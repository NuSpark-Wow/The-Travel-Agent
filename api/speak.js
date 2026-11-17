// The Travel Agent's voice: ElevenLabs text-to-speech, used only when a visitor taps "Listen".
// Env: ELEVENLABS_API_KEY (required for the voice; without it the Listen buttons say the voice is off)
// Optional: ELEVENLABS_VOICE_ID_WOMAN / ELEVENLABS_VOICE_ID_MAN to swap in different voices, ELEVENLABS_MODEL to change the model.
// Only the tool's own written text is sent here. No visitor audio ever reaches this server.
const { guard, readBody } = require('./_lib');

const DEFAULT_WOMAN = 'Nhs7eitvQWFTQBsf0yiT'; // Sarah Explains - approachable, clear
const DEFAULT_MAN = 'JYUzXNeyCPmymMkfcicu';   // Jon - warm American storyteller
const cache = new Map();                      // the same text isn't paid for twice (resets when the server sleeps)
const hits = new Map();                       // simple per-visitor limit
const LIMIT = 60;                             // voice requests per visitor per hour

module.exports = async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  const woman = process.env.ELEVENLABS_VOICE_ID_WOMAN || DEFAULT_WOMAN, man = process.env.ELEVENLABS_VOICE_ID_MAN || DEFAULT_MAN;
  // Health check you can open in a browser: /api/speak  (never shows the key)
  if (req.method === 'GET') return res.json({ api_key_set: !!key, woman_voice_id: woman, man_voice_id: man });
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!key) return res.status(501).json({ error: 'voice_off' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  if (h.length >= LIMIT) return res.status(429).json({ error: 'busy' });
  h.push(now); hits.set(ip, h);

  const body = await readBody(req);
  const text = String((body || {}).text || '').replace(/\s+/g, ' ').trim().slice(0, 1600);
  if (!text) return res.status(400).json({ error: 'empty' });
  const who = (body || {}).voice === 'man' ? 'man' : 'woman', voice = who === 'man' ? man : woman, ck = who + '|' + text;
  if (cache.has(ck)) return res.json({ audio: cache.get(ck) });

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'voice_failed' });
    const audio = Buffer.from(await r.arrayBuffer()).toString('base64');
    if (cache.size > 300) cache.clear();
    cache.set(ck, audio);
    return res.json({ audio });
  } catch (e) {
    return res.status(502).json({ error: 'voice_failed' });
  }
};
