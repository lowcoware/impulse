# Realtime — WebSocket, SSE, and streaming

Real-time transport for Go/Python services behind Traefik, plus LLM/STT
token streaming (this file owns all streaming). gorilla/websocket blessed.
Same terse, incident-cited style as the rest of impulse-backend.

## 1. WebSocket connection lifecycle

1. **Two goroutines per connection** — one `readPump`, one `writePump`,
   talking via a channel. gorilla's contract: at most one goroutine calls
   write methods concurrently, at most one calls read — this split is the
   only safe way to get full duplex.
2. **The leak:** a handler that doesn't close on read error, or a spawned
   goroutine with no deadline, leaves `Read()` blocked forever on a dead
   client — goroutine + fd + buffers pinned until restart. Fix:
   `defer conn.Close()` at the top of `readPump`, and closing `readPump`
   must signal `writePump` to exit (closed done-chan) — a dangling
   write-side goroutine is the same leak with an extra step.
3. **Keepalive:** `SetReadDeadline(now + pongWait)` + a `SetPongHandler`
   that resets it on every pong; `writePump` pings on a `time.Ticker` at
   `pingPeriod < pongWait`. No pong in time → next read times out → close.
   Without it, TCP-idle dead peers (laptop sleep, NAT timeout) stay open
   forever.
4. Clean shutdown: send a `CloseMessage` with a deadline before dropping
   the TCP conn, so the peer gets a close frame not an RST.

## 2. Backpressure

1. **Failure mode:** slow/stalled client + unbounded per-conn send buffer =
   server memory grows without limit as the writer falls behind — a
   documented OOM pattern, not theoretical.
2. **Fix:** bounded `chan []byte` per connection (e.g. 256). On full:
   drop the message (telemetry/presence — loss ok) OR close with a
   policy-violation code (chat/events — a silent drop is worse than a
   disconnect). Never `select`-send with no `default` against an unbounded
   producer.
3. Write deadline on every `WriteMessage` (`SetWriteDeadline`) — without it
   a stuck TCP write (not just a full app buffer) blocks the writer forever,
   §1.2's leak from the other side.

## 3. Reconnect

1. Client: exponential backoff + full jitter (base ~500ms, cap ~30s,
   randomize the delay). No jitter → synchronized reconnect storm takes
   down the just-recovered server (thundering herd).
2. Resumable SSE: every event carries `id:`; the browser auto-sends
   `Last-Event-ID` on reconnect; server replays from a short-lived buffer
   (Redis list/stream, TTL ~ disconnect window) keyed by stream/user.
3. Idempotent delivery on replay is mandatory — the client may have already
   processed the last event before the drop (ack race). Reuse `events.md`
   §3 dedup keyed on `event_id`; never "trust the resume point."

## 4. Scaling stateful connections horizontally

1. A WS/SSE conn is pinned to the instance that accepted the handshake.
   Traefik sticky sessions route *reconnects* back to the same pod — that
   fixes routing, not fan-out.
2. **Naive-broadcast trap:** writing to "the" local connection list only
   reaches clients pinned to *that* instance; clients on other replicas
   silently never receive it. No error thrown — messages just vanish.
3. Fix (blessed primitive): Redis PubSub — every instance subscribes to
   the channel, publishes on local event ingest, fans out to its own
   locally-held conns on receipt. Decouples "who holds the socket" from
   "who produced the event."
4. PubSub is best-effort — an instance down at publish time never gets the
   message. Money/state-adjacent events that must survive a restart are a
   Streams + consumer-group job, not PubSub (`events.md`). Don't default to
   PubSub for durability-critical fan-out.

## 5. SSE specifics

1. Use SSE when the channel is server→client only — plain HTTP, no upgrade
   dance, works through Traefik cleanly, browser `EventSource` auto-
   reconnects with zero client code. WebSocket only when the client also
   pushes.
2. Format: `id: <n>\ndata: <payload>\n\n` (blank line ends the event);
   `Content-Type: text/event-stream`, `Cache-Control: no-cache`.
3. **Proxy-buffering trap:** a buffering proxy holds the response until a
   buffer fills — SSE becomes bursty, not real-time. Set
   `X-Accel-Buffering: no`; Traefik doesn't buffer by default but a
   compression middleware in front of the stream (gzip-on-SSE) reintroduces
   the same "wait for buffer" effect — exclude the SSE route from it.
4. Client-disconnect detection: watch `r.Context().Done()` in the write
   loop. A handler that only checks the `Write()` error won't notice a dead
   client until the OS TCP buffer fills, minutes later.

## 6. LLM token streaming

1. SSE passthrough: proxy the upstream (Claude/OpenAI) stream directly,
   don't buffer-then-rechunk — buffering doubles latency and defeats the
   point.
2. Partial-response mid-stream failure is documented, not edge-case:
   upstream can drop without a terminal `message_stop`. Treat "stream ended
   with no terminal event" as an error state, never silently render what
   arrived as complete.
3. **Client-disconnect mid-stream:** propagate the client handler's `ctx`
   into the upstream streaming call and cancel the moment the client leaves
   — providers that support cancellation stop generating/billing
   immediately; those that don't keep billing for output nobody reads.
   (Same deadline-propagation discipline as `hardening-go.md`'s gRPC rule.)
4. Backpressure: dropping tokens mid-sentence is worse than a bounded
   delay — for this stream type prefer a larger buffer + brief backoff over
   the drop policy of §2.

## 7. STT streaming

1. Audio chunks in over WS (client mic → server) — same read-pump/
   ping-pong/deadline rules as §1 apply to the audio-in socket.
2. Buffer audio into fixed windows (e.g. ~5s with silence-boundary
   extension) before feeding the recognizer — raw per-packet chunks
   fragment words at chunk boundaries (Vosk/Whisper both).
3. Emit interim (unstable) transcripts as a *distinct event type* from
   final results (Vosk's partial/final split is the reference) so the
   client renders "typing"-style partials without treating them as
   committed — collapsing the two causes text flicker/rewrite bugs.
4. The outbound transcript channel gets the same bounded-backpressure rule
   as §2 — a client can't consume infinite partials either.
5. Speech-service-specific concerns (self-hosted model sizing, TTS caching,
   sample-rate bugs) live in `impulse-ai/references/speech.md`; this file owns
   the transport, that one owns the audio/model layer.

Sources: [gorilla/websocket concurrency contract](https://pkg.go.dev/github.com/gorilla/websocket) ·
[WebSocket backpressure/memory](https://loke.dev/blog/websockets-backpressure-websocketstream-memory) ·
[Traefik WS sticky-session limitation](https://github.com/traefik/traefik/issues/8735) ·
[Redis PubSub WS fan-out](https://oneuptime.com/blog/post/2026-02-02-redis-websockets-pubsub/view) ·
[SSE behind a buffering proxy](https://oneuptime.com/blog/post/2025-12-16-server-sent-events-nginx/view) ·
[Claude streaming](https://platform.claude.com/docs/en/build-with-claude/streaming) ·
[Vosk streaming partial/final](https://github.com/alphacep/vosk-api)
