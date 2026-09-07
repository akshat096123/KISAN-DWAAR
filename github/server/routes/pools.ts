import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// GET all pools with their member farmer IDs
router.get('/', (req: Request, res: Response): void => {
  try {
    const pools = db.prepare('SELECT * FROM pools ORDER BY created_at DESC').all() as any[];
    const poolFarmers = db.prepare('SELECT * FROM pool_farmers').all() as any[];

    const pfMap = new Map<string, string[]>();
    for (const pf of poolFarmers) {
      if (!pfMap.has(pf.pool_id)) pfMap.set(pf.pool_id, []);
      pfMap.get(pf.pool_id)!.push(pf.farmer_id);
    }

    const formatted = pools.map(p => ({
      id: p.id,
      demandId: p.demand_id,
      farmers: pfMap.get(p.id) || [],
      totalQuantity: p.total_quantity,
      committedQuantity: p.committed_quantity,
      pricePerKg: p.price_per_kg,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pools' });
  }
});

// GET all offers
router.get('/offers', (req: Request, res: Response): void => {
  try {
    const offers = db.prepare('SELECT * FROM offers ORDER BY created_at DESC').all() as any[];
    const formatted = offers.map(o => ({
      id: o.id,
      farmerId: o.farmer_id,
      poolId: o.pool_id,
      demandId: o.demand_id,
      crop: o.crop,
      quantity: o.quantity,
      pricePerKg: o.price_per_kg,
      status: o.status,
      callbackScheduledAt: o.callback_scheduled_at || undefined,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch offers' });
  }
});

// PATCH update offer status (e.g. farmer accepts/rejects via Web or IVR)
router.patch('/offers/:id', (req: Request, res: Response): void => {
  try {
    const { status, callbackScheduledAt } = req.body;
    const offerId = req.params.id;

    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId) as any;
    if (!offer) {
      res.status(404).json({ error: 'Offer not found.' });
      return;
    }

    const now = new Date().toISOString();
    let poolStatusUpdated = false;
    let newPoolStatus = '';

    db.transaction(() => {
      db.prepare(`
        UPDATE offers
        SET status = ?, callback_scheduled_at = ?, updated_at = ?
        WHERE id = ?
      `).run(status, callbackScheduledAt || null, now, offerId);

      // Re-evaluate pool committed quantity if accepted
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(offer.pool_id) as any;
      if (pool) {
        const allOffers = db.prepare('SELECT * FROM offers WHERE pool_id = ?').all(offer.pool_id) as any[];
        const acceptedOffers = allOffers.filter(o => o.status === 'accepted' || (o.id === offerId && status === 'accepted'));
        const newCommitted = acceptedOffers.reduce((sum, o) => sum + o.quantity, 0);
        const isQuorum = newCommitted >= (pool.total_quantity * 0.9);

        newPoolStatus = isQuorum ? 'confirmed' : pool.status;
        if (newPoolStatus !== pool.status || newCommitted !== pool.committed_quantity) {
          poolStatusUpdated = true;
          db.prepare(`
            UPDATE pools SET committed_quantity = ?, status = ?, updated_at = ? WHERE id = ?
          `).run(newCommitted, newPoolStatus, now, pool.id);
        }
      }

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `audit-${Date.now()}`,
        now,
        status === 'accepted' ? 'offer_accepted' : status === 'rejected' ? 'offer_rejected' : 'offer_callback_requested',
        offer.farmer_id,
        'offer',
        offerId,
        JSON.stringify({ status, poolId: offer.pool_id, quantity: offer.quantity })
      );
    })();

    res.json({
      success: true,
      message: `Offer status updated to ${status}`,
      offerId,
      status,
      poolStatus: newPoolStatus || undefined,
    });
  } catch (error: any) {
    console.error('Error updating offer:', error);
    res.status(500).json({ error: error.message || 'Failed to update offer.' });
  }
});

export default router;
