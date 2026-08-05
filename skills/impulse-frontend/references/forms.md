# Forms

Extends `components.md`'s 8-state model and form anatomy, and the
double-submit bug in `ai-bug-patterns-fe.md` — don't re-derive those.

1. **Stance:** vee-validate + `@vee-validate/zod` — the Zod schema is the
   single source of truth for shape/types; vee-validate owns field
   registration, dirty/touched, submit lifecycle. Don't hand-roll a
   validation state machine.
2. **Multi-step:** keep ONE `useForm()` instance mounted for the whole
   wizard, swap the active Zod schema per step (fields unregister/register
   on swap) — mounting a fresh form per step loses dirty/touched across
   steps.
3. **Field arrays:** `useFieldArray`, never `v-for` over a plain local array
   with manual `push`/`splice` — that loses per-row validation/touched and
   reintroduces the `:key="index"` bug (`ai-bug-patterns-fe.md`).
4. **Unsaved-changes guard:** surface `meta.dirty` for a route-leave guard.
5. **Server-side field errors:** map them back onto vee-validate's per-field
   error state (not a blanket toast) so `components.md`'s inline-error rule
   holds for async validation failures too.
6. **Never re-ask entered data** (WCAG 3.3.7 Redundant Entry, Level A):
   email-confirm / password-confirm-by-retyping fields are a fail — validate
   the single field properly and never block paste.
7. **Error styling off `:user-invalid`, never `:invalid`** — red borders on
   first paint before the user touched anything is the loudest
   untested-validation tell. Timing: validate on first blur after edit;
   once a field is invalid, switch it to per-input re-validation so the
   error clears the moment the value becomes valid.
8. **Error summary on submit** (multi-error forms): heading-led container,
   `tabindex="-1"`, move focus to it — and NO `role="alert"` on the summary
   (double-announces); `role="alert"` is for inline field errors only.
9. **Numeric-looking inputs:** `<input type="text" inputmode="numeric"
   pattern="[0-9]*">` for ZIP/OTP/card numbers. `type="number"` is wrong
   there — spinners, stripped leading zeros, locale decimal traps.
10. **Field count isn't linear, it's a cliff.** Measured conversion by
    field count: ~23% at 3 fields, ~17% at 5, then it collapses — ~11% at
    7, ~7% at 10+. Every field past 5 costs roughly 2.8 points of
    conversion, not the same marginal cost as fields 1-5. Chunking the same
    field count into visually shorter multi-step screens measurably beats
    one long form with identical fields — perceived length, not just actual
    field count, drives abandonment. Autofill matters as much as field
    count: forms complete ~35% faster and abandon ~75% less when autofill
    actually fires, which is why input `autocomplete` attributes
    (`name`/`email`/`street-address`/etc., not left blank or set to
    `"off"`) are a conversion lever, not just a convenience nicety.
    [Zuko/DigitalApplied: form conversion-rate benchmarks 2026](https://www.digitalapplied.com/blog/form-conversion-rate-benchmarks-2026-data-points)

11. **Input font-size floor: 16px on mobile.** Any text/email/number input
    styled below 16px triggers iOS Safari's auto-zoom on focus (it zooms
    the viewport to make the text legible, then the user has to manually
    zoom back out). Set the base input font-size to `1rem`/16px minimum on
    mobile breakpoints even when the surrounding design uses a smaller
    scale for labels/hints — this is a platform behavior, not a design
    preference, and there's no override.

Source: [vee-validate + Zod](https://vee-validate.logaretm.com/v4/integrations/zod-schema-validation/);
rules 6-9 from nexu-io/open-design craft/form-validation.md (Apache-2.0), re-expressed.
