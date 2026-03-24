import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

const configuredDatabasePath = process.env.SQLITE_DB_PATH?.trim();
const databasePath = configuredDatabasePath
  ? path.resolve(configuredDatabasePath)
  : path.resolve("backend", "data", "military-assets.db");
const dataDirectory = path.dirname(databasePath);

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(databasePath);

export { databasePath };

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        id: this.lastID,
        changes: this.changes
      });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

export async function initializeDatabase() {
  await run("PRAGMA foreign_keys = ON");
  await run("PRAGMA busy_timeout = 5000");
  await run("PRAGMA journal_mode = WAL");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      base TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      base TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity >= 0),
      status TEXT NOT NULL,
      unit TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      destination_base TEXT NOT NULL,
      vendor TEXT NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES assets(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      from_base TEXT NOT NULL,
      to_base TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      status TEXT NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES assets(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      base TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      type TEXT NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES assets(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);
}

async function seedUsers() {
  const existingUsers = await get("SELECT COUNT(*) AS count FROM users");

  if (existingUsers.count > 0) {
    return;
  }

  const users = [
    ["Admin Officer", "admin", "admin123", "admin", "Central Command"],
    ["Commander North", "commander.north", "command123", "commander", "Northern Base"],
    ["Logistics South", "logistics.south", "logistics123", "logistics", "Southern Base"]
  ];

  for (const user of users) {
    await run(
      "INSERT INTO users (name, username, password, role, base) VALUES (?, ?, ?, ?, ?)",
      user
    );
  }
}

async function seedAssets() {
  const existingAssets = await get("SELECT COUNT(*) AS count FROM assets");

  if (existingAssets.count > 0) {
    return;
  }

  const assets = [
    ["Armored Personnel Carrier", "Vehicle", "Northern Base", 12, "Operational", "units"],
    ["Tactical Radio Kit", "Equipment", "Northern Base", 48, "Operational", "kits"],
    ["5.56mm Ammunition", "Ammunition", "Southern Base", 12000, "Stocked", "rounds"],
    ["Night Vision Goggles", "Equipment", "Southern Base", 65, "Operational", "pairs"],
    ["Utility Transport Truck", "Vehicle", "Central Command", 18, "Maintenance", "units"],
    ["120mm Mortar Shell", "Ammunition", "Central Command", 840, "Restricted", "rounds"]
  ];

  for (const asset of assets) {
    await run(
      "INSERT INTO assets (name, category, base, quantity, status, unit) VALUES (?, ?, ?, ?, ?, ?)",
      asset
    );
  }
}

export async function seedDatabase() {
  const shouldSeed = (process.env.SEED_DEMO_DATA ?? "true").toLowerCase() === "true";

  if (!shouldSeed) {
    return;
  }

  await seedUsers();
  await seedAssets();
}
