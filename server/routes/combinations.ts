import { Router, Request, Response } from 'express';
import { db } from '../db';
import { findCandidateCombinations } from '../../src/utils/business';

const router = Router();

// Helper to get formatted farmers with inventories from DB
function getFarmersWithInventory() {
  const farmersRows = db.prepare('SELECT * FROM farmers WHERE is_active = 1 AND identity_verified = 1').all() as any[];
  const inventoryRows = db.prepare('SELECT * FROM farmer_inventory').all() as any[];

  const invMap = new Map<string, any[]>();
  for (const inv of inventoryRows) {
    if (!invMap.has(inv.farmer_id)) invMap.set(inv.farmer_id, []);
    invMap.get(inv.farmer_id)!.push(inv);
  }

  return farmersRows.map(f => {
    const invs = invMap.get(f.id) || [];
    return {
      id: f.id,
      aadhaarNumber: f.aadhaar_number,
      name: f.name,
      phone: f.phone,
      email: f.email || undefined,
      identityVerified: Boolean(f.identity_verified),
      registeredByOfficialId: f.registered_by,
      landSize: f.land_size,
      crops: Array.from(new Set(invs.map((i: any) => i.crop))),
      inventory: invs.map((i: any) => ({
        crop: i.crop,
        availableQuantity: i.available_quantity,
        minPricePerKg: i.min_price_per_kg,
        grade: i.grade,
        registeredByOfficialId: i.registered_by,
        registeredAt: i.registered_at,
      })),
      location: {
        village: f.village,
        district: f.district,
        state: f.state,
        coordinates: [77.45, 28.66] as [number, number],
      },
      preferredLanguage: f.preferred_language || 'hi',
      createdAt: f.created_at,
      isActive: Boolean(f.is_active),
    };
  });
}

