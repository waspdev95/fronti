import { spawn, execSync, type ChildProcessWithoutNullStreams } from 'child_process';
import { readSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import readline from 'readline';

const CONFIG_DIR = '.ai-visual-editor';
const WORKSPACE_CONFIG_FILE = 'workspace.json';
const MESSAGE_HEADER_SIZE = 4;
const CLAUDE_COMMAND_TIMEOUT = 5000;

/**
 * Common paths where Claude CLI might be installed.
 * Chrome's native messaging hosts run with a limited PATH,
 * so we need to check known locations.
 */
const CLAUDE_KNOWN_PATHS = [
  join(homedir(), '.npm-global', 'bin', 'claude'),
  join(homedir(), '.local', 'bin', 'claude'),
  join(homedir(), '.nvm', 'current', 'bin', 'claude'),
  '/usr/local/bin/claude',
  '/opt/node22/bin/claude',
  '/opt/homebrew/bin/claude',
  '/usr/bin/claude',
];

let cachedClaudePath: string | null = null;

/**
 * Find the Claude CLI executable path.
 * First tries 'which claude', then checks known paths.
 */
function findClaudePath(): string | null {
  if (cachedClaudePath) return cachedClaudePath;

  // Try 'which claude' first (works if PATH is correct)
  try {
    const result = execSync('which claude', {
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    if (result && existsSync(result)) {
      cachedClaudePath = result;
      return result;
    }
  } catch {
    // which failed, try known paths
  }

  // Check known installation paths
  for (const p of CLAUDE_KNOWN_PATHS) {
    if (existsSync(p)) {
      cachedClaudePath = p;
      return p;
    }
  }

  return null;
}

const activeProcesses = new Set<ChildProcessWithoutNullStreams>();
let isShuttingDown = false;
let handlersBound = false;

interface ExecuteMessage {
  command: 'execute';
  prompt: string;
  projectPath: string | null;
  sessionId: string | null;
  isFirstMessage: boolean;
  toolPermissions: Record<string, boolean>;
}

interface CheckMessage {
  command: 'checkAll' | 'checkVscExtension' | 'checkClaudeCode';
}

type IncomingMessage = ExecuteMessage | CheckMessage | { command: string; [key: string]: any };

function getWorkspacePath(): string | null {
  try {
    const configFile = join(homedir(), CONFIG_DIR, WORKSPACE_CONFIG_FILE);

    if (existsSync(configFile)) {
      const data = readFileSync(configFile, 'utf8');
      const config = JSON.parse(data);
      return config.projectPath || null;
    }
  } catch (error) {
    logError('Failed to read workspace info', error as Error);
  }

  return null;
}

function logError(message: string, error: Error | string): void {
  const detail = typeof error === 'string' ? error : error?.message || error;
  console.error(`[Error] ${message}:`, detail);
}

function logInfo(message: string): void {
  console.error(`[Info] ${message}`);
}

function getMessage(): IncomingMessage {
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

function sendMessage(message: Record<string, unknown>): void {
  const buffer = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(MESSAGE_HEADER_SIZE);
  header.writeUInt32LE(buffer.length, 0);

  process.stdout.write(header);
  process.stdout.write(buffer);
}

function buildClaudeArgs(
  toolPermissions: Record<string, boolean> | undefined,
  sessionId: string | null,
  isFirstMessage: boolean
): string[] {
  const args = ['--print', '--verbose', '--output-format', 'stream-json', '--include-partial-messages'];

  const allPermissionsEnabled =
    toolPermissions?.read &&
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
    const allowedTools: string[] = [];
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

async function executeClaude(
  prompt: string,
  projectPath: string | null,
  sessionId: string | null,
  isFirstMessage: boolean,
  toolPermissions: Record<string, boolean> | undefined
): Promise<void> {
  const claudeArgs = buildClaudeArgs(toolPermissions, sessionId, isFirstMessage);

  const claudePath = findClaudePath();
  if (!claudePath) {
    sendMessage({
      type: 'error',
      error: "Claude CLI not found. Please install Claude Code CLI (npm install -g @anthropic-ai/claude-code)."
    });
    return Promise.resolve();
  }

  logInfo('Executing Claude command');
  logInfo(`Claude path: ${claudePath}`);
  logInfo(`Working directory: ${projectPath || process.cwd()}`);
  logInfo(`Prompt length: ${prompt.length} characters`);

  return new Promise((resolve, reject) => {
    const claude = spawn(claudePath, claudeArgs, {
      cwd: projectPath || undefined,
      shell: false
    });

    activeProcesses.add(claude);

    claude.stdin.write(prompt);
    claude.stdin.end();

    const rl = readline.createInterface({
      input: claude.stdout,
      crlfDelay: Infinity
    });

    let finalResult: any = null;

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
            data
          });
        }
      } catch (e) {
        logError('Failed to parse stream line', e as Error);
      }
    });

    claude.stderr.on('data', (data) => {
      logError('Claude stderr', data.toString());
    });

    claude.on('close', (code) => {
      logInfo(`Claude process exited with code ${code}`);
      activeProcesses.delete(claude);

      if (finalResult) {
        sendMessage({
          type: 'complete',
          success: !finalResult.is_error,
          error: finalResult.is_error ? finalResult.error || 'Unknown error' : null,
          result: finalResult.result,
          duration: finalResult.duration_ms,
          usage: finalResult.usage,
          total_cost_usd: finalResult.total_cost_usd,
          modelUsage: finalResult.modelUsage
        });
      } else {
        sendMessage({
          type: 'complete',
          success: code === 0,
          error: code !== 0 ? `Process exited with code ${code}` : null
        });
      }

      resolve();
    });

    claude.on('error', (error) => {
      logError('Claude spawn error', error as Error);
      activeProcesses.delete(claude);

      const nodeError = error as NodeJS.ErrnoException;
      const errorMessage =
        nodeError.code === 'ENOENT'
          ? "Claude CLI not found. Please install Claude Code CLI and ensure it's in your PATH."
          : nodeError.message;

      sendMessage({
        type: 'error',
        error: errorMessage
      });
      reject(error);
    });
  });
}

