import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export type AuthorizedIllustrationClients = {
  adminId: string;
  userClient: ReturnType<typeof createClient>;
  serviceClient: ReturnType<typeof createClient>;
};

export class IllustrationHttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function authorizeIllustrationAdmin(
  req: Request,
): Promise<AuthorizedIllustrationClients> {
  const authorization = req.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    throw new IllustrationHttpError(401, 'AUTHENTICATION_REQUIRED');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    throw new IllustrationHttpError(500, 'SERVER_CONFIGURATION_ERROR');
  }

  // This client is deliberately user-scoped. No service credential is read yet.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    throw new IllustrationHttpError(401, 'INVALID_AUTHENTICATION');
  }

  const { data: isAdmin, error: adminError } = await userClient.rpc('is_app_admin');
  if (adminError || isAdmin !== true) {
    throw new IllustrationHttpError(403, 'ADMIN_REQUIRED');
  }

  // Privileged credentials are accessed only after authenticated app-admin proof.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    throw new IllustrationHttpError(500, 'SERVER_CONFIGURATION_ERROR');
  }
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { adminId: userData.user.id, userClient, serviceClient };
}
