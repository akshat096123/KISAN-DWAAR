import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// GET audit logs
router.get('/', (req: Request, res: Response): void => {
  try {
    const { action, userId, entityType, limit } = req.query;
    let query = 'SELECT * FROM audit_logs';
    const conditions: string[] = [];
    const params: any[] = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    if (entityType) {
      conditions.push('entity_type = ?');
      params.push(entityType);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(Number(limit));
    }

    const rows = db.prepare(query).all(...params) as any[];
    const formatted = rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      userId: r.user_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: JSON.parse(r.details_json || '{}'),
      ipHash: r.ip_hash || undefined,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs.' });
  }
});

// POST append audit log
router.post('/', (req: Request, res: Response): void => {
  try {
    const { action, userId, entityType, entityId, details, ipHash } = req.body;

    if (!action || !userId || !entityType || !entityId) {
      res.status(400).json({ error: 'Action, UserId, EntityType, and EntityId are required.' });
      return;
    }

    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      now,
      action,
      userId,
      entityType,
      entityId,
      JSON.stringify(details || {}),
      ipHash || '127.0.0.1'
    );

    res.status(201).json({
      success: true,
      id,
      timestamp: now,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record audit log.' });
  }
});

export default router;
