const FISH_SPECIES = [
  'Mackerel',
  'Sardine',
  'Tuna',
  'Anchovy',
  'Pomfret',
  'Seer Fish',
  'King Fish',
  'Prawns',
  'Crab',
  'Squid',
  'Ribbon Fish',
  'Catla',
  'Rohu',
  'Other'
];

function normalizeFishSpecies(value) {
  const text = String(value || '').trim().toLowerCase();
  return FISH_SPECIES.find((species) => species.toLowerCase() === text) || null;
}
