# Architecture

Parla is an Expo development build with a small optional server. This document is the map, followed by the decisions that shaped it and the alternatives that were turned down.

## Map

```
src/
  app/                  Expo Router routes. Each file renders one feature screen.
  composition/          The composition root: AppServices, native and test wiring, app-wide effects.
  core/
    clock/              Clock interface, system and manual clocks.
    content/            Languages and CEFR levels.
    db/                 SqlDriver interface, expo-sqlite driver, migrations.
    errors/             AppError with codes.
    hooks/              useQuery, useStore.
    i18n/               English UI strings and a typed translator.
    lib/                Pure helpers: day keys, edit distance, ids, stores.
    speech/             SpeechRecognizer and Speaker interfaces and their implementations.
    theme/, ui/         Design tokens and the component library.
  features/
    onboarding/         Placement scorer, profile repository, onboarding screens.
    conversation/       Tutor interface, scripted and server tutors, the session state machine, scenarios.
    pronunciation/      Tokeniser, word alignment, scoring, the speaking attempt engine, drills.
    review/             FSRS wrapper, queue order, review repository and service.
    progress/           Streak and XP logic, progress service, reminders, charts.
    billing/            Billing interface, expo-iap and RevenueCat adapters, entitlement machine, quota, paywall.
    widget/             Widget snapshot builder and the expo-widgets layout.
    demo/               Fictional learner, seed, clip manifest.
server/                 The tutor API (Node, AI SDK 7).
store/Parla.storekit    Local StoreKit configuration.
plugins/                Config plugin that wires the StoreKit configuration into the iOS scheme.
```

Inside a feature, folders mean the same thing everywhere:

| Folder                              | Contains                                              | May import                                 |
| ----------------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `lib/`                              | Pure TypeScript: rules, state machines, scoring       | other `lib/`, `core/lib`, `zod`, `ts-fsrs` |
| `data/`                             | Repositories over `SqlExecutor`, thin native adapters | `lib/`                                     |
| `engine/`                           | Services that combine repositories, ports and rules   | `lib/`, `data/`, interfaces                |
| `components/`, `screens/`, `hooks/` | React                                                 | anything above                             |

ESLint enforces the first row: `lib/` cannot import React, React Native, Expo or Skia.

## Dependency injection

`AppServices` is built once by `createNativeServices()` (device and simulator) or `createTestServices()` (Jest), and handed down by `ServicesProvider`. Both call `assembleServices(ports)`; they differ only in the ports:

| Port                | Native                                                                           | Test / demo              |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------ |
| `Clock`             | system clock                                                                     | manual clock             |
| `SpeechRecognizer`  | expo-speech-recognition, with bundled clips in demo mode and a scripted fallback | scripted recogniser      |
| `Speaker`           | expo-speech                                                                      | silent speaker           |
| `Tutor`             | server tutor when `EXPO_PUBLIC_TUTOR_URL` is set, else scripted                  | scripted tutor           |
| `Billing`           | expo-iap, or RevenueCat                                                          | fake billing             |
| `ReminderScheduler` | expo-notifications                                                               | no-op scheduler          |
| `SqlDriver`         | expo-sqlite                                                                      | better-sqlite3 in memory |

There are no module-level singletons in domain code. Changes are published on one typed emitter (`profile`, `progress`, `review`, `conversation`, `entitlement`); `useLiveQuery` re-reads when a topic it depends on changes.

## Decisions

### ADR-001: expo-iap, with RevenueCat as an adapter rather than the default

**Decision.** Billing is an interface. The default implementation is expo-iap 6 (StoreKit 2 on iOS, Play Billing on Android); RevenueCat is a second implementation of the same interface.

**Why.** expo-iap is an Expo module with a config plugin, so it fits CNG and the development build without extra native setup, and it exposes StoreKit 2 directly: verified transactions, renewal info, grace period dates, and the intro offer on each purchase. That is enough to drive the entitlement machine on device. RevenueCat is excellent when a team wants server-side receipts, webhooks and cross-platform entitlements without running a server, so it is supported, but making it the default would hide the StoreKit work this project exists to show and add a vendor account to every clone.

**Rejected.**

- _react-native-iap_: the same OpenIAP API family, but a bare React Native library rather than an Expo module; expo-iap is the maintained Expo path from the same authors.
- _RevenueCat only_: hides the store behind a dashboard and requires an account and API key to run the paywall at all.
- _Hand-written StoreKit 2 module_: possible, but it duplicates what expo-iap already does well and needs a Play Billing twin.

### ADR-002: on-device speech recognition first, cloud as the fallback, scripted only when there is no recogniser

**Decision.** The recogniser requests on-device recognition whenever the platform reports it. Start-up failures (no on-device model, a recogniser that is momentarily unavailable after it is created, an audio session still held by text to speech) are retried once as-is and once on the platform's server recogniser. If the platform recogniser never produces a result in the session, the app falls back to the scripted recogniser and labels every transcript with it.

