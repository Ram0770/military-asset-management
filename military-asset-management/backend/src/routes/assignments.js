import express from "express";
import { get, run } from "../database.js";

const router = express.Router();

router.post("/", async (request, response) => {
  const { assetId, assignedTo, quantity, type, notes } = request.body;

  if (!assetId || !assignedTo || !Number.isInteger(quantity) || quantity <= 0 || !type) {
    response.status(400).json({ message: "Asset, assignee, quantity, and movement type are required." });
    return;
  }

  if (!["assignment", "expenditure"].includes(type)) {
    response.status(400).json({ message: "Movement type must be assignment or expenditure." });
    return;
  }

  const asset = await get("SELECT * FROM assets WHERE id = ?", [assetId]);

  if (!asset) {
    response.status(404).json({ message: "Asset not found." });
    return;
  }

  if (request.user.role !== "admin" && request.user.base !== asset.base) {
    response.status(403).json({ message: "You can only record activity for your base." });
    return;
  }

  if (asset.quantity < quantity) {
    response.status(400).json({ message: "Quantity exceeds available stock." });
    return;
  }

  await run(
    `INSERT INTO assignments (asset_id, base, assigned_to, quantity, type, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [assetId, asset.base, assignedTo, quantity, type, notes ?? "", request.user.id]
  );

  await run(
    "UPDATE assets SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [quantity, assetId]
  );

  response.status(201).json({ message: "Asset activity recorded successfully." });
});

export default router;
