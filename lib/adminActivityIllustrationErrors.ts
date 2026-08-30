export class IllustrationBackendUnavailableError extends Error {
  constructor() {
    super("Illustration tools aren't available in this environment yet.");
    this.name = 'IllustrationBackendUnavailableError';
  }
}

export class IllustrationAdminError extends Error {
  constructor(message = 'Illustration tools could not complete this request.') {
    super(message);
    this.name = 'IllustrationAdminError';
  }
}

export function isIllustrationBackendUnavailable(error: unknown) {
  return error instanceof IllustrationBackendUnavailableError;
}

export function classifyStateRpcError(error: any): Error {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase();
  if (
    error?.code === 'PGRST202' &&
    text.includes('get_admin_activity_illustration_state') &&
    (text.includes('schema cache') || text.includes('could not find the function'))
  ) return new IllustrationBackendUnavailableError();
  return new IllustrationAdminError('Illustration status is temporarily unavailable.');
}

export async function classifyIllustrationFunctionError(error: any): Promise<Error> {
  if (error?.context instanceof Response) {
    if (error.context.status === 404) return new IllustrationBackendUnavailableError();
    try {
      const payload = await error.context.clone().json();
      if (payload?.error === 'ILLUSTRATION_INFRASTRUCTURE_UNAVAILABLE') {
        return new IllustrationBackendUnavailableError();
      }
      if (payload?.error === 'GENERATION_RATE_LIMITED') {
        return new IllustrationAdminError('Illustration generation is temporarily rate limited.');
      }
      if (payload?.error === 'APPROVAL_CONFLICT') {
        return new IllustrationAdminError('Illustration state changed. Refresh before approving.');
      }
    } catch {
      // Never surface raw Edge/PostgREST response text to the Admin UI.
    }
  }
  return new IllustrationAdminError();
}
