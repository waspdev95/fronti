import * as vscode from 'vscode';

/**
 * Webview provider for Chrome Extension setup instructions
 */
export class ChromeExtensionProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'visualEditorAI.chromeExtension';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    webviewView.webview.options = {
      enableScripts: false,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this.getHtmlContent();
  }

  /**
   * Generate HTML content for the webview
   */
  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fronti Getting Started</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      padding: 20px 16px;
      margin: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      line-height: 1.6;
    }
    h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    p {
      margin: 0 0 12px 0;
      color: var(--vscode-descriptionForeground);
    }
    .welcome {
      margin-bottom: 20px;
    }
    .steps {
      margin-top: 24px;
    }
    .step {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .step:last-child {
      border-bottom: none;
    }
    .step-number {
      display: inline-block;
      width: 24px;
      height: 24px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-weight: 600;
      font-size: 13px;
      margin-right: 8px;
    }
    .step-title {
      display: inline;
      font-weight: 600;
      color: var(--vscode-foreground);
      font-size: 14px;
    }
    .step-desc {
      margin: 8px 0 0 32px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
    }
    .install-link {
      display: inline-block;
      margin: 12px 0 0 32px;
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      font-size: 13px;
      transition: background 0.2s;
    }
    .install-link:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .chrome-icon {
      display: inline-block;
      margin-right: 6px;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="welcome">
    <h2>👋 Welcome to Fronti!</h2>
    <p>Visual-first AI coding agent that works directly in your browser. Edit localhost projects by selecting elements and describing changes.</p>
  </div>

  <div class="steps">
    <div class="step">
      <div>
        <span class="step-number">1</span>
        <span class="step-title">Install Chrome Extension</span>
      </div>
      <p class="step-desc">Get started by installing the Fronti extension from Chrome Web Store:</p>
      <a href="https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj"
         class="install-link"
         target="_blank">
        <span class="chrome-icon">🔗</span>
        Install Chrome Extension
      </a>
    </div>

    <div class="step">
      <div>
        <span class="step-number">2</span>
        <span class="step-title">Start Your Dev Server</span>
      </div>
      <p class="step-desc">Run your local development server (e.g., localhost:3000, localhost:5173, etc.)</p>
    </div>

    <div class="step">
      <div>
        <span class="step-number">3</span>
        <span class="step-title">Open Fronti</span>
      </div>
      <p class="step-desc">Click the Fronti extension, navigate to your localhost URL, and start building!</p>
    </div>
  </div>
</body>
</html>`;
  }
}
