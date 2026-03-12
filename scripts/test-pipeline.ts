// scripts/test-pipeline.ts
// Quick standalone script to prove audio → Groq → transcript works.
// Run BEFORE building the full Electron app.
//
// Usage:
//   GROQ_API_KEY=your_key_here npx ts-node scripts/test-pipeline.ts
//
// You should see transcript lines printed as you speak.
// Ctrl+C to stop.

import { AudioCapture } from '../src/main/audio';
import { GroqProvider }  from '../packages/stt-providers/src/groq';

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error('ERROR: Set GROQ_API_KEY env var before running this script.');
  console.error('  GROQ_API_KEY=your_key npx ts-node scripts/test-pipeline.ts');
  process.exit(1);
}

// Use the Mic1 device found via pactl list sources short
// Change this to whichever source name showed up for you
const MIC_DEVICE = 'alsa_input.pci-0000_00_1f.3-platform-skl_hda_dsp_generic.HiFi__Mic1__source';

async function main() {
  console.log('BibleBeam pipeline test');
  console.log('───────────────────────');
  console.log('Connecting to Groq...');

  const provider = new GroqProvider();

  try {
    await provider.connect(apiKey!);
    console.log('✓ Groq connected\n');
  } catch (err: any) {
    console.error('✗ Groq connection failed:', err.message);
    process.exit(1);
  }

  const audio = new AudioCapture();

  provider.startStreaming(
    (segment) => {
      if (segment.text.trim()) {
        console.log(`[transcript] ${segment.text}`);
      }
    },
    (err) => {
      console.error('[groq error]', err.message);
    }
  );

  audio.on('data', (chunk: Buffer) => {
    provider.sendAudio(chunk);
  });

  audio.on('start', () => {
    console.log(`✓ Mic started (${MIC_DEVICE})`);
    console.log('Speak now — transcripts will appear every ~4 seconds.');
    console.log('Ctrl+C to stop.\n');
  });

  audio.on('error', (err: Error) => {
    console.error('[audio error]', err.message);
  });

  audio.start(MIC_DEVICE);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nStopping...');
    audio.stop();
    provider.disconnect();
    process.exit(0);
  });
}

main();