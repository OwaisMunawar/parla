# Contributing

Thanks for taking a look. Parla is small enough to read in an afternoon; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) is the map.

## Setup

```sh
npm ci
cp .env.example .env.local     # EXPO_PUBLIC_DEMO=1 seeds a fictional learner
npx expo run:ios               # or run:android; Expo Go cannot run speech recognition, IAP or widgets
```

The tutor server is optional. Without `EXPO_PUBLIC_TUTOR_URL` the app uses the scripted tutor.

```sh
TUTOR_MODEL=openai/gpt-5-mini AI_GATEWAY_API_KEY=... npm run server
EXPO_PUBLIC_TUTOR_URL=http://localhost:8787 npm start
```

## Before opening a pull request

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
```

CI runs the same commands plus `expo-doctor`, then builds the iOS simulator app and the Android debug APK.

## Ground rules

- Domain code under `src/**/lib/` stays free of React and native imports (ESLint enforces it). If a change needs the platform, put it behind an interface and wire it in `src/composition/`.
- Scoring, scheduling, streak, quota and entitlement changes need tests. The coverage gate is 90% of lines.
- Migrations are append-only. Never edit a shipped one.
- The app talks to the network from one file, `serverTutor.ts`; ESLint guards it.
- UI strings go through `src/core/i18n/en.ts`. Target-language content lives with its feature.
- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`).

## Adding a scenario

1. Add it to `src/features/conversation/content/<language>.ts` with steps, hints and the mistakes the scripted tutor should catch.
2. Run `npx tsx scripts/make-demo-clips.ts` on macOS to regenerate the demo clips for Spanish prompts.
3. The content test checks every scenario against the server contract and compiles every pattern.

## Testing purchases

See [Monetisation](README.md#monetisation) in the README: run the app from Xcode so the `Parla.storekit` configuration in the scheme is active.
