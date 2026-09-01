# Arcon Learning App

Static multi-page Arcon learning app for English-speaking learners.

## Local testing

ES modules require HTTP. Run `python3 -m http.server 8000` in this folder, then open `http://localhost:8000/`.

## GitHub Pages

Upload the project contents to a repository and enable GitHub Pages for the branch/folder containing these files.

## Included
- Multi-page `index.html` + `lesson.html`
- Ordered unified lesson JSON arrays
- `%word%`, `~word~`, and conditional suffix placeholders
- `localStorage` progress abstraction
- 3 visual hearts with no hard fail
- Choice, match, and write exercises
- English Web Speech API approximation with manual override hook
- Light/dark mode via `prefers-color-scheme`
- No translator, XP, streaks, or Telegram integration

TTS is explicitly best-effort: available English browser voices differ by device/browser.
