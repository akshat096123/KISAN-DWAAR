import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// Helper to format farmer row from DB into typed object
function formatFarmer(f: any, inventories: any[]) {
  return {
    id: f.id,
    aadhaarNumber: f.aadhaar_number,
    name: f.name,
    phone: f.phone,
    email: f.email || undefined,
    identityVerified: Boolean(f.identity_verified),
    registeredByOfficialId: f.registered_by,
    landSize: f.land_size,
    crops: Array.from(new Set(inventories.map((i: any) => i.crop))),
    inventory: inventories.map((i: any) => ({
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
      coordinates: [77.45, 28.66],
    },
    bankDetails: f.bank_account
      ? {
          vpa: f.bank_vpa || `${f.name.toLowerCase().replace(/\s+/g, '')}@upi`,
          accountNumber: f.bank_account,
          ifsc: f.bank_ifsc || 'SBIN0001234',
        }
      : undefined,
    preferredLanguage: f.preferred_language || 'hi',
    createdAt: f.created_at,
    isActive: Boolean(f.is_active),
  };
}

// GET all farmers with their inventories
router.get('/', (req: Request, res: Response): void => {
  try {
    const farmersRows = db.prepare('SELECT * FROM farmers ORDER BY created_at DESC').all();
    const inventoryRows = db.prepare('SELECT * FROM farmer_inventory').all();

    const invMap = new Map<string, any[]>();
    for (const inv of inventoryRows) {
      const fId = (inv as any).farmer_id;
      if (!invMap.has(fId)) invMap.set(fId, []);
      invMap.get(fId)!.push(inv);
    }

    const result = farmersRows.map((f: any) => formatFarmer(f, invMap.get(f.id) || []));
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching farmers:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch farmers' });
  }
});

// GET single farmer by ID
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const f = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.params.id);
    if (!f) {
      res.status(404).json({ error: 'Farmer not found' });
      return;
    }
    const inventories = db.prepare('SELECT * FROM farmer_inventory WHERE farmer_id = ?').all(req.params.id);
    res.json(formatFarmer(f, inventories));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch farmer' });
  }
});

// POST register a new farmer (Official Aadhaar e-KYC Onboarding)
router.post('/', (req: Request, res: Response): void => {
  try {
    const {
      aadhaarNumber,
      name,
      phone,
      email,
      landSize,
      village,
      district,
      state,
      bankAccount,
      bankIfsc,
      bankVpa,
      cropType,
      cropQuantity,
      cropMinDemandPrice,
      cropGrade,
      registeredByOfficialId,
      preferredLanguage,
    } = req.body;

    if (!aadhaarNumber || !name || !phone) {
      res.status(400).json({ error: 'Aadhaar Number, Name, and Phone are required.' });
      return;
    }

    // Check if Aadhaar already exists
    const existing = db.prepare('SELECT id FROM farmers WHERE aadhaar_number = ?').get(aadhaarNumber);
    if (existing) {
      res.status(409).json({ error: `A farmer with Aadhaar ${aadhaarNumber} is already registered.` });
      return;
    }

    const farmerId = `farmer-${Date.now().toString().slice(-4)}`;
    const officialId = registeredByOfficialId || 'GOVT-OFFICER-INSPECTOR-12';
    const now = new Date().toISOString();

    const insertFarmer = db.prepare(`
      INSERT INTO farmers (
        id, aadhaar_number, name, phone, email, identity_verified, registered_by,
        land_size, village, district, state, bank_vpa, bank_account, bank_ifsc,
        preferred_language, created_at, is_active
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertInventory = db.prepare(`
      INSERT INTO farmer_inventory (
        id, farmer_id, crop, available_quantity, min_price_per_kg, grade,
        registered_by, registered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const registerTx = db.transaction(() => {
      insertFarmer.run(
        farmerId,
        aadhaarNumber,
        name,
        phone,
        email || null,
        officialId,
        Number(landSize) || 1.0,
        village || 'Rampur',
        district || 'Meerut',
        state || 'Uttar Pradesh',
        bankVpa || null,
        bankAccount || null,
        bankIfsc || 'SBIN0001234',
        preferredLanguage || 'hi',
        now
      );

      if (cropType && cropQuantity) {
        insertInventory.run(
          `inv-${farmerId}-${cropType}-0`,
          farmerId,
          cropType,
          Number(cropQuantity),
          Number(cropMinDemandPrice) || 24.0,
          cropGrade || 'A',
          officialId,
          now
        );
      }

      insertAudit.run(
        `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        now,
        'user_registered_by_govt',
        officialId,
        'farmer',
        farmerId,
        JSON.stringify({ aadhaar: aadhaarNumber, name, phone, crop: cropType }),
        '127.0.0.1'
      );
    });

    registerTx();

    const createdFarmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmerId);
    const inventories = db.prepare('SELECT * FROM farmer_inventory WHERE farmer_id = ?').all(farmerId);

    res.status(201).json({
      success: true,
      message: 'Farmer registered successfully via Aadhaar e-KYC',
      farmer: formatFarmer(createdFarmer, inventories),
    });
  } catch (error: any) {
    console.error('Error registering farmer:', error);
    res.status(500).json({ error: error.message || 'Failed to register farmer.' });
  }
});

// POST add crop harvest entry for an existing farmer
router.post('/:id/inventory', (req: Request, res: Response): void => {
  try {
    const farmerId = req.params.id;
    const { crop, availableQuantity, minPricePerKg, grade, registeredByOfficialId } = req.body;

    if (!crop || !availableQuantity || !minPricePerKg) {
      res.status(400).json({ error: 'Crop type, available quantity, and minimum price are required.' });
      return;
    }

    const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmerId);
    if (!farmer) {
      res.status(404).json({ error: 'Farmer not found.' });
      return;
    }

    const officialId = registeredByOfficialId || 'GOVT-OFFICER-INSPECTOR-12';
    const now = new Date().toISOString();
    const invId = `inv-${farmerId}-${crop}-${Date.now().toString().slice(-4)}`;

    const addInvTx = db.transaction(() => {
      // Remove any previous record for the same crop to avoid duplicate inventory confusion or update it
      db.prepare('DELETE FROM farmer_inventory WHERE farmer_id = ? AND crop = ?').run(farmerId, crop);

      db.prepare(`
        INSERT INTO farmer_inventory (id, farmer_id, crop, available_quantity, min_price_per_kg, grade, registered_by, registered_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invId,
        farmerId,
        crop,
        Number(availableQuantity),
        Number(minPricePerKg),
        grade || 'A',
        officialId,
        now
      );

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        now,
        'crop_harvest_registered_by_govt',
        officialId,
        'inventory',
        invId,
        JSON.stringify({ farmerId, crop, quantity: availableQuantity, minPrice: minPricePerKg, grade })
      );
    });

    addInvTx();

    const inventories = db.prepare('SELECT * FROM farmer_inventory WHERE farmer_id = ?').all(farmerId);
    res.json({
      success: true,
      message: `Crop harvest ${crop} added successfully for ${(farmer as any).name}`,
      farmer: formatFarmer(farmer, inventories),
      inventory: {
        crop,
        availableQuantity: Number(availableQuantity),
        minPricePerKg: Number(minPricePerKg),
        grade: grade || 'A',
        registeredByOfficialId: officialId,
        registeredAt: now,
      },
    });
  } catch (error: any) {
    console.error('Error adding crop harvest:', error);
    res.status(500).json({ error: error.message || 'Failed to add crop harvest inventory.' });
  }
});

export default router;
