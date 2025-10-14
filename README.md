# Fronti - Visual-first AI coding agent

> Like v0, Bolt, and Lovable - but for your existing local projects. Free, local, and under your control.

Click any element in the browser -> describe the change -> Fronti routes it through Claude Code -> your source updates automatically.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/jojjbmgmggenijlkhjeaiodfoggjcjgj?label=Chrome%20Extension)](https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/VisualEditor.visual-editor-ai?label=VS%20Code%20Extension)](https://marketplace.visualstudio.com/items?itemName=VisualEditor.visual-editor-ai)
[![GitHub stars](https://img.shields.io/github/stars/waspdev95/fronti?style=social)](https://github.com/waspdev95/fronti/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick start

1. Install both extensions
   - Chrome: [Fronti - Visual Editor AI](https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj)
   - VS Code: [Fronti AI extension](https://marketplace.visualstudio.com/items?itemName=VisualEditor.visual-editor-ai)
2. Prepare your workspace
   - Open the project in VS Code with the [Claude Code extension](https://marketplace.visualstudio.com/items?itemName=AnthropicClaude.claude-dev) installed and signed in.
   - Start your project's local development server (for example `npm run dev` -> `http://localhost:3000`).
3. Edit visually
   - Open the Fronti Chrome extension, point it to your localhost URL, click the element to adjust, describe the change, and review the edit in VS Code.

---

## How Fronti works

- The Chrome extension captures visual context from your running app.
- The VS Code extension bridges Fronti requests into Claude Code.
- Claude Code applies AI-powered edits locally, so you approve every change before committing.

---

## Why Fronti?

| Capability | v0 / Bolt / Lovable | Fronti |
| --- | --- | --- |
| Works with existing local codebases | Limited | Yes |
| Keeps code and prompts on your machine | No | Yes |
| Visual click-to-edit workflow | Limited | Yes |
| Full editor and git control | Limited | Yes |
| Requires subscription | Yes | No |

---

## Requirements

- Node.js 18 or newer.
- Visual Studio Code with the [Claude Code extension](https://marketplace.visualstudio.com/items?itemName=AnthropicClaude.claude-dev). Sign in with your Anthropic account.
- Google Chrome or another Chromium-based browser that can install from the Chrome Web Store.
- A local development server for your project (React, Next.js, Vue, Vite, Astro, etc.).

Fronti does not store API keys. All AI calls run locally through Claude Code.

---

## Development

Build each extension independently when working from source.

### Chrome extension

```bash
cd chrome-extension
npm install
npm run build
```

Load the unpacked extension from `chrome-extension/dist` in Chrome.

### VS Code extension

```bash
cd vsc-extension
npm install
npm run compile
npm run package  # Outputs visual-editor-ai-<version>.vsix in vsc-extension/
```

Install the generated `.vsix` in VS Code (Extensions panel -> ... -> Install from VSIX).

---

## Contributing

Contributions are welcome:

1. Fork this repository.
2. Create a feature branch (`git checkout -b feature/my-improvement`).
3. Commit your changes (`git commit -m "Describe your change"`).
4. Push the branch and open a pull request.

---

## License

Fronti is distributed under the [MIT License](LICENSE).

---

## Support

If Fronti helps your workflow, please star the repo and share feedback.

- [Report bugs](https://github.com/waspdev95/fronti/issues)
- [Start a discussion](https://github.com/waspdev95/fronti/discussions)

---

<p align="center">Made with care for developers.</p>
