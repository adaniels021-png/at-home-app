import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: reports } = await supabase
    .from('weekly_user_reports')
    .select('*, profiles(email, child_name)')

  for (const report of reports || []) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
      },
      body: JSON.stringify({
        from: 'ABA at Home <reports@yourdomain.com>',
        to: [report.profiles.email],
        subject: `Weekly Progress: ${report.profiles.child_name}`,
        html: `<h1>Weekly Clinical Summary</h1><p>Practice: ${report.total_minutes} mins.</p>`
      })
    })
  }

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
})
