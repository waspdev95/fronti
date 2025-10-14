# 🎨 Fronti - Visual-first AI coding agent

> Like v0, Bolt, and Lovable - but for your **existing local projects**. Free, local, and fully under your control.

**Visual editing for local codebases using Claude Code agent.**

Select elements in browser → Describe changes → AI agent handles coding ✨

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/jojjbmgmggenijlkhjeaiodfoggjcjgj?label=Chrome%20Extension)](https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/VisualEditor.visual-editor-ai?label=VS%20Code%20Extension)](https://marketplace.visualstudio.com/items?itemName=VisualEditor.visual-editor-ai)
[![GitHub stars](https://img.shields.io/github/stars/waspdev95/fronti?style=social)](https://github.com/waspdev95/fronti/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ Features

⚡ **Visual-first** — Select UI elements in browser, AI codes automatically
🏠 **Local & Private** — Runs on your machine, your code stays yours
🔥 **Built for Frontend** — React, Next.js, Vue, Tailwind - any web framework
🚀 **10x Faster** — Visual selection replaces manual code navigation
🔑 **Bring Your Own API** — Use your Claude API key, no lock-in

---

## 🚀 Quick Start

**1. Install Extensions**
- [📦 Chrome Extension](https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj) — Visual element selector
- [📦 VS Code Extension](https://marketplace.visualstudio.com/items?itemName=VisualEditor.visual-editor-ai) — Native host bridge

**2. Use It**
1. Open your project in VS Code
2. Run dev server (e.g., `npm run dev` → `localhost:3000`)
3. Open Chrome extension, enter your localhost URL
4. Select element → Describe change → Done! ✅

---

## 📦 What's Included

This monorepo contains both extensions needed to run Fronti:

- **`/chrome-extension`** — Visual element selector with AI chat interface
- **`/vsc-extension`** — Native host bridge for file operations with Claude Code

Both work together to enable visual-first AI coding.

---

## 🎯 Why Fronti?

| Feature | v0/Bolt/Lovable | Fronti |
|---------|-----------------|--------|
| Works with existing code | ❌ | ✅ |
| Local & private | ❌ | ✅ |
| Bring your own API key | ❌ | ✅ |
| Visual element selection | ✅ | ✅ |
| Full codebase control | ❌ | ✅ |
| No monthly fees | ❌ | ✅ |

---

## 📋 Requirements

- **Node.js** 18 or higher
- **VS Code** with Claude Code installed and authenticated
- **Chrome** browser (or Chromium-based)
- **Claude API key** from [Anthropic Console](https://console.anthropic.com/)

---

## 🛠️ Development

Want to contribute or run from source?

### Chrome Extension

```bash
cd chrome-extension
npm install
npm run build
```

Load unpacked extension from `chrome-extension/dist` in Chrome.

### VS Code Extension

```bash
cd vsc-extension
npm install
npm run compile
npm run package  # Creates .vsix file
```

Install the `.vsix` file in VS Code.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🌟 Support

If Fronti helps your development workflow, please ⭐ **star this repo**!

**Found a bug?** → [Report an issue](https://github.com/waspdev95/fronti/issues)
**Have questions?** → [Start a discussion](https://github.com/waspdev95/fronti/discussions)

---

## 🔗 Links

- [Chrome Extension](https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=VisualEditor.visual-editor-ai)

---

<p align="center">Made with ❤️ for developers who want visual-first AI coding</p>
