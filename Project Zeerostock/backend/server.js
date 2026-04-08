const express = require("express");
const path = require("path");
const inventory = require("./data/inventory.json");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/search", (req, res) => {
  const { q = "", category = "", minPrice, maxPrice } = req.query;

  const hasMinPrice = minPrice !== undefined && minPrice !== "";
  const hasMaxPrice = maxPrice !== undefined && maxPrice !== "";

  const parsedMinPrice = hasMinPrice ? Number(minPrice) : null;
  const parsedMaxPrice = hasMaxPrice ? Number(maxPrice) : null;

  if (hasMinPrice && Number.isNaN(parsedMinPrice)) {
    return res.status(400).json({ message: "minPrice must be a valid number" });
  }

  if (hasMaxPrice && Number.isNaN(parsedMaxPrice)) {
    return res.status(400).json({ message: "maxPrice must be a valid number" });
  }

  if (
    parsedMinPrice !== null &&
    parsedMaxPrice !== null &&
    parsedMinPrice > parsedMaxPrice
  ) {
    return res.status(400).json({ message: "Invalid price range" });
  }

  let results = [...inventory];

  const normalizedQuery = q.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();

  if (normalizedQuery) {
    results = results.filter((item) =>
      item.productName.toLowerCase().includes(normalizedQuery)
    );
  }

  if (normalizedCategory) {
    results = results.filter(
      (item) => item.category.toLowerCase() === normalizedCategory
    );
  }

  if (parsedMinPrice !== null) {
    results = results.filter((item) => item.price >= parsedMinPrice);
  }

  if (parsedMaxPrice !== null) {
    results = results.filter((item) => item.price <= parsedMaxPrice);
  }

  return res.json(results);
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Inventory search server running on http://localhost:${PORT}`);
});
