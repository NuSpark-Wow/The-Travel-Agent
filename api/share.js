// Share page for one Travel Agent find.
// Facebook, Messenger, LinkedIn, X and texting apps read the hidden tags on this page,
// so the shared card shows the actual photo of the place, the place name and a "who knew" line.
// People who click the link are sent straight on to The Travel Agent page on nusparklearnwow.com.
// Open to everyone on purpose (Facebook's reader must be able to see it). It only ever shows
// Wikimedia Commons photos, which are free to reuse with credit.

const TOOL_PAGE = 'https://nusparklearnwow.com/the-travel-agent/';
const FALLBACK_IMG = 'banner1.png';

const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

module.exports = (req, res) => {
  const q = req.query || {};
  const name = clip(q.n, 90) || 'a cool place';
  const word = clip(q.d, 30) || 'place';
  const town = clip(q.t, 60);
  const fact = clip(q.f, 220);
  const credit = clip(q.c, 120);
  let img = String(q.i || '');
  // only Wikimedia Commons photos (free to reuse); anything else falls back to the Travel Agent banner
  try { const u = new URL(img); if (u.protocol !== 'https:' || u.hostname !== 'upload.wikimedia.org') img = ''; } catch (e) { img = ''; }
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const base = 'https://' + host;
  if (!img) img = base + '/' + FALLBACK_IMG;

  const inTown = town && !name.toLowerCase().includes(town.toLowerCase()) ? ' in ' + town : '';
  const title = `Check out this cool ${word} I found on The NuSparkLearnWow Travel Agent: ${name}${inTown}`;
  const desc = (fact ? 'Who knew? ' + fact : 'What\'s here? Wow...who knew? Explore any place on The Travel Agent.') + (credit ? ' Photo: ' + credit : '');
  const self = base + req.url;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate');
  res.status(200).send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="NuSparkLearnWow">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:alt" content="${esc(name)}">
<meta property="og:url" content="${esc(self)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<meta http-equiv="refresh" content="0;url=${esc(TOOL_PAGE)}">
<link rel="canonical" href="${esc(TOOL_PAGE)}">
<style>body{font-family:system-ui,sans-serif;background:#13254a;color:#fff;text-align:center;padding:40px 16px}a{color:#e0b33a}</style>
</head><body>
<p>Taking you to The Travel Agent on NuSparkLearnWow...</p>
<p><a href="${esc(TOOL_PAGE)}">Tap here if it doesn't open</a></p>
<script>location.replace(${JSON.stringify(TOOL_PAGE)});</script>
</body></html>`);
};
