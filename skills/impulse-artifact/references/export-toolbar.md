# export-toolbar.md: copy/PNG/PDF export for a self-contained artifact

Source: extracted from Cocoon-AI/architecture-diagram-generator (harvested
GitHub skill, MIT), generalized beyond diagrams — any artifact genre can
carry this (reports, diagrams, plans). Not a default: add it only when the
user is likely to want the artifact outside the chat (share, paste into a
doc, print).

## Lane 0 — native `window.print()` + `@media print` (try this first)

Before reaching for either lane below: if the artifact is text-first (a
report, a plan) and the only need is "let the user print or save as PDF,"
a print stylesheet plus a plain `Export PDF` button calling
`window.print()` satisfies SKILL.md rule 6's "no external dependencies"
in the strictest sense — nothing beyond what the browser ships natively,
no CDN script at all. Write a `@media print` block that hides the
artifact's own chrome (nav, toolbar, the export button itself) and sets
sane page margins; that's the whole implementation. This is the right
default for the common case and should be tried before either CDN-based
lane below, not as a fallback when they're unavailable.

Reach past it only when its real limits actually bite:
- **Dark-mode canvas fidelity** — browser print dialogs don't reliably
  reproduce a dark background/canvas (some force light backgrounds,
  users can override print color settings) → Lane 1 (bitmap capture)
  sidesteps this by capturing the rendered pixels directly.
- **One-click copy-to-clipboard, or a PNG file specifically** — native
  print has no clipboard path and outputs a PDF (or a print-preview),
  never a standalone image → Lane 1.
- **Selectable/searchable text in the exported PDF with precise layout
  control beyond what `@media print` gives** (a long structured report
  where the user will search/copy from the PDF) → Lane 2 (WeasyPrint),
  see below.

## Lane 1 — bitmap capture (html2canvas + jsPDF)

Browser print dialogs add browser chrome the user has to strip manually
and (per Lane 0's caveat) don't always reproduce a dark canvas faithfully.
Capturing the container as a bitmap (`html2canvas`) and feeding that
bitmap into a one-page PDF (`jsPDF`) sidesteps both problems and gives a
copy-to-clipboard path native print never had — at the cost of needing
two CDN scripts (see SKILL.md rule 6's exception for this specific case).

## Structure

1. Give the artifact's outermost wrapper a stable id (`id="report-container"`
   or similar) — this is the exact rect that gets captured.
2. A collapsed `⋯` toggle, usually top-right of the header. Click reveals
   three actions: 📋 copy PNG to clipboard, 🖼️ download PNG, 📄 download PDF.
   Collapsed by default so it doesn't compete with the artifact's own chrome.
3. All three actions call `html2canvas` on the same rect with `scale: 2`
   (bump to 3-4 for print-quality output), the toolbar itself excluded from
   the capture via `ignoreElements`, and a small breathing-room padding
   (~32px) added around the captured content.

## CDN + integrity (mandatory when pulled from CDN)

Pin exact versions and set Subresource Integrity hashes — an artifact that
loads unpinned CDN scripts is a supply-chain risk the moment that CDN is
compromised:

```html
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
        integrity="sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"
        integrity="sha384-en/ztfPSRkGfME4KIm05joYXynqzUgbsG5nMrj/xEFAHXkeZfO3yMK8QQ+mP7p1/"
        crossorigin="anonymous"></script>
```

If the version is bumped, recompute the hash — do not carry an old hash
forward onto a new file.

## Script skeleton

```js
function captureRect() {
  const el = document.getElementById('report-container');
  const rect = el.getBoundingClientRect();
  const pad = 32;
  return html2canvas(document.body, {
    x: rect.left - pad, y: rect.top - pad,
    width: rect.width + pad * 2, height: rect.height + pad * 2,
    scale: 2,
    ignoreElements: (node) => node.classList?.contains('toolbar'),
  });
}

async function copyAsImage() {
  const canvas = await captureRect();
  canvas.toBlob((blob) => {
    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
}

async function downloadPNG() {
  const canvas = await captureRect();
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'artifact.png';
  a.click();
}

async function downloadPDF() {
  const canvas = await captureRect();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px', format: [canvas.width, canvas.height],
  });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save('artifact.pdf');
}
```

```css
.toolbar { position: absolute; top: 1rem; right: 1rem; }
.toolbar-actions { display: none; }
.toolbar.open .toolbar-actions { display: flex; gap: 0.5rem; }
@media print { .toolbar { display: none !important; } }
```

## Second lane — real-text PDF for text-first artifacts

The bitmap path above is right for anything visual (diagram, dashboard,
prototype) where pixel fidelity matters more than the text being
selectable. For a text-first artifact (a report, a plan, a long-form
write-up) where the user actually wants to select/search/copy text from
the exported PDF, a bitmap-embedded-in-PDF is the wrong tool — the text
becomes an image, unselectable and unsearchable.

For that case, render real HTML/CSS directly to PDF instead of screenshotting
it: WeasyPrint (or headless Chrome's own print-to-PDF as a fallback) with a
dedicated print stylesheet (`@page` margins, `break-inside: avoid` on
cards/tables, print-safe colors since some renderers ignore `background`
without `-webkit-print-color-adjust: exact` / `print-color-adjust: exact`).
If the content includes CJK text, verify the output isn't garbled by
extracting text back out of the generated PDF and eyeballing it — a
font-embedding gap silently drops or mangles CJK glyphs in some
HTML-to-PDF renderers, and it's easy to ship without noticing since the
PDF still *looks* fine at a glance in some viewers.

**Honest escalation, not a silent downgrade:** if the artifact needs live
browser JS or interactive charts, this real-HTML PDF path is the wrong
one — say so and recommend the bitmap/`html2canvas` lane (or a headless-
browser print) instead of shipping a PDF that's silently missing the
interactive parts.

## Caveats

- Clipboard write needs a secure context (https / localhost / file://) and a
  user gesture — don't call `copyAsImage` from a non-click handler.
- `<foreignObject>` inside inline SVG renders inconsistently under
  `html2canvas` — for artifacts that lean on this toolbar, stick to plain
  `<svg>` shapes and `<text>`, not HTML-in-SVG.
- This is JS-in-artifact, so it only applies where the genre already allows
  scripted interactivity (dashboard, diagram, prototype) — a genre gated to
  static-only stays static; don't bolt this on to satisfy an unrelated ask.
