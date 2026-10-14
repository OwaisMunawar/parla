# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-14

### Added

- Onboarding: language and goal, a five-question placement (listening and speaking) that sets a CEFR starting level, a daily XP goal, a reminder time and a soft paywall.
- Conversation practice: three scenarios in Spanish, French and Italian, hold to talk with a live waveform and interim transcript, spoken tutor replies, inline corrections with explanations and "add to review".
- Tutor behind one interface: a scripted tutor that runs offline, and a server tutor (`server/`) using AI SDK structured output with any provider, streamed as NDJSON.
- Pronunciation drills scored per word from a word-level alignment of the target sentence against the recogniser's output and its confidence.
- FSRS review (ts-fsrs) of saved corrections and vocabulary, with spoken answers and interval previews on each grade.
- Progress: streak with freeze tokens, XP, a weekly chart, words learned and CEFR level progress.
- StoreKit 2 and Play Billing through expo-iap, an optional RevenueCat adapter, a local StoreKit configuration wired into the iOS scheme, entitlement state machine, restore and manage subscription.
- Free tier of three conversations a day; Pro adds unlimited conversations and larger review packs.
- iOS home-screen streak widget (expo-widgets) and a daily reminder (expo-notifications).
- Demo mode with a seeded fictional learner and bundled audio clips for every Spanish speaking prompt.
- CI for format, lint, types, tests with a coverage gate, expo-doctor and native builds for both platforms.
