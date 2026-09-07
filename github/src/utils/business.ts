import { CropType, IDemand, IFarmer, IPool, IEscrowAccount, IBuyer, AuditActionType, IAuditLog, IOffer, ITransportBid, ICandidateCombination } from '../types';

export const MSP_BENCHMARKS: Record<CropType, number> = {
  wheat: 22.75,
  rice: 20.40,
  moong: 77.55,
  masoor: 55.00,
  urad: 66.00,
  chana: 53.35,
  jau: 19.75,
  bajra: 22.50,
  makai: 18.50,
  jowar: 29.70,
};

// National average fallback
export const MANDI_AVERAGES: Record<CropType, number> = {
  wheat: 24.50,
  rice: 23.00,
  moong: 82.00,
  masoor: 58.50,
  urad: 70.00,
  chana: 56.00,
  jau: 21.00,
  bajra: 23.50,
  makai: 19.80,
  jowar: 31.00,
};

// ─── Regional APMC Mandi Price Table ────────────────────────────────────────
// Prices in ₹/kg. Each region has distinct market conditions based on
// surplus/deficit, proximity to consumption centres, and seasonal demand.
// Partial records are fine — missing crops fall back to MANDI_AVERAGES.
export const REGION_MANDI_PRICES: Record<string, Partial<Record<CropType, number>>> = {
  // ── Uttar Pradesh ──────────────────────────────────────────────────────────
  'Meerut APMC, UP':       { wheat: 23.80, rice: 21.50, moong: 80.00, masoor: 57.00, chana: 55.00, urad: 68.50, jau: 20.50, makai: 19.20 },
  'Lucknow APMC, UP':      { wheat: 24.20, rice: 22.00, moong: 81.50, masoor: 58.00, chana: 55.80, urad: 69.00, jau: 20.80, makai: 19.50 },
  'Kanpur APMC, UP':       { wheat: 23.60, rice: 21.80, moong: 80.50, masoor: 57.50, chana: 54.50, urad: 68.00, jau: 20.20, makai: 19.00 },
  'Varanasi APMC, UP':     { wheat: 24.00, rice: 22.50, moong: 82.50, masoor: 59.00, chana: 56.20, urad: 70.00, jau: 21.00, makai: 19.80 },
  'Agra APMC, UP':         { wheat: 23.50, rice: 21.20, moong: 79.50, masoor: 56.50, chana: 54.00, urad: 67.50, jau: 20.00, makai: 18.80 },
  'Mathura APMC, UP':      { wheat: 23.40, rice: 21.00, moong: 79.00, masoor: 56.00, chana: 53.80, urad: 67.00, jau: 19.80, makai: 18.60 },
  'Gorakhpur APMC, UP':    { wheat: 24.50, rice: 23.00, moong: 83.00, masoor: 59.50, chana: 56.80, urad: 71.00, jau: 21.50, makai: 20.20 },
  // ── Punjab ─────────────────────────────────────────────────────────────────
  'Amritsar APMC, Punjab': { wheat: 25.20, rice: 24.00, moong: 84.00, masoor: 60.00, chana: 57.50, urad: 72.00, jau: 22.00, makai: 20.50 },
  'Ludhiana APMC, Punjab': { wheat: 25.50, rice: 24.50, moong: 85.00, masoor: 61.00, chana: 58.00, urad: 72.50, jau: 22.50, makai: 21.00 },
  'Patiala APMC, Punjab':  { wheat: 25.00, rice: 23.80, moong: 84.50, masoor: 60.50, chana: 57.80, urad: 72.20, jau: 22.20, makai: 20.80 },
  'Bathinda APMC, Punjab': { wheat: 24.80, rice: 23.50, moong: 83.50, masoor: 60.00, chana: 57.00, urad: 71.50, jau: 22.00, makai: 20.60 },
  // ── Haryana ────────────────────────────────────────────────────────────────
  'Karnal APMC, Haryana':  { wheat: 24.60, rice: 23.20, moong: 82.50, masoor: 59.00, chana: 56.50, urad: 70.50, jau: 21.50, makai: 20.00 },
  'Hisar APMC, Haryana':   { wheat: 24.00, rice: 22.00, moong: 80.50, masoor: 57.50, chana: 55.50, urad: 69.50, jau: 21.00, bajra: 24.50, makai: 19.50 },
  'Rohtak APMC, Haryana':  { wheat: 24.20, rice: 22.50, moong: 81.00, masoor: 58.00, chana: 55.80, urad: 70.00, jau: 21.20, makai: 19.70 },
  // ── Madhya Pradesh ─────────────────────────────────────────────────────────
  'Indore APMC, MP':       { wheat: 23.00, rice: 22.50, moong: 81.00, masoor: 57.00, chana: 55.50, urad: 69.00, jau: 20.50, jowar: 30.00, makai: 19.00 },
  'Bhopal APMC, MP':       { wheat: 22.80, rice: 22.00, moong: 80.00, masoor: 56.50, chana: 55.00, urad: 68.50, jau: 20.00, jowar: 29.80, makai: 18.80 },
  'Jabalpur APMC, MP':     { wheat: 23.20, rice: 22.80, moong: 81.50, masoor: 57.50, chana: 55.80, urad: 69.50, jau: 20.80, jowar: 30.50, makai: 19.20 },
  'Gwalior APMC, MP':      { wheat: 23.50, rice: 21.80, moong: 80.50, masoor: 57.00, chana: 55.20, urad: 69.00, jau: 20.60, makai: 19.10 },
  'Ujjain APMC, MP':       { wheat: 22.60, rice: 21.50, moong: 79.50, masoor: 56.00, chana: 54.50, urad: 68.00, jau: 19.80, jowar: 29.50, makai: 18.60 },
  // ── Rajasthan ──────────────────────────────────────────────────────────────
  'Jaipur APMC, Rajasthan':   { wheat: 23.40, moong: 78.00, bajra: 23.00, chana: 54.00, urad: 67.00, jau: 20.00, jowar: 29.00 },
  'Jodhpur APMC, Rajasthan':  { wheat: 22.80, moong: 76.00, bajra: 22.50, chana: 53.00, urad: 66.00, jau: 19.50, jowar: 28.50 },
  'Bikaner APMC, Rajasthan':  { wheat: 22.50, moong: 75.50, bajra: 22.00, chana: 52.50, urad: 65.50, jau: 19.20, jowar: 28.00 },
  'Kota APMC, Rajasthan':     { wheat: 23.00, moong: 77.00, bajra: 23.00, chana: 53.50, urad: 66.50, jau: 19.80, jowar: 29.20 },
  // ── Maharashtra ────────────────────────────────────────────────────────────
  'Mumbai APMC, Maharashtra':  { wheat: 26.00, rice: 25.50, moong: 88.00, masoor: 63.00, chana: 60.00, urad: 75.00, jowar: 33.00, makai: 21.50 },
  'Pune APMC, Maharashtra':    { wheat: 25.50, rice: 25.00, moong: 87.00, masoor: 62.00, chana: 59.50, urad: 74.00, jowar: 32.50, makai: 21.00 },
  'Nagpur APMC, Maharashtra':  { wheat: 24.80, rice: 24.00, moong: 85.00, masoor: 61.00, chana: 58.50, urad: 73.00, jowar: 31.80, makai: 20.50 },
  'Nashik APMC, Maharashtra':  { wheat: 25.00, rice: 24.20, moong: 85.50, masoor: 61.20, chana: 58.80, urad: 73.50, jowar: 32.00, makai: 20.80 },
  'Aurangabad APMC, MH':       { wheat: 24.50, rice: 23.50, moong: 84.00, masoor: 60.00, chana: 58.00, urad: 72.00, jowar: 31.50, makai: 20.20 },
  // ── Gujarat ────────────────────────────────────────────────────────────────
  'Ahmedabad APMC, Gujarat':   { wheat: 24.50, rice: 23.50, moong: 83.00, masoor: 59.50, chana: 57.20, urad: 71.50, bajra: 23.80, makai: 20.00 },
  'Rajkot APMC, Gujarat':      { wheat: 24.00, rice: 23.00, moong: 82.00, masoor: 58.80, chana: 56.80, urad: 70.80, bajra: 23.20, makai: 19.60 },
  'Surat APMC, Gujarat':       { wheat: 25.00, rice: 24.00, moong: 85.00, masoor: 61.00, chana: 58.50, urad: 73.00, makai: 20.50 },
  'Vadodara APMC, Gujarat':    { wheat: 24.20, rice: 23.20, moong: 82.50, masoor: 59.00, chana: 57.00, urad: 71.00, bajra: 23.50, makai: 19.80 },
  // ── Bihar ──────────────────────────────────────────────────────────────────
  'Patna APMC, Bihar':         { wheat: 24.80, rice: 23.50, moong: 83.50, masoor: 60.00, chana: 57.00, urad: 71.00, makai: 20.50, jau: 21.00 },
  'Muzaffarpur APMC, Bihar':   { wheat: 24.50, rice: 23.20, moong: 82.50, masoor: 59.00, chana: 56.50, urad: 70.50, makai: 20.20, jau: 20.80 },
  'Gaya APMC, Bihar':          { wheat: 24.20, rice: 23.00, moong: 81.50, masoor: 58.50, chana: 56.00, urad: 70.00, makai: 20.00, jau: 20.50 },
  // ── West Bengal ────────────────────────────────────────────────────────────
  'Kolkata APMC, WB':          { wheat: 26.50, rice: 25.00, moong: 89.00, masoor: 64.00, chana: 61.00, urad: 76.00, makai: 22.00 },
  'Siliguri APMC, WB':         { wheat: 25.50, rice: 24.50, moong: 86.50, masoor: 62.00, chana: 59.00, urad: 74.00, makai: 21.50 },
  // ── Karnataka ──────────────────────────────────────────────────────────────
  'Bengaluru APMC, Karnataka': { wheat: 27.00, rice: 25.50, moong: 90.00, masoor: 65.00, chana: 62.00, urad: 77.00, jowar: 33.50, makai: 22.50 },
  'Mysuru APMC, Karnataka':    { wheat: 26.50, rice: 25.00, moong: 88.50, masoor: 63.50, chana: 61.00, urad: 75.50, jowar: 32.80, makai: 22.00 },
  'Hubli APMC, Karnataka':     { wheat: 25.80, rice: 24.50, moong: 87.00, masoor: 62.50, chana: 60.00, urad: 74.50, jowar: 32.00, makai: 21.50 },
  // ── Andhra Pradesh ─────────────────────────────────────────────────────────
  'Hyderabad APMC, AP':        { wheat: 26.00, rice: 24.80, moong: 87.50, masoor: 63.00, chana: 61.00, urad: 75.50, jowar: 32.50, makai: 22.00 },
  'Vijayawada APMC, AP':       { wheat: 25.50, rice: 24.50, moong: 86.50, masoor: 62.00, chana: 60.00, urad: 74.50, jowar: 32.00, makai: 21.50 },
  'Guntur APMC, AP':           { wheat: 25.20, rice: 24.20, moong: 86.00, masoor: 61.50, chana: 59.50, urad: 74.00, jowar: 31.80, makai: 21.20 },
  // ── Tamil Nadu ─────────────────────────────────────────────────────────────
  'Chennai APMC, TN':          { wheat: 27.50, rice: 26.00, moong: 91.00, masoor: 66.00, chana: 63.00, urad: 78.00, makai: 23.00 },
  'Coimbatore APMC, TN':       { wheat: 27.00, rice: 25.50, moong: 89.50, masoor: 64.50, chana: 62.00, urad: 77.00, makai: 22.50 },
  'Madurai APMC, TN':          { wheat: 27.20, rice: 25.80, moong: 90.00, masoor: 65.00, chana: 62.50, urad: 77.50, makai: 22.80 },
  // ── Delhi NCR ──────────────────────────────────────────────────────────────
  'Azadpur Mandi, Delhi':      { wheat: 26.50, rice: 25.00, moong: 88.00, masoor: 63.50, chana: 61.00, urad: 76.50, jau: 22.00, makai: 21.50 },
  'Ghazipur Mandi, Delhi':     { wheat: 26.00, rice: 24.50, moong: 87.00, masoor: 62.50, chana: 60.50, urad: 75.50, jau: 21.80, makai: 21.00 },
  // ── Odisha ─────────────────────────────────────────────────────────────────
  'Bhubaneswar APMC, Odisha':  { wheat: 25.00, rice: 24.00, moong: 85.00, masoor: 61.00, chana: 58.50, urad: 73.00, makai: 20.80 },
  'Cuttack APMC, Odisha':      { wheat: 24.80, rice: 23.80, moong: 84.50, masoor: 60.50, chana: 58.00, urad: 72.50, makai: 20.50 },
  // ── Chhattisgarh ───────────────────────────────────────────────────────────
  'Raipur APMC, CG':           { wheat: 23.50, rice: 22.50, moong: 82.00, masoor: 58.00, chana: 55.50, urad: 69.50, jowar: 30.50, makai: 19.50 },
  // ── Uttarakhand ────────────────────────────────────────────────────────────
  'Dehradun APMC, UK':         { wheat: 24.00, rice: 23.00, moong: 82.00, masoor: 58.50, chana: 56.00, urad: 70.00, jau: 20.50, makai: 19.50 },
  'Haridwar APMC, UK':         { wheat: 23.80, rice: 22.80, moong: 81.50, masoor: 58.00, chana: 55.80, urad: 69.50, jau: 20.20, makai: 19.30 },
  // ── Himachal Pradesh ───────────────────────────────────────────────────────
  'Shimla APMC, HP':           { wheat: 25.00, rice: 24.00, moong: 85.00, masoor: 61.00, chana: 58.00, urad: 72.00, jau: 21.50, makai: 20.00 },
  'Solan APMC, HP':            { wheat: 24.50, rice: 23.50, moong: 84.00, masoor: 60.00, chana: 57.50, urad: 71.00, jau: 21.00, makai: 19.80 },
  // ── Jharkhand ──────────────────────────────────────────────────────────────
  'Ranchi APMC, Jharkhand':    { wheat: 24.50, rice: 23.20, moong: 83.00, masoor: 59.50, chana: 57.00, urad: 71.00, makai: 20.20 },
  // ── Assam ──────────────────────────────────────────────────────────────────
  'Guwahati APMC, Assam':      { wheat: 27.00, rice: 25.50, moong: 90.00, masoor: 64.50, chana: 62.00, urad: 77.00, makai: 22.50 },
  // ── Kerala ─────────────────────────────────────────────────────────────────
  'Kochi APMC, Kerala':        { wheat: 28.50, rice: 27.00, moong: 92.00, masoor: 67.00, chana: 64.00, urad: 79.00, makai: 23.50 },
  'Thiruvananthapuram APMC':   { wheat: 28.00, rice: 26.50, moong: 91.00, masoor: 66.00, chana: 63.00, urad: 78.00, makai: 23.00 },
};

