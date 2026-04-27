# content-editor

A terminal-launched desktop editor for Markdown, JSON, and CSV files. Opens a local web UI in your browser with file-type-aware editing modes.

## Features

- **Markdown** - rich editing with toolbar, live preview, and raw view; supports GFM tables, checklists, code blocks, links, and images
- **JSON** - syntax-highlighted tree editor with validation and error reporting
- **CSV** - tabular editor with add/remove row and column support
- Dark mode via `--dark` / `--night` flag

## Requirements

- Node.js 18+

## Installation

```bash
npm install
npm run build
npm link   # makes `content_editor` available globally
```

## Usage

```bash
content_editor [file] [options]
```

| Option | Description |
|---|---|
| `--dark` / `--night` / `-n` | Start in dark mode |

The editor auto-detects the file type from the extension (`.md`, `.markdown`, `.mdx`, `.txt`, `.csv`, `.tsv`). JSON mode is used for `.json` files. Opens in the browser at `http://localhost:4000`.

## Development

```bash
npm run dev    # Vite dev server
npm run build  # production build
npm run lint   # ESLint
```

## Tech Stack

- React 19, TypeScript, Vite
- [MDXEditor](https://mdxeditor.dev/) for rich Markdown editing
- react-markdown for preview rendering
