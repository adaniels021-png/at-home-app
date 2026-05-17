import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization') || '';

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user?.id) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const userId = user.id;

    const { data: children } = await supabaseAdmin
      .from('children')
      .select('id')
      .eq('user_id', userId);

    const childIds = (children || []).map((child: any) => child.id);

    for (const childId of childIds) {
      await supabaseAdmin.from('lesson_logs').delete().eq('child_id', childId);
      await supabaseAdmin.from('daily_lesson_instances').delete().eq('child_id', childId);
      await supabaseAdmin.from('lesson_queue').delete().eq('child_id', childId);
      await supabaseAdmin.from('skill_mastery').delete().eq('child_id', childId);
      await supabaseAdmin.from('lesson_streaks').delete().eq('child_id', childId);
      await supabaseAdmin.from('pecs_cards').delete().eq('child_id', childId);
      await supabaseAdmin.from('assessments').delete().eq('child_id', childId);
      await supabaseAdmin.from('routine_logs').delete().eq('child_id', childId);
      await supabaseAdmin.from('daily_fun_activities').delete().eq('child_id', childId);
      await supabaseAdmin.from('saved_activities').delete().eq('child_id', childId);
      await supabaseAdmin.from('notification_preferences').delete().eq('child_id', childId);
    }

    await supabaseAdmin.from('children').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId);

    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, deleted_user_id: userId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});