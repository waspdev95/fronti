#!/usr/bin/env node

/**
 * Native Messaging Host for AI Visual Editor
 * Chrome extension ile Claude CLI arasında köprü
 */

import { spawn } from 'child_process';
import { readSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import readline from 'readline';

// Track spawned processes for cleanup
const activeProcesses = new Set();

// VSC extension'dan workspace path'ini oku
function getWorkspacePath() {
  try {
    const configFile = join(homedir(), '.ai-visual-editor', 'workspace.json');

    if (existsSync(configFile)) {
      const data = readFileSync(configFile, 'utf8');
      const config = JSON.parse(data);
      return config.projectPath || null;
    }
  } catch (error) {
    console.error('Failed to read workspace info:', error);
  }

  return null;
}

// Native messaging protokolü - stdin'den mesaj oku
function getMessage() {
  // 4 byte header oku (message length)
  const headerBuffer = Buffer.alloc(4);
  const headerBytes = readSync(0, headerBuffer, 0, 4, null); // 0 = stdin

  if (headerBytes !== 4) {
    throw new Error('Failed to read message header');
  }

  const messageLength = headerBuffer.readUInt32LE(0);
  console.error(`Receiving message (${messageLength} bytes)`);

  // Message oku
  const messageBuffer = Buffer.alloc(messageLength);
  const messageBytes = readSync(0, messageBuffer, 0, messageLength, null);

  if (messageBytes !== messageLength) {
    throw new Error('Failed to read complete message');
  }

  const message = JSON.parse(messageBuffer.toString());
  console.error(`Message received:`, message.command);

  return message;
}

function sendMessage(message) {
  const buffer = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);

  process.stdout.write(header);
  process.stdout.write(buffer);
}

async function executeClaude(prompt, projectPath, sessionId, isFirstMessage) {
  const claudeArgs = [
    '--print',
    '--verbose',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--allowedTools', 'Bash,Write,Read,Edit,MultiEdit,Grep,Glob',
    '--dangerously-skip-permissions'
  ];

  // Add session-id for first message, resume for subsequent messages
  if (sessionId) {
    if (isFirstMessage) {
      claudeArgs.push('--session-id', sessionId);
      console.error(`Creating new session: ${sessionId}`);
    } else {
      claudeArgs.push('--resume', sessionId);
      console.error(`Resuming session: ${sessionId}`);
    }
  }

  console.error(`Executing Claude command with streaming...`);
  console.error(`Working dir: ${projectPath || process.cwd()}`);
  console.error(`Prompt length: ${prompt.length} characters`);

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
        console.error(`Stream: ${data.type}${data.subtype ? `/${data.subtype}` : ''}`);

        // Check if this is the final result
        if (data.type === 'result') {
          finalResult = data;
          console.error(`Final result: ${data.subtype}, is_error: ${data.is_error}`);
        } else {
          // Send stream chunk to extension (excluding result, will send separately)
          sendMessage({
            type: 'stream',
            data: data
          });
        }
      } catch (e) {
        console.error(`Failed to parse line: ${line}`);
      }
    });

    // Handle stderr
    claude.stderr.on('data', (data) => {
      console.error(`Claude stderr: ${data.toString()}`);
    });

    // Handle completion
    claude.on('close', (code) => {
      console.error(`Claude process exited with code ${code}`);
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

    // Handle spawn errors
    claude.on('error', (error) => {
      console.error(`Spawn error: ${error.message}`);
      activeProcesses.delete(claude);

      // Provide user-friendly error message
      let errorMessage = error.message;
      if (error.code === 'ENOENT') {
        errorMessage = 'Claude CLI not found. Please install Claude Code CLI and make sure it\'s in your PATH.';
      }

      sendMessage({
        type: 'error',
        error: errorMessage
      });
      reject(error);
    });
  });
}

// Check if VS Code extension is installed
async function checkVscExtension() {
  // If we're here, native host is working = extension is installed
  sendMessage({
    type: 'checkResult',
    success: true,
    installed: true
  });
}

// Check if Claude Code CLI is installed
async function checkClaudeCode() {
  try {
    // Try to spawn 'claude' command
    const { execSync } = await import('child_process');
    const output = execSync('claude --version', { encoding: 'utf8', timeout: 5000 });

    // If we got here, Claude Code is installed
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

// Check everything at once
async function checkAll() {
  let claudeInstalled = false;
  let claudeVersion = null;

  try {
    const { execSync } = await import('child_process');
    const output = execSync('claude --version', { encoding: 'utf8', timeout: 5000, stdio: 'pipe' });
    claudeInstalled = true;
    claudeVersion = output.trim();
  } catch (error) {
    claudeInstalled = false;
  }

  // VSC extension'dan workspace path'ini al
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
    projectPath: projectPath
  });
}

// Cleanup function
let isShuttingDown = false;

function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.error('[Cleanup] Native host shutting down...');
  console.error(`[Cleanup] Killing ${activeProcesses.size} active processes`);

  // Kill all spawned Claude processes
  activeProcesses.forEach(proc => {
    try {
      if (!proc.killed) {
        proc.kill('SIGTERM');
        console.error('[Cleanup] Killed process:', proc.pid);
      }
    } catch (err) {
      console.error('[Cleanup] Failed to kill process:', err.message);
    }
  });

  activeProcesses.clear();

  // Exit after a short delay to ensure cleanup completes
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

// Handle graceful shutdown signals
process.on('SIGTERM', () => {
  console.error('[Signal] Received SIGTERM - shutting down gracefully');
  cleanup();
});

process.on('SIGINT', () => {
  console.error('[Signal] Received SIGINT - shutting down gracefully');
  cleanup();
});

process.on('SIGHUP', () => {
  console.error('[Signal] Received SIGHUP - shutting down gracefully');
  cleanup();
});

// Handle stdin close
process.stdin.on('end', () => {
  console.error('[Stdin] Stdin closed - shutting down');
  cleanup();
});

process.stdin.on('close', () => {
  console.error('[Stdin] Stdin stream closed - shutting down');
  cleanup();
});

// Main
(async () => {
  try {
    while (true) {
      const message = getMessage();

      if (message.command === 'execute') {
        await executeClaude(message.prompt, message.projectPath, message.sessionId, message.isFirstMessage);
      } else if (message.command === 'checkAll') {
        await checkAll();
      } else if (message.command === 'checkVscExtension') {
        await checkVscExtension();
      } else if (message.command === 'checkClaudeCode') {
        await checkClaudeCode();
      } else {
        sendMessage({
          type: 'error',
          error: 'Unknown command'
        });
      }
    }
  } catch (error) {
    // Stdin closed - normal shutdown
    if (error.message?.includes('Failed to read')) {
      console.error('[Error] Stdin closed - exiting gracefully');
      cleanup();
    } else {
      console.error('Native host error:', error);
      process.exit(1);
    }
  }
})();
