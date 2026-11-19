// Step 2: the picks behind one door
const { guard, askJSON, readBody, reason } = require('./_lib');

const DOOR_NAMES = {
  secret: 'Secret Spots - hidden places most visitors miss',
  unique: 'Unique Things to Do - one-of-a-kind experiences',
  museums: 'Museums - big names plus quirky small ones',
  restaurants: 'Unique Restaurants - local food and places with a story behind them',
  hikes: 'Hikes & Trails - easy walks up to bucket-list climbs',
  water: 'On the Water - boating, kayaking, snorkeling, diving, river and lake trips',
  beaches: 'Beaches & Amusement Parks - what each is like (crowds, water, families)',
  drives: 'Scenic Drives - famous routes and what you see along them',
  trains: 'Train Journeys - scenic, historic and famous rides',
  historic: 'Historic & Sacred Places - castles, ruins, temples, landmarks',
  wildlife: 'Wildlife & Parks - parks, refuges, where to see animals',
  views: 'Must-See Landscapes & Views - natural wonders, lookouts, skylines'
};

// Doors where places open, close or change - check the live web first
const SCOPE_NOTE = {
  proper: 'Stay within the city or place itself (city proper). Do not include suburbs or nearby towns.',
  area: 'Cover the place AND its surrounding area: suburbs and nearby towns within about an hour\'s drive (like a TV market / metro area). Always name the town for anything outside the main place.'
};
const LIVE_CHECK = ['restaurants', 'water', 'beaches', 'unique', 'secret'];

const SYSTEM = `You are The Travel Agent on NuSparkLearnWow - a "what's here? wow!" discovery guide.
Your job is to make people say "Wow...who knew?" about a place. This is learning and discovery, like the best illustrated travel books - NOT trip planning.

Rules:
- Never give logistics: no flights, hotels, prices, budgets, directions, itineraries, booking advice.
- Only real places that genuinely exist. Never invent a place, a fact, a rating or a review quote.
- No star ratings and no "best/top" ranking language - these are "picks."
- Each pick needs a real wow: a surprising story, record, history, or detail most people don't know.
- For businesses (restaurants, boat tours, amusement parks), only include ones you are confident are currently operating; set "check" to true for them.
- Keep it family-friendly.
- Never use the phrase "of a lifetime."
- "facts": up to 5 true, surprising facts. Only as many as are genuinely true and interesting - never pad. Minimum 1.
- "nearby": 2-3 real places close by worth seeing, each with a one-line hook (e.g. "A 5-minute walk: Elfreth's Alley, America's oldest residential street"). No directions or travel details.
- "paul": "Mr. Paul's Take" - 2-3 warm, friendly sentences on why you, your kids or your family will love it. Speak as Mr. Paul, a teacher who loves discovery. NEVER claim Mr. Paul personally visited or experienced the place.

Answer shape (for reference):
{"intro":"2 short spoken sentences introducing this door for this place, warm and exciting (under 45 words)",
"picks":[{"name":"Exact real name","area":"Neighborhood/area or nearby town","wow":"One punchy wow line (under 15 words)","story":"3-4 sentences on why it's special","facts":["fact 1","fact 2"],"nearby":[{"name":"Real place","hook":"one line"}],"paul":"Mr. Paul's Take","image_query":"Best search words to find a real photo of this exact place","check":false}]}`;

const SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          area: { type: 'string' },
          wow: { type: 'string' },
          story: { type: 'string' },
          facts: { type: 'array', items: { type: 'string' } },
          nearby: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, hook: { type: 'string' } }, required: ['name', 'hook'] } },
          paul: { type: 'string' },
          image_query: { type: 'string' },
          check: { type: 'boolean' }
        },
        required: ['name', 'area', 'wow', 'story', 'facts', 'nearby', 'paul', 'image_query', 'check']
      }
    }
  },
  required: ['intro', 'picks']
};

module.exports = async (req, res) => {
  if (!(await require("./_lwgate")(req, res, "the-travel-agent"))) return;
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { place, door, exclude, scope } = readBody(req);
  if (!place || !DOOR_NAMES[door]) return res.status(400).json({ error: 'Missing place or door.' });

  const skip = Array.isArray(exclude) && exclude.length
    ? '\nDo NOT repeat any of these: ' + exclude.slice(0, 40).join('; ')
    : '';
  const user = `Place: ${String(place).slice(0, 120)}
Door: ${DOOR_NAMES[door]}
Area: ${SCOPE_NOTE[scope] || SCOPE_NOTE.proper}
Give 6 picks.${skip}`;

  try {
    const out = await askJSON(SYSTEM, user, SCHEMA, {
      useSearch: LIVE_CHECK.includes(door),
      maxTokens: 8000
    });
    out.picks = (out.picks || []).slice(0, 6);
    if (LIVE_CHECK.includes(door) && door === 'restaurants') {
      out.picks.forEach(p => { p.check = true; });
    }
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: reason(e) });
  }
};
