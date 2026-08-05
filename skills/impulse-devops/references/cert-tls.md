# Traefik ACME / TLS

1. **Challenge type by need:** HTTP-01 (needs port 80 reachable, simplest,
   no wildcards); TLS-ALPN-01 (port 443, no wildcards); DNS-01 (the only one
   for wildcards, works behind NAT/firewall, but needs DNS-provider API
   creds — another secret tier, `impulse-security/references/secrets.md`).
2. **Validate against staging first.** Set `caServer` to
   `acme-staging-v02.api.letsencrypt.org` while iterating on resolver
   config. Prod rate limit is 50 certs/registered-domain/week and
   non-overridable — a misconfigured resolver looping renewal attempts burns
   the weekly quota and locks you out for days.
3. `acme.json` on a named volume, **mode 600** (Traefik refuses to start on
   looser perms — 644/660/777 all fail), and backed up — container
   recreation without a persisted `acme.json` re-requests every cert from
   scratch against that same rate limit.
4. **Silent renewal failure is a design assumption, not an edge case.**
   Traefik logs renewal failures quietly; nobody tails logs until the
   outage. A real case ran to 11 months on a 1-year cert before a CA email
   surfaced it. **Alert on days-to-expiry (< 14), not on renewal-error log
   lines** — external TLS-handshake check (Prometheus blackbox exporter's
   `probe_ssl_earliest_cert_expiry`), independent of Traefik's own health.
   The inverse failure is just as real: a 2026 incident took 14,000+
   services across 3 regions offline for 127 minutes when a cron job's
   renewal window got tightened from 30 days to 2 hours (an undocumented
   "save on API calls" change) with no rate-limit check and no backoff —
   it burned the weekly duplicate-cert quota in under 2 minutes flat, 47
   minutes before the actual renewal was even due. Rule this adds: any
   automated renewal script needs its OWN rate-limit awareness and backoff,
   not just trust that "it only renews when needed" — a config change to
   the renewal window is exactly the kind of edit that slips past review
   because it looks like a harmless optimization.
   [johal.in: Let's Encrypt rate-limit postmortem, 2-hour outage](https://johal.in/postmortem-lets-encrypt-rate-limit-prevented-certificate-renewal/)
5. Router labels use `traefik.http.routers.X.tls.certresolver=myresolver`;
   resolver storage `--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json`.

Traefik middleware (rate-limit/CORS/headers) and Traefik CVEs live in
`impulse-security/references/edge.md` — this file owns cert automation only.

Sources: [Traefik ACME docs](https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/) ·
[Let's Encrypt rate limits](https://letsencrypt.org/docs/rate-limits/) ·
[blackbox cert-expiry alerting](https://promlabs.com/blog/2024/02/06/monitoring-tls-endpoint-certificate-expiration-with-prometheus/)
