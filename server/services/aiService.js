const fishSpecies = require('./fishSpecies');

const supportedIntents = new Set([
  'UPDATE_VESSEL_STATUS',
  'START_FISHING_TRIP',
  'END_FISHING_TRIP',
  'RECORD_CATCH',
  'CREATE_FISH_LISTING',
  'CREATE_AUCTION',
  'CREATE_DIRECT_SALE',
  'UPDATE_LISTING',
  'VIEW_MARKET_PRICE',
  'VIEW_EARNINGS',
  'VIEW_AUCTIONS',
  'VIEW_ORDERS',
  'HELP',
  'EMERGENCY_ALERT'
]);

const numberWords = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100
};

const regionalSpecies = {
  'ಬಂಗಡೆ': 'Mackerel',
  'ಮತ್ತಿ': 'Sardine',
  'ചാള': 'Sardine',
  'അയല': 'Mackerel',
  'ചൂര': 'Tuna'
};

function normalizedText(text) {
  return String(text || '').toLowerCase().replace(/[₹,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasWord(text, words) {
  return words.some((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(text));
}

function extractNumber(text, pattern) {
  const numericMatch = text.match(pattern);
  if (numericMatch) return Number(numericMatch[1]);

  const wordPattern = new RegExp(`\\b(${Object.keys(numberWords).join('|')})\\b`, 'i');
  const wordMatch = text.match(wordPattern);
  return wordMatch ? numberWords[wordMatch[1].toLowerCase()] : null;
}

function extractQuantity(text) {
  const quantityMatch = text.match(/(?:about|around|approximately|nearly)?\s*(\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\s*(?:kilos?|kilograms?|kgs?|kg|ಕಿಲೋ|ಕೆಜಿ|കിലോ|കിലോഗ്രാം)\b/i);
  if (!quantityMatch) return null;
  const value = Number(quantityMatch[1]) || numberWords[quantityMatch[1].toLowerCase()];
  return Number.isFinite(value) ? value : null;
}

function extractQuantities(text) {
  const matches = [...text.matchAll(/(?:about|around|approximately|nearly)?\s*(\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\s*(?:kilos?|kilograms?|kgs?|kg|ಕಿಲೋ|ಕೆಜಿ|കിലോ|കിലോഗ്രാം)\b/gi)];
  return matches.map((match) => Number(match[1]) || numberWords[match[1].toLowerCase()]).filter(Number.isFinite);
}

function extractPrice(text) {
  const priceMatch = text.match(/(?:(?:at|for|starting(?:\s+price)?(?:\s+of)?)\s*)?(?:₹|rs\.?|rupees?)\s*(\d+(?:\.\d+)?)|(?:(?:at|for|starting(?:\s+price)?(?:\s+of)?)\s*)?(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?)/i);
  return priceMatch ? Number(priceMatch[1] || priceMatch[2]) : null;
}

function extractSpecies(text) {
  const regionalMatch = Object.entries(regionalSpecies).find(([alias]) => text.includes(alias));
  if (regionalMatch) return regionalMatch[1];
  return fishSpecies
    .slice()
    .sort((left, right) => right.length - left.length)
    .find((species) => new RegExp(`\\b${species.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&').replace(/ /g, '\\s+')}s?\\b`, 'i').test(text)) || null;
}

function extractQuality(text) {
  const qualityMatch = text.match(/\b(good|fresh|excellent|premium|high[- ]quality|a[- ]grade|grade\s+a)\b/i);
  if (!qualityMatch) return null;
  return qualityMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detectVesselStatus(text) {
  const candidates = [
    { status: 'RETURNING', words: ['returning', 'coming back', 'retaining'] },
    { status: 'DEPARTED', words: ['leaving', 'departed', 'going out'] },
    { status: 'ANCHORED', words: ['anchored', 'drop anchor', 'dropped anchor'] },
    { status: 'ARRIVED', words: ['reached harbor', 'reached the harbor', 'arrived'] },
    { status: 'DOCKED', words: ['docked'] },
    { status: 'FISHING', words: ['fishing', 'started fishing'] },
    { status: 'AT_HARBOR', words: ['at harbor', 'in harbor'] }
  ];

  return candidates.find((candidate) => candidate.words.some((phrase) => new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i').test(text)))?.status || null;
}

function detectIntent(text) {
  const status = detectVesselStatus(text);
  if (status) return 'UPDATE_VESSEL_STATUS';
  if (hasWord(text, ['emergency']) || /\bneed\s+help\b|ತುರ್ತು|അടിയന്തിര/i.test(text)) return 'EMERGENCY_ALERT';
  if (hasWord(text, ['earnings', 'income', 'money']) || /ಗಳಿಕೆ|ಆದಾಯ|വരുമാനം/i.test(text)) return 'VIEW_EARNINGS';
  if (hasWord(text, ['orders', 'order']) || /ಆದೇಶ|ഓർഡർ/i.test(text)) return 'VIEW_ORDERS';
  if (hasWord(text, ['price', 'prices', 'selling', 'paying']) || /ಬೆಲೆ|ವില/i.test(text)) return 'VIEW_MARKET_PRICE';
  if ((hasWord(text, ['show', 'view', 'list']) && hasWord(text, ['auction', 'auctions'])) || /ಹರಾಜು|ലേലം/i.test(text)) return 'VIEW_AUCTIONS';
  if (hasWord(text, ['help', 'assist']) || /ಸಹಾಯ|സഹായം/i.test(text)) return 'HELP';
  if (hasWord(text, ['start']) && hasWord(text, ['trip', 'fishing'])) return 'START_FISHING_TRIP';
  if (hasWord(text, ['end', 'finish', 'complete']) && hasWord(text, ['trip', 'fishing'])) return 'END_FISHING_TRIP';

  const hasCatchVerb = /\b(caught|catch|got|record|recorded|brought|have)\b|ಹಿಡಿ|ಸಿಕ್ಕಿತು|ಹಿಡಿದ|പിടി|കിട്ടി/i.test(text);
  const hasAuctionVerb = /\b(auction|bid|bidding)\b|ಹರಾಜು|ಲേലം/i.test(text);
  const hasSaleVerb = /\b(sell|sale|selling|list|listing|offer)\b|ಮಾರಾಟ|ಮಾರಲು|വിൽക്ക|വില്പന/i.test(text);
  if (hasCatchVerb && (hasAuctionVerb || hasSaleVerb)) return hasAuctionVerb ? 'RECORD_CATCH_AND_CREATE_AUCTION' : 'RECORD_CATCH_AND_CREATE_DIRECT_SALE';
  if (hasCatchVerb) return 'RECORD_CATCH';
  if (hasAuctionVerb) return 'CREATE_AUCTION';
  if (hasSaleVerb && /\b(direct|directly)\b/i.test(text)) return 'CREATE_DIRECT_SALE';
  if (hasSaleVerb) return 'CREATE_FISH_LISTING';
  return 'UNKNOWN';
}

async function detectIntentFromAI(text, context = {}) {
  const input = normalizedText(text);
  const species = extractSpecies(input) || context.species || null;
  const quantities = extractQuantities(input);
  const quantity = quantities[0] || null;
  const price = extractPrice(input);
  let intent = detectIntent(input);
  if (intent === 'UNKNOWN' && /\b(direct|directly)\b/i.test(input) && context.species) intent = 'CREATE_DIRECT_SALE';
  if (intent === 'UNKNOWN' && /\b(auction|bid|bidding)\b/i.test(input) && context.species) intent = 'CREATE_AUCTION';
  if (intent === 'UNKNOWN' && /\b(record|catch|caught)\b|ಹಿಡಿ|ಸಿಕ್ಕಿತು|ಹಿಡಿದ|പിടി|കിട്ടി/i.test(input) && context.species) intent = 'RECORD_CATCH';
  if (intent === 'UNKNOWN' && context.lastIntent && (price || quantity || /\b(direct|directly|auction)\b/i.test(input))) intent = context.lastIntent;
  const combinedAction = intent === 'RECORD_CATCH_AND_CREATE_AUCTION' || intent === 'RECORD_CATCH_AND_CREATE_DIRECT_SALE';
  const listingQuantity = combinedAction ? quantities[1] || null : quantity;
  const resolvedQuantity = quantity || context.quantity || null;
  const resolvedPrice = price || context.price || null;
  const parameters = {
    species,
    quantity: resolvedQuantity,
    listingQuantity: combinedAction ? (listingQuantity || context.listingQuantity || null) : (context.listingQuantity || null),
    unit: 'kg',
    price: resolvedPrice,
    quality: extractQuality(input) || context.quality || null,
    priceUnit: 'kg'
  };

  const hasExtractedInformation = Boolean(species || resolvedQuantity || parameters.quality || resolvedPrice);

  if (intent === 'UNKNOWN' && species && resolvedQuantity && !resolvedPrice) {
    return {
      intent: 'RECORD_CATCH',
      parameters,
      confidence: 0.95,
      missing: [],
      missingFields: [],
      requiresConfirmation: true,
      message: `I understood ${resolvedQuantity} kg of ${species}. Record this as your catch?`
    };
  }

  if (intent === 'CREATE_FISH_LISTING' && resolvedQuantity && !/\b(direct|directly|auction|bid|bidding)\b/i.test(input)) {
    return {
      intent: 'CLARIFICATION_REQUIRED',
      parameters,
      confidence: 0.95,
      missing: ['action'],
      missingFields: ['action'],
      requiresConfirmation: false,
      message: `I understand that you have ${resolvedQuantity} kg of ${species}. Would you like to sell it directly or create an auction?`
    };
  }

  if (intent === 'UNKNOWN' && hasExtractedInformation) {
    const missing = resolvedQuantity ? ['action'] : ['quantity', 'action'];
    const message = resolvedQuantity
      ? `I understand that you have ${resolvedQuantity} kg of ${species}. Would you like to record it as your catch, sell it directly, or create an auction?`
      : `I understand that you have ${species}. How many kilos do you have?`;
    return { intent: 'CLARIFICATION_REQUIRED', parameters, confidence: 0.95, missing, missingFields: missing, requiresConfirmation: false, message };
  }

  if (intent === 'UPDATE_VESSEL_STATUS') {
    return { intent, parameters: { status: detectVesselStatus(input) }, confidence: 0.95, requiresConfirmation: true };
  }

  if (intent === 'RECORD_CATCH' || intent === 'RECORD_CATCH_AND_CREATE_AUCTION' || intent === 'RECORD_CATCH_AND_CREATE_DIRECT_SALE') {
    const missing = [];
    if (!species) missing.push('species');
    if (!resolvedQuantity) missing.push('quantity');
    if (combinedAction && !parameters.listingQuantity) missing.push('listingQuantity');
    if (combinedAction && intent === 'RECORD_CATCH_AND_CREATE_DIRECT_SALE' && !resolvedPrice) missing.push('price');
    const response = {
      intent: intent === 'RECORD_CATCH' ? 'RECORD_CATCH' : intent,
      parameters,
      confidence: missing.length ? 0.6 : 0.95,
      missing,
      missingFields: missing,
      requiresConfirmation: missing.length === 0
    };
    return response;
  }

  if (intent === 'CREATE_AUCTION' || intent === 'CREATE_DIRECT_SALE') {
    const missing = [];
    if (!species) missing.push('species');
    if (!resolvedQuantity) missing.push('quantity');
    if ((intent === 'CREATE_AUCTION' || intent === 'CREATE_DIRECT_SALE') && !resolvedPrice) missing.push('price');
    return {
      intent,
      parameters,
      confidence: missing.length ? 0.6 : 0.95,
      missing,
      missingFields: missing,
      requiresConfirmation: missing.length === 0
    };
  }

  if (intent === 'CREATE_FISH_LISTING') {
    const missing = [];
    if (!species) missing.push('species');
    if (!quantity) missing.push('quantity');
    return { intent, parameters, confidence: 0.65, missing, missingFields: missing, requiresConfirmation: true };
  }

  if (intent === 'VIEW_MARKET_PRICE') {
    return { intent, parameters: { species }, confidence: species ? 0.95 : 0.7, missing: species ? [] : ['species'], missingFields: species ? [] : ['species'], requiresConfirmation: false };
  }

  if (intent === 'UNKNOWN') return { intent: 'UNKNOWN', parameters: {}, confidence: 0, requiresConfirmation: false };
  return { intent, parameters: {}, confidence: 0.9, requiresConfirmation: false };
}

async function processVoiceCommand(text, context = {}) {
  if (!text || !String(text).trim()) return { intent: 'UNKNOWN', parameters: {}, confidence: 0, requiresConfirmation: false };
  return detectIntentFromAI(text, context);
}

module.exports = { supportedIntents, processVoiceCommand, detectIntentFromAI };
