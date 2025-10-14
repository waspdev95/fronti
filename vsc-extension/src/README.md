# Source Code Structure

This directory contains the TypeScript source code for the Fronti VS Code extension.

## Architecture

The codebase follows a modular architecture with clear separation of concerns:

```
src/
├── extension.ts              # Main entry point - activation/deactivation
├── chromeExtensionView.ts    # Webview provider for getting started
├── constants.ts              # Application constants
├── types.ts                  # TypeScript type definitions
├── native-host/              # Native messaging host installation
│   ├── installer.ts          # Main installation logic
│   ├── manifest.ts           # Manifest generation
│   └── registry.ts           # Platform-specific registration
└── utils/                    # Utility modules
    └── workspace.ts          # Workspace configuration management
```

## Key Modules

### Extension Entry Point (`extension.ts`)
- Minimal coordination logic
- Handles activation and deactivation lifecycle
- Registers event listeners and providers

### Native Host (`native-host/`)
- **installer.ts**: Orchestrates native host installation
- **manifest.ts**: Creates native messaging manifest
- **registry.ts**: Platform-specific Chrome registration (Windows/Mac/Linux)

### Utilities (`utils/`)
- **workspace.ts**: Manages workspace path synchronization with native host

### Core Files
- **constants.ts**: Centralized configuration constants
- **types.ts**: Shared TypeScript interfaces and types

## Design Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Modularity**: Easy to test, maintain, and extend
3. **Type Safety**: Full TypeScript type coverage
4. **Platform Agnostic**: Clean abstraction for OS-specific code
5. **Error Handling**: Proper error boundaries and user feedback

## Development

```bash
# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Package extension
npm run package
```
