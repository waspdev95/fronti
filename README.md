# Fronti - Visual Layer for Claude Code

Fronti brings Claude Code's powerful agent capabilities into your browser. Point it at any localhost project, select the element you want to change, describe what you need, and Claude updates your codebase instantly.

- Visual interface for Claude Code running on your localhost
- Works with React, Next.js, Vue, Tailwind, Astro, Svelte, and any web stack
- Handles UI changes, refactors, API integrations, logic updates, and test generation
- Perfect for rapid prototyping and production refinements

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/jojjbmgmggenijlkhjeaiodfoggjcjgj?label=Chrome%20Extension)](https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/VisualEditor.visual-editor-ai?label=VS%20Code%20Extension)](https://marketplace.visualstudio.com/items?itemName=VisualEditor.visual-editor-ai)
[![GitHub stars](https://img.shields.io/github/stars/waspdev95/fronti?style=social)](https://github.com/waspdev95/fronti/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick start

1. Install Claude Code CLI  
   `npm install -g @anthropic-ai/claude-code`
2. Install Fronti extensions
   - Chrome: [Fronti Chrome Extension](https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj)
   - VS Code: [Fronti Visual Studio Extension](https://marketplace.visualstudio.com/items?itemName=VisualEditor.visual-editor-ai)
3. Prepare your project
   - Open the repo in VS Code.
   - Start your local development server (for example `npm run dev` -> `http://localhost:3000` or `5173`).
4. Run Claude from the canvas
   - Launch the Chrome extension, pick an element or section, describe the improvement, and let Claude Code apply and sync the changes.

---

## What you can do

- Redesign components, restyle layouts, and update content directly from your browser
- Refactor logic, connect APIs, adjust data flows, and generate tests using Claude's agent capabilities
- Create new sections and reusable components with production-ready code
- Apply batch improvements like accessibility fixes, theme updates, or design token changes across your entire project
- See changes instantly with your existing dev server and hot reload

---

## Why Fronti?

Get the speed of hosted AI tools with complete control over your codebase.

| Feature | Hosted AI Builders | Fronti |
| --- | --- | --- |
| Works with your existing codebase | No | Yes |
| Code stays on your machine | No | Yes |
| Visual click-to-edit interface | Limited | Yes |
| Full agent capabilities | No | Yes |

---

## How it works

- The Chrome extension provides a visual interface over your localhost dev server
- The VS Code extension connects your selections to Claude Code CLI running in your editor
- Claude executes changes locally in your codebase

---

## Built for web development

- Turn visual feedback into code changes in minutes
- Works with any framework or design system
- Everything runs locally on your machine

---

## Requirements

- Node.js 18 or newer
- Visual Studio Code
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- Fronti VS Code Extension
- Fronti Chrome Extension
- Chromium-based browser (Chrome, Edge, Arc, etc.)
- Local dev server running your project

All Claude requests run through Claude Code CLI, which requires an active Anthropic subscription.

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