// POST search candidate combinations from SQLite
router.post('/search', (req: Request, res: Response): void => {
  try {
    const { crop, quantity, maxPricePerKg, grade, deliveryAddress, deliveryDeadline, buyerId } = req.body;

    if (!crop || !quantity || !maxPricePerKg) {
      res.status(400).json({ error: 'Crop, Quantity, and Max Price are required.' });
      return;
    }

    const tempDemand = {
      id: `temp-demand-${Date.now()}`,
      buyerId: buyerId || 'buyer-001',
      crop,
      quantity: Number(quantity),
      maxPricePerKg: Number(maxPricePerKg),
      pricePerKg: Number(maxPricePerKg),
      unit: 'kg',
      deliveryLocation: { address: deliveryAddress || 'Agri Warehouse, UP', coordinates: [77.45, 28.66] as [number, number] },
      deliveryDeadline: deliveryDeadline || new Date().toISOString(),
      grade: grade || 'A',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const farmers = getFarmersWithInventory();
    const combinations = findCandidateCombinations(tempDemand, farmers as any);

    res.json({
      success: true,
      count: combinations.length,
      combinations,
    });
  } catch (error: any) {
    console.error('Error finding combinations:', error);
    res.status(500).json({ error: error.message || 'Failed to search combinations.' });
  }
});

// POST lock combination deal into database (Demand, Pool, Offers, Escrow, Broadcast trigger)
router.post('/deal', (req: Request, res: Response): void => {
  try {
    const { buyerId, crop, quantity, maxPricePerKg, grade, deliveryAddress, deliveryDeadline, combination } = req.body;

    if (!buyerId || !crop || !quantity || !combination || !combination.farmers) {
      res.status(400).json({ error: 'Incomplete deal payload. Buyer ID, Crop, and Combination are required.' });
      return;
    }

    const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId) as any;
    if (!buyer) {
      res.status(404).json({ error: 'Buyer not found.' });
      return;
    }

    const now = new Date().toISOString();
    const demandId = `demand-${Date.now()}`;
    const poolId = `pool-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const cropValue = combination.totalCost;
    const transporterShare = Math.round(cropValue * 0.08);
    const platformFee = Math.round(cropValue * 0.02);
    const totalAmount = cropValue + transporterShare + platformFee;
    const escrowId = `escrow-${poolId}`;

    const createdOffers: any[] = [];

    db.transaction(() => {
      // 1. Insert Demand
      db.prepare(`
        INSERT INTO demands (
          id, buyer_id, crop, quantity, max_price_per_kg, price_per_kg, unit,
          delivery_address, delivery_deadline, grade, selected_combination_id,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'kg', ?, ?, ?, ?, 'matched', ?, ?)
      `).run(
        demandId,
        buyerId,
        crop,
        Number(quantity),
        Number(maxPricePerKg),
        combination.avgPricePerKg,
        deliveryAddress || 'Central Warehouse, UP',
        deliveryDeadline || now,
        grade || 'A',
        combination.id,
        now,
        now
      );

      // 2. Insert Pool
      db.prepare(`
        INSERT INTO pools (
          id, demand_id, total_quantity, committed_quantity, price_per_kg, status, created_at, updated_at
        ) VALUES (?, ?, ?, 0, ?, 'forming', ?, ?)
      `).run(
        poolId,
        demandId,
        Number(quantity),
        combination.avgPricePerKg,
        now,
        now
      );

      // 3. Insert Pool Farmers & Individual Farmer Offers
      for (const item of combination.farmers) {
        const farmerId = item.farmer.id;
        const offerId = `offer-${Date.now()}-${farmerId}`;

        db.prepare(`
          INSERT INTO pool_farmers (id, pool_id, farmer_id, allocated_kg, price_per_kg)
          VALUES (?, ?, ?, ?, ?)
        `).run(`pf-${poolId}-${farmerId}`, poolId, farmerId, item.allocatedKg, item.minPricePerKg);

        db.prepare(`
          INSERT INTO offers (
            id, farmer_id, pool_id, demand_id, crop, quantity, price_per_kg, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).run(offerId, farmerId, poolId, demandId, crop, item.allocatedKg, item.minPricePerKg, now, now);

        createdOffers.push({
          id: offerId,
          farmerId,
          poolId,
          demandId,
          crop,
          quantity: item.allocatedKg,
          pricePerKg: item.minPricePerKg,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });
      }

      // 4. Insert Escrow Account
      db.prepare(`
        INSERT INTO escrows (
          id, pool_id, buyer_id, total_amount, platform_fee, farmers_share,
          transporter_share, status, locked_at, release_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'held', ?, 'delivery_verified')
      `).run(
        escrowId,
        poolId,
        buyerId,
        totalAmount,
        platformFee,
        cropValue,
        transporterShare,
        now
      );

      // 5. Insert Audit Logs
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `audit-${Date.now()}-1`,
        now,
        'combination_deal_locked',
        buyerId,
        'pool',
        poolId,
        JSON.stringify({ combinationId: combination.id, farmersCount: combination.farmers.length, cropValue, totalAmount })
      );

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `audit-${Date.now()}-2`,
        now,
        'payment_escrow_locked',
        buyerId,
        'escrow',
        escrowId,
        JSON.stringify({ totalAmount, farmersShare: cropValue, transporterShare, platformFee })
      );
    })();

    res.status(201).json({
      success: true,
      message: 'Deal locked successfully! Escrow funds held and farmer pool formed.',
      deal: {
        demandId,
        pool: {
          id: poolId,
          demandId,
          farmers: combination.farmers.map((f: any) => f.farmer.id),
          totalQuantity: Number(quantity),
          committedQuantity: 0,
          pricePerKg: combination.avgPricePerKg,
          status: 'forming',
          createdAt: now,
          updatedAt: now,
        },
        offers: createdOffers,
        escrow: {
          id: escrowId,
          poolId,
          buyerId,
          totalAmount,
          platformFee,
          farmersShare: cropValue,
          transporterShare,
          status: 'held',
          lockedAt: now,
        },
      },
    });
  } catch (error: any) {
    console.error('Error locking combination deal:', error);
    res.status(500).json({ error: error.message || 'Failed to lock deal into database.' });
  }
});

export default router;
