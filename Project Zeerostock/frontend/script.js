const form = document.getElementById("search-form");
const resultsBody = document.getElementById("results-body");
const statusMessage = document.getElementById("status-message");
const emptyState = document.getElementById("empty-state");
const resultCount = document.getElementById("result-count");
const heroTotalItems = document.getElementById("hero-total-items");

async function fetchInventory(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "") {
      params.append(key, value);
    }
  });

  const queryString = params.toString();
  const url = queryString ? `/search?${queryString}` : "/search";

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong while searching.");
  }

  return data;
}

function renderResults(items) {
  resultsBody.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image-wrap">
        <img
          class="product-image"
          src="${item.image}"
          alt="${item.productName}"
          loading="lazy"
          onerror="this.onerror=null; this.src='${item.fallbackImage || "/images/office-chair.svg"}';"
        />
      </div>
      <div class="product-card-header">
        <div>
          <h3>${item.productName}</h3>
        </div>
        <span class="category-pill">${item.category}</span>
      </div>
      <div class="product-meta">
        <div class="meta-block">
          <span class="meta-label">Supplier</span>
          <span class="meta-value">${item.supplier}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">Price</span>
          <span class="meta-value price">$${item.price.toFixed(2)}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">Product ID</span>
          <span class="meta-value">#${item.id}</span>
        </div>
        <div class="meta-block">
          <span class="meta-label">Availability</span>
          <span class="meta-value">Ready to source</span>
        </div>
      </div>
    `;
    resultsBody.appendChild(card);
  });

  resultCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  heroTotalItems.textContent = items.length;
  emptyState.hidden = items.length !== 0;
}

async function runSearch(filters = {}, options = {}) {
  try {
    statusMessage.className = "status-message";
    statusMessage.textContent = options.loadingMessage || "Loading results...";

    const items = await fetchInventory(filters);
    renderResults(items);

    statusMessage.className = "status-message success";
    statusMessage.textContent =
      items.length === 0
        ? "Search completed. No inventory matched these filters."
        : "Search completed successfully.";
  } catch (error) {
    resultsBody.innerHTML = "";
    resultCount.textContent = "";
    emptyState.hidden = true;
    statusMessage.className = "status-message error";
    statusMessage.textContent = error.message;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  runSearch({
    q: formData.get("q").trim(),
    category: formData.get("category"),
    minPrice: formData.get("minPrice"),
    maxPrice: formData.get("maxPrice")
  });
});

runSearch({}, { loadingMessage: "Showing all inventory." });
