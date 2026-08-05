# Speech — TTS/STT services

Building transcription/synthesis services. Transport (WS lifecycle,
backpressure, reconnect) lives in `impulse-backend/references/realtime.md` —
cross-ref it; this owns the audio/model layer.

## STT

1. **Streaming vs batch:** streaming (WS, partial transcripts) for live use
   (voice agents, captions) needing sub-second feedback; batch (upload) for
   post-hoc audio — simpler, cacheable, retries cleanly. Don't build
   streaming when batch's latency is invisible to the use case.
2. Vosk is streaming-native (Kaldi emits partials per chunk); Whisper is
   batch-only by design — "streaming Whisper" forks buffer N seconds and
   re-run inference (+1-2s), not true incremental decoding. Vosk for real
   partials; Whisper (API or self-hosted faster-whisper) for batch or
   near-real-time-is-fine.
3. **VAD is not optional for streaming** — without voice-activity detection,
   silence gets decoded as audio, wasting compute and producing hallucinated
   partials. Silero VAD (~4x fewer errors than webrtcvad at matched FP rate)
   for segment boundaries. Chunk on VAD-confirmed segments (~100-250ms
   decode windows), not a fixed timer — fixed chunks split mid-word.
4. **Sample-rate mismatch is the classic silent bug.** Whisper hard-requires
   16kHz mono PCM; feeding 8kHz/44.1kHz doesn't error — it produces garbage/
   truncated output. Resample explicitly at ingest (`ffmpeg -ar 16000 -ac
   1`); never trust the client's declared format. Any STT ingest path with
   no explicit resample step is a review finding.

## Self-hosted STT sizing

1. Model size is an accuracy/RAM trade, not a free upgrade. RU Vosk small
   (~45MB, ~300MB RAM) vs large (~1.5GB, up to 16GB RAM) — pick by measured
   WER on real audio, not a leaderboard.
2. Vosk is CPU-only by design; Whisper/faster-whisper want GPU
   (faster-whisper INT8 ≈ 4x lower latency, ~half the VRAM of vanilla).
3. **One model instance serving many WS connections is the bottleneck** —
   inference serializes per request. Scale via multiple worker processes
   (per-core/per-GPU), not more WS handlers on one model. Bound concurrency
   with a semaphore/capped queue — GPU footprint per worker ≈ 2x model size
   (CUDA context + buffers).
4. Self-host beats API past ~a few hundred transcription-hours/month, or
   when audio can't leave infra (privacy-mandated RU voice). Below that, the
   managed API is cheaper once ops time is priced in.

## TTS (ElevenLabs)

1. **Cache by `hash(text + voice_id + model + params)`**, not text alone —
   billed per character, so any repeated phrase (greetings, the aki.dev
   guide segments) generated twice is pure waste. The audio guide is a
   batch/cache case, not streaming.
2. Streaming (WS) lowers *perceived* latency (first chunk plays while later
   generate), not inference latency — prefer it for interactive; full-file
   for cacheable content generated once.
3. Rate limits are concurrency-based (idle WS conns are cheap). Circuit-break
   on sustained 429s (same shape as aiogram flood control), not blind retry.
4. Pre-validate text length against the model limit client-side before
   sending.

## AI-typical speech-code bugs

- **Blocking STT/TTS inference in an `async def`** — decode is CPU/GPU-bound
  sync work; route through `asyncio.to_thread`/`ProcessPoolExecutor` or a
  worker, never awaited in place (`impulse-backend/references/hardening-python.md`).
- **Unbounded concurrent transcription jobs OOM the host** — cap with a
  semaphore/bounded pool that rejects or queues.
- **No timeout on model inference** — a hung decode blocks a worker slot
  forever; wrap every inference in an explicit deadline (`asyncio.wait_for`).
- **Audio files not cleaned up** — temp WAVs + cached TTS output fill the
  disk; delete-on-success + a TTL sweep for orphans from failed requests.

Sources: [ElevenLabs latency](https://elevenlabs.io/docs/eleven-api/concepts/latency) ·
[Vosk models (RU sizes/WER)](https://alphacephei.com/vosk/models) ·
[faster-whisper](https://github.com/SYSTRAN/faster-whisper) ·
[Silero VAD](https://github.com/snakers4/silero-vad) ·
[Habr: offline RU voice (Vosk, hardware lessons)](https://habr.com/ru/companies/wirenboard/articles/965856/)
