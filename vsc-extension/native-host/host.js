#!/usr/bin/env node

/**
 * Native Messaging Host for Fronti
 *
 * Provides a bridge between Chrome extension and Claude CLI using native messaging protocol.
 * Handles command execution, streaming responses, and process management.
 *
 * @module native-host
 */

import { spawn } from 'child_process';
import { readSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import readline from 'readline';

// Constants
const CONFIG_DIR = '.ai-visual-editor';
const WORKSPACE_CONFIG_FILE = 'workspace.json';
const MESSAGE_HEADER_SIZE = 4;
const CLAUDE_COMMAND_TIMEOUT = 5000;

// Process management
const activeProcesses = new Set();
let isShuttingDown = false;

/**
 * Read workspace path from VS Code extension config
 * @returns {string|null} Workspace path or null if not found
 */
function getWorkspacePath() {
  try {
    const configFile = join(homedir(), CONFIG_DIR, WORKSPACE_CONFIG_FILE);

    if (existsSync(configFile)) {
      const data = readFileSync(configFile, 'utf8');
      const config = JSON.parse(data);
      return config.projectPath || null;
    }
  } catch (error) {
    logError('Failed to read workspace info', error);
  }

  return null;
}

/**
 * Utility: Log error messages to stderr
 */
function logError(message, error) {
  console.error(`[Error] ${message}:`, error?.message || error);
}

/**
 * Utility: Log info messages to stderr
 */
function logInfo(message) {
  console.error(`[Info] ${message}`);
}

/**
 * Read message from stdin using native messaging protocol
 * @returns {Object} Parsed message object
 * @throws {Error} If message cannot be read
 */
function getMessage() {
  const headerBuffer = Buffer.alloc(MESSAGE_HEADER_SIZE);
  const headerBytes = readSync(0, headerBuffer, 0, MESSAGE_HEADER_SIZE, null);

  if (headerBytes !== MESSAGE_HEADER_SIZE) {
    throw new Error('Failed to read message header');
  }

  const messageLength = headerBuffer.readUInt32LE(0);
  logInfo(`Receiving message (${messageLength} bytes)`);

  const messageBuffer = Buffer.alloc(messageLength);
  const messageBytes = readSync(0, messageBuffer, 0, messageLength, null);

  if (messageBytes !== messageLength) {
    throw new Error('Failed to read complete message');
  }

  const message = JSON.parse(messageBuffer.toString());
  logInfo(`Message received: ${message.command}`);

  return message;
}

/**
 * Send message to stdout using native messaging protocol
 * @param {Object} message - Message object to send
 */
function sendMessage(message) {
  const buffer = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(MESSAGE_HEADER_SIZE);
  header.writeUInt32LE(buffer.length, 0);

  process.stdout.write(header);
  process.stdout.write(buffer);
}

/**
 * Build Claude CLI arguments based on permissions and session
 * @param {Object} toolPermissions - Tool permission flags
 * @param {string} sessionId - Session identifier
 * @param {boolean} isFirstMessage - Whether this is first message
 * @returns {string[]} Array of CLI arguments
 */
function buildClaudeArgs(toolPermissions, sessionId, isFirstMessage) {
  const args = [
    '--print',
    '--verbose',
    '--output-format', 'stream-json',
    '--include-partial-messages'
  ];

  const allPermissionsEnabled = toolPermissions?.read &&
    toolPermissions?.write &&
    toolPermissions?.edit &&
    toolPermissions?.bash &&
    toolPermissions?.grep &&
    toolPermissions?.glob &&
    toolPermissions?.webSearch &&
    toolPermissions?.webFetch;

  if (allPermissionsEnabled) {
    args.push('--dangerously-skip-permissions');
    logInfo('All permissions enabled - using skip permissions');
  } else {
    const allowedTools = [];
    if (toolPermissions?.read) allowedTools.push('Read');
    if (toolPermissions?.write) allowedTools.push('Write');
    if (toolPermissions?.edit) {
      allowedTools.push('Edit');
      allowedTools.push('MultiEdit');
    }
    if (toolPermissions?.bash) allowedTools.push('Bash');
    if (toolPermissions?.grep) allowedTools.push('Grep');
    if (toolPermissions?.glob) allowedTools.push('Glob');
    if (toolPermissions?.webSearch) allowedTools.push('WebSearch');
    if (toolPermissions?.webFetch) allowedTools.push('WebFetch');

    const allowedToolsStr = allowedTools.length > 0 ? allowedTools.join(',') : 'Read';
    args.push('--allowedTools', allowedToolsStr);
    logInfo(`Selective permissions - allowed tools: ${allowedToolsStr}`);
  }

  if (sessionId) {
    if (isFirstMessage) {
      args.push('--session-id', sessionId);
      logInfo(`Creating new session: ${sessionId}`);
    } else {
      args.push('--resume', sessionId);
      logInfo(`Resuming session: ${sessionId}`);
    }
  }

  return args;
}

/**
 * Execute Claude CLI command with streaming output
 * @param {string} prompt - The prompt to send to Claude
 * @param {string} projectPath - Working directory path
 * @param {string} sessionId - Session identifier
 * @param {boolean} isFirstMessage - Whether this is the first message in session
 * @param {Object} toolPermissions - Tool permission flags
 * @returns {Promise<void>}
 */
async function executeClaude(prompt, projectPath, sessionId, isFirstMessage, toolPermissions) {
  const claudeArgs = buildClaudeArgs(toolPermissions, sessionId, isFirstMessage);

  logInfo(`Executing Claude command`);
  logInfo(`Working directory: ${projectPath || process.cwd()}`);
  logInfo(`Prompt length: ${prompt.length} characters`);

  return new Promise((resolve, reject) => {
    const claude = spawn('claude', claudeArgs, {
      cwd: projectPath || undefined,
      shell: true
    });

    // Track process for cleanup
    activeProcesses.add(claude);

    // Send prompt to stdin
    claude.stdin.write(prompt);
    claude.stdin.end();

    // Setup readline for stdout
    const rl = readline.createInterface({
      input: claude.stdout,
      crlfDelay: Infinity
    });

    let finalResult = null;

    // Stream each line to Chrome extension
    rl.on('line', (line) => {
      try {
        const data = JSON.parse(line);
        logInfo(`Stream: ${data.type}${data.subtype ? `/${data.subtype}` : ''}`);

        if (data.type === 'result') {
          finalResult = data;
          logInfo(`Final result: ${data.subtype}, is_error: ${data.is_error}`);
        } else {
          sendMessage({
            type: 'stream',
            data: data
          });
        }
      } catch (e) {
        logError(`Failed to parse stream line`, e);
      }
    });

    claude.stderr.on('data', (data) => {
      logError('Claude stderr', data.toString());
    });

    claude.on('close', (code) => {
      logInfo(`Claude process exited with code ${code}`);
      activeProcesses.delete(claude);

      // Send completion message with final result
      if (finalResult) {
        sendMessage({
          type: 'complete',
          success: !finalResult.is_error,
          error: finalResult.is_error ? (finalResult.error || 'Unknown error') : null,
          result: finalResult.result,
          duration: finalResult.duration_ms,
          usage: finalResult.usage,
          total_cost_usd: finalResult.total_cost_usd,
          modelUsage: finalResult.modelUsage
        });
      } else {
        // No final result received
        sendMessage({
          type: 'complete',
          success: code === 0,
          error: code !== 0 ? `Process exited with code ${code}` : null
        });
      }

      resolve();
    });

    claude.on('error', (error) => {
      logError('Claude spawn error', error);
      activeProcesses.delete(claude);

      const errorMessage = error.code === 'ENOENT'
        ? 'Claude CLI not found. Please install Claude Code CLI and ensure it\'s in your PATH.'
        : error.message;

      sendMessage({
        type: 'error',
        error: errorMessage
      });
      reject(error);
    });
  });
}

/**
 * Check if VS Code extension is installed
 */
async function checkVscExtension() {
  sendMessage({
    type: 'checkResult',
    success: true,
    installed: true
  });
}

/**
 * Check if Claude Code CLI is installed
 */
async function checkClaudeCode() {
  try {
    const { execSync } = await import('child_process');
    const output = execSync('claude --version', {
      encoding: 'utf8',
      timeout: CLAUDE_COMMAND_TIMEOUT
    });

    sendMessage({
      type: 'checkResult',
      success: true,
      installed: true,
      version: output.trim()
    });
  } catch (error) {
    sendMessage({
      type: 'checkResult',
      success: false,
      installed: false,
      error: 'Claude Code not found'
    });
  }
}

/**
 * Check all dependencies at once
 */
async function checkAll() {
  let claudeInstalled = false;
  let claudeVersion = null;

  try {
    const { execSync } = await import('child_process');
    const output = execSync('claude --version', {
      encoding: 'utf8',
      timeout: CLAUDE_COMMAND_TIMEOUT,
      stdio: 'pipe'
    });
    claudeInstalled = true;
    claudeVersion = output.trim();
  } catch (error) {
    claudeInstalled = false;
  }

  const projectPath = getWorkspacePath();

  sendMessage({
    type: 'checkAllResult',
    vscExtension: {
      success: true,
      installed: true
    },
    claudeCode: {
      success: claudeInstalled,
      installed: claudeInstalled,
      version: claudeVersion,
      error: claudeInstalled ? null : 'Claude Code not found'
    },
    projectPath
  });
}

/**
 * Cleanup function to terminate all active processes
 */
function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logInfo('Native host shutting down...');
  logInfo(`Terminating ${activeProcesses.size} active processes`);

  activeProcesses.forEach(proc => {
    try {
      if (!proc.killed) {
        proc.kill('SIGTERM');
        logInfo(`Terminated process: ${proc.pid}`);
      }
    } catch (err) {
      logError(`Failed to terminate process`, err);
    }
  });

  activeProcesses.clear();

  setTimeout(() => {
    process.exit(0);
  }, 100);
}

