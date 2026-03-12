# Contributing to BibleBeam

Thanks for wanting to help. BibleBeam is built by and for church media teams —
every contribution, big or small, helps churches around the world.

## Ways to contribute

- **Fix a bug** — pick any open issue labelled `bug`
- **Add a new STT provider** — see [docs/adding-stt-provider.md](docs/adding-stt-provider.md)
- **Add a Bible translation** — see [docs/adding-translation.md](docs/adding-translation.md)
- **Improve docs** — especially the audio setup guide for non-developers
- **Report bugs** — use the bug report issue template

## Setup

```bash
git clone https://github.com/YOUR_FORK/biblebeam.git
cd biblebeam
pnpm install
pnpm dev
```

Requires Node.js 18+ and pnpm. On Linux, also install:
```bash
sudo apt install libasound2-dev libsecret-1-dev
```

## Before opening a PR

```bash
pnpm lint       # must pass
pnpm typecheck  # must pass
pnpm test       # must pass
```

## Branch naming

- `feat/your-feature-name`
- `fix/what-you-fixed`
- `docs/what-you-documented`

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add AssemblyAI STT provider
fix: regex not matching Ps. abbreviation
docs: add Yamaha mixer setup guide
```

## Code style

- TypeScript strict mode — no `any` unless absolutely necessary
- Interfaces over classes for data shapes
- New STT providers go in `packages/stt-providers/src/`
- New Bible providers go in `packages/bible-providers/src/`
- Tests go next to the code they test in `tests/`

## Questions?

Open a Discussion — that's what they're for.
