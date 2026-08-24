import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { initDatabase, db } from './db';
import { seedDatabaseIfEmpty } from './seed';

import authRouter from './routes/auth';
import farmersRouter from './routes/farmers';
import buyersRouter from './routes/buyers';
import transportersRouter from './routes/transporters';
import combinationsRouter from './routes/combinations';
import poolsRouter from './routes/pools';
import deliveriesRouter from './routes/deliveries';
import escrowsRouter from './routes/escrows';
import pricingRouter from './routes/pricing';
import auditRouter from './routes/audit';
import ivrRouter from './routes/ivr';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/api/health')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Initialize SQLite & Seed
initDatabase();
seedDatabaseIfEmpty();

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/farmers', farmersRouter);
app.use('/api/buyers', buyersRouter);
app.use('/api/transporters', transportersRouter);
app.use('/api/combinations', combinationsRouter);
app.use('/api/pools', poolsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/escrows', escrowsRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/ivr', ivrRouter);

// Healthcheck
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: 'sqlite-connected',
    version: '1.0.0',
  });
});

// Full state aggregator endpoint for initial synchronized frontend load
app.get('/api/state', (req: Request, res: Response): void => {
  try {
    const farmersRows = db.prepare('SELECT * FROM farmers ORDER BY created_at DESC').all() as any[];
    const inventoryRows = db.prepare('SELECT * FROM farmer_inventory').all() as any[];
    const invMap = new Map<string, any[]>();
    for (const inv of inventoryRows) {
      if (!invMap.has(inv.farmer_id)) invMap.set(inv.farmer_id, []);
      invMap.get(inv.farmer_id)!.push(inv);
    }
    const farmers = farmersRows.map(f => ({
      id: f.id,
      aadhaarNumber: f.aadhaar_number,
      name: f.name,
      phone: f.phone,
      email: f.email || undefined,
      identityVerified: Boolean(f.identity_verified),
      registeredByOfficialId: f.registered_by,
      landSize: f.land_size,
      crops: Array.from(new Set((invMap.get(f.id) || []).map((i: any) => i.crop))),
      inventory: (invMap.get(f.id) || []).map((i: any) => ({
        crop: i.crop,
        availableQuantity: i.available_quantity,
        minPricePerKg: i.min_price_per_kg,
        grade: i.grade,
        registeredByOfficialId: i.registered_by,
        registeredAt: i.registered_at,
      })),
      location: { village: f.village, district: f.district, state: f.state, coordinates: [77.45, 28.66] },
      bankDetails: f.bank_account ? { vpa: f.bank_vpa || `${f.name.toLowerCase().replace(/\s+/g, '')}@upi`, accountNumber: f.bank_account, ifsc: f.bank_ifsc || 'SBIN0001234' } : undefined,
      preferredLanguage: f.preferred_language || 'hi',
      createdAt: f.created_at,
      isActive: Boolean(f.is_active),
    }));

    const buyers = (db.prepare('SELECT * FROM buyers ORDER BY created_at DESC').all() as any[]).map(b => ({
      id: b.id,
      aadhaarNumber: b.aadhaar_number || undefined,
      organizationName: b.organization_name,
      taxId: b.tax_id,
      creditLimit: b.credit_limit,
      creditUsed: b.credit_used,
      verificationStatus: b.verification_status,
      registeredByOfficialId: b.registered_by,
      location: { address: b.address, coordinates: [77.45, 28.66] },
      contactPerson: b.contact_person,
      phone: b.phone,
      email: b.email,
      createdAt: b.created_at,
      isActive: Boolean(b.is_active),
    }));

    const demands = (db.prepare('SELECT * FROM demands ORDER BY created_at DESC').all() as any[]).map(d => ({
      id: d.id,
      buyerId: d.buyer_id,
      crop: d.crop,
      quantity: d.quantity,
      maxPricePerKg: d.max_price_per_kg,
      pricePerKg: d.price_per_kg,
      unit: d.unit,
      deliveryLocation: { address: d.delivery_address, coordinates: [77.45, 28.66] },
      deliveryDeadline: d.delivery_deadline,
      grade: d.grade,
      selectedCombinationId: d.selected_combination_id || undefined,
      status: d.status,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    const poolsRows = db.prepare('SELECT * FROM pools ORDER BY created_at DESC').all() as any[];
    const poolFarmers = db.prepare('SELECT * FROM pool_farmers').all() as any[];
    const pfMap = new Map<string, string[]>();
    for (const pf of poolFarmers) {
      if (!pfMap.has(pf.pool_id)) pfMap.set(pf.pool_id, []);
      pfMap.get(pf.pool_id)!.push(pf.farmer_id);
    }
    const pools = poolsRows.map(p => ({
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

    const transporters = (db.prepare('SELECT * FROM transporters ORDER BY created_at DESC').all() as any[]).map(t => ({
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
    }));

    const offers = (db.prepare('SELECT * FROM offers ORDER BY created_at DESC').all() as any[]).map(o => ({
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

    const transportBids = (db.prepare('SELECT * FROM transport_bids ORDER BY submitted_at DESC').all() as any[]).map(b => ({
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

    const deliveriesRows = db.prepare('SELECT * FROM deliveries ORDER BY created_at DESC').all() as any[];
    const pickups = db.prepare('SELECT * FROM delivery_pickups').all() as any[];
    const pickMap = new Map<string, any[]>();
    for (const p of pickups) {
      if (!pickMap.has(p.delivery_id)) pickMap.set(p.delivery_id, []);
      pickMap.get(p.delivery_id)!.push(p);
    }
    const deliveries = deliveriesRows.map(d => ({
      id: d.id,
      poolId: d.pool_id,
      transporterId: d.transporter_id,
      pickupLocations: (pickMap.get(d.id) || []).map(p => ({
        farmerId: p.farmer_id,
        location: p.location,
        quantity: p.quantity,
        weight: p.weight,
        photoUrl: p.photo_url || undefined,
        timestamp: p.timestamp,
      })),
      deliveryLocation: { address: d.delivery_address, coordinates: [77.45, 28.66] },
      deliveryPhoto: d.delivery_photo || undefined,
      actualWeight: d.actual_weight,
      deliveredAt: d.delivered_at || undefined,
      verifiedAt: d.verified_at || undefined,
      verifiedBy: d.verified_by || undefined,
      verificationSignature: d.verification_signature || undefined,
      status: d.status,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    const escrows = (db.prepare('SELECT * FROM escrows ORDER BY locked_at DESC').all() as any[]).map(e => ({
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
    }));

    const auditLogs = (db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all() as any[]).map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      action: a.action,
      userId: a.user_id,
      entityType: a.entity_type,
      entityId: a.entity_id,
      details: JSON.parse(a.details_json || '{}'),
      ipHash: a.ip_hash || undefined,
    }));

    const callLogs = (db.prepare('SELECT * FROM call_logs ORDER BY timestamp DESC LIMIT 100').all() as any[]).map(c => ({
      id: c.id,
      phone: c.phone,
      type: c.type,
      direction: c.direction,
      status: c.status,
      duration: c.duration,
      recordingUrl: c.recording_url || undefined,
      dtmf: JSON.parse(c.dtmf_json || '[]'),
      outcome: c.outcome || undefined,
      language: c.language,
      timestamp: c.timestamp,
    }));

    res.json({
      farmers,
      buyers,
      demands,
      pools,
      transporters,
      offers,
      transportBids,
      deliveries,
      escrows,
      auditLogs,
      callLogs,
    });
  } catch (error: any) {
    console.error('Error fetching global state:', error);
    res.status(500).json({ error: error.message || 'Failed to aggregate state.' });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: err.message || 'An unexpected internal server error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 KISAN-DWAAR API Server running on port ${PORT} (http://localhost:${PORT})`);
});

export default app;
