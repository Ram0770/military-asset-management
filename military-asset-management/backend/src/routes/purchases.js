import express from "express";
import { get, run } from "../database.js";

const router = express.Router();

router.post("/", async (request, response) => {
  const { assetId, quantity, destinationBase, vendor, notes } = request.body;

  if (!assetId || !Number.isInteger(quantity) || quantity <= 0 || !destinationBase || !vendor) {
    response.status(400).json({ message: "Asset, quantity, destination base, and vendor are required." });
    return;
  }

  if (request.user.role !== "admin" && request.user.base !== destinationBase) {
    response.status(403).json({ message: "You can only record purchases for your base." });
    return;
  }

  const asset = await get("SELECT * FROM assets WHERE id = ?", [assetId]);

  if (!asset) {
    response.status(404).json({ message: "Asset not found." });
    return;
  }

  await run(
    `INSERT INTO purchases (asset_id, quantity, destination_base, vendor, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [assetId, quantity, destinationBase, vendor, notes ?? "", request.user.id]
  );

  if (asset.base === destinationBase) {
    await run(
      "UPDATE assets SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [quantity, assetId]
    );
  } else {
    await run(
      `INSERT INTO assets (name, category, base, quantity, status, unit, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [asset.name, asset.category, destinationBase, quantity, asset.status, asset.unit]
    );
  }

  response.status(201).json({ message: "Purchase recorded successfully." });
});

export default router;
