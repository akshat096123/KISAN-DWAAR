import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

function formatEscrow(e: any) {
  return {
    id: e.id,
    poolId: e.pool_id,
    buyerId: e.buyer_id,
    totalAmount: e.total_amount,
    platformFee: e.platform_fee,
    farmersShare: e.farmers_share,
    transporterShare: e.transporter_share,
    status: e.status,
    lockedAt: e.locked_at,
    releasedAt: e.released_at || undefined,
    releaseReason: e.release_reason || 'delivery_verified',
  };
}

// GET all escrow accounts
router.get('/', (req: Request, res: Response): void => {
  try {
    const escrows = db.prepare('SELECT * FROM escrows ORDER BY locked_at DESC').all();
    res.json(escrows.map(formatEscrow));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch escrows' });
  }
});

// POST release escrow
router.post('/:id/release', (req: Request, res: Response): void => {
  try {
    const escrowId = req.params.id;
    const { releaseReason, officialId } = req.body;

    const escrow = db.prepare('SELECT * FROM escrows WHERE id = ?').get(escrowId) as any;
    if (!escrow) {
      res.status(404).json({ error: 'Escrow account not found.' });
      return;
    }

    const now = new Date().toISOString();
    const reason = releaseReason || 'delivery_verified';
    const officer = officialId || 'GOVT-OFFICER-INSPECTOR-12';

    db.transaction(() => {
      db.prepare(`
        UPDATE escrows
        SET status = 'released', released_at = ?, release_reason = ?
        WHERE id = ?
      `).run(now, reason, escrowId);

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, 'escrow_released', ?, 'escrow', ?, ?)
      `).run(
        `audit-${Date.now()}`,
        now,
        officer,
        escrowId,
        JSON.stringify({ totalAmount: escrow.total_amount, reason, officialId: officer })
      );
    })();

    res.json({
      success: true,
      message: `Escrow ${escrowId} released successfully via DBT.`,
      escrow: {
        ...formatEscrow(escrow),
        status: 'released',
        releasedAt: now,
        releaseReason: reason,
      },
    });
  } catch (error: any) {
    console.error('Error releasing escrow:', error);
    res.status(500).json({ error: error.message || 'Failed to release escrow.' });
  }
});

export default router;
