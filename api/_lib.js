// Shared helpers for The Travel Agent (NuSparkLearnWow)
// Files starting with "_" inside /api are NOT public routes on Vercel.

const ALLOWED = [
  'nusparkpublishing.com',
  'nusparkmarketing.com',
  'nusparklearnwow.com'
];

// Website lock: only answer requests coming from Paul's sites
// (set ALLOW_VERCEL=1 in Vercel to test on the *.vercel.app address)
function siteAllowed(req) {
  const src = req.headers.origin || req.headers.referer || '';
  let host = '';
  try { host = new URL(src).hostname.toLowerCase(); } catch (e) { return false; }
  if (ALLOWED.some(d => host === d || host.endsWith('.' + d))) return true;
  if (process.env.ALLOW_VERCEL === '1' && host.endsWith('.vercel.app')) return true;
  if (process.env.ALLOW_LOCAL === '1' && (host === 'localhost' || host === '127.0.0.1')) return true;
  return false;
}

function guard(req, res) {
  if (!siteAllowed(req)) {
    res.status(403).json({ error: 'This tool only runs on NuSpark websites.' });
    return false;
  }
  return true;
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

// Call Claude and get back a clean JSON object.
// The AI hands its answer to a "submit" tool, so the reply is always valid JSON.
// useSearch = let Claude check the live web first.
async function askJSON(system, user, schema, { useSearch = false, maxTokens = 3000 } = {}) {
  const tools = [{
    name: 'submit',
    description: 'Submit the final answer. Always finish by calling this tool exactly once.',
    input_schema: schema
  }];
  if (useSearch) tools.unshift({ type: 'web_search_20250305', name: 'web_search', max_uses: 4 });
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system: system + '\n\nWhen you are ready, call the submit tool with your answer. Do not write the answer as text.',
    messages: [{ role: 'user', content: user }],
    tools,
    tool_choice: useSearch ? { type: 'auto' } : { type: 'tool', name: 'submit' }
  };

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error('AI error ' + r.status + ': ' + t.slice(0, 300));
      }
      const data = await r.json();
      const call = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'submit');
      if (call && call.input) return call.input;
      // Backup: the AI wrote JSON as text instead
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      return parseJSON(text);
    } catch (e) {
      lastErr = e;
      console.error('askJSON attempt ' + (attempt + 1) + ' failed:', e.message);
      if (/AI error (401|403|404)/.test(e.message)) break; // setup problems: no point retrying
    }
  }
  throw lastErr;
}

// Pull a JSON object out of plain text (backup only)
function parseJSON(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('No JSON in reply');
  const raw = text.slice(a, b + 1)
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(raw);
}

function reason(e) {
  const m = String((e && e.message) || '');
  if (!process.env.ANTHROPIC_API_KEY) return 'Setup needed: ANTHROPIC_API_KEY is missing in Vercel.';
  if (/401|authentication|invalid x-api-key/i.test(m)) return 'Setup needed: the ANTHROPIC_API_KEY in Vercel is not valid.';
  if (/AI error 404|not_found_error/i.test(m)) return 'Setup needed: the AI model name (' + MODEL + ') is not available. Fix or remove ANTHROPIC_MODEL in Vercel.';
  if (/AI error 400/i.test(m)) return 'The AI could not read the request (code 400). Please send Claude a screenshot.';
  if (/429|rate|overloaded|529/i.test(m)) return 'The AI is busy right now. Please try again in a moment.';
  if (/JSON/i.test(m)) return 'The answer came back scrambled. Please try again.';
  return 'Something went wrong. Please try again.';
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = { guard, askJSON, readBody, reason };
