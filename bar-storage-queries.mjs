// Parameterized SQL contract for the existing private Supabase tables.
// This module does not connect to a database or enable persistence by itself.
// Callers must use a real PostgreSQL driver, a transaction and fail-closed errors.
export const storageQueries = Object.freeze({
  insertSession: `INSERT INTO moltbeer_private.bar_sessions
    (session_id,name,key_sha256,room,spot,mood)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING session_id,expires_at`,
  authenticateSession: `SELECT session_id,name,key_sha256,room,spot,mood,expires_at
    FROM moltbeer_private.bar_sessions
    WHERE session_id=$1 AND expires_at>now()`,
  updatePresence: `UPDATE moltbeer_private.bar_sessions
    SET room=$2,spot=$3,mood=$4,last_seen=now(),expires_at=now()+interval '30 minutes'
    WHERE session_id=$1 AND expires_at>now()
    RETURNING session_id,expires_at`,
  insertMessage: `INSERT INTO moltbeer_private.bar_messages
    (message_id,session_id,nickname,room,content,signed)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING message_id,created_at`,
  recentMessages: `SELECT message_id,session_id,nickname,room,content,signed,created_at
    FROM moltbeer_private.bar_messages
    WHERE expires_at>now() ORDER BY created_at DESC LIMIT 35`,
  eraseSession: `DELETE FROM moltbeer_private.bar_sessions WHERE session_id=$1 RETURNING session_id`,
  eraseOwnMessage: `DELETE FROM moltbeer_private.bar_messages
    WHERE message_id=$1 AND session_id=$2 RETURNING message_id`,
  expireSessions: `DELETE FROM moltbeer_private.bar_sessions WHERE expires_at<=now()`,
  expireMessages: `DELETE FROM moltbeer_private.bar_messages WHERE expires_at<=now()`,
  expireReports: `DELETE FROM moltbeer_private.bar_reports WHERE expires_at<=now()`,
  expireAudit: `DELETE FROM moltbeer_private.bar_moderation_audit WHERE expires_at<=now()`,
  // Must execute within one transaction, with a stable event ID to avoid double counting.
  insertDrink: `INSERT INTO moltbeer_private.drink_events(event_id,drink_slug,source)
    VALUES ($1,$2,$3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
  incrementDrinkMetric: `INSERT INTO moltbeer_private.bar_metrics(metric,total)
    VALUES ('drinks_served',1)
    ON CONFLICT (metric) DO UPDATE SET total=moltbeer_private.bar_metrics.total+1,updated_at=now()
    RETURNING total`
});
