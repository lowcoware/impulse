# Legal framework — scraping a site to clone it

Not legal advice — the boundary this skill operates inside, so the agent
doesn't casually cross a line the user didn't ask it to.

## Scraping public data — hiQ v. LinkedIn, what it actually settled

The load-bearing precedent: the Ninth Circuit held platforms can't use the
CFAA (a criminal computer-fraud statute) to block scraping of data that's
publicly available to anyone on the open internet — no login wall, no
paywall. This is exactly why `SKILL.md`'s own rule ("never harvest content
behind auth or a paywall") is the actual legal boundary, not a cautious
extra: cross that line (login-gated, paid, private) and the CFAA calculus
flips from "probably fine" to real criminal-statute exposure. The case
itself ended in a private settlement (hiQ paid LinkedIn $500K, stipulated
to liability) — that settlement is NOT precedent, but the earlier Ninth
Circuit ruling on the public-data question stands and is what matters here.

**What hiQ does NOT clear:** a site's Terms of Service is a separate,
contract-law question from the CFAA, and it doesn't need a login wall to
bind you. Meta v. Bright Data confirmed a breach-of-contract claim based on
ToS can survive even when a CFAA claim fails — scraping data that's
technically public can still be a ToS breach with its own legal exposure,
just a different legal theory than "computer fraud."

## robots.txt and ToS — what actually obligates, and what's just signal

Neither `robots.txt` nor a passive "by using this site you agree" (browsewrap)
ToS is automatically, universally legally binding — courts are split on
browsewrap specifically, and robots.txt is a technical convention, not a
statute. But both carry real legal weight as **evidence of good/bad
faith**: ignoring a robots.txt disallow directive can be used to argue you
accessed data without authorization or acted in bad faith, even where the
directive itself isn't a law. A clickwrap ToS (you checked a box, created
an account) is a different story — almost universally enforceable as an
actual contract once accepted.

**Practical rule for this skill:** treat `robots.txt` disallow rules as a
hard stop, not a suggestion to weigh — the legal ambiguity around it is
exactly the reason to not test it. Treat any ToS the target requires
active acceptance for (account creation, explicit checkbox) as a binding
contract, full stop. A passive browsewrap ToS on an otherwise-public page
is the one case with genuine legal ambiguity — that's a call for the user
to make with their own counsel, not this skill to route around silently.

## Assets, design, and copyright — separate from the scraping question

Copyright on the SITE'S OWN assets (photography, copy, brand marks,
proprietary code) is untouched by hiQ or robots.txt entirely — those cases
are about ACCESS to data, not ownership of what's found there. This is why
`assessment.md`'s brand-residue check and `SKILL.md`'s "assets and brand
remain the owner's" rule are a completely separate boundary from the
scraping-legality question above, not the same rule restated: you can be
fully within your rights to access and observe a page, and still have no
right whatsoever to reuse its photography, copy, or brand identity in
anything that ships.

[Jenner & Block: hiQ v. LinkedIn, Ninth Circuit reaffirms narrow CFAA reading](https://www.jenner.com/en/news-insights/publications/client-alert-data-scraping-in-hiq-v-linkedin-the-ninth-circuit-reaffirms-narrow-interpretation-of-cfaa) ·
[ByteTunnels: is robots.txt legally binding](https://bytetunnels.com/posts/is-robots-txt-legally-binding-scraping-law-explained/) ·
[cloro: website scraping legal 2026, US + EU rules](https://cloro.dev/blog/website-scraping-legal/)
