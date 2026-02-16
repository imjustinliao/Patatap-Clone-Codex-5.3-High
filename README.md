# Patatap Clone

This is an experiment project built using Codex (GPT-5.3 High) in a single prompt to clone the famous app Patatap (for learning and exploration).

Feel free to fork, remix, and build on top of it for open source purposes.

## The Prompt (verbatim)

```
Now, create a project folder named: patatap clone that basically clones whatever the website https://patatap.com/ has. It's a web app that has multiple modes of sound effect experience when you click on the screen which is seperate into 30 blocks (look up their codes by inspecting). Each representign one sound effect. While on bottom right corner block, you can switch mode (or like theme) for a different sound effect theme (they have 5, loop when you keep clicking). Note, every click of a block has its own sound and VISUAL effect unique to each using geometry, color, and animation. Each theme has a different background color. User should be able to see the clicking. 

Now clone this entier project.
```

## Follow-up Prompt (verbatim)

```
On patatap app, you can tap like multiple blocks if you mouse click and hover, now you can only do one at a time for this clone, fix that.
```

## What It Does

Interactive full-screen web app inspired by Patatap:

- 30 clickable/tappable blocks (6x5 grid)
- 29 sound pads with unique sound + visual behavior
- Bottom-right block cycles through 5 themes
- Theme-specific sound synthesis, color palette, and background
- Keyboard support (`1-0`, `q-p`, `a-l`, `z-m` for pads, `m` for mode switch)

## Tech Stack

- HTML (single page)
- CSS (Grid layout + animations)
- Vanilla JavaScript (no framework)
- Web Audio API (synthesized sounds, no audio files)
- Canvas 2D (visual FX rendering)
- No dependencies, no build step

## Run

Open `/Users/justin-liao/CS Projects/temp/Test/patatap clone/index.html` in a browser.

No build step is required.

## Notes

- Audio starts on first user gesture because browsers require interaction for Web Audio.
- `MODE` block loops through all 5 themes.

## License

MIT. See `/Users/justin-liao/CS Projects/temp/Test/patatap clone/LICENSE`.
