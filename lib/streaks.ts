import { supabase } from './supabase';

export async function calculateCurrentStreak(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // 1. Fetch distinct dates where a session was logged
    const { data, error } = await supabase
      .from('sessions')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return 0;

    // 2. Normalize dates to YYYY-MM-DD to handle multiple sessions per day
    const uniqueDates = Array.from(new Set(
      data.map(s => new Date(s.created_at).toISOString().split('T')[0])
    ));

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 3. Start checking from today or yesterday (to allow for the current day)
    let checkDate = uniqueDates.includes(today) ? today : (uniqueDates.includes(yesterdayStr) ? yesterdayStr : null);

    if (!checkDate) return 0;

    let currentDate = new Date(checkDate);
    
    while (uniqueDates.includes(currentDate.toISOString().split('T')[0])) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  } catch (e) {
    return 0;
  }
}
