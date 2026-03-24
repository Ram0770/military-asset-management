import { useState } from "react";

export default function AssignmentPanel({ assets, onSubmit }) {
  const [form, setForm] = useState({
    assetId: "",
    assignedTo: "",
    quantity: 0,
    type: "assignment",
    notes: ""
  });

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit("/assignments", {
      ...form,
      assetId: Number(form.assetId),
      quantity: Number(form.quantity)
    });
    setForm({ assetId: "", assignedTo: "", quantity: 0, type: "assignment", notes: "" });
  }

  return (
    <section className="panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Assignments & Expenditures</p>
          <h2>Reduce on-hand stock with traceability</h2>
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
          Activity Type
          <select
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="assignment">Assignment</option>
            <option value="expenditure">Expenditure</option>
          </select>
        </label>

        <label>
          Assigned To / Purpose
          <input
            required
            value={form.assignedTo}
            onChange={(event) =>
              setForm((current) => ({ ...current, assignedTo: event.target.value }))
            }
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
          Record Activity
        </button>
      </form>
    </section>
  );
}
