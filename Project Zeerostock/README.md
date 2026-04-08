# Zeerostock Inventory Search Assignment

This project is a complete solution for the Zeerostock inventory search assignment. It includes an Express backend with a `GET /search` endpoint and a simple frontend that lets buyers filter inventory by product name, category, and price range.

## Project Structure

```text
inventory-search-project/
|- backend/
|  |- data/
|  |  `- inventory.json
|  |- package.json
|  `- server.js
|- frontend/
|  |- index.html
|  |- script.js
|  `- style.css
`- README.md
```

## Features

- `GET /search` returns all items when no filters are provided.
- `q` performs a case-insensitive partial match on `productName`.
- `category` performs a case-insensitive exact match on the category field.
- `minPrice` and `maxPrice` filter items by price range.
- Combined filters work together, so each result must satisfy all active filters.
- Invalid numeric values and `minPrice > maxPrice` return a `400 Bad Request`.
- The frontend shows search results, empty states, and API error messages.

## Setup

1. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open `http://localhost:3000` in your browser.

## Search Logic

The backend starts with the full inventory array and applies filters one by one:

1. Product name filter with `item.productName.toLowerCase().includes(q.toLowerCase())`
2. Category filter with a case-insensitive exact comparison
3. Minimum price filter with `item.price >= minPrice`
4. Maximum price filter with `item.price <= maxPrice`

If `q` is empty, the product-name filter is skipped. If no records match, the API returns an empty array and the frontend shows `No results found.`

## Example Requests

- `GET /search`
- `GET /search?q=chair`
- `GET /search?category=Furniture`
- `GET /search?minPrice=100&maxPrice=300`
- `GET /search?q=desk&category=Furniture&minPrice=100&maxPrice=400`

## One Performance Improvement for Large Datasets

If the inventory grows beyond a small in-memory JSON file, a good next improvement would be moving the data into a database and adding indexes on `category`, `price`, and a searchable text field for product names. That would reduce the amount of data scanned on each request and keep search responses fast as inventory grows.
