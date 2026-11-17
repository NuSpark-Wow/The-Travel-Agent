// ElevenLabs voice for The Travel Agent
const { guard, readBody } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { text } = readBody(req);
  if (!text) return res.status(400).json({ error: 'No text' });
  const voice = process.env.ELEVENLABS_VOICE_ID;
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg'
        },
        body: JSON.stringify({
          text: String(text).slice(0, 1200),
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      }
    );
    if (!r.ok) return res.status(502).json({ error: 'Voice unavailable' });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).json({ error: 'Voice unavailable' });
  }
};