**Why.** Speech is personal data. On device, a learner's voice never leaves the phone, latency is lower and there is no per-request cost. Apple's and Google's recognisers both return per-segment confidence (iOS) or word segments (Android 14+), which is what pronunciation scoring needs. Demo mode feeds bundled clips to the same recogniser as an audio file, so a simulator exercises the real recognition path.

**Rejected.**

- _Whisper (cloud or on device)_: strong transcripts, but no per-word confidence from the hosted API, a large model download on device, and no streaming interim results in the hold-to-talk loop.
- _Cloud speech APIs (Google, Azure) as the default_: pronunciation assessment features exist, but every utterance leaves the device and needs a key. They fit behind the same interface later.

### ADR-003: FSRS over SM-2

**Decision.** Review scheduling uses FSRS through ts-fsrs, wrapped in [`scheduler.ts`](../src/features/review/lib/scheduler.ts). Schedules are stored as plain numbers, grades are words, and the wrapper is the only file that imports the library.

**Why.** FSRS models stability and difficulty per card and targets a requested retention (0.9 here). Published benchmarks on large review datasets show it needs fewer reviews than SM-2 for the same retention, and it handles late reviews sensibly, which matters for an app people open irregularly. Short-term learning steps are on, so a phrase you get wrong comes back within minutes, not tomorrow.

**Rejected.**

- _SM-2 / Anki's original algorithm_: simple, but its fixed ease factors punish early mistakes for the life of a card ("ease hell").
- _Leitner boxes_: easy to explain, too coarse for mixed phrase and vocabulary cards.

### ADR-004: pronunciation scoring from recogniser output, not phonemes

**Decision.** Score words from two signals the recogniser already provides: whether it heard the target word (a word-level Levenshtein alignment with a cheaper near-miss substitution) and how sure it was (segment confidence). See the README's scoring section.

**Why.** It works offline, in every language the platform recogniser supports, with no model to ship and no cost per attempt, and it is fully testable as pure functions. Biasing the recogniser with the target sentence keeps it fair: a word that is still misheard with the hint is a word a listener would struggle with.

**Rejected.**

- _Phoneme alignment with an acoustic model_ (e.g. wav2vec 2.0 + forced alignment): the gold standard, but a large per-language model and native inference work. It is on the roadmap as an upgrade behind the same `PronunciationResult` shape.
- _Cloud pronunciation assessment_ (Azure): accurate, but sends audio off device and needs a key per user session.
- _Character-level diff of the whole transcript_: one dropped word shifts every comparison after it; word alignment does not.

### ADR-005: quota and entitlement design

**Decision.**

- Entitlement is a pure state machine (`none → trial → active → grace → expired`) driven by store events. The last state is cached in SQLite so Pro survives a cold start offline, and every launch and foreground re-syncs with the store, which always wins.
- When a renewing period ends and the store has not reported the renewal yet, access continues for three days (`grace`) rather than locking out a paying learner; the store's own billing grace period date is used whenever StoreKit reports one.
- The free quota counts conversations started on the learner's local calendar day, and a conversation starts when the learner first speaks, not when the screen opens. Resuming one already counted is always allowed.
- There is no receipt server. StoreKit 2 transactions arrive JWS-verified on device and expo-iap surfaces only verified ones; the `finish` step in the adapter is the seam for App Store Server API or Play Developer API checks.

**Why.** Every edge (a cancelled trial, a failed renewal, a refund, an empty restore for a learner who never subscribed) has one tested answer, instead of `if (isPro)` scattered across screens. Local-day counting matches what "three a day" means to a person, and uses the same day keys as the streak.

**Rejected.**

- _A boolean `isPro` flag_: cannot express a trial ending, a grace period or a refund.
- _Counting conversations on open_: punishes browsing, and makes the upsell feel like a trap.
- _Rolling 24-hour quota windows_: harder to explain, and inconsistent with the streak's calendar days.

### ADR-006: calendar day keys for streaks

**Decision.** Every activity stores the `YYYY-MM-DD` key of the learner's local day at the time it happened, and streak arithmetic works only on keys.

**Why.** A streak is about days the learner lived through. Converting an instant to a key once, at the edge, makes DST (a 23-hour day is still one day) and travel (yesterday's practice is not rewritten by today's zone) non-issues, and the tests prove both.

### ADR-007: one network file

**Decision.** Only [`serverTutor.ts`](../src/features/conversation/engine/serverTutor.ts) may use `fetch`; the AI SDK never enters the app bundle. ESLint enforces both.

**Why.** The model key lives on the server. The app knows a base URL, nothing else, and everything else (speech, scoring, review, billing state) runs on the device.

### ADR-008: NDJSON for the tutor stream

**Decision.** `POST /v1/turn` streams newline-delimited JSON events: `partial` (the reply text so far), then `final` (the validated, grounded turn) or `error`.

**Why.** It needs nothing beyond split-on-newline on either side, `expo/fetch` streams it on device, and a proxy that buffers the response still delivers a valid document. Model failures become an `error` event rather than a broken stream, so the app always gets an ending.

**Rejected.** _Server-sent events_: works, but needs an SSE parser on React Native for no gain here. _The AI SDK UI message protocol_: built for chat UIs with tool calls; one structured turn does not need it.
