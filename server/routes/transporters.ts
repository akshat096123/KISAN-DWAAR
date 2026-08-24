import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

function formatTransporter(t: any) {
  return {
    id: t.id,
    aadhaarNumber: t.aadhaar_number,
    name: t.name,
    phone: t.phone,
    vehicleType: t.vehicle_type,
    vehicleNumber: t.vehicle_number,
    license: t.license || undefined,
    rating: t.rating,
    hasSmartphone: Boolean(t.has_smartphone),
    registeredByOfficialId: t.registered_by,
    isActive: Boolean(t.is_active),
    createdAt: t.created_at,
  };
}

// GET all transporters
router.get('/', (req: Request, res: Response): void => {
  try {
    const transporters = db.prepare('SELECT * FROM transporters ORDER BY created_at DESC').all();
    res.json(transporters.map(formatTransporter));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transporters' });
  }
});

// POST register transporter (Official Registration)
router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      aadhaarNumber,
      name,
      phone,
      vehicleType,
      vehicleNumber,
      license,
      hasSmartphone,
      registeredByOfficialId,
    } = req.body;

    if (!aadhaarNumber || !name || !phone || !vehicleNumber) {
      res.status(400).json({ error: 'Aadhaar Number, Name, Phone, and Vehicle Number are required.' });
      return;
    }

    const transporterId = `transporter-${Date.now().toString().slice(-4)}`;
    const officialId = registeredByOfficialId || 'GOVT-OFFICER-INSPECTOR-12';
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO transporters (
          id, aadhaar_number, name, phone, vehicle_type, vehicle_number, license,
          rating, has_smartphone, registered_by, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 4.9, ?, ?, 1, ?)
      `).run(
        transporterId,
        aadhaarNumber,
        name,
        phone,
        vehicleType || 'Tata 407 (2.5 Ton)',
        vehicleNumber,
        license || null,
        hasSmartphone ? 1 : 0,
        officialId,
        now
      );

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        now,
        'user_registered_by_govt',
        officialId,
        'transporter',
        transporterId,
        JSON.stringify({ name, vehicleNumber, phone })
      );
    })();

    const created = db.prepare('SELECT * FROM transporters WHERE id = ?').get(transporterId);
    res.status(201).json({
      success: true,
      message: 'Transporter registered successfully via Aadhaar e-KYC',
      transporter: formatTransporter(created),
    });
  } catch (error: any) {
    console.error('Error registering transporter:', error);
    res.status(500).json({ error: error.message || 'Failed to register transporter.' });
  }
});

// GET all transport bids
router.get('/bids', (req: Request, res: Response): void => {
  try {
    const bids = db.prepare('SELECT * FROM transport_bids ORDER BY submitted_at DESC').all();
    const formatted = bids.map((b: any) => ({
      id: b.id,
      poolId: b.pool_id,
      transporterId: b.transporter_id,
      quantity: b.quantity,
      ratePerQuintalKm: b.rate_per_quintal_km,
      estimatedDistance: b.estimated_distance,
      estimatedCost: b.estimated_cost,
      status: b.status,
      submittedAt: b.submitted_at,
      awardedAt: b.awarded_at || undefined,
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transport bids' });
  }
});

// POST submit a single-round reverse auction bid
router.post('/bids', (req: Request, res: Response): void => {
  try {
    const { poolId, transporterId, ratePerQuintalKm, estimatedDistance } = req.body;

    if (!poolId || !transporterId || !ratePerQuintalKm) {
      res.status(400).json({ error: 'Pool ID, Transporter ID, and Rate per Quintal-Km are required.' });
      return;
    }

    // Check if transporter has already submitted a bid for this pool
    const existing = db.prepare('SELECT id FROM transport_bids WHERE pool_id = ? AND transporter_id = ?').get(poolId, transporterId);
    if (existing) {
      res.status(400).json({ error: 'Violation: In Single-Round Reverse Auction, each transporter can bid strictly once.' });
      return;
    }

    const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(poolId) as any;
    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const rate = Number(ratePerQuintalKm);
    const distance = Number(estimatedDistance) || 120;
    const quintals = pool.total_quantity / 100;
    const estimatedCost = Math.round(rate * distance * quintals);
    const bidId = `bid-${Date.now()}-${transporterId.slice(-3)}`;
    const now = new Date().toISOString();

    let isWinner = false;
    let newDeliveryRecord: any = null;

    db.transaction(() => {
      // 1. Insert new bid
      db.prepare(`
        INSERT INTO transport_bids (
          id, pool_id, transporter_id, quantity, rate_per_quintal_km,
          estimated_distance, estimated_cost, status, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
      `).run(
        bidId,
        poolId,
        transporterId,
        pool.total_quantity,
        rate,
        distance,
        estimatedCost,
        now
      );

      // 2. Fetch all bids for this pool to determine the lowest bidder
      const allPoolBids = db.prepare('SELECT * FROM transport_bids WHERE pool_id = ?').all(poolId) as any[];
      const lowestBid = allPoolBids.reduce((prev, curr) => (curr.rate_per_quintal_km < prev.rate_per_quintal_km ? curr : prev), allPoolBids[0]);

      if (lowestBid && lowestBid.id === bidId) {
        isWinner = true;
        // Award this bid, decline others
        db.prepare('UPDATE transport_bids SET status = ? WHERE pool_id = ?').run('declined', poolId);
        db.prepare('UPDATE transport_bids SET status = ?, awarded_at = ? WHERE id = ?').run('awarded', now, bidId);

        // Update escrow transporter share with the winning bid cost
        db.prepare('UPDATE escrows SET transporter_share = ? WHERE pool_id = ?').run(estimatedCost, poolId);

        // Check if delivery already exists or create manifest
        const existingDelivery = db.prepare('SELECT id FROM deliveries WHERE pool_id = ?').get(poolId);
        if (!existingDelivery) {
          const deliveryId = `DEL-${Date.now().toString().slice(-6)}`;
          const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(pool.demand_id) as any;
          const poolFarmers = db.prepare('SELECT * FROM pool_farmers WHERE pool_id = ?').all(poolId) as any[];

          db.prepare(`
            INSERT INTO deliveries (
              id, pool_id, transporter_id, delivery_address, actual_weight, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
          `).run(
            deliveryId,
            poolId,
            transporterId,
            demand?.delivery_address || 'Central APMC Warehouse, UP',
            pool.total_quantity,
            now,
            now
          );

          for (let i = 0; i < poolFarmers.length; i++) {
            const pf = poolFarmers[i];
            const f = db.prepare('SELECT * FROM farmers WHERE id = ?').get(pf.farmer_id) as any;
            db.prepare(`
              INSERT INTO delivery_pickups (
                id, delivery_id, farmer_id, location, quantity, weight, timestamp
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              `pick-${deliveryId}-${pf.farmer_id}-${i}`,
              deliveryId,
              pf.farmer_id,
              `${f?.village || 'Farm'} (${f?.district || 'Rural'})`,
              pf.allocated_kg,
              pf.allocated_kg,
              now
            );
          }

          newDeliveryRecord = {
            id: deliveryId,
            poolId,
            transporterId,
            status: 'pending',
          };
        }
      }

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        now,
        isWinner ? 'transport_bid_won' : 'transport_bid_placed',
        transporterId,
        'bid',
        bidId,
        JSON.stringify({ rate, distance, estimatedCost, isWinner, poolId })
      );
    })();

    res.status(201).json({
      success: true,
      message: isWinner
        ? '🏆 Congratulations! Your sealed bid is the lowest. Transport contract awarded automatically!'
        : 'Bid recorded in the sealed reverse auction ledger.',
      isWinner,
      bid: {
        id: bidId,
        poolId,
        transporterId,
        quantity: pool.total_quantity,
        ratePerQuintalKm: rate,
        estimatedDistance: distance,
        estimatedCost,
        status: isWinner ? 'awarded' : 'submitted',
        submittedAt: now,
      },
      delivery: newDeliveryRecord,
    });
  } catch (error: any) {
    console.error('Error submitting transport bid:', error);
    res.status(500).json({ error: error.message || 'Failed to submit transport bid.' });
  }
});

export default router;
