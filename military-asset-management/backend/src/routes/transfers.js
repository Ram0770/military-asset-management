import express from "express";
import { get, run } from "../database.js";

const router = express.Router();

router.post("/", async (request, response) => {
  const { assetId, toBase, quantity, notes } = request.body;

  if (!assetId || !toBase || !Number.isInteger(quantity) || quantity <= 0) {
    response.status(400).json({ message: "Asset, destination base, and quantity are required." });
    return;
  }

  const asset = await get("SELECT * FROM assets WHERE id = ?", [assetId]);

  if (!asset) {
    response.status(404).json({ message: "Asset not found." });
    return;
  }

  if (request.user.role !== "admin" && request.user.base !== asset.base) {
    response.status(403).json({ message: "You can only transfer assets from your assigned base." });
    return;
  }

  if (asset.quantity < quantity) {
    response.status(400).json({ message: "Transfer quantity exceeds available stock." });
    return;
  }

  await run(
    `INSERT INTO transfers (asset_id, from_base, to_base, quantity, status, notes, created_by)
     VALUES (?, ?, ?, ?, 'Completed', ?, ?)`,
    [assetId, asset.base, toBase, quantity, notes ?? "", request.user.id]
  );

  await run(
    "UPDATE assets SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [quantity, assetId]
  );

  const existingDestinationAsset = await get(
    "SELECT id FROM assets WHERE name = ? AND base = ?",
    [asset.name, toBase]
  );

  if (existingDestinationAsset) {
    await run(
      "UPDATE assets SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [quantity, existingDestinationAsset.id]
    );
  } else {
    await run(
      `INSERT INTO assets (name, category, base, quantity, status, unit, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [asset.name, asset.category, toBase, quantity, asset.status, asset.unit]
    );
  }

  response.status(201).json({ message: "Transfer completed successfully." });
});

export default router;
