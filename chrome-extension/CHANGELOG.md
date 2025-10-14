# Changelog

All notable changes to the Fronti Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-10-14

### Changed
- Extracted message rendering into dedicated ChatMessage component
- Created useClaudeStream custom hook for streaming logic
- Improved code modularity and maintainability
- Reduced component complexity

### Added
- ChatMessage component for rendering all message types
- useClaudeStream hook for handling AI streaming responses

## [1.0.1] - 2025-10-14

### Changed
- Refactored background service worker with modular architecture
- Extracted native messaging logic into dedicated service module
- Improved code documentation and removed Turkish comments
- Enhanced error handling and logging

### Added
- Native messaging service module (`services/native-messaging.ts`)
- Comprehensive JSDoc documentation
- CHANGELOG file for version tracking

### Fixed
- Improved port cleanup and resource management
- Better error messages for native host connection issues

## [1.0.0] - 2025-10-07

### Added
- Initial release of Fronti Chrome Extension
- Visual element selection and inspection
- Native messaging integration with VS Code extension
- Real-time Claude AI streaming responses
- Task queue management
- Settings panel for tool permissions
- Keyboard shortcuts (V for inspector mode)
- Onboarding experience
