# SEO & i18n

SEO and i18n share one file because they're the same failure surface —
hreflang/canonical/OG are SEO tags that i18n owns per-locale. Nuxt 4,
@nuxtjs/seo, @nuxtjs/i18n. Image/OG-asset optimization folds in here.

## SEO

1. `useSeoMeta()` for meta (title/description/OG/twitter) — typed, not
   typo-prone. `useHead()` only for non-flat tags (link/script/JSON-LD).
2. Site-wide invariants (title template, lang, favicon) in `app.vue`;
   per-page overrides in the page. Duplicate/missing titles across pages =
   set once at app level, override per-page only.
3. **Meta must render during SSR, not in `onMounted`/client-only.** Meta set
   client-side-only = crawlers and social scrapers (no JS) see nothing.
   Verify via view-source, not devtools.
4. OG/Twitter image = absolute URL, ≥1200×600. A relative `/og.png` gets
   silently dropped by social platforms — build the full URL
   (`useRequestURL()`/site config).
5. Canonical points to itself (or the non-query variant) — never
   cross-page, never cross-locale. Pointing canonical at a "preferred"
   different page is a de-indexing risk.
6. `@nuxtjs/seo` bundles sitemap/robots/og-image/schema.org — install once,
   don't also hand-roll `public/robots.txt` (the static one silently wins).
7. Generate OG images via a dedicated route (`defineOgImage()`), not
   `<NuxtImg>` — the responsive srcset pipeline gives scrapers the wrong
   crop/dimension. For content images: `<NuxtPicture>` with `format`
   (avif/webp first, fallback last) + per-breakpoint `sizes`; don't rely on
   defaults (`ai-bug-patterns-fe.md`'s perf entries are the bug side).

## i18n

1. Routing strategy: `prefix` (all locales prefixed) for symmetric SEO;
   `prefix_except_default` when the default locale owns bare `/`;
   `no_prefix`/cookie-only is SEO-blind — crawlers can't discover other
   locales, only one ever gets indexed. Don't use `no_prefix` for a public
   site.
2. `lazy: true` + `langDir` for message chunks — without it every locale's
   full bundle ships on first load, payload bloat proportional to locale
   count.
3. SSR locale resolution order: URL prefix/domain > cookie >
   `Accept-Language`. Never resolve locale in a client `onMounted` first —
   causes an SSR/CSR hydration mismatch flash of wrong-locale content.
4. Set `baseUrl` (production origin) in i18n config — required for
   hreflang/canonical to be absolute. Missing it → hreflang emits
   relative/`localhost` URLs in prod, crawlers ignore them.
5. `useLocaleHead()` per page for hreflang + per-locale canonical. Canonical
   points to the *same-locale* URL, never to the default locale — otherwise
   non-default locales get de-indexed in favor of default.
6. **Missing translation key silently renders the raw key string in prod.**
   Set `missingWarn`/`fallbackWarn` (or a `missing` handler) to log in CI/
   staging — don't rely on eyeballing the UI.
7. Named interpolation (`{count}`), never positional (`{0}`) — positional
   breaks silently when translators reorder the sentence.

Sources: [Nuxt SEO — useSeoMeta vs useHead](https://nuxtseo.com/learn-seo/nuxt/mastering-meta) ·
[@nuxtjs/seo module](https://nuxt.com/modules/seo) ·
[Nuxt Image config](https://image.nuxt.com/get-started/configuration) ·
[Nuxt i18n routing strategies](https://i18n.nuxtjs.org/docs/guide) ·
[Nuxt i18n SEO (hreflang/baseUrl)](https://i18n.nuxtjs.org/docs/guide/seo) ·
[Vue i18n fallback/missing-key](https://vue-i18n.intlify.dev/guide/essentials/fallback)