async function checkVscExtension(): Promise<void> {
  sendMessage({
    type: 'checkResult',
    success: true,
    installed: true
  });
}

async function checkClaudeCode(): Promise<void> {
  let claudeInstalled = false;
  let claudeVersion: string | null = null;

  const claudePath = findClaudePath();
  if (claudePath) {
    try {
      const output = execSync(`${claudePath} --version`, {
        encoding: 'utf8',
        timeout: CLAUDE_COMMAND_TIMEOUT,
        stdio: 'pipe'
      });
      claudeInstalled = true;
      claudeVersion = output.trim();
    } catch {
      claudeInstalled = false;
    }
  }

  sendMessage({
    type: 'checkResult',
    success: claudeInstalled,
    installed: claudeInstalled,
    version: claudeVersion,
    error: claudeInstalled ? null : 'Claude Code not found'
  });
}

async function checkAll(): Promise<void> {
  let claudeInstalled = false;
  let claudeVersion: string | null = null;

  const claudePath = findClaudePath();
  if (claudePath) {
    try {
      const output = execSync(`${claudePath} --version`, {
        encoding: 'utf8',
        timeout: CLAUDE_COMMAND_TIMEOUT,
        stdio: 'pipe'
      });
      claudeInstalled = true;
      claudeVersion = output.trim();
    } catch {
      claudeInstalled = false;
    }
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

function cleanup(): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logInfo('Native host shutting down...');
  logInfo(`Terminating ${activeProcesses.size} active processes`);

  activeProcesses.forEach((proc) => {
    try {
      if (!proc.killed) {
        proc.kill('SIGTERM');
        logInfo(`Terminated process: ${proc.pid}`);
      }
    } catch (err) {
      logError('Failed to terminate process', err as Error);
    }
  });

  activeProcesses.clear();

  setTimeout(() => {
    process.exit(0);
  }, 100);
}

function bindSignalHandlers(): void {
  if (handlersBound) return;
  handlersBound = true;

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
}

export async function runNativeHost(): Promise<void> {
  bindSignalHandlers();

  try {
    while (true) {
      const message = getMessage();

      switch (message.command) {
        case 'execute':
          await executeClaude(
            (message as ExecuteMessage).prompt,
            (message as ExecuteMessage).projectPath,
            (message as ExecuteMessage).sessionId,
            (message as ExecuteMessage).isFirstMessage,
            (message as ExecuteMessage).toolPermissions
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
    const err = error as Error;
    if (err.message?.includes('Failed to read')) {
      logInfo('Stdin closed - exiting gracefully');
      cleanup();
    } else {
      logError('Fatal error', err);
      process.exit(1);
    }
  }
}

export function terminateActiveProcesses(): void {
  cleanup();
}
