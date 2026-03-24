import { useState } from "react";
import api from "../api";

const demoAccounts = [
  { label: "Admin", username: "admin", password: "admin123" },
  { label: "Commander", username: "commander.north", password: "command123" },
  { label: "Logistics", username: "logistics.south", password: "logistics123" }
];

export default function LoginForm({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: "admin", password: "admin123" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await api.post("/auth/login", credentials);
      onLogin(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <p className="eyebrow">KristalBall Assignment</p>
        <h1>Military Asset Management System</h1>
        <p>
          Track inventory balances, base-to-base transfers, assignments, and expenditures through a
          role-aware operations dashboard.
        </p>
      </section>

      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Mission Access</h2>
        <p className="muted">Use one of the seeded demonstration accounts below.</p>

        <label>
          Username
          <input
            value={credentials.username}
            onChange={(event) =>
              setCredentials((current) => ({ ...current, username: event.target.value }))
            }
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={credentials.password}
            onChange={(event) =>
              setCredentials((current) => ({ ...current, password: event.target.value }))
            }
          />
        </label>

        {error ? <div className="alert error">{error}</div> : null}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Authorizing..." : "Login"}
        </button>

        <div className="demo-grid">
          {demoAccounts.map((account) => (
            <button
              key={account.label}
              className="demo-account"
              onClick={() => setCredentials(account)}
              type="button"
            >
              <strong>{account.label}</strong>
              <span>{account.username}</span>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
