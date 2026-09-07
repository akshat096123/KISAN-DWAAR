import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/kisan_dwaar.db';
const resolvedDbPath = path.resolve(process.cwd(), dbPath);

// Ensure the directory exists
const dir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(resolvedDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS farmers (
      id TEXT PRIMARY KEY,
      aadhaar_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      identity_verified INTEGER DEFAULT 1,
      registered_by TEXT NOT NULL,
      land_size REAL DEFAULT 1.0,
      village TEXT NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      bank_vpa TEXT,
      bank_account TEXT,
      bank_ifsc TEXT,
      preferred_language TEXT DEFAULT 'hi',
      created_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS farmer_inventory (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL,
      crop TEXT NOT NULL,
      available_quantity REAL NOT NULL,
      min_price_per_kg REAL NOT NULL,
      grade TEXT NOT NULL,
      registered_by TEXT NOT NULL,
      registered_at TEXT NOT NULL,
      FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS buyers (
      id TEXT PRIMARY KEY,
      aadhaar_number TEXT,
      organization_name TEXT NOT NULL,
      tax_id TEXT NOT NULL,
      credit_limit REAL DEFAULT 1000000,
      credit_used REAL DEFAULT 0,
      verification_status TEXT DEFAULT 'verified',
      registered_by TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS transporters (
      id TEXT PRIMARY KEY,
      aadhaar_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      license TEXT,
      rating REAL DEFAULT 4.8,
      has_smartphone INTEGER DEFAULT 1,
      registered_by TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demands (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      crop TEXT NOT NULL,
      quantity REAL NOT NULL,
      max_price_per_kg REAL NOT NULL,
      price_per_kg REAL NOT NULL,
      unit TEXT DEFAULT 'kg',
      delivery_address TEXT NOT NULL,
      delivery_deadline TEXT NOT NULL,
      grade TEXT NOT NULL,
      selected_combination_id TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      demand_id TEXT NOT NULL,
      total_quantity REAL NOT NULL,
      committed_quantity REAL DEFAULT 0,
      price_per_kg REAL NOT NULL,
      status TEXT DEFAULT 'forming',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pool_farmers (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      allocated_kg REAL NOT NULL,
      price_per_kg REAL NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL,
      pool_id TEXT NOT NULL,
      demand_id TEXT NOT NULL,
      crop TEXT NOT NULL,
      quantity REAL NOT NULL,
      price_per_kg REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      callback_scheduled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transport_bids (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      transporter_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      rate_per_quintal_km REAL NOT NULL,
      estimated_distance REAL NOT NULL,
      estimated_cost REAL NOT NULL,
      status TEXT DEFAULT 'submitted',
      submitted_at TEXT NOT NULL,
      awarded_at TEXT,
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
      FOREIGN KEY (transporter_id) REFERENCES transporters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      transporter_id TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_photo TEXT,
      actual_weight REAL NOT NULL,
      delivered_at TEXT,
      verified_at TEXT,
      verified_by TEXT,
      verification_signature TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
      FOREIGN KEY (transporter_id) REFERENCES transporters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS delivery_pickups (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL,
      farmer_id TEXT NOT NULL,
      location TEXT NOT NULL,
      quantity REAL NOT NULL,
      weight REAL NOT NULL,
      photo_url TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS escrows (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      platform_fee REAL NOT NULL,
      farmers_share REAL NOT NULL,
      transporter_share REAL NOT NULL,
      status TEXT DEFAULT 'held',
      locked_at TEXT NOT NULL,
      released_at TEXT,
      release_reason TEXT DEFAULT 'delivery_verified',
      FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details_json TEXT NOT NULL,
      ip_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS call_logs (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      type TEXT NOT NULL,
      direction TEXT DEFAULT 'outbound',
      status TEXT DEFAULT 'completed',
      duration INTEGER DEFAULT 60,
      recording_url TEXT,
      dtmf_json TEXT,
      outcome TEXT,
      language TEXT DEFAULT 'hi',
      timestamp TEXT NOT NULL
    );
  `);

  console.log('✅ SQLite schema initialized at', resolvedDbPath);
}
