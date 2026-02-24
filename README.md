# Telegram Tools

A client-side web app for working with Telegram MTProto session strings. Generate, convert, analyze, and inspect sessions for **gotg**, **GramJS**, **Kurigram**, **mtcute**, and **Telethon** — all in your browser with zero backend.

## Features

- **Generator** — Authenticate via Telegram (phone or bot token) and export session strings in all supported formats
- **Converter** — Paste a session string, auto-detect its format, and convert to any other format
- **Analyzer** — Decode and inspect all fields of a session string (DC, auth key, user ID, etc.)
- **DC Connectivity** — Ping test all Telegram production and test data centers with per-DC and bulk testing
- **MTProto Reference** — Library cards with GitHub links, authors, and a session format specifications table

## Supported Formats

| Format | Library | Language |
|--------|---------|----------|
| gotg | [gotg](https://github.com/pageton/gotg) | Go |
| GramJS | [GramJS](https://github.com/gram-js/gramjs) | JavaScript |
| Kurigram | [Kurigram](https://github.com/KurimuzonAkuma/kurigram) | Python |
| mtcute | [mtcute](https://github.com/mtcute/mtcute) | TypeScript |
| Telethon | [Telethon](https://github.com/LonamiWebs/Telethon) | Python |

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Tech Stack

- [Svelte 5](https://svelte.dev) + TypeScript
- [Vite 7](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [GramJS](https://github.com/gram-js/gramjs) (in-browser Telegram auth)

## License

MIT
