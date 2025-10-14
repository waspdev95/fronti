# Fronti - Visual Layer for Claude Code

Fronti brings Claude Code's powerful agent capabilities into your browser. Point it at any localhost project, select the element you want to change, describe what you need, and Claude updates your codebase instantly.

- Visual interface for Claude Code running on your localhost
- Works with React, Next.js, Vue, Tailwind, Astro, Svelte, and any web stack
- Handles UI changes, refactors, API integrations, logic updates, and test generation
- Perfect for rapid prototyping and production refinements

## Quick start

1. Install Claude Code CLI
   `npm install -g @anthropic-ai/claude-code`
2. Install Fronti extensions
   - Chrome: [Fronti Chrome Extension](https://chromewebstore.google.com/detail/visual-editor-ai/jojjbmgmggenijlkhjeaiodfoggjcjgj)
   - VS Code: This extension
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
- This VS Code Extension
- Fronti Chrome Extension
- Chromium-based browser (Chrome, Edge, Arc, etc.)
- Local dev server running your project

All Claude requests run through Claude Code CLI, which requires an active Anthropic subscription.

---

Questions or feedback? Open an issue on the [Fronti repository](https://github.com/waspdev95/fronti/issues).
