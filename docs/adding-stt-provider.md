# Adding a new STT provider

BibleBeam's speech-to-text layer is fully pluggable. Any streaming STT service
can be integrated in under an hour by implementing one TypeScript interface.

## Step 1 — Create the adapter file

Create `packages/stt-providers/src/your-provider.ts` and implement `ISTTProvider`:

```typescript
import type { ISTTProvider, TranscriptSegment } from './base';

export class YourProvider implements ISTTProvider {
  readonly name = 'Your Provider Name';  // shown in Settings UI
  readonly id   = 'your-provider';       // snake_case, stored in settings

  async connect(apiKey: string): Promise<void> {
    // Validate the key. Throw a descriptive Error if invalid.
  }

  startStreaming(
    onTranscript: (segment: TranscriptSegment) => void,
    onError: (error: Error) => void
  ): void {
    // Set up your WebSocket / SDK connection.
    // Call onTranscript() for every partial and final segment.
    // Call onError() on unrecoverable errors.
  }

  sendAudio(chunk: Buffer): void {
    // Forward the PCM audio chunk to your service.
    // Format: s16le, 16kHz, mono.
  }

  stopStreaming(): void {
    // Gracefully close the streaming connection.
  }

  disconnect(): void {
    // Full teardown.
  }
}
```

## Step 2 — Register the provider

In `packages/stt-providers/src/index.ts`:

```typescript
export { YourProvider } from './your-provider';

// Add to the PROVIDERS map:
export const PROVIDERS = {
  // ...existing providers...
  'your-provider': () => new YourProvider(),
};
```

Also add `'your-provider'` to the `ProviderId` type union.

## Step 3 — Add to the Settings UI

In `src/renderer/pages/Settings.tsx`, add your provider to the dropdown:

```tsx
<option value="your-provider">Your Provider Name</option>
```

## Step 4 — Write a test

Create `packages/stt-providers/tests/your-provider.test.ts`. At minimum, test
that the adapter calls `onTranscript` with a `TranscriptSegment` of the correct
shape when it receives a mock API response.

## Step 5 — Update the README

Add your provider to the STT providers table in `README.md`. Include the free
tier details — this is the most useful information for churches evaluating the app.

## Step 6 — Open a PR

Include in the PR description:
- Link to your provider's documentation
- Free tier details and any rate limits
- Whether the provider supports streaming or requires chunked uploads
