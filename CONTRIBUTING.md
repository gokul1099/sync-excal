# Contributing to Excalidraw Sync

Thank you for your interest in contributing to Excalidraw Sync! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/excalidraw-sync.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit your changes: `git commit -m "Add some feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions.

Quick start:
```bash
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

## Code Style

- We use TypeScript for type safety
- We use Prettier for code formatting
- We use ESLint for code linting
- Follow existing code patterns and conventions

Run formatting and linting:
```bash
npm run format
npm run lint
```

## Commit Messages

Follow conventional commits format:
- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation changes`
- `style: formatting, missing semicolons, etc.`
- `refactor: code refactoring`
- `test: adding tests`
- `chore: updating build tasks, package manager configs, etc.`

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Ensure all tests pass and the code builds successfully
3. Update documentation for any API changes
4. The PR will be merged once you have approval from maintainers

## Testing

Before submitting a PR:
```bash
npm run type-check  # TypeScript type checking
npm run build       # Production build
npm run lint        # Code linting
```

Test the extension:
1. Build the extension: `npm run build`
2. Load in Chrome from `dist` folder
3. Test all functionality thoroughly
4. Check browser console for errors

## Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance improvements
- 🧪 Tests
- 🌐 Internationalization

## Reporting Bugs

When reporting bugs, include:
- Extension version
- Browser version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Browser console errors

## Feature Requests

For feature requests, explain:
- The use case
- Why it's useful
- Proposed implementation (if you have ideas)

## Questions?

Feel free to open an issue for any questions or discussions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
