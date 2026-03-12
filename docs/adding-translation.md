# Adding a new Bible translation

## Before you start — check the license

BibleBeam can only bundle translations that are **public domain** or have an
explicit license permitting free redistribution. Copyright translations (NIV,
NLT, NKJV, ESV) must be accessed via an API, not bundled.

**Public domain translations you can bundle:** KJV, ASV, WEB, YLT, Darby, WEB.
**API-only translations:** ESV (api.esv.org, free key), NIV, NLT, NKJV.

If in doubt, do not bundle — implement an `IBibleProvider` that calls the
translation's API instead.

---

## Option A — Bundled translation (public domain)

### 1. Prepare the JSON file

Convert the translation text to the standard schema:

```json
{
  "Genesis": {
    "1": {
      "1": "In the beginning God created the heaven and the earth.",
      "2": "And the earth was without form, and void..."
    }
  },
  "John": {
    "3": {
      "16": "For God so loved the world..."
    }
  }
}
```

Use full book names as keys (matching those in `packages/verse-matcher/src/regex.ts`).
Chapter and verse numbers are string keys.

Save as `packages/bible-data/translations/your-translation.json`.

Document the source of the text in `packages/bible-data/README.md`.

### 2. Register the translation

In `packages/bible-data/src/index.ts`, add an export for your translation.

### 3. Add a local provider

In `packages/bible-providers/src/local.ts`, add a case for your translation
abbreviation that reads from the JSON file.

---

## Option B — API translation (copyright, user provides key)

### 1. Create the provider file

```typescript
// packages/bible-providers/src/your-translation-api.ts

import type { IBibleProvider, VerseReference, VerseResult } from './base';

export class YourTranslationProvider implements IBibleProvider {
  readonly translation     = 'ABC';         // short code shown in UI
  readonly translationName = 'Your Bible';  // full name
  readonly requiresApiKey  = true;

  constructor(private apiKey: string) {}

  async getVerse(ref: VerseReference): Promise<VerseResult> {
    // Fetch from your translation's API using this.apiKey
  }

  async search(query: string, limit = 10): Promise<VerseResult[]> {
    // Return up to `limit` results matching the query
  }
}
```

### 2. Register in Settings

Add the translation to the Settings dropdown and the provider map in
`packages/bible-providers/src/index.ts`.

---

## Step 3 — Update the README

Add your translation to the "Bible Translations" table. For API translations,
include a link to where users can get their free API key.

## Step 4 — Open a PR

Include in the PR description:
- Translation name and abbreviation
- License / source confirmation (for bundled) or API documentation link (for API)
- Whether it requires a user API key
