# Dark mode — mandatory on every artifact

Every artifact this skill produces ships both themes. Not optional, not a
"if there's time" — a report someone opens at night in the wrong theme
reads as unfinished.

## The four required pieces

1. **CSS variables on `:root` and `html.dark`** — every color a variable,
   zero hard-coded hex in component rules (the SVG-diagram case is stricter
   still: zero hex inside `<svg>` at all, see `genres.md`).
2. **A small theme toggle button** — visible, not buried in a menu.
3. **`localStorage` persistence** — the user's choice survives a reload.
4. **An apply-before-paint script in `<head>`** — runs before CSS parses,
   reads the stored preference (falling back to
   `prefers-color-scheme: dark`), and sets the class synchronously. Skipping
   this step is what causes the light-then-dark flash on load.

## Reference implementation

```html
<head>
  <script>
    (function () {
      const stored = localStorage.getItem('theme');
      const dark = stored
        ? stored === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', dark);
    })();
  </script>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #1a1a1a;
      --muted: #6b7280;
      --accent: #2563eb;
      --border: #e5e7eb;
    }
    html.dark {
      --bg: #0f0f10;
      --fg: #e8e8e8;
      --muted: #9ca3af;
      --accent: #60a5fa;
      --border: #2a2a2d;
    }
    body {
      background: var(--bg);
      color: var(--fg);
    }
  </style>
</head>
<body>
  <button id="theme-toggle" aria-label="Toggle theme">Theme</button>
  <script>
    const btn = document.getElementById('theme-toggle');
    btn.addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  </script>
</body>
```

Placement matters: the inline script MUST sit in `<head>`, before the
`<style>` block that references the variables it's flipping, and before any
visible content in `<body>`. Anywhere else and the browser paints once in
the wrong theme first.

## Interaction with ai-tells.md

This is a smaller surface than a full impulse-frontend build (no `@theme`
tiers, no DESIGN.md protocol needed for a one-off artifact) but the same
color discipline applies: one accent, off-black/off-white not pure
`#000`/`#fff`, no AI-purple gradient reflex. `impulse-frontend/references/
ai-tells.md` and `tokens.md` §6 (the Lila Rule) are the fuller version of
this same rule — read them if the artifact's accent choice is a real
decision, not just "pick blue."
