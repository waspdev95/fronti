/**
 * Native Host Runtime
 * Handles Chrome native messaging protocol and Claude CLI execution
 */

import { spawn, execSync, type ChildProcessWithoutNullStreams } from 'child_process';
import { readSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import readline from 'readline';
import { CONFIG_DIR, WORKSPACE_CONFIG_FILE, COMMAND_TIMEOUT, IS_WINDOWS, ERRORS } from './constants';

// Native messaging protocol
const MESSAGE_HEADER_SIZE = 4;

// State
let cachedClaudePath: string | null = null;
const activeProcesses = new Set<ChildProcessWithoutNullStreams>();
let isShuttingDown = false;

// Types
interface ExecuteMessage {
  command: 'execute';
  prompt: string;
  projectPath: string | null;
  sessionId: string | null;
  isFirstMessage: boolean;
  toolPermissions: Record<string, boolean>;
}

type IncomingMessage = ExecuteMessage | { command: string; [key: string]: unknown };


/**
 * Find Claude CLI using system commands
 */
function findClaudePath(): string | null {
  if (cachedClaudePath) return cachedClaudePath;

  // Try where/which
  try {
    const cmd = IS_WINDOWS ? 'where claude' : 'which claude';
    const result = execSync(cmd, { encoding: 'utf8', timeout: 2000, stdio: ['pipe', 'pipe', 'ignore'] })
      .trim().split('\n')[0];
    if (result && existsSync(result)) {
      cachedClaudePath = result;
      return result;
    }
  } catch { /* continue */ }

  // Fallback: npm global prefix
  try {
    const prefix = execSync('npm config get prefix', { encoding: 'utf8', timeout: 2000, stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const claudePath = IS_WINDOWS ? join(prefix, 'claude.cmd') : join(prefix, 'bin', 'claude');
    if (existsSync(claudePath)) {
      cachedClaudePath = claudePath;
      return claudePath;
    }
  } catch { /* continue */ }

  return null;
}

/**
 * Get Claude version (reusable)
 */
function getClaudeVersion(): { installed: boolean; version: string | null } {
  const claudePath = findClaudePath();
  if (!claudePath) return { installed: false, version: null };

  try {
    const version = execSync(`"${claudePath}" --version`, { encoding: 'utf8', timeout: COMMAND_TIMEOUT, stdio: 'pipe' }).trim();
    return { installed: true, version };
  } catch {
    return { installed: false, version: null };
  }
}

/**
 * Read workspace config
 */
function getWorkspacePath(): string | null {
  try {
    const configFile = join(homedir(), CONFIG_DIR, WORKSPACE_CONFIG_FILE);
    if (existsSync(configFile)) {
      const config = JSON.parse(readFileSync(configFile, 'utf8'));
      return config.projectPath || null;
    }
  } catch { /* ignore */ }
  return null;
}

// Native messaging protocol
function getMessage(): IncomingMessage {
  const header = Buffer.alloc(MESSAGE_HEADER_SIZE);
  if (readSync(0, header, 0, MESSAGE_HEADER_SIZE, null) !== MESSAGE_HEADER_SIZE) {
    throw new Error('Failed to read message header');
  }

  const len = header.readUInt32LE(0);
  const body = Buffer.alloc(len);
  if (readSync(0, body, 0, len, null) !== len) {
    throw new Error('Failed to read message body');
  }

  return JSON.parse(body.toString());
}

function sendMessage(msg: Record<string, unknown>): void {
  const data = Buffer.from(JSON.stringify(msg));
  const header = Buffer.alloc(MESSAGE_HEADER_SIZE);
  header.writeUInt32LE(data.length, 0);
  process.stdout.write(header);
  process.stdout.write(data);
}

/**
 * Build Claude CLI arguments
 */
function buildClaudeArgs(permissions: Record<string, boolean> | undefined, sessionId: string | null, isFirst: boolean): string[] {
  const args = ['--print', '--verbose', '--output-format', 'stream-json', '--include-partial-messages'];

  const allEnabled = permissions?.read && permissions?.write && permissions?.edit &&
    permissions?.bash && permissions?.grep && permissions?.glob &&
    permissions?.webSearch && permissions?.webFetch;

  if (allEnabled) {
    args.push('--dangerously-skip-permissions');
  } else {
    const tools: string[] = [];
    if (permissions?.read) tools.push('Read');
    if (permissions?.write) tools.push('Write');
    if (permissions?.edit) tools.push('Edit', 'MultiEdit');
    if (permissions?.bash) tools.push('Bash');
    if (permissions?.grep) tools.push('Grep');
    if (permissions?.glob) tools.push('Glob');
    if (permissions?.webSearch) tools.push('WebSearch');
    if (permissions?.webFetch) tools.push('WebFetch');
    args.push('--allowedTools', tools.length ? tools.join(',') : 'Read');
  }

  if (sessionId) {
    args.push(isFirst ? '--session-id' : '--resume', sessionId);
  }

  return args;
}

/**
 * Execute Claude CLI
 */
async function executeClaude(msg: ExecuteMessage): Promise<void> {
  const claudePath = findClaudePath();
  if (!claudePath) {
    sendMessage({ type: 'error', error: ERRORS.CLAUDE_NOT_FOUND });
    return;
  }

  const args = buildClaudeArgs(msg.toolPermissions, msg.sessionId, msg.isFirstMessage);

  return new Promise((resolve, reject) => {
    const proc = spawn(claudePath, args, { cwd: msg.projectPath || undefined, shell: IS_WINDOWS });
    activeProcesses.add(proc);

    proc.stdin.write(msg.prompt);
    proc.stdin.end();

    let result: Record<string, unknown> | null = null;
    const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity });

    rl.on('line', (line) => {
      try {
        const data = JSON.parse(line);
        if (data.type === 'result') {
          result = data;
        } else {
          sendMessage({ type: 'stream', data });
        }
      } catch { /* skip invalid json */ }
    });


    proc.on('close', (code) => {
      activeProcesses.delete(proc);
      sendMessage(result ? {
        type: 'complete',
        success: !result.is_error,
        error: result.is_error ? result.error : null,
        result: result.result,
        duration: result.duration_ms,
        usage: result.usage,
        total_cost_usd: result.total_cost_usd
      } : {
        type: 'complete',
        success: code === 0,
        error: code !== 0 ? `Exit code ${code}` : null
      });
      resolve();
    });

    proc.on('error', (err) => {
      activeProcesses.delete(proc);
      sendMessage({ type: 'error', error: (err as NodeJS.ErrnoException).code === 'ENOENT' ? ERRORS.CLAUDE_NOT_FOUND : err.message });
      reject(err);
    });
  });
}

// Command handlers
const handlers: Record<string, () => Promise<void>> = {
  checkAll: async () => {
    const { installed, version } = getClaudeVersion();
    sendMessage({
      type: 'checkAllResult',
      vscExtension: { success: true, installed: true },
      claudeCode: { success: installed, installed, version, error: installed ? null : 'Not found' },
      projectPath: getWorkspacePath()
    });
  },
  checkVscExtension: async () => sendMessage({ type: 'checkResult', success: true, installed: true }),
  checkClaudeCode: async () => {
    const { installed, version } = getClaudeVersion();
    sendMessage({ type: 'checkResult', success: installed, installed, version, error: installed ? null : 'Not found' });
  }
};

// Cleanup
function cleanup(): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  activeProcesses.forEach(p => { try { p.kill('SIGTERM'); } catch { /* ignore */ } });
  activeProcesses.clear();
  setTimeout(() => process.exit(0), 100);
}

/**
 * Main loop
 */
export async function runNativeHost(): Promise<void> {
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.stdin.on('end', cleanup);

  try {
    while (true) {
      const msg = getMessage();

      if (msg.command === 'execute') {
        await executeClaude(msg as ExecuteMessage);
      } else if (handlers[msg.command]) {
        await handlers[msg.command]();
      } else {
        sendMessage({ type: 'error', error: `Unknown command: ${msg.command}` });
      }
    }
  } catch (err) {
    if ((err as Error).message?.includes('Failed to read')) {
      cleanup();
    } else {
      process.exit(1);
    }
  }
}

export { cleanup as terminateActiveProcesses };
