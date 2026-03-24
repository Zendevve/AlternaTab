# AlternaTab Documentation

Welcome to the AlternaTab documentation. This documentation follows the [MCAF Guide](https://mcaf.guide).

## Quick Links

### Core
- [Design Principles](DESIGN_PRINCIPLES.md) — The Five Pillars guiding all development

### Features
- [Tab Overlay](Features/tab-overlay.md) — Core Alt+Q overlay functionality
- [Settings](Features/settings.md) — Options page and configuration
- [Search & Filter](Features/search-filter.md) — In-overlay tab search

### Architecture
- [ADR-001: Manifest V3](ADR/001-manifest-v3.md) — Why we use MV3
- [ADR-002: Message Passing](ADR/002-message-passing.md) — Cross-context communication

### Guides
- [Development Setup](Development/setup.md) — Local development instructions
- [Testing Strategy](Testing/strategy.md) — How to test the extension

## Project Structure

```
alternaTab/
├── manifest.json       ← Extension manifest (MV3)
├── background.js       ← Service worker
├── content.js          ← Overlay UI
├── overlay.css         ← Overlay styles
├── options.*           ← Settings page
├── icons/              ← Extension icons
├── docs/               ← This documentation
└── AGENTS.md           ← AI agent rules
```

## Contributing

1. Read [AGENTS.md](../AGENTS.md) for coding rules
2. Follow [Development Setup](Development/setup.md)
3. Test changes per [Testing Strategy](Testing/strategy.md)
4. Update docs if behavior changes

---

*See [AGENTS.md](../AGENTS.md) for AI agent guidelines.*
