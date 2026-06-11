const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL     || "",
  process.env.SUPABASE_ANON_KEY || ""
);

// ---------------------------------------------------------------------------
// safeQuery — race any Supabase query against a short timeout.
//
// On the free tier Supabase pauses the project after ~1 week of inactivity.
// A paused project does NOT reject quickly; the request hangs, which would
// otherwise freeze an entire API route. safeQuery guarantees a route always
// gets a result fast: on timeout (or any error) it resolves to
// { data: null, error } so callers transparently fall back to in-memory data.
// ---------------------------------------------------------------------------
const DB_TIMEOUT_MS = parseInt(process.env.DB_TIMEOUT_MS || "2500");

async function safeQuery(query) {
  try {
    return await Promise.race([
      Promise.resolve(query),
      new Promise((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: { message: "db_timeout" } }),
          DB_TIMEOUT_MS
        )
      ),
    ]);
  } catch (err) {
    return { data: null, error: err };
  }
}

module.exports = supabase;
module.exports.safeQuery = safeQuery;
