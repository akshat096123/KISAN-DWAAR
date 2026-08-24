import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// GET all IVR call logs
router.get('/logs', (req: Request, res: Response): void => {
  try {
    const logs = db.prepare('SELECT * FROM call_logs ORDER BY timestamp DESC').all() as any[];
    const formatted = logs.map(l => ({
      id: l.id,
      phone: l.phone,
      type: l.type,
      direction: l.direction,
      status: l.status,
      duration: l.duration,
      recordingUrl: l.recording_url || undefined,
      dtmf: JSON.parse(l.dtmf_json || '[]'),
      outcome: l.outcome || undefined,
      language: l.language,
      timestamp: l.timestamp,
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch call logs.' });
  }
});

// POST record an IVR call log
router.post('/logs', (req: Request, res: Response): void => {
  try {
    const { phone, type, direction, status, duration, recordingUrl, dtmf, outcome, language } = req.body;

    if (!phone || !type) {
      res.status(400).json({ error: 'Phone and Call Type are required.' });
      return;
    }

    const logId = `call-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO call_logs (
        id, phone, type, direction, status, duration, recording_url, dtmf_json, outcome, language, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      phone,
      type,
      direction || 'outbound',
      status || 'completed',
      Number(duration) || 45,
      recordingUrl || null,
      JSON.stringify(dtmf || []),
      outcome || null,
      language || 'hi',
      now
    );

    res.status(201).json({
      success: true,
      message: 'IVR call log recorded successfully',
      callId: logId,
    });
  } catch (error: any) {
    console.error('Error logging IVR call:', error);
    res.status(500).json({ error: error.message || 'Failed to record call log.' });
  }
});

// POST trigger automated broadcast to all nearby transporters for a formed pool
router.post('/broadcast', (req: Request, res: Response): void => {
  try {
    const { poolId, customMessage } = req.body;

    if (!poolId) {
      res.status(400).json({ error: 'Pool ID is required to broadcast IVR calls.' });
      return;
    }

    const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(poolId) as any;
    if (!pool) {
      res.status(404).json({ error: 'Pool not found.' });
      return;
    }

    const transporters = db.prepare('SELECT * FROM transporters WHERE is_active = 1').all() as any[];
    const now = new Date().toISOString();
    const callsTriggered: any[] = [];

    db.transaction(() => {
      for (const t of transporters) {
        const callId = `call-trans-${Date.now()}-${t.id.slice(-3)}`;
        db.prepare(`
          INSERT INTO call_logs (id, phone, type, direction, status, duration, outcome, language, timestamp)
          VALUES (?, ?, 'transporter', 'outbound', 'completed', 65, 'rate_submitted', 'hi', ?)
        `).run(callId, t.phone, now);

        callsTriggered.push({
          callId,
          transporterId: t.id,
          name: t.name,
          phone: t.phone,
          status: 'initiated',
        });
      }

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, 'transporter_call_broadcasted', 'SYSTEM-IVR-DAEMON', 'pool', ?, ?)
      `).run(
        `audit-${Date.now()}-broadcast`,
        now,
        poolId,
        JSON.stringify({ poolId, totalTransportersCalled: transporters.length, message: customMessage })
      );
    })();

    res.json({
      success: true,
      message: `Automated regional IVR broadcast initiated to ${transporters.length} certified transport carriers.`,
      poolId,
      transportersContacted: callsTriggered.length,
      calls: callsTriggered,
    });
  } catch (error: any) {
    console.error('Error broadcasting IVR calls:', error);
    res.status(500).json({ error: error.message || 'Failed to broadcast IVR calls.' });
  }
});

export default router;
