import assert from 'node:assert/strict';

import {
  classifyIllustrationFunctionError,
  classifyStateRpcError,
  IllustrationAdminError,
  IllustrationBackendUnavailableError,
} from '../lib/adminActivityIllustrationErrors.ts';

const absentRpc = classifyStateRpcError({
  code: 'PGRST202',
  message: 'Could not find the function public.get_admin_activity_illustration_state(target_activity_id) in the schema cache',
});
assert.ok(absentRpc instanceof IllustrationBackendUnavailableError);

for (const unexpected of [
  { code: '42501', message: 'permission denied' },
  { code: 'PGRST202', message: 'Could not find another_function in the schema cache' },
  { code: 'XX000', message: 'database failure with internal details' },
]) {
  const classified = classifyStateRpcError(unexpected);
  assert.ok(classified instanceof IllustrationAdminError);
  assert.doesNotMatch(classified.message, /permission|schema cache|database failure/i);
}

assert.ok(
  await classifyIllustrationFunctionError({ context: new Response('{}', { status: 404 }) })
    instanceof IllustrationBackendUnavailableError,
);
assert.ok(
  await classifyIllustrationFunctionError({
    context: new Response(JSON.stringify({ error: 'ILLUSTRATION_INFRASTRUCTURE_UNAVAILABLE' }), { status: 503 }),
  }) instanceof IllustrationBackendUnavailableError,
);
const unexpectedFunction = await classifyIllustrationFunctionError({
  context: new Response(JSON.stringify({ error: 'DATABASE_FAILURE', raw: 'private detail' }), { status: 500 }),
});
assert.ok(unexpectedFunction instanceof IllustrationAdminError);
assert.doesNotMatch(unexpectedFunction.message, /database|private detail/i);

console.log('Daily Adventures C.3A Admin error classification: PASS');
console.log('Missing exact RPC/function/storage: graceful unavailable');
console.log('Permission/integrity/database failures: sanitized unexpected error');
