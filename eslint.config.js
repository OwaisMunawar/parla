// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

// The only app module that talks to the network. Everything else (speech,
// scoring, review, billing state) runs on the device.
const SERVER_TUTOR = 'src/features/conversation/engine/serverTutor.ts';

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*', 'ios/*', 'android/*', 'server/dist/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'server/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['server/src/main.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [SERVER_TUTOR, 'src/composition/**', 'src/**/__tests__/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map((name) => ({
          name,
          message: `Parla only reaches the network from ${SERVER_TUTOR}. See docs/ARCHITECTURE.md.`,
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'expo/fetch', message: `Network access lives in ${SERVER_TUTOR}.` },
            { name: 'ai', message: 'The AI SDK runs on the server, never in the app bundle.' },
          ],
        },
      ],
    },
  },
  {
    // Domain code stays framework-free: it runs in plain Node, in the widget
    // snapshot builder and in the server, without pulling in UI modules.
    files: ['src/**/lib/**/*.ts'],
    ignores: ['src/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@shopify/*'],
              message: 'lib/ is pure TypeScript. Move platform code to data/ or engine/.',
            },
          ],
        },
      ],
    },
  },
]);
