import { Asset } from 'expo-asset';

import { type ClipResolver } from '@/core/speech/clipRecognizer';

import { clipManifest } from '../clipManifest';
import { clipKey } from '../lib/clipKey';

/** Resolves a prompt's bundled clip to a local file URI the recogniser can read. */
export function createClipResolver(language: () => string): ClipResolver {
  return async (expected) => {
    const module = clipManifest[clipKey(language(), expected)];
    if (module === undefined) return null;
    const asset = await Asset.fromModule(module).downloadAsync();
    return asset.localUri ?? asset.uri;
  };
}
