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

function normalizeIntent(raw) {
  if (!raw) return 'UNKNOWN';
  const text = String(raw).trim().toUpperCase();
  if (text.includes('RETURNING') || text.includes('ARRIVED') || text.includes('DOCKED') || text.includes('ANCHORE')) return 'UPDATE_VESSEL_STATUS';
  if (text.includes('START') && text.includes('TRIP')) return 'START_FISHING_TRIP';
  if (text.includes('END') && text.includes('TRIP')) return 'END_FISHING_TRIP';
  if (text.includes('CAUGHT') || text.includes('CATCH')) return 'RECORD_CATCH';
  if (text.includes('AUCTION') || text.includes('SELL') || text.includes('LIST')) return 'CREATE_AUCTION';
  if (text.includes('DIRECT') || text.includes('SALE')) return 'CREATE_DIRECT_SALE';
  if (text.includes('PRICE') || text.includes('MARKET')) return 'VIEW_MARKET_PRICE';
  if (text.includes('EARN') || text.includes('MONEY')) return 'VIEW_EARNINGS';
  if (text.includes('AUCTION') && text.includes('SHOW')) return 'VIEW_AUCTIONS';
  if (text.includes('ORDER')) return 'VIEW_ORDERS';
  if (text.includes('HELP')) return 'HELP';
  if (text.includes('EMERGENCY') || text.includes('NEED HELP') || text.includes('HELP ME')) return 'EMERGENCY_ALERT';
  return 'UNKNOWN';
}

async function detectIntentFromAI(text) {
  const intent = normalizeIntent(text);

  if (intent === 'UNKNOWN') {
    return { intent: 'UNKNOWN' };
  }

  if (intent === 'UPDATE_VESSEL_STATUS') {
    const status = /returning|arrived|docked|anchored|departed|fishing|at harbor/i.test(text)
      ? (text.match(/returning|arrived|docked|anchored|departed|fishing|at harbor/i) || [])[0]?.toUpperCase().replace(/ /g, '_') || 'RETURNING'
      : 'RETURNING';

    return {
      intent: 'UPDATE_VESSEL_STATUS',
      status,
      requiresConfirmation: true
    };
  }

  if (intent === 'RECORD_CATCH') {
    const fishMatch = text.match(/(?:of\s+)?([A-Za-z]+)(?:\s+fish)?/i) || ['Mackerel'];
    const quantityMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|kilograms?)/i);
    const fish = fishMatch[1] || 'Mackerel';
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 0;

    return {
      intent: 'RECORD_CATCH',
      fishSpecies: fish.charAt(0).toUpperCase() + fish.slice(1),
      quantity,
      unit: 'kg',
      requiresConfirmation: true
    };
  }

  if (intent === 'CREATE_AUCTION') {
    const quantityMatch = text.match(/(\d+(?:\.\d+)?)\s*(kilos?|kg|kilograms?)/i);
    const priceMatch = text.match(/at\s*(\d+(?:\.\d+)?)\s*(rupees?|rs|₹)/i);
    return {
      intent: 'CREATE_AUCTION',
      fishSpecies: text.match(/([A-Za-z]+)/i)?.[1] || 'Mackerel',
      quantity: quantityMatch ? Number(quantityMatch[1]) : 20,
      unit: 'kg',
      startingPrice: priceMatch ? Number(priceMatch[1]) : 300,
      requiresConfirmation: true,
      saleType: 'AUCTION'
    };
  }

  return {
    intent,
    requiresConfirmation: false
  };
}

async function processVoiceCommand(text) {
  if (!text || !text.trim()) {
    return { intent: 'UNKNOWN' };
  }

  const validation = detectIntentFromAI(text);
  return validation;
}

module.exports = {
  supportedIntents,
  processVoiceCommand,
  detectIntentFromAI
};
