# Kulsum — Love Site

A single-page, GitHub Pages–ready website with an iOS-style passcode lock, a live count-up since 13 December 2024, a daily poem (never repeating for the same date) with line-by-line typing, a quote of the day, elegant glassmorphism, and lightweight 3D interactions.

## Features
- iOS-like passcode screen with a glass “iPhone” and keypad. Passcode: **130206**.
- Autoplays music after unlock (due to user interaction, this works in modern browsers). Put your track at `assets/music.mp3`.
- Live time since **13 December 2024** (adjust in `index.html` if needed).
- **Poem of the Day** — procedurally composed in classical Arabic/Urdu styles (Ghazal, Nazm, Qasida, Rubāʿī, Free Verse). Each line types in, fading as if written.
- **Quote of the Day** — loaded from `data/quotes.json` deterministically per day.
- Rotating themes inspired by iOS design, with floating orbs and 3D tilt.
- Works as a static site (no build tools), perfect for GitHub Pages.

## How to use
1. Replace `assets/music.mp3` with your actual song (keep the same filename).
2. Optionally edit `data/quotes.json` to add more quotes.
3. Edit the nicknames in the inline `NICKNAMES` array inside `index.html` if you want.
4. **Deploy on GitHub Pages:** Create a repo, add these files to the root, commit, then enable Pages in Settings → Pages → Source: `main` branch `/ (root)`.
5. Open your Pages URL. Enter `130206` to unlock.

## Notes on “never repeat”
- The poem is generated uniquely from the **full date** (YYYY-MM-DD); the same calendar date will always create the same poem so it won’t repeat across different days. To truly never repeat for centuries, keep expanding the generator lists or add more styles.
