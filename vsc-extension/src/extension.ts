import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as os from 'os';
import { ChromeExtensionProvider } from './chromeExtensionView';

const HOST_NAME = 'com.ai_visual_editor.host';
const CHROME_EXTENSION_URL = 'chrome://extensions/';

// Workspace info'yu dosyaya yaz
function saveWorkspaceInfo() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const activeDocument = vscode.window.activeTextEditor?.document;

  let projectPath = null;

  if (workspaceFolder) {
    // Öncelik workspace path'ine
    projectPath = workspaceFolder.uri.fsPath;
  } else if (activeDocument && !activeDocument.isUntitled) {
    // Workspace yoksa, açık dosyanın klasörü
    projectPath = path.dirname(activeDocument.uri.fsPath);
  }

  const configDir = path.join(os.homedir(), '.ai-visual-editor');
  const configFile = path.join(configDir, 'workspace.json');

  try {
    // Config klasörünü oluştur
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Workspace info'yu kaydet
    fs.writeFileSync(configFile, JSON.stringify({
      projectPath,
      timestamp: Date.now()
    }, null, 2));

    console.log('Workspace info saved:', projectPath);
  } catch (error) {
    console.error('Failed to save workspace info:', error);
  }
}

// Workspace config'i temizle
function cleanupWorkspaceInfo() {
  const configDir = path.join(os.homedir(), '.ai-visual-editor');
  const configFile = path.join(configDir, 'workspace.json');

  try {
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
      console.log('Workspace info cleaned up');
    }
  } catch (error) {
    console.error('Failed to cleanup workspace info:', error);
  }
}

function installNativeHost(context: vscode.ExtensionContext) {
  try {
    const platform = os.platform();
    const extensionPath = context.extensionPath;
    const nativeHostPath = path.join(extensionPath, 'native-host');

    // Create manifest pointing to extension directory
    const manifest = createManifest(nativeHostPath, platform);
    const manifestPath = path.join(nativeHostPath, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Make host executable on Unix systems
    if (platform !== 'win32') {
      const hostScript = path.join(nativeHostPath, 'host.sh');
      if (fs.existsSync(hostScript)) {
        fs.chmodSync(hostScript, '755');
      }
      const hostJs = path.join(nativeHostPath, 'host.js');
      if (fs.existsSync(hostJs)) {
        fs.chmodSync(hostJs, '755');
      }
    }

    // Register with browser
    registerNativeHost(manifestPath, platform);

    console.log('Native host registered successfully');
  } catch (error) {
    console.error('Failed to install native host:', error);
  }
}

function createManifest(nativeHostPath: string, platform: string): any {
  const hostExecutable = platform === 'win32'
    ? path.join(nativeHostPath, 'host.bat')
    : path.join(nativeHostPath, 'host.sh');

  return {
    name: HOST_NAME,
    description: 'AI Visual Editor Native Host',
    path: hostExecutable,
    type: 'stdio',
    allowed_origins: [
      'chrome-extension://mcodgknnanafinfelelpfdbepmnhmocg/'
    ]
  };
}

function registerNativeHost(manifestPath: string, platform: string) {
  try {
    if (platform === 'win32') {
      // Windows: Register in registry
      const regPath = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`;
      execSync(`reg add "${regPath}" /ve /t REG_SZ /d "${manifestPath}" /f`, {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      });
    } else if (platform === 'darwin') {
      // macOS: Copy to Library
      const targetDir = path.join(os.homedir(), 'Library/Application Support/Google/Chrome/NativeMessagingHosts');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetPath = path.join(targetDir, `${HOST_NAME}.json`);
      fs.copyFileSync(manifestPath, targetPath);
    } else {
      // Linux: Copy to config directory
      const targetDir = path.join(os.homedir(), '.config/google-chrome/NativeMessagingHosts');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetPath = path.join(targetDir, `${HOST_NAME}.json`);
      fs.copyFileSync(manifestPath, targetPath);
    }
  } catch (error) {
    throw new Error(`Failed to register native host: ${error}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Visual Editor AI is activating...');

  // Install native host
  installNativeHost(context);

  // Workspace info'yu ilk kez kaydet
  saveWorkspaceInfo();

  // Register webview view provider
  const chromeExtensionProvider = new ChromeExtensionProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChromeExtensionProvider.viewType,
      chromeExtensionProvider
    )
  );

  // Workspace değiştiğinde güncelle
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      saveWorkspaceInfo();
    })
  );

  // Aktif editör değiştiğinde güncelle
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      saveWorkspaceInfo();
    })
  );

  console.log('Visual Editor AI activated - native messaging ready');
}

export function deactivate() {
  console.log('AI Visual Editor is deactivating');

  try {
    // Cleanup workspace config dosyası
    cleanupWorkspaceInfo();

    const platform = os.platform();

    // Unregister native host
    if (platform === 'win32') {
      // Remove Windows registry entry
      const regPath = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`;
      try {
        execSync(`reg delete "${regPath}" /f`, {
          timeout: 2000,
          windowsHide: true,
          stdio: 'ignore'
        });
        console.log('Registry entry removed');
      } catch {
        // Ignore if already removed
      }
    } else if (platform === 'darwin') {
      // Remove macOS manifest
      const manifestPath = path.join(os.homedir(), 'Library/Application Support/Google/Chrome/NativeMessagingHosts', `${HOST_NAME}.json`);
      try {
        fs.unlinkSync(manifestPath);
        console.log('Manifest file removed');
      } catch {
        // Ignore if already removed
      }
    } else {
      // Remove Linux manifest
      const manifestPath = path.join(os.homedir(), '.config/google-chrome/NativeMessagingHosts', `${HOST_NAME}.json`);
      try {
        fs.unlinkSync(manifestPath);
        console.log('Manifest file removed');
      } catch {
        // Ignore if already removed
      }
    }

    console.log('AI Visual Editor deactivated - cleanup complete');
  } catch (error) {
    console.error('Deactivation cleanup error:', error);
  }
}
