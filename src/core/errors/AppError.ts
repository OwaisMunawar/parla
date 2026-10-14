/**
 * Every failure the UI reacts to carries a code. Screens switch on the code,
 * never on message text, so copy can change without changing behaviour.
 */
export const ErrorCodes = [
  'DB_MIGRATION_FAILED',
  'NOT_FOUND',
  'SPEECH_PERMISSION_DENIED',
  'SPEECH_UNAVAILABLE',
  'SPEECH_NO_MATCH',
  'SPEECH_FAILED',
  'TUTOR_UNAVAILABLE',
  'TUTOR_INVALID_OUTPUT',
  'TUTOR_FAILED',
  'BILLING_UNAVAILABLE',
  'BILLING_PRODUCT_NOT_FOUND',
  'BILLING_CANCELLED',
  'BILLING_PENDING',
  'BILLING_FAILED',
  'QUOTA_EXCEEDED',
  'CANCELLED',
  'UNKNOWN',
] as const;

export type ErrorCode = (typeof ErrorCodes)[number];

export class AppError extends Error {
  override readonly name = 'AppError';
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
  }
}

export function isAppError(error: unknown, code?: ErrorCode): error is AppError {
  return error instanceof AppError && (code === undefined || error.code === code);
}

/**
 * Normalises anything thrown (native module errors cross JSI as plain objects
 * or strings) into an AppError, keeping the original as the cause.
 */
export function toAppError(error: unknown, fallback: ErrorCode, message?: string): AppError {
  if (error instanceof AppError) return error;
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return new AppError(fallback, message ?? detail, { cause: error });
}
