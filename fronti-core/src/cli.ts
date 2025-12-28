#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runNativeHost } from './run';
import {
  getDefaultRuntimeDir,
  getRegisteredManifestPath,
  installNativeHostRuntime,
  readManifestExecutable,
  uninstallNativeHost
} from './install';
import type { Platform } from './types';

function hasCommandArguments(): boolean {
  return process.argv.length > 2;
}

function runInstall(
  platform: Platform,
  runtimeDir: string,
  allowedExtensionIds: string[],
  options: { quiet?: boolean } = {}
): void {
  try {
    const result = installNativeHostRuntime({
      nativeHostPath: runtimeDir,
      platform,
      allowedExtensionIds
    });

    if (!options.quiet) {
      console.log(`✔ Native host manifest installed at ${result.manifestPath}`);
      console.log(`✔ Registered for platform: ${platform}`);
      console.log('You can now use the Fronti Chrome extension.');
    }
  } catch (error) {
    if (options.quiet) {
      console.error('[fronti-native-host] Auto-install failed:', error instanceof Error ? error.message : error);
    } else {
      throw error;
    }
  }
}

async function runCli(): Promise<void> {
  const platform = process.platform as Platform;

  await yargs(hideBin(process.argv))
    .scriptName('fronti-native-host')
    .command(
      'install',
      'Install or update the Fronti native host manifest',
      (cmd) =>
        cmd
          .option('runtime-dir', {
            type: 'string',
            description: 'Directory to place host runtime files',
            default: getDefaultRuntimeDir()
          })
          .option('extensions', {
            type: 'array',
            description: 'Allowed Chrome extension IDs',
            default: ['jojjbmgmggenijlkhjeaiodfoggjcjgj']
          }),
      (args) => {
        const runtimeDir = args['runtime-dir'] as string;
        const allowed = (args.extensions as string[]).map((id) => id.trim()).filter(Boolean);

        runInstall(platform, runtimeDir, allowed);
      }
    )
    .command(
      'auto-install',
      false,
      (cmd) =>
        cmd
          .option('runtime-dir', {
            type: 'string',
            default: getDefaultRuntimeDir()
          })
          .option('extensions', {
            type: 'array',
            default: ['jojjbmgmggenijlkhjeaiodfoggjcjgj']
          }),
      (args) => {
        const runtimeDir = args['runtime-dir'] as string;
        const allowed = (args.extensions as string[]).map((id) => id.trim()).filter(Boolean);
        runInstall(platform, runtimeDir, allowed, { quiet: true });
      }
    )
    .command(
      'uninstall',
      'Remove the registered Fronti native host manifest',
      () => {},
      () => {
        uninstallNativeHost(platform);
        console.log('✔ Native host registration removed.');
      }
    )
    .command(
      'status',
      'Show current native host registration',
      () => {},
      () => {
        const manifestPath = getRegisteredManifestPath(platform);
        if (!manifestPath) {
          console.log('Native host: not registered.');
          return;
        }

        const executable = readManifestExecutable(manifestPath);
        console.log('Native host: registered');
        console.log(`Manifest path: ${manifestPath}`);
        console.log(`Executable: ${executable ?? 'unknown'}`);
      }
    )
    .demandCommand(1)
    .help()
    .parseAsync();
}

export async function main(): Promise<void> {
  if (!hasCommandArguments()) {
    await runNativeHost();
  } else {
    await runCli();
  }
}

main().catch((error) => {
  console.error('[fronti-native-host] Unexpected error:', error);
  process.exit(1);
});
