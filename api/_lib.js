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

// Call Claude. useSearch = let Claude check the live web first.
async function askClaude(system, user, { useSearch = false, maxTokens = 3000 } = {}) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }]
  };
  if (useSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }];
  }
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
  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
  return text;
}

// Pull the JSON object out of the AI reply
function parseJSON(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('No JSON in reply');
  return JSON.parse(text.slice(a, b + 1));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = { guard, askClaude, parseJSON, readBody };