/**
 * Signal handlers for graceful shutdown
 */
process.on('SIGTERM', () => {
  logInfo('Received SIGTERM - shutting down gracefully');
  cleanup();
});

process.on('SIGINT', () => {
  logInfo('Received SIGINT - shutting down gracefully');
  cleanup();
});

process.on('SIGHUP', () => {
  logInfo('Received SIGHUP - shutting down gracefully');
  cleanup();
});

process.stdin.on('end', () => {
  logInfo('Stdin closed - shutting down');
  cleanup();
});

process.stdin.on('close', () => {
  logInfo('Stdin stream closed - shutting down');
  cleanup();
});

/**
 * Main message loop
 */
(async () => {
  try {
    while (true) {
      const message = getMessage();

      switch (message.command) {
        case 'execute':
          await executeClaude(
            message.prompt,
            message.projectPath,
            message.sessionId,
            message.isFirstMessage,
            message.toolPermissions
          );
          break;
        case 'checkAll':
          await checkAll();
          break;
        case 'checkVscExtension':
          await checkVscExtension();
          break;
        case 'checkClaudeCode':
          await checkClaudeCode();
          break;
        default:
          sendMessage({
            type: 'error',
            error: `Unknown command: ${message.command}`
          });
      }
    }
  } catch (error) {
    if (error.message?.includes('Failed to read')) {
      logInfo('Stdin closed - exiting gracefully');
      cleanup();
    } else {
      logError('Fatal error', error);
      process.exit(1);
    }
  }
})();
