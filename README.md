# Big Text

Show a message in **huge letters** on your phone — a pickup sign at the airport, a note to someone behind soundproof glass, a message across a noisy room.

Part of the same app family as Mobile LaTeX, AirCopy, 农历, 漢字 and Bark (shared look and icon style).

## Features

- **Fits the screen**: the text is automatically set to the largest size that fits, on as many lines as needed (a new line in the message starts a new line on the sign). Works for Latin and Chinese/Japanese/Korean text.
- **Scroll mode**: long messages move across the screen as one big line, with adjustable speed.
- **High-contrast colors**: white/black, yellow/black, red, blue, green… — change them on the sign with 🎨.
- **Full screen & screen stays on** while the sign is shown (Fullscreen and Screen Wake Lock APIs where supported).
- **Rotate ⟳**: turn the text sideways when the phone's auto-rotate is locked.
- **Blink** to catch attention, **Mirror** for reflections (e.g. a windshield).
- **Quick phrases** and your **recent messages** (stored only on your device).
- **Share a sign**: 🔗 *Copy link* makes a link like `…/bigtext/?t=Welcome%2C%20Anna!&c=yb` that opens straight to the sign.
- **Works offline** as a PWA: add it to your home screen.

Tap the sign to show its buttons (🎨 colors, ⟳ rotate, ✕ close); the back button or Esc also closes it.

## Run locally

```bash
python3 -m http.server 8000
```

Open http://localhost:8000.

## Deploy

GitHub Pages → Settings → Pages → *Deploy from a branch* → `main`, `/ (root)`.

## License

MIT — see [LICENSE](LICENSE). The icon is original to this project.