// Export all region names as a sorted list for dropdowns
export const ALL_MANDI_REGIONS = Object.keys(REGION_MANDI_PRICES).sort();

export function calculateFairPrice(crop: CropType, location: string, grade: string = 'A'): {
  fairPrice: number;
  msp: number;
  mandiPrice: number;
  confidence: number;
  reason: string;
} {
  const msp = MSP_BENCHMARKS[crop] || 22.0;

  // Look up region-specific price; fall back to national average
  const regionPrices = REGION_MANDI_PRICES[location];
  const mandiPrice = (regionPrices?.[crop]) ?? MANDI_AVERAGES[crop] ?? (msp * 1.08);

  const gradeMultiplier = grade === 'Premium' ? 1.10 : grade === 'A' ? 1.05 : grade === 'B' ? 1.0 : 0.92;
  const rawFairPrice = (mandiPrice * 0.6 + msp * 0.4) * gradeMultiplier;
  const fairPrice = Math.round(rawFairPrice * 10) / 10;

  const regionLabel = location || 'National Average';
  const reason = `AI Fair Price for ${crop.toUpperCase()} at ${regionLabel}: APMC mandi avg ₹${mandiPrice.toFixed(2)}/kg × 60% + MSP ₹${msp}/kg × 40% = ₹${((mandiPrice * 0.6 + msp * 0.4)).toFixed(2)}/kg, adjusted for Grade ${grade} (×${gradeMultiplier}).`;

  return {
    fairPrice,
    msp,
    mandiPrice,
    confidence: 0.94,
    reason,
  };
}

