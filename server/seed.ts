import { db } from './db';
import {
  farmers,
  buyers,
  demands,
  pools,
  transporters,
  offers,
  transportBids,
  escrows,
  deliveries,
  callLogs,
  auditLogs,
} from '../src/data/seedData';

export function seedDatabaseIfEmpty() {
  const farmerCount = db.prepare('SELECT count(*) as count FROM farmers').get() as { count: number };
  if (farmerCount.count > 0) {
    console.log('📦 Database already contains records. Skipping initial seeding.');
    return;
  }

  console.log('🌱 Empty database detected. Seeding initial records into SQLite...');

  const insertFarmer = db.prepare(`
    INSERT INTO farmers (id, aadhaar_number, name, phone, email, identity_verified, registered_by, land_size, village, district, state, bank_vpa, bank_account, bank_ifsc, preferred_language, created_at, is_active)
    VALUES (@id, @aadhaarNumber, @name, @phone, @email, @identityVerified, @registeredByOfficialId, @landSize, @village, @district, @state, @bankVpa, @bankAccount, @bankIfsc, @preferredLanguage, @createdAt, @isActive)
  `);

  const insertInventory = db.prepare(`
    INSERT INTO farmer_inventory (id, farmer_id, crop, available_quantity, min_price_per_kg, grade, registered_by, registered_at)
    VALUES (@id, @farmerId, @crop, @availableQuantity, @minPricePerKg, @grade, @registeredByOfficialId, @registeredAt)
  `);

  const insertBuyer = db.prepare(`
    INSERT INTO buyers (id, aadhaar_number, organization_name, tax_id, credit_limit, credit_used, verification_status, registered_by, address, contact_person, phone, email, created_at, is_active)
    VALUES (@id, @aadhaarNumber, @organizationName, @taxId, @creditLimit, @creditUsed, @verificationStatus, @registeredByOfficialId, @address, @contactPerson, @phone, @email, @createdAt, @isActive)
  `);

  const insertTransporter = db.prepare(`
    INSERT INTO transporters (id, aadhaar_number, name, phone, vehicle_type, vehicle_number, license, rating, has_smartphone, registered_by, is_active, created_at)
    VALUES (@id, @aadhaarNumber, @name, @phone, @vehicleType, @vehicleNumber, @license, @rating, @hasSmartphone, @registeredByOfficialId, @isActive, @createdAt)
  `);

  const insertDemand = db.prepare(`
    INSERT INTO demands (id, buyer_id, crop, quantity, max_price_per_kg, price_per_kg, unit, delivery_address, delivery_deadline, grade, selected_combination_id, status, created_at, updated_at)
    VALUES (@id, @buyerId, @crop, @quantity, @maxPricePerKg, @pricePerKg, @unit, @deliveryAddress, @deliveryDeadline, @grade, @selectedCombinationId, @status, @createdAt, @updatedAt)
  `);

  const insertPool = db.prepare(`
    INSERT INTO pools (id, demand_id, total_quantity, committed_quantity, price_per_kg, status, created_at, updated_at)
    VALUES (@id, @demandId, @totalQuantity, @committedQuantity, @pricePerKg, @status, @createdAt, @updatedAt)
  `);

  const insertPoolFarmer = db.prepare(`
    INSERT INTO pool_farmers (id, pool_id, farmer_id, allocated_kg, price_per_kg)
    VALUES (@id, @poolId, @farmerId, @allocatedKg, @pricePerKg)
  `);

  const insertOffer = db.prepare(`
    INSERT INTO offers (id, farmer_id, pool_id, demand_id, crop, quantity, price_per_kg, status, callback_scheduled_at, created_at, updated_at)
    VALUES (@id, @farmerId, @poolId, @demandId, @crop, @quantity, @pricePerKg, @status, @callbackScheduledAt, @createdAt, @updatedAt)
  `);

  const insertBid = db.prepare(`
    INSERT INTO transport_bids (id, pool_id, transporter_id, quantity, rate_per_quintal_km, estimated_distance, estimated_cost, status, submitted_at, awarded_at)
    VALUES (@id, @poolId, @transporterId, @quantity, @ratePerQuintalKm, @estimatedDistance, @estimatedCost, @status, @submittedAt, @awardedAt)
  `);

  const insertDelivery = db.prepare(`
    INSERT INTO deliveries (id, pool_id, transporter_id, delivery_address, delivery_photo, actual_weight, delivered_at, verified_at, verified_by, verification_signature, status, created_at, updated_at)
    VALUES (@id, @poolId, @transporterId, @deliveryAddress, @deliveryPhoto, @actualWeight, @deliveredAt, @verifiedAt, @verifiedBy, @verificationSignature, @status, @createdAt, @updatedAt)
  `);

  const insertPickup = db.prepare(`
    INSERT INTO delivery_pickups (id, delivery_id, farmer_id, location, quantity, weight, photo_url, timestamp)
    VALUES (@id, @deliveryId, @farmerId, @location, @quantity, @weight, @photoUrl, @timestamp)
  `);

  const insertEscrow = db.prepare(`
    INSERT INTO escrows (id, pool_id, buyer_id, total_amount, platform_fee, farmers_share, transporter_share, status, locked_at, released_at, release_reason)
    VALUES (@id, @poolId, @buyerId, @totalAmount, @platformFee, @farmersShare, @transporterShare, @status, @lockedAt, @releasedAt, @releaseReason)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, user_id, entity_type, entity_id, details_json, ip_hash)
    VALUES (@id, @timestamp, @action, @userId, @entityType, @entityId, @detailsJson, @ipHash)
  `);

  const insertCallLog = db.prepare(`
    INSERT INTO call_logs (id, phone, type, direction, status, duration, recording_url, dtmf_json, outcome, language, timestamp)
    VALUES (@id, @phone, @type, @direction, @status, @duration, @recordingUrl, @dtmfJson, @outcome, @language, @timestamp)
  `);

  const seedTransaction = db.transaction(() => {
    // 1. Farmers & Inventory
    for (const f of farmers) {
      insertFarmer.run({
        id: f.id,
        aadhaarNumber: f.aadhaarNumber,
        name: f.name,
        phone: f.phone,
        email: f.email || null,
        identityVerified: f.identityVerified ? 1 : 0,
        registeredByOfficialId: f.registeredByOfficialId,
        landSize: f.landSize,
        village: f.location.village,
        district: f.location.district,
        state: f.location.state,
        bankVpa: f.bankDetails?.vpa || null,
        bankAccount: f.bankDetails?.accountNumber || null,
        bankIfsc: f.bankDetails?.ifsc || null,
        preferredLanguage: f.preferredLanguage || 'hi',
        createdAt: f.createdAt,
        isActive: f.isActive ? 1 : 0,
      });

      for (let i = 0; i < (f.inventory || []).length; i++) {
        const inv = f.inventory[i];
        insertInventory.run({
          id: `inv-${f.id}-${inv.crop}-${i}`,
          farmerId: f.id,
          crop: inv.crop,
          availableQuantity: inv.availableQuantity,
          minPricePerKg: inv.minPricePerKg,
          grade: inv.grade,
          registeredByOfficialId: inv.registeredByOfficialId,
          registeredAt: inv.registeredAt,
        });
      }
    }

    // 2. Buyers
    for (const b of buyers) {
      insertBuyer.run({
        id: b.id,
        aadhaarNumber: b.aadhaarNumber || null,
        organizationName: b.organizationName,
        taxId: b.taxId,
        creditLimit: b.creditLimit,
        creditUsed: b.creditUsed,
        verificationStatus: b.verificationStatus,
        registeredByOfficialId: b.registeredByOfficialId,
        address: b.location.address,
        contactPerson: b.contactPerson,
        phone: b.phone,
        email: b.email,
        createdAt: b.createdAt,
        isActive: b.isActive ? 1 : 0,
      });
    }

    // 3. Transporters
    for (const t of transporters) {
      insertTransporter.run({
        id: t.id,
        aadhaarNumber: t.aadhaarNumber,
        name: t.name,
        phone: t.phone,
        vehicleType: t.vehicleType,
        vehicleNumber: t.vehicleNumber,
        license: t.license || null,
        rating: t.rating,
        hasSmartphone: t.hasSmartphone ? 1 : 0,
        registeredByOfficialId: t.registeredByOfficialId,
        isActive: t.isActive ? 1 : 0,
        createdAt: t.createdAt,
      });
    }

    // 4. Demands
    for (const d of demands) {
      insertDemand.run({
        id: d.id,
        buyerId: d.buyerId,
        crop: d.crop,
        quantity: d.quantity,
        maxPricePerKg: d.maxPricePerKg,
        pricePerKg: d.pricePerKg,
        unit: d.unit || 'kg',
        deliveryAddress: d.deliveryLocation.address,
        deliveryDeadline: d.deliveryDeadline,
        grade: d.grade,
        selectedCombinationId: d.selectedCombinationId || null,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      });
    }

    // 5. Pools & Pool Farmers
    for (const p of pools) {
      insertPool.run({
        id: p.id,
        demandId: p.demandId,
        totalQuantity: p.totalQuantity,
        committedQuantity: p.committedQuantity,
        pricePerKg: p.pricePerKg,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      });

      for (let i = 0; i < p.farmers.length; i++) {
        const fId = p.farmers[i];
        insertPoolFarmer.run({
          id: `pf-${p.id}-${fId}`,
          poolId: p.id,
          farmerId: fId,
          allocatedKg: Math.round(p.totalQuantity / p.farmers.length),
          pricePerKg: p.pricePerKg,
        });
      }
    }

    // 6. Offers
    for (const o of offers) {
      insertOffer.run({
        id: o.id,
        farmerId: o.farmerId,
        poolId: o.poolId,
        demandId: o.demandId,
        crop: o.crop,
        quantity: o.quantity,
        pricePerKg: o.pricePerKg,
        status: o.status,
        callbackScheduledAt: o.callbackScheduledAt || null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      });
    }

    // 7. Transport Bids
    for (const b of transportBids) {
      insertBid.run({
        id: b.id,
        poolId: b.poolId,
        transporterId: b.transporterId,
        quantity: b.quantity,
        ratePerQuintalKm: b.ratePerQuintalKm,
        estimatedDistance: b.estimatedDistance,
        estimatedCost: b.estimatedCost,
        status: b.status,
        submittedAt: b.submittedAt,
        awardedAt: b.awardedAt || null,
      });
    }

    // 8. Deliveries & Pickups
    for (const d of deliveries) {
      insertDelivery.run({
        id: d.id,
        poolId: d.poolId,
        transporterId: d.transporterId,
        deliveryAddress: d.deliveryLocation.address,
        deliveryPhoto: d.deliveryPhoto || null,
        actualWeight: d.actualWeight,
        deliveredAt: d.deliveredAt || null,
        verifiedAt: d.verifiedAt || null,
        verifiedBy: d.verifiedBy || null,
        verificationSignature: d.verificationSignature || null,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      });

      for (let i = 0; i < (d.pickupLocations || []).length; i++) {
        const pick = d.pickupLocations[i];
        insertPickup.run({
          id: `pick-${d.id}-${pick.farmerId}-${i}`,
          deliveryId: d.id,
          farmerId: pick.farmerId,
          location: pick.location,
          quantity: pick.quantity,
          weight: pick.weight,
          photoUrl: pick.photoUrl || null,
          timestamp: pick.timestamp,
        });
      }
    }

    // 9. Escrows
    for (const e of escrows) {
      insertEscrow.run({
        id: e.id,
        poolId: e.poolId,
        buyerId: e.buyerId,
        totalAmount: e.totalAmount,
        platformFee: e.platformFee,
        farmersShare: e.farmersShare,
        transporterShare: e.transporterShare,
        status: e.status,
        lockedAt: e.lockedAt,
        releasedAt: e.releasedAt || null,
        releaseReason: e.releaseReason || 'delivery_verified',
      });
    }

    // 10. Audit Logs
    for (const a of auditLogs) {
      insertAudit.run({
        id: a.id,
        timestamp: a.timestamp,
        action: a.action,
        userId: a.userId,
        entityType: a.entityType,
        entityId: a.entityId,
        detailsJson: JSON.stringify(a.details || {}),
        ipHash: a.ipHash || null,
      });
    }

    // 11. Call Logs
    for (const c of callLogs) {
      insertCallLog.run({
        id: c.id,
        phone: c.phone,
        type: c.type,
        direction: c.direction,
        status: c.status,
        duration: c.duration,
        recordingUrl: c.recordingUrl || null,
        dtmfJson: JSON.stringify(c.dtmf || []),
        outcome: c.outcome || null,
        language: c.language,
        timestamp: c.timestamp,
      });
    }
  });

  seedTransaction();
  console.log('✅ SQLite initial database seeded successfully.');
}
