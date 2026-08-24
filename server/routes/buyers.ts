import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

function formatBuyer(b: any) {
  return {
    id: b.id,
    aadhaarNumber: b.aadhaar_number || undefined,
    organizationName: b.organization_name,
    taxId: b.tax_id,
    creditLimit: b.credit_limit,
    creditUsed: b.credit_used,
    verificationStatus: b.verification_status,
    registeredByOfficialId: b.registered_by,
    location: {
      address: b.address,
      coordinates: [77.45, 28.66],
    },
    contactPerson: b.contact_person,
    phone: b.phone,
    email: b.email,
    createdAt: b.created_at,
    isActive: Boolean(b.is_active),
  };
}

// GET all buyers
router.get('/', (req: Request, res: Response): void => {
  try {
    const buyers = db.prepare('SELECT * FROM buyers ORDER BY created_at DESC').all();
    res.json(buyers.map(formatBuyer));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch buyers' });
  }
});

// POST register buyer (Official Registration)
router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      organizationName,
      taxId,
      aadhaarNumber,
      contactPerson,
      phone,
      email,
      address,
      registeredByOfficialId,
    } = req.body;

    if (!organizationName || !taxId || !phone) {
      res.status(400).json({ error: 'Organization Name, GSTIN/Tax ID, and Phone are required.' });
      return;
    }

    const buyerId = `buyer-${Date.now().toString().slice(-4)}`;
    const officialId = registeredByOfficialId || 'GOVT-OFFICER-INSPECTOR-12';
    const now = new Date().toISOString();

    const insertBuyer = db.prepare(`
      INSERT INTO buyers (
        id, aadhaar_number, organization_name, tax_id, credit_limit, credit_used,
        verification_status, registered_by, address, contact_person, phone, email,
        created_at, is_active
      ) VALUES (?, ?, ?, ?, 1000000, 0, 'verified', ?, ?, ?, ?, ?, ?, 1)
    `);

    db.transaction(() => {
      insertBuyer.run(
        buyerId,
        aadhaarNumber || null,
        organizationName,
        taxId,
        officialId,
        address || 'Central Agri Warehouse, NCR',
        contactPerson || organizationName,
        phone,
        email || 'buyer@procurement.in',
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
        'buyer',
        buyerId,
        JSON.stringify({ organizationName, taxId, phone })
      );
    })();

    const created = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
    res.status(201).json({
      success: true,
      message: 'Buyer registered successfully',
      buyer: formatBuyer(created),
    });
  } catch (error: any) {
    console.error('Error registering buyer:', error);
    res.status(500).json({ error: error.message || 'Failed to register buyer.' });
  }
});

// GET all demands
router.get('/demands', (req: Request, res: Response): void => {
  try {
    const demands = db.prepare('SELECT * FROM demands ORDER BY created_at DESC').all();
    const formatted = demands.map((d: any) => ({
      id: d.id,
      buyerId: d.buyer_id,
      crop: d.crop,
      quantity: d.quantity,
      maxPricePerKg: d.max_price_per_kg,
      pricePerKg: d.price_per_kg,
      unit: d.unit,
      deliveryLocation: {
        address: d.delivery_address,
        coordinates: [77.45, 28.66],
      },
      deliveryDeadline: d.delivery_deadline,
      grade: d.grade,
      selectedCombinationId: d.selected_combination_id || undefined,
      status: d.status,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch demands' });
  }
});

// POST post buyer demand
router.post('/demands', (req: Request, res: Response): void => {
  try {
    const {
      buyerId,
      crop,
      quantity,
      maxPricePerKg,
      pricePerKg,
      unit,
      deliveryAddress,
      deliveryDeadline,
      grade,
    } = req.body;

    if (!buyerId || !crop || !quantity || !maxPricePerKg) {
      res.status(400).json({ error: 'Buyer ID, Crop, Quantity, and Max Price are required.' });
      return;
    }

    const demandId = `demand-${Date.now()}`;
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO demands (
          id, buyer_id, crop, quantity, max_price_per_kg, price_per_kg, unit,
          delivery_address, delivery_deadline, grade, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        demandId,
        buyerId,
        crop,
        Number(quantity),
        Number(maxPricePerKg),
        Number(pricePerKg || maxPricePerKg),
        unit || 'kg',
        deliveryAddress || 'Warehouse Depot, UP',
        deliveryDeadline || now,
        grade || 'A',
        now,
        now
      );

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        now,
        'demands_posted',
        buyerId,
        'demand',
        demandId,
        JSON.stringify({ crop, quantity, maxPricePerKg, grade, deliveryAddress })
      );
    })();

    const created = db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId) as any;
    res.status(201).json({
      success: true,
      message: 'Demand posted successfully',
      demand: {
        id: created.id,
        buyerId: created.buyer_id,
        crop: created.crop,
        quantity: created.quantity,
        maxPricePerKg: created.max_price_per_kg,
        pricePerKg: created.price_per_kg,
        unit: created.unit,
        deliveryLocation: { address: created.delivery_address, coordinates: [77.45, 28.66] },
        deliveryDeadline: created.delivery_deadline,
        grade: created.grade,
        status: created.status,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error posting demand:', error);
    res.status(500).json({ error: error.message || 'Failed to post demand.' });
  }
});

export default router;
