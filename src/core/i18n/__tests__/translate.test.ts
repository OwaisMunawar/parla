import { createTranslator, t } from '../translate';

describe('translate', () => {
  it('interpolates and pluralises', () => {
    expect(t('home.freeLeft', { count: 1 })).toBe('1 free conversation left today');
    expect(t('home.freeLeft', { count: 2 })).toBe('2 free conversations left today');
    expect(t('onboarding.resultTitle', { level: 'A2' })).toBe('You are starting at A2');
    expect(t('common.continue')).toBe('Continue');
  });

  it('falls back to English, then to the key, and keeps unknown placeholders', () => {
    const partial = createTranslator({ common: { continue: 'Continuar' } }, 'es');
    expect(partial('common.continue')).toBe('Continuar');
    expect(partial('common.back')).toBe('Back');
    expect(partial('common.days', { count: 3 })).toBe('3 days');
    expect(partial('nope.missing' as never)).toBe('nope.missing');
    expect(t('onboarding.resultTitle')).toBe('You are starting at {{level}}');
  });
});