/**
 * Finds all feasible Farmer or Multi-Farmer combinations that can satisfy the Buyer's requested crop, quantity, and max price.
 */
export function findCandidateCombinations(demand: IDemand, farmers: IFarmer[]): ICandidateCombination[] {
  // Filter farmers who have registered inventory for the crop with price <= demand.maxPricePerKg
  const eligibleFarmersWithCrop = farmers.filter(f => {
    if (!f.isActive || !f.identityVerified) return false;
    const inv = f.inventory.find(i => i.crop === demand.crop);
    return inv && inv.availableQuantity > 0 && inv.minPricePerKg <= demand.maxPricePerKg;
  });

  const combinations: ICandidateCombination[] = [];
  const requiredKg = demand.quantity;

  // 1. Single Farmer Matches (if any farmer alone has >= requiredKg)
  eligibleFarmersWithCrop.forEach(f => {
    const inv = f.inventory.find(i => i.crop === demand.crop)!;
    if (inv.availableQuantity >= requiredKg) {
      combinations.push({
        id: `comb-single-${f.id}`,
        farmers: [{ farmer: f, allocatedKg: requiredKg, minPricePerKg: inv.minPricePerKg }],
        totalQuantity: requiredKg,
        avgPricePerKg: inv.minPricePerKg,
        totalCost: requiredKg * inv.minPricePerKg,
        pickupVillages: [f.location.village],
        estimatedDistanceKm: 65,
      });
    }
  });

  // 2. Multi-Farmer 2-3 Farmer Clusters (Greedy by lowest price, by proximity, and balanced)
  // Combination Strategy A: Lowest Cost First
  const sortedByPrice = [...eligibleFarmersWithCrop].sort((a, b) => {
    const priceA = a.inventory.find(i => i.crop === demand.crop)?.minPricePerKg || 999;
    const priceB = b.inventory.find(i => i.crop === demand.crop)?.minPricePerKg || 999;
    return priceA - priceB;
  });

  let accKg = 0;
  const clusterA: ICandidateCombination['farmers'] = [];
  const villagesA: string[] = [];

  for (const f of sortedByPrice) {
    if (accKg >= requiredKg) break;
    const inv = f.inventory.find(i => i.crop === demand.crop)!;
    const allocated = Math.min(inv.availableQuantity, requiredKg - accKg);
    if (allocated > 0) {
      clusterA.push({ farmer: f, allocatedKg: allocated, minPricePerKg: inv.minPricePerKg });
      accKg += allocated;
      if (!villagesA.includes(f.location.village)) villagesA.push(f.location.village);
    }
  }

  if (accKg >= requiredKg && clusterA.length > 1) {
    const totalCost = clusterA.reduce((sum, item) => sum + (item.allocatedKg * item.minPricePerKg), 0);
    combinations.push({
      id: `comb-best-price-${Date.now()}`,
      farmers: clusterA,
      totalQuantity: requiredKg,
      avgPricePerKg: Math.round((totalCost / requiredKg) * 100) / 100,
      totalCost,
      pickupVillages: villagesA,
      estimatedDistanceKm: 85 + (villagesA.length * 15),
    });
  }

  // Combination Strategy B: Smallholder Inclusion First (smallest land holdings)
  const sortedByLand = [...eligibleFarmersWithCrop].sort((a, b) => a.landSize - b.landSize);
  let accKgB = 0;
  const clusterB: ICandidateCombination['farmers'] = [];
  const villagesB: string[] = [];

  for (const f of sortedByLand) {
    if (accKgB >= requiredKg) break;
    const inv = f.inventory.find(i => i.crop === demand.crop)!;
    const allocated = Math.min(inv.availableQuantity, requiredKg - accKgB);
    if (allocated > 0) {
      clusterB.push({ farmer: f, allocatedKg: allocated, minPricePerKg: inv.minPricePerKg });
      accKgB += allocated;
      if (!villagesB.includes(f.location.village)) villagesB.push(f.location.village);
    }
  }

  if (accKgB >= requiredKg && clusterB.length > 1) {
    const totalCost = clusterB.reduce((sum, item) => sum + (item.allocatedKg * item.minPricePerKg), 0);
    // Don't duplicate if identical to clusterA
    const idListA = clusterA.map(c => c.farmer.id).sort().join(',');
    const idListB = clusterB.map(c => c.farmer.id).sort().join(',');
    if (idListA !== idListB) {
      combinations.push({
        id: `comb-smallholders-${Date.now()}`,
        farmers: clusterB,
        totalQuantity: requiredKg,
        avgPricePerKg: Math.round((totalCost / requiredKg) * 100) / 100,
        totalCost,
        pickupVillages: villagesB,
        estimatedDistanceKm: 95 + (villagesB.length * 18),
      });
    }
  }

  // Fallback default if not enough inventory was registered yet
  if (combinations.length === 0 && eligibleFarmersWithCrop.length > 0) {
    const fallbackList: ICandidateCombination['farmers'] = eligibleFarmersWithCrop.slice(0, 3).map(f => ({
      farmer: f,
      allocatedKg: Math.round(requiredKg / Math.min(3, eligibleFarmersWithCrop.length)),
      minPricePerKg: f.inventory.find(i => i.crop === demand.crop)?.minPricePerKg || demand.maxPricePerKg,
    }));
    const totalCost = fallbackList.reduce((sum, item) => sum + (item.allocatedKg * item.minPricePerKg), 0);
    combinations.push({
      id: `comb-matched-fallback-${Date.now()}`,
      farmers: fallbackList,
      totalQuantity: requiredKg,
      avgPricePerKg: Math.round((totalCost / requiredKg) * 100) / 100,
      totalCost,
      pickupVillages: fallbackList.map(c => c.farmer.location.village),
      estimatedDistanceKm: 110,
    });
  }

  return combinations;
}

