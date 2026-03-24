import express from "express";
import { all, get, run } from "../database.js";

const router = express.Router();

function canAccessBase(user, base) {
  return user.role === "admin" || user.base === base;
}

router.get("/", async (request, response) => {
  const { base, category, search } = request.query;
  const conditions = [];
  const params = [];

  if (request.user.role !== "admin") {
    conditions.push("base = ?");
    params.push(request.user.base);
  } else if (base) {
    conditions.push("base = ?");
    params.push(base);
  }

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  if (search) {
    conditions.push("name LIKE ?");
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const assets = await all(
    `SELECT id, name, category, base, quantity, status, unit, updated_at
     FROM assets
     ${whereClause}
     ORDER BY base ASC, category ASC, name ASC`,
    params
  );

  response.json(assets);
});

router.get("/summary", async (request, response) => {
  const baseCondition = request.user.role === "admin" ? "" : "WHERE base = ?";
  const params = request.user.role === "admin" ? [] : [request.user.base];

  const stockByBase = await all(
    `SELECT base, COUNT(*) AS asset_types, SUM(quantity) AS total_quantity
     FROM assets
     ${baseCondition}
     GROUP BY base
     ORDER BY base`,
    params
  );

  const stockByCategory = await all(
    `SELECT category, SUM(quantity) AS total_quantity
     FROM assets
     ${baseCondition}
     GROUP BY category
     ORDER BY total_quantity DESC`,
    params
  );

  const recentMovements = await all(
    `SELECT 'Purchase' AS movement_type, p.created_at, a.name AS asset_name, p.quantity, p.destination_base AS related_base, u.name AS actor
     FROM purchases p
     JOIN assets a ON a.id = p.asset_id
     JOIN users u ON u.id = p.created_by
     ${request.user.role === "admin" ? "" : "WHERE p.destination_base = ?"}
     UNION ALL
     SELECT 'Transfer' AS movement_type, t.created_at, a.name AS asset_name, t.quantity, t.to_base AS related_base, u.name AS actor
     FROM transfers t
     JOIN assets a ON a.id = t.asset_id
     JOIN users u ON u.id = t.created_by
     ${request.user.role === "admin" ? "" : "WHERE t.from_base = ? OR t.to_base = ?"}
     UNION ALL
     SELECT UPPER(SUBSTR(s.type, 1, 1)) || LOWER(SUBSTR(s.type, 2)) AS movement_type, s.created_at, a.name AS asset_name, s.quantity, s.base AS related_base, u.name AS actor
     FROM assignments s
     JOIN assets a ON a.id = s.asset_id
     JOIN users u ON u.id = s.created_by
     ${request.user.role === "admin" ? "" : "WHERE s.base = ?"}
     ORDER BY created_at DESC
     LIMIT 10`,
    request.user.role === "admin"
      ? []
      : [request.user.base, request.user.base, request.user.base, request.user.base]
  );

  response.json({
    stockByBase,
    stockByCategory,
    recentMovements
  });
});

router.post("/", async (request, response) => {
  const { name, category, base, quantity, status, unit } = request.body;

  if (!name || !category || !base || !status || !unit || !Number.isInteger(quantity)) {
    response.status(400).json({ message: "All asset fields are required." });
    return;
  }

  if (!canAccessBase(request.user, base)) {
    response.status(403).json({ message: "You can only create assets for your base." });
    return;
  }

  const result = await run(
    `INSERT INTO assets (name, category, base, quantity, status, unit, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [name, category, base, quantity, status, unit]
  );

  const asset = await get("SELECT * FROM assets WHERE id = ?", [result.id]);
  response.status(201).json(asset);
});

export default router;
