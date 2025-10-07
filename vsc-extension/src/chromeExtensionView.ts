import * as vscode from 'vscode';

export class ChromeExtensionProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'visualEditorAI.chromeExtension';

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = {
      enableScripts: false
    };

    webviewView.webview.html = this.getHtmlContent();
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      padding: 16px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      line-height: 1.6;
    }
    p {
      margin: 0 0 12px 0;
    }
    .info {
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <p class="info">Visual Editor AI works with Claude Code CLI and Chrome Extension to edit your localhost projects with AI.</p>

  <p>Install the Chrome Extension and start using it on your local development server.</p>
</body>
</html>`;
  }
}
