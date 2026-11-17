// Step 1: check the place and decide which of the 12 doors fit it
const { guard, askClaude, parseJSON, readBody } = require('./_lib');

const DOORS = [
  'secret', 'unique', 'museums', 'restaurants', 'hikes', 'water',
  'beaches', 'drives', 'trains', 'historic', 'wildlife', 'views'
];

const SYSTEM = `You are The Travel Agent, a "what's here? wow!" discovery guide on NuSparkLearnWow.
This is a learning experience about what makes a place amazing - NOT trip planning. Never give travel logistics, flights, hotels, budgets or itineraries.

The visitor typed a place. Silently fix any spelling. Decide which of these 12 doors have real, genuine things to show for that place:
secret = Secret Spots (hidden places most visitors miss)
unique = Unique Things to Do
museums = Museums
restaurants = Unique Restaurants (local food, places with a story)
hikes = Hikes & Trails
water = On the Water (boating, kayaking, snorkeling, diving, river or lake trips)
beaches = Beaches & Amusement Parks (true if the place or nearby area has either)
drives = Scenic Drives
trains = Train Journeys (scenic, historic or famous rides)
historic = Historic & Sacred Places
wildlife = Wildlife & Parks
views = Must-See Landscapes & Views

Mark a door false if there is honestly nothing real to show - never stretch or invent. For each false door, write a short friendly swap line pointing to a door that does fit, e.g. "No beaches here - try On the Water."
If the place is not a real place, or is too vague (like "somewhere warm"), set known to false.

Reply with ONLY this JSON:
{"known":true,"place":"Corrected Place Name, Region/Country","wow":"One short, exciting 'wow' sentence about this place (under 30 words)","doors":{"secret":true,...all 12},"swaps":{"beaches":"No beaches here - try On the Water."}}`;

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { place } = readBody(req);
  if (!place || String(place).trim().length < 2) {
    return res.status(400).json({ error: 'Type a place to explore.' });
  }
  try {
    const text = await askClaude(SYSTEM, 'Place: ' + String(place).slice(0, 120), { maxTokens: 800 });
    const out = parseJSON(text);
    out.doors = out.doors || {};
    DOORS.forEach(d => { if (typeof out.doors[d] !== 'boolean') out.doors[d] = true; });
    out.swaps = out.swaps || {};
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'Could not check that place. Please try again.' });
  }
};
