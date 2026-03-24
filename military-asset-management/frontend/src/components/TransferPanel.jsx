import { useState } from "react";

export default function TransferPanel({ assets, onSubmit }) {
  const [form, setForm] = useState({
    assetId: "",
    toBase: "",
    quantity: 0,
    notes: ""
  });

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit("/transfers", {
      ...form,
      assetId: Number(form.assetId),
      quantity: Number(form.quantity)
    });
    setForm({ assetId: "", toBase: "", quantity: 0, notes: "" });
  }

  return (
    <section className="panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Transfers</p>
          <h2>Move stock between bases</h2>
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
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.base}) - {asset.quantity}
              </option>
            ))}
          </select>
        </label>

        <label>
          Destination Base
          <input
            required
            value={form.toBase}
            onChange={(event) => setForm((current) => ({ ...current, toBase: event.target.value }))}
          />
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

        <label className="full-span">
          Notes
          <textarea
            rows="4"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>

        <button className="primary-button" type="submit">
          Execute Transfer
        </button>
      </form>
    </section>
  );
}
