# Audio setup guide

This guide is for church media volunteers setting up BibleBeam with their
existing sound system. No audio engineering experience required.

## The simplest setup

Plug a 3.5mm stereo cable from the **monitor mix output** of your mixer into
your computer's **microphone/line-in jack**.

> Use the monitor mix, not the main mix (FOH). This way, if you need to mute
> the main speakers mid-service, BibleBeam keeps listening.

In BibleBeam Settings → Audio Input, select the line-in device.

---

## Recommended setups by mixer type

### Behringer X32 / X-Air series
Use an **Aux Send** bus assigned to the pastor's mic channel only:
1. Create an Aux Send (e.g. Aux 6)
2. Route only the pastor's mic to that send
3. Connect the Aux 6 XLR output to a USB audio interface
4. Connect the USB interface to your computer
5. Select the USB interface in BibleBeam

### Yamaha MG / TF series
Use the **2TR OUT** (tape output) — it follows the main mix, which works fine
for most setups. Connect via RCA-to-3.5mm adapter into your computer.

### Mackie ProFX series
Use the **Control Room Out** (same as main mix at reduced level) via TRS cable.

### Small analog mixer (Behringer Xenyx, etc.)
Use the **Headphone Out** or **Control Room Out** into your computer's line-in.

---

## Using a USB audio interface (recommended for quality)

A Focusrite Scarlett Solo (~$120) gives you a proper line-level input, better
signal quality, and avoids ground loop hum that laptop line-ins can have.

1. Connect mixer output to Scarlett input 2 (line, not mic)
2. Plug Scarlett into computer via USB
3. Set gain on Scarlett so the green ring flickers occasionally — not constant red
4. In BibleBeam Settings → Audio Input, select "Scarlett Solo"

---

## Troubleshooting

**BibleBeam isn't detecting any audio**
- Check Settings → Audio Status — it should show "Listening"
- On Linux: run `parecord --list-devices` in a terminal to confirm your device
  is visible. Select it in Settings.

**Transcription accuracy is low**
- Check the pastor's mic is not muted on your mixer
- Reduce background music/ambient noise in the feed if possible
- Try a different STT provider — Deepgram handles accents better than Whisper

**Ground loop hum (buzzing noise)**
- Use a DI box or ground loop isolator between the mixer and your computer
- Or switch to a USB audio interface which avoids this entirely

**Latency feels high**
- Deepgram's streaming mode should give <2s end-to-end
- If using Whisper, switch to Deepgram — Whisper chunks audio so latency is higher

---

## Linux-specific notes

BibleBeam uses PulseAudio (`parecord`) for audio capture on Linux. This works
on both PulseAudio and PipeWire systems (via PipeWire's PulseAudio compatibility
layer) — no extra configuration needed on Ubuntu 22.04+, Fedora 37+.

If you have multiple audio inputs (built-in mic + USB interface), select the
right one in BibleBeam Settings → Audio Input.
