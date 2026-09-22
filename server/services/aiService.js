const AI_API_URL = process.env.AI_API_URL || 'http://localhost:3000/mock-ai';

const supportedIntents = new Set([
  'UPDATE_VESSEL_STATUS',
  'START_FISHING_TRIP',
  'END_FISHING_TRIP',
  'RECORD_CATCH',
  'CREATE_FISH_LISTING',
  'CREATE_AUCTION',
  'CREATE_DIRECT_SALE',
  'VIEW_MARKET_PRICE',
  'VIEW_EARNINGS',
  'VIEW_AUCTIONS',
  'VIEW_ORDERS',
  'HELP',
  'EMERGENCY_ALERT'
]);

const fishSpecies = ['mackerel', 'sardine', 'sardines', 'tuna', 'pomfret', 'anchovy', 'prawns', 'shrimp'];
const numberWords = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

function numberValue(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return numeric;
  return numberWords[String(value).toLowerCase()] || null;
}

function extractNumber(text, pattern) {
  const match = text.match(pattern);
  return match ? numberValue(match[1]) : null;
}

function extractSpecies(text, context = {}) {
  const explicit = fishSpecies.find((species) => new RegExp(`\\b${species}\\b`, 'i').test(text));
  if (explicit) return explicit.replace(/s$/, '').replace(/^./, (letter) => letter.toUpperCase());
  return context.species || null;
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectIntent(text) {
  if (/\b(price|paying|worth|market)\b/i.test(text)) return 'VIEW_MARKET_PRICE';
  if (/\b(earn|earned|earnings|income)\b/i.test(text)) return 'VIEW_EARNINGS';
  if (/\b(orders?|purchases?)\b/i.test(text) && /\b(show|list|what|my)\b/i.test(text)) return 'VIEW_ORDERS';
  if (/\b(auctions?)\b/i.test(text) && /\b(show|list|active|what)\b/i.test(text)) return 'VIEW_AUCTIONS';
  if (/\b(return|retaining|coming back|arriv|dock|anchor|depart|leav)\w*\b/i.test(text) && /\b(boat|vessel|harbor|harbour|return|coming back|leav|depart|anchor|dock|arriv)\w*\b/i.test(text)) return 'UPDATE_VESSEL_STATUS';
  if (/\b(start|begin)\b.*\b(fishing )?trip\b/i.test(text)) return 'START_FISHING_TRIP';
  if (/\b(end|finish|complete)\b.*\btrip\b/i.test(text)) return 'END_FISHING_TRIP';
  if (/\b(emergency|danger|mayday)\b/i.test(text)) return 'EMERGENCY_ALERT';
  if (/\b(help)\b/i.test(text)) return 'HELP';
  if (/\b(auction|bid)\w*\b/i.test(text)) return 'CREATE_AUCTION';
  if (/\b(direct|directly)\b.*\b(sell|sale|listing)\b|\b(sell|sale)\b.*\b(direct|directly)\b|\bdirectly\b/i.test(text)) return 'CREATE_DIRECT_SALE';
  if (/\b(list|listing|online|for sale|sell|put .* up)\b/i.test(text)) return 'CREATE_FISH_LISTING';
  if (/\b(caught|catch|got|brought back|catch of|harvest)\w*\b/i.test(text)) return 'RECORD_CATCH';
  return 'UNKNOWN';
}

function vesselStatus(text) {
  if (/depart|leav/i.test(text)) return 'DEPARTED';
  if (/anchor|at harbor|at harbour/i.test(text)) return 'ANCHORED';
  if (/arriv|reach.*harbor|reach.*harbour|dock/i.test(text)) return 'ARRIVED';
  return 'RETURNING';
}

function extractTrade(text, context) {
  const species = extractSpecies(text, context);
  const quantities = [...text.matchAll(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s*(?:kilos?|kgs?|kg|kilograms?)\b/gi)]
    .map((match) => numberValue(match[1]));
  const prices = [...text.matchAll(/(?:\b(?:at|for|starting at|per kilo|a kilo|price of)\s*(?:₹|rs\.?|rupees?)?\s*|\b)(\d+(?:\.\d+)?)\s*(?=\s*(?:₹|rs\.?|rupees?)?\s*(?:per\s+)?kilo\b)/gi)]
    .map((match) => Number(match[1]));
  const saleQuantity = quantities.length > 1 ? quantities[quantities.length - 1] : quantities[0] || context.quantity || null;
  const catchQuantity = quantities.length > 1 ? quantities[0] : context.catchQuantity || (hasAny(text, [/caught/i, /catch/i, /brought back/i]) ? quantities[0] : null);
  const price = prices[prices.length - 1] || context.price || null;
  const qualityMatch = text.match(/\b(good|great|excellent|poor|premium|fresh)\s+quality\b/i);
  const quality = qualityMatch ? qualityMatch[1].toUpperCase() : context.quality || null;
  const saleType = /auction|bid/i.test(text) ? 'AUCTION' : /direct|directly/i.test(text) ? 'DIRECT_SALE' : context.saleType || null;
  return { species, quantities, saleQuantity, catchQuantity, price, quality, saleType };
}

function missingForTrade(trade, intent) {
  const missing = [];
  if (!trade.species) missing.push('species');
  if (!trade.quantity && intent !== 'RECORD_CATCH') missing.push('quantity');
  if (!trade.price && (intent === 'CREATE_DIRECT_SALE' || intent === 'CREATE_AUCTION')) missing.push(intent === 'CREATE_AUCTION' ? 'startingPrice' : 'price');
  if (!trade.saleType && intent === 'CREATE_FISH_LISTING') missing.push('saleType');
  return missing;
}

function buildTradeResponse(text, previous = {}) {
  const detectedIntent = detectIntent(text);
  const intent = detectedIntent === 'UNKNOWN' && previous.pendingIntent ? previous.pendingIntent : detectedIntent;
  const trade = extractTrade(text, previous);
  const hasSaleRequest = intent === 'CREATE_DIRECT_SALE' || intent === 'CREATE_AUCTION' || intent === 'CREATE_FISH_LISTING' || /\b(sell|sale|auction|online|listed)\b/i.test(text);
  const actions = [];
  const catchRequested = /\b(caught|catch|got|brought back|harvest)\w*\b/i.test(text);
  if (catchRequested && trade.species && trade.catchQuantity) {
    actions.push({ intent: 'RECORD_CATCH', parameters: { species: trade.species, quantity: trade.catchQuantity, unit: 'kg', quality: trade.quality || 'A' } });
  }
  if (hasSaleRequest) {
    const saleIntent = trade.saleType === 'AUCTION' ? 'CREATE_AUCTION' : trade.saleType === 'DIRECT_SALE' ? 'CREATE_DIRECT_SALE' : intent;
    actions.push({ intent: saleIntent, parameters: { species: trade.species, quantity: trade.saleQuantity, unit: 'kg', price: trade.price, priceUnit: 'kg', startingPrice: trade.price, quality: trade.quality || 'A' } });
  }
  const primary = actions.find((action) => action.intent !== 'RECORD_CATCH') || actions[0];
  const missing = primary ? missingForTrade(primary.parameters, primary.intent) : [];
  return {
    intent: primary?.intent || intent,
    parameters: primary?.parameters || { species: trade.species, quantity: trade.catchQuantity, unit: 'kg', quality: trade.quality || 'A' },
    actions,
    confidence: primary && missing.length === 0 ? 0.9 : 0.75,
    requiresConfirmation: actions.length > 0 && missing.length === 0,
    missingFields: missing,
    context: { ...previous, pendingIntent: primary?.intent || previous.pendingIntent, species: trade.species || previous.species, catchQuantity: trade.catchQuantity || previous.catchQuantity, quantity: trade.saleQuantity || previous.quantity, price: trade.price || previous.price, quality: trade.quality || previous.quality, saleType: trade.saleType || previous.saleType }
  };
}

async function detectIntentFromAI(text, context = {}) {
  const intent = detectIntent(text);
  const hasTradeContext = context.pendingIntent || context.species || context.quantity || context.price;
  if (['RECORD_CATCH', 'CREATE_FISH_LISTING', 'CREATE_AUCTION', 'CREATE_DIRECT_SALE'].includes(intent) || intent === 'UNKNOWN' && hasTradeContext || /\b(sell|sale|auction|online|listed|caught|catch)\b/i.test(text)) {
    const response = buildTradeResponse(text, context);
    if (response.intent === 'UNKNOWN' && context.pendingIntent) response.intent = context.pendingIntent;
    return response;
  }
  if (intent === 'UPDATE_VESSEL_STATUS') return { intent, parameters: { status: vesselStatus(text) }, status: vesselStatus(text), confidence: 0.9, requiresConfirmation: true, missingFields: [], context };
  if (intent === 'START_FISHING_TRIP' || intent === 'END_FISHING_TRIP') return { intent, parameters: {}, confidence: 0.9, requiresConfirmation: true, missingFields: [], context };
  return { intent, parameters: {}, confidence: intent === 'UNKNOWN' ? 0 : 0.9, requiresConfirmation: false, missingFields: [], context };
}

async function processVoiceCommand(text, context = {}) {
  if (!text || !text.trim()) return { intent: 'UNKNOWN', parameters: {}, missingFields: ['speech'] };
  return detectIntentFromAI(text.trim(), context);
}

module.exports = { supportedIntents, processVoiceCommand, detectIntentFromAI };
