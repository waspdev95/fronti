#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runNativeHost } from './run';
import {
  getDefaultRuntimeDir,
  getRegisteredManifestPath,
  installNativeHostRuntime,
  smartInstall,
  isInstallNeeded,
  readManifestExecutable,
  uninstallNativeHost
} from './install';
import { NATIVE_HOST_VERSION } from './constants';
import type { Platform } from './types';

function hasCommandArguments(): boolean {
  return process.argv.length > 2;
}

function runInstall(
  platform: Platform,
  runtimeDir: string,
  allowedExtensionIds: string[],
  options: { quiet?: boolean; force?: boolean } = {}
): void {
  try {
    // Use smartInstall unless force is specified
    const result = options.force
      ? installNativeHostRuntime({
          nativeHostPath: runtimeDir,
          platform,
          allowedExtensionIds
        })
      : smartInstall({
          nativeHostPath: runtimeDir,
          platform,
          allowedExtensionIds
        });

    if (!options.quiet) {
      if (result.usedExisting) {
        console.log(`✔ Native host already installed and up-to-date (v${NATIVE_HOST_VERSION})`);
        console.log(`  Manifest: ${result.manifestPath}`);
      } else {
        console.log(`✔ Native host installed (v${NATIVE_HOST_VERSION})`);
        console.log(`  Manifest: ${result.manifestPath}`);
        console.log(`  Runtime: ${runtimeDir}`);
        console.log('You can now use the Fronti Chrome extension.');
      }
    }
  } catch (error) {
    if (options.quiet) {
      console.error('[fronti-core] Auto-install failed:', error instanceof Error ? error.message : error);
    } else {
      throw error;
    }
  }
}

async function runCli(): Promise<void> {
  const platform = process.platform as Platform;

  await yargs(hideBin(process.argv))
    .scriptName('fronti-core')
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
          })
          .option('force', {
            type: 'boolean',
            description: 'Force reinstall even if already up-to-date',
            default: false
          }),
      (args) => {
        const runtimeDir = args['runtime-dir'] as string;
        const allowed = (args.extensions as string[]).map((id) => id.trim()).filter(Boolean);
        const force = args.force as boolean;

        runInstall(platform, runtimeDir, allowed, { force });
      }
    )
    .command(
      'auto-install',
      false, // Hidden command for postinstall
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
          console.log('Native host: not registered');
          console.log(`Current version: v${NATIVE_HOST_VERSION}`);
          console.log('\nRun "fronti-core install" to register.');
          return;
        }

        const executable = readManifestExecutable(manifestPath);
        const needsUpdate = isInstallNeeded(platform);

        console.log('Native host: registered');
        console.log(`Manifest: ${manifestPath}`);
        console.log(`Executable: ${executable ?? 'unknown'}`);
        console.log(`Current version: v${NATIVE_HOST_VERSION}`);

        if (needsUpdate) {
          console.log('\n⚠ Update available. Run "fronti-core install" to update.');
        } else {
          console.log('\n✔ Up-to-date');
        }
      }
    )
    .command(
      '$0',
      false, // Default command (hidden) - run as native host daemon
      () => {},
      async () => {
        // If run without arguments, act as native host daemon
        // This is for backwards compatibility
        await runNativeHost();
      }
    )
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
  console.error('[fronti-core] Unexpected error:', error);
  process.exit(1);
});
