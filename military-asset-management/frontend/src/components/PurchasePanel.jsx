import { useMemo, useState } from "react";

export default function PurchasePanel({ assets, onSubmit, user }) {
  const [form, setForm] = useState({
    assetId: "",
    quantity: 0,
    destinationBase: user.base,
    vendor: "",
    notes: ""
  });

  const selectableAssets = useMemo(
    () => assets.filter((asset) => user.role === "admin" || asset.base === user.base),
    [assets, user.base, user.role]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit("/purchases", {
      ...form,
      assetId: Number(form.assetId),
      quantity: Number(form.quantity)
    });
    setForm((current) => ({ ...current, quantity: 0, vendor: "", notes: "" }));
  }

  return (
    <section className="panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Purchases</p>
          <h2>Record inbound procurement</h2>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Asset
          <select
            required
            value={form.assetId}
            onChange={(event) => setForm((current) => ({ ...current, assetId: event.target.value }))}
          >
            <option value="">Select asset</option>
            {selectableAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.base})
              </option>
            ))}
          </select>
        </label>

        <label>
          Quantity
          <input
            min="1"
            required
            type="number"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
          />
        </label>

        <label>
          Destination Base
          <input
            required
            value={form.destinationBase}
            onChange={(event) =>
              setForm((current) => ({ ...current, destinationBase: event.target.value }))
            }
          />
        </label>

        <label>
          Vendor
          <input
            required
            value={form.vendor}
            onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))}
          />
        </label>

        <label className="full-span">
          Notes
          <textarea
            rows="4"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>

        <button className="primary-button" type="submit">
          Save Purchase
        </button>
      </form>
    </section>
  );
}
