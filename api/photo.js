// Photo pass-through for share pictures: lets the page draw a Wikimedia photo onto the
// share card when the browser can't load it straight from Wikimedia. Wikimedia photos only.
const { guard } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res, 'image')) return;
  const u = String((req.query && req.query.u) || '');
  let url;
  try { url = new URL(u); } catch (e) { return res.status(400).end('Bad photo address'); }
  if (url.protocol !== 'https:' || url.hostname !== 'upload.wikimedia.org') return res.status(400).end('Wikimedia photos only');
  try {
    const r = await fetch(url.href, { headers: { 'User-Agent': 'NuSparkLearnWow-TravelAgent/1.0 (nusparklearnwow.com)' } });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !/^image\//.test(type)) return res.status(404).end('Photo not found');
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return res.status(413).end('Photo too large');
    res.setHeader('Content-Type', type);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=604800, max-age=86400');
    res.status(200).end(buf);
  } catch (e) {
    res.status(502).end('Photo unavailable');
  }
};
