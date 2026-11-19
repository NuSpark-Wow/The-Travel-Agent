// Real photos first: Wikimedia Commons, then Google Images via Serper as backup
const { guard } = require('./_lib');

async function wikimedia(q) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    '&generator=search&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime|extmetadata&iiextmetadatafilter=Artist|LicenseShortName' +
    '&iiurlwidth=900&gsrsearch=' + encodeURIComponent(q);
  const r = await fetch(url, { headers: { 'User-Agent': 'NuSparkLearnWow-TravelAgent/1.0 (nusparklearnwow.com)' } });
  if (!r.ok) return null;
  const data = await r.json();
  const pages = Object.values((data.query && data.query.pages) || {})
    .sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const p of pages) {
    const info = p.imageinfo && p.imageinfo[0];
    if (!info) continue;
    if (!/image\/(jpeg|png|webp)/.test(info.mime || '')) continue;
    const artist = info.extmetadata && info.extmetadata.Artist
      ? String(info.extmetadata.Artist.value).replace(/<[^>]+>/g, '').trim().slice(0, 60)
      : '';
    const license = info.extmetadata && info.extmetadata.LicenseShortName
      ? String(info.extmetadata.LicenseShortName.value).replace(/<[^>]+>/g, '').trim()
      : '';
    return {
      url: info.thumburl || info.url,
      credit: (artist ? artist + ' / ' : '') + 'Wikimedia Commons' + (license ? ' (' + license + ')' : ''),
      page: info.descriptionurl || '',
      source: 'wikimedia'
    };
  }
  return null;
}

async function serper(q) {
  if (!process.env.SERPER_API_KEY) return null;
  const r = await fetch('https://google.serper.dev/images', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, num: 5 })
  });
  if (!r.ok) return null;
  const data = await r.json();
  const img = (data.images || []).find(i => /^https:/.test(i.imageUrl || ''));
  return img ? { url: img.imageUrl, credit: img.source || img.domain || 'Web', page: img.link || '', source: 'web' } : null;
}

module.exports = async (req, res) => {
  if (!(await require("./_lwgate")(req, res, "the-travel-agent"))) return;
  if (!guard(req, res, 'image')) return;
  const q = String((req.query && req.query.q) || '').slice(0, 120);
  if (!q) return res.status(400).json({ error: 'Missing search' });
  try {
    const hit = (await wikimedia(q)) || (await serper(q));
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate');
    res.status(200).json(hit || { url: null });
  } catch (e) {
    res.status(200).json({ url: null });
  }
};
