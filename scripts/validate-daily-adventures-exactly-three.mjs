import { contains, pass, read } from './daily-adventures-validator-utils.mjs';

const sql = read('supabase/migrations/20260830120000_daily_adventures_phase_a_foundation.sql');

contains(sql, /position smallint not null check \(position between 1 and 3\)/, 'Positions are not constrained to 1-3');
contains(sql, /primary key \(child_id, assignment_date, position\)/, 'Stable position key is missing');
contains(sql, /unique \(child_id, assignment_date, library_activity_id\)/, 'Duplicate activities are not prevented');
contains(sql, /pg_advisory_xact_lock/, 'Concurrent assignment creation is not locked');
contains(sql, /limit \(3 - existing_count\)/, 'Assignment fill does not target exactly three');
contains(sql, /activity\.status = 'approved'/, 'Assignments are not limited to approved content');
contains(sql, /activity\.pro_only[\s\S]*from public\.daily_adventure_assignments/, 'Daily results do not carry catalog availability');
contains(sql, /existing_count < 3/, 'Incomplete assignment state is not exposed');
contains(sql, /assignment_date >= effective_date - 14/, 'Recent-repeat avoidance is missing');
contains(sql, /md5\(target_child_id::text \|\| ':' \|\| effective_date::text/, 'Selection is not stable for child/date');
contains(sql, /returns table\([\s\S]*?"position" smallint[\s\S]*?"time" text/, 'Reserved RPC output identifiers must be quoted for PostgreSQL execution');
contains(sql, /select ranked\.id, ranked\.candidate_position[\s\S]*select selected\.id,[\s\S]*select positions\.position/, 'Assignment CTE columns must be qualified against PL/pgSQL output parameters');

pass('Exactly-three stable assignment contract');
