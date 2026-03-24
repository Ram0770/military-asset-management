import { useMemo, useState } from "react";

export default function Dashboard({ assets, summary, user, filters, onFilterChange }) {
  const [selectedMovement, setSelectedMovement] = useState(null);

  const totals = useMemo(() => {
    return assets.reduce(
      (accumulator, asset) => {
        accumulator.assetTypes += 1;
        accumulator.quantity += asset.quantity;
        return accumulator;
      },
      { assetTypes: 0, quantity: 0 }
    );
  }, [assets]);

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Operational readiness snapshot</h2>
          <p className="section-copy">
            Review current stock posture, filter by operational scope, and inspect movement records
            across controlled bases.
          </p>
        </div>
        <div className="badge-row">
          <span className="badge">Role: {user.role}</span>
          <span className="badge">Base: {user.base}</span>
        </div>
      </div>

      <div className="command-banner">
        <div>
          <span className="eyebrow">Readiness Signal</span>
          <h3>Consolidated inventory intelligence for active command decisions</h3>
        </div>
        <div className="banner-grid">
          <div>
            <span className="banner-label">Live assets</span>
            <strong>{totals.assetTypes}</strong>
          </div>
          <div>
            <span className="banner-label">Recent movements</span>
            <strong>{summary?.recentMovements.length ?? 0}</strong>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Visible Asset Types</span>
          <strong>{totals.assetTypes}</strong>
        </article>
        <article className="stat-card">
          <span>Total Stock Units</span>
          <strong>{totals.quantity.toLocaleString()}</strong>
        </article>
        <article className="stat-card">
          <span>Bases In Scope</span>
          <strong>{summary?.stockByBase.length ?? 0}</strong>
        </article>
      </div>

      <div className="panel">
        <div className="filter-grid">
          <label>
            Base
            <input
              disabled={user.role !== "admin"}
              placeholder={user.role === "admin" ? "All bases" : user.base}
              value={filters.base}
              onChange={(event) =>
                onFilterChange((current) => ({ ...current, base: event.target.value }))
              }
            />
          </label>
          <label>
            Category
            <input
              placeholder="Vehicle, Equipment..."
              value={filters.category}
              onChange={(event) =>
                onFilterChange((current) => ({ ...current, category: event.target.value }))
              }
            />
          </label>
          <label>
            Search Asset
            <input
              placeholder="Search by asset name"
              value={filters.search}
              onChange={(event) =>
                onFilterChange((current) => ({ ...current, search: event.target.value }))
              }
            />
          </label>
        </div>
      </div>

      <div className="two-column">
        <div className="panel">
          <div className="panel-header">
            <h3>Asset Balances</h3>
            <span className="panel-kicker">Current stock by base and category</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Base</th>
                  <th>Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.name}</td>
                    <td>{asset.category}</td>
                    <td>{asset.base}</td>
                    <td>
                      {asset.quantity} {asset.unit}
                    </td>
                    <td>{asset.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel-header">
              <h3>Base Summary</h3>
              <span className="panel-kicker">Aggregate strength by installation</span>
            </div>
            <div className="summary-list">
              {summary?.stockByBase.map((item) => (
                <div className="summary-item" key={item.base}>
                  <strong>{item.base}</strong>
                  <span>{item.asset_types} asset types</span>
                  <span>{Number(item.total_quantity).toLocaleString()} total units</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Net Movements</h3>
              <span className="panel-kicker">Open the cards below for details</span>
            </div>
            <div className="summary-list">
              {summary?.recentMovements.map((movement, index) => (
                <button
                  className="movement-item"
                  key={`${movement.created_at}-${index}`}
                  onClick={() => setSelectedMovement(movement)}
                  type="button"
                >
                  <strong>{movement.movement_type}</strong>
                  <span>{movement.asset_name}</span>
                  <span>
                    {movement.quantity} units to/from {movement.related_base}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedMovement ? (
        <div className="modal-backdrop" onClick={() => setSelectedMovement(null)} role="presentation">
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog">
            <h3>Movement Detail</h3>
            <p>
              <strong>Type:</strong> {selectedMovement.movement_type}
            </p>
            <p>
              <strong>Asset:</strong> {selectedMovement.asset_name}
            </p>
            <p>
              <strong>Quantity:</strong> {selectedMovement.quantity}
            </p>
            <p>
              <strong>Base:</strong> {selectedMovement.related_base}
            </p>
            <p>
              <strong>Logged by:</strong> {selectedMovement.actor}
            </p>
            <p>
              <strong>Timestamp:</strong> {selectedMovement.created_at}
            </p>
            <button className="primary-button" onClick={() => setSelectedMovement(null)} type="button">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