/**
 * Locks the deal on the selected combination and constructs the pool and individual farmer offers.
 */
export function lockCombinationDeal(
  demand: IDemand, 
  combination: ICandidateCombination, 
  buyer: IBuyer
): { pool: IPool; offers: IOffer[]; escrow: IEscrowAccount } {
  const poolId = `pool-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const offers: IOffer[] = combination.farmers.map(item => ({
    id: `offer-${Date.now()}-${item.farmer.id}`,
    farmerId: item.farmer.id,
    poolId,
    demandId: demand.id,
    crop: demand.crop,
    quantity: item.allocatedKg,
    pricePerKg: item.minPricePerKg,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const pool: IPool = {
    id: poolId,
    demandId: demand.id,
    farmers: combination.farmers.map(c => c.farmer.id),
    totalQuantity: demand.quantity,
    committedQuantity: 0,
    pricePerKg: combination.avgPricePerKg,
    status: 'forming',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const cropValue = combination.totalCost;
  const transporterShare = Math.round(cropValue * 0.08);
  const platformFee = Math.round(cropValue * 0.02);
  const totalAmount = cropValue + transporterShare + platformFee;

  const escrow: IEscrowAccount = {
    id: `escrow-${pool.id}`,
    poolId: pool.id,
    buyerId: buyer.id,
    totalAmount,
    platformFee,
    farmersShare: cropValue,
    transporterShare,
    status: 'held',
    lockedAt: new Date().toISOString(),
    releaseReason: 'delivery_verified',
  };

  return { pool, offers, escrow };
}

export function calculateEscrow(pool: IPool, buyer: IBuyer, estimatedTransportCost: number = 0): IEscrowAccount {
  const cropValue = pool.totalQuantity * pool.pricePerKg;
  const transporterShare = estimatedTransportCost > 0 ? estimatedTransportCost : Math.round(cropValue * 0.08);
  const platformFee = Math.round(cropValue * 0.02);
  const farmersShare = cropValue;
  const totalAmount = farmersShare + transporterShare + platformFee;

  return {
    id: `escrow-${pool.id}`,
    poolId: pool.id,
    buyerId: buyer.id,
    totalAmount,
    platformFee,
    farmersShare,
    transporterShare,
    status: 'held',
    lockedAt: new Date().toISOString(),
    releaseReason: 'delivery_verified',
  };
}

export function releaseEscrow(escrow: IEscrowAccount): IEscrowAccount {
  return {
    ...escrow,
    status: 'released',
    releasedAt: new Date().toISOString(),
    releaseReason: 'delivery_verified',
  };
}

export function evaluateTransportBids(bids: ITransportBid[]): ITransportBid | null {
  const validBids = bids.filter(b => b.status === 'submitted' && b.ratePerQuintalKm > 0);
  if (validBids.length === 0) return null;

  return validBids.reduce((lowest, current) => 
    current.ratePerQuintalKm < lowest.ratePerQuintalKm ? current : lowest
  );
}

export function logAudit(
  action: AuditActionType,
  userId: string,
  entity: string,
  entityId: string,
  details: Record<string, unknown>
): IAuditLog {
  return {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date().toISOString(),
    action,
    userId,
    entityType: entity,
    entityId,
    details,
  };
}