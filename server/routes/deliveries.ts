import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

function formatDelivery(d: any, pickups: any[]) {
  return {
    id: d.id,
    poolId: d.pool_id,
    transporterId: d.transporter_id,
    pickupLocations: pickups.map(p => ({
      farmerId: p.farmer_id,
      location: p.location,
      quantity: p.quantity,
      weight: p.weight,
      photoUrl: p.photo_url || undefined,
      timestamp: p.timestamp,
    })),
    deliveryLocation: {
      address: d.delivery_address,
      coordinates: [77.45, 28.66],
    },
    deliveryPhoto: d.delivery_photo || undefined,
    actualWeight: d.actual_weight,
    deliveredAt: d.delivered_at || undefined,
    verifiedAt: d.verified_at || undefined,
    verifiedBy: d.verified_by || undefined,
    verificationSignature: d.verification_signature || undefined,
    status: d.status,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

// GET all deliveries
router.get('/', (req: Request, res: Response): void => {
  try {
    const deliveries = db.prepare('SELECT * FROM deliveries ORDER BY created_at DESC').all() as any[];
    const pickups = db.prepare('SELECT * FROM delivery_pickups').all() as any[];

    const pickMap = new Map<string, any[]>();
    for (const p of pickups) {
      if (!pickMap.has(p.delivery_id)) pickMap.set(p.delivery_id, []);
      pickMap.get(p.delivery_id)!.push(p);
    }

    const formatted = deliveries.map(d => formatDelivery(d, pickMap.get(d.id) || []));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch deliveries' });
  }
});

// POST official QR delivery verification & DBT Escrow release
router.post('/:id/verify', (req: Request, res: Response): void => {
  try {
    const deliveryId = req.params.id;
    const { officialId, actualWeight, inspectorNotes, signature } = req.body;

    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId) as any;
    if (!delivery) {
      res.status(404).json({ error: `Delivery record ${deliveryId} not found in database.` });
      return;
    }

    const officer = officialId || 'GOVT-OFFICER-INSPECTOR-12';
    const now = new Date().toISOString();
    const finalWeight = Number(actualWeight) || delivery.actual_weight;
    const sig = signature || `OFFICIAL-SIGN-SHA256-${Date.now()}`;

    let escrowReleased = false;

    db.transaction(() => {
      // 1. Update delivery to verified
      db.prepare(`
        UPDATE deliveries
        SET status = 'verified', actual_weight = ?, verified_at = ?, verified_by = ?, verification_signature = ?, updated_at = ?
        WHERE id = ?
      `).run(finalWeight, now, officer, sig, now, deliveryId);

      // 2. Update linked pool status to 'delivered' / 'paid'
      db.prepare(`UPDATE pools SET status = 'paid', updated_at = ? WHERE id = ?`).run(now, delivery.pool_id);

      // 3. Release the linked escrow account
      const escrow = db.prepare('SELECT * FROM escrows WHERE pool_id = ?').get(delivery.pool_id) as any;
      if (escrow) {
        db.prepare(`
          UPDATE escrows
          SET status = 'released', released_at = ?, release_reason = 'delivery_verified'
          WHERE id = ?
        `).run(now, escrow.id);
        escrowReleased = true;

        db.prepare(`
          INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
          VALUES (?, ?, 'payment_released', ?, 'escrow', ?, ?)
        `).run(
          `audit-${Date.now()}-escrow`,
          now,
          officer,
          escrow.id,
          JSON.stringify({
            deliveryId,
            totalReleased: escrow.total_amount,
            farmersShare: escrow.farmers_share,
            transporterShare: escrow.transporter_share,
            officialId: officer,
          })
        );
      }

      // 4. Audit log for delivery verification
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, 'delivery_verified', ?, 'delivery', ?, ?)
      `).run(
        `audit-${Date.now()}-deliv`,
        now,
        officer,
        deliveryId,
        JSON.stringify({ actualWeight: finalWeight, inspectorNotes, signature: sig })
      );
    })();

    const updatedDelivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId) as any;
    const pickups = db.prepare('SELECT * FROM delivery_pickups WHERE delivery_id = ?').all(deliveryId) as any[];

    res.json({
      success: true,
      message: `Delivery ${deliveryId} verified successfully by Mandi Inspector. Escrow payouts unlocked!`,
      delivery: formatDelivery(updatedDelivery, pickups),
      escrowReleased,
    });
  } catch (error: any) {
    console.error('Error verifying delivery:', error);
    res.status(500).json({ error: error.message || 'Failed to verify delivery.' });
  }
});

// PATCH update delivery transit status
router.patch('/:id/status', (req: Request, res: Response): void => {
  try {
    const deliveryId = req.params.id;
    const { status, actualWeight } = req.body;

    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId) as any;
    if (!delivery) {
      res.status(404).json({ error: 'Delivery not found.' });
      return;
    }

    const now = new Date().toISOString();
    const weight = actualWeight !== undefined ? Number(actualWeight) : delivery.actual_weight;

    db.transaction(() => {
      db.prepare(`
        UPDATE deliveries
        SET status = ?, actual_weight = ?, delivered_at = CASE WHEN ? = 'delivered' THEN ? ELSE delivered_at END, updated_at = ?
        WHERE id = ?
      `).run(status, weight, status, now, now, deliveryId);

      const actionMap: Record<string, string> = {
        picked_up: 'delivery_picked_up',
        in_transit: 'delivery_in_transit',
        delivered: 'delivery_in_transit',
        verified: 'delivery_verified',
      };

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, 'delivery', ?, ?)
      `).run(
        `audit-${Date.now()}`,
        now,
        actionMap[status] || 'delivery_in_transit',
        delivery.transporter_id,
        deliveryId,
        JSON.stringify({ status, weight })
      );
    })();

    res.json({
      success: true,
      message: `Delivery status updated to ${status}`,
      deliveryId,
      status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update delivery status.' });
  }
});

export default router;
