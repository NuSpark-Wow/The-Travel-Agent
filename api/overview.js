// The two-sheet overview of the chosen place (shown above the 12 doors)
const { guard, askJSON, readBody, reason } = require('./_lib');

const SYSTEM = `You are The Travel Agent on NuSparkLearnWow - a "what's here? wow!" discovery guide.
Write a two-sheet overview of the place, like the opening spread of a beautiful illustrated travel book.
This is learning and discovery - NOT trip planning: no flights, hotels, prices, budgets, directions or itineraries.

Rules:
- Only true, well-established facts. Never invent. If unsure of a number, leave it out.
- Population or size: give a rounded, approximate figure and say "about".
- Family-friendly, warm and exciting, plain English.
- Never use the phrase "of a lifetime."

Sheet 1 - "Meet [place]":
- glance: 4-6 quick facts as label/value pairs (e.g. Where, Known for, Nickname, Founded, Population, Climate). Only include ones that are true.
- story: 2 short paragraphs on its history and how it became what it is.

Sheet 2 - "What makes it special":
- special: 3 short sections, each a heading and 2-3 sentences, chosen to fit the place (e.g. Culture & Food, Nature & Landscape, Famous Faces, Architecture, Wildlife).
- whoknew: 3 surprising "Wow...who knew?" facts.

Also give image_query: the best search words to find a real, iconic photo of this place.`;

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    glance: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } }, required: ['label', 'value'] } },
    story: { type: 'array', items: { type: 'string' } },
    special: { type: 'array', items: { type: 'object', properties: { heading: { type: 'string' }, text: { type: 'string' } }, required: ['heading', 'text'] } },
    whoknew: { type: 'array', items: { type: 'string' } },
    image_query: { type: 'string' }
  },
  required: ['glance', 'story', 'special', 'whoknew', 'image_query']
};

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { place } = readBody(req);
  if (!place) return res.status(400).json({ error: 'Missing place.' });
  try {
    const out = await askJSON(SYSTEM, 'Place: ' + String(place).slice(0, 120), SCHEMA, { maxTokens: 4000 });
    out.glance = (out.glance || []).slice(0, 6);
    out.story = (out.story || []).slice(0, 2);
    out.special = (out.special || []).slice(0, 3);
    out.whoknew = (out.whoknew || []).slice(0, 3);
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: reason(e) });
  }
};
