import { useEffect, useState } from "react";
import api from "./api";
import AssignmentPanel from "./components/AssignmentPanel";
import Dashboard from "./components/Dashboard";
import LoginForm from "./components/LoginForm";
import PurchasePanel from "./components/PurchasePanel";
import TransferPanel from "./components/TransferPanel";
import UsersPanel from "./components/UsersPanel";

const tabsByRole = {
  admin: ["dashboard", "purchases", "transfers", "assignments", "users"],
  commander: ["dashboard", "transfers", "assignments"],
  logistics: ["dashboard", "purchases", "transfers", "assignments"]
};

const tabLabels = {
  dashboard: "Dashboard",
  purchases: "Purchases",
  transfers: "Transfers",
  assignments: "Assignments & Expenditures",
  users: "Users"
};

export default function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("mam_token");
    const user = localStorage.getItem("mam_user");
    return token && user ? { token, user: JSON.parse(user) } : null;
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ base: "", category: "", search: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    loadData();
  }, [session, filters.base, filters.category, filters.search]);

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const assetResponse = await api.get("/assets", { params: filters });
      const summaryResponse = await api.get("/assets/summary");
      setAssets(assetResponse.data);
      setSummary(summaryResponse.data);

      if (session?.user.role === "admin") {
        const userResponse = await api.get("/users");
        setUsers(userResponse.data);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Unable to load application data.");
      if (requestError.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogin(payload) {
    localStorage.setItem("mam_token", payload.token);
    localStorage.setItem("mam_user", JSON.stringify(payload.user));
    setSession(payload);
    setActiveTab("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("mam_token");
    localStorage.removeItem("mam_user");
    setSession(null);
    setUsers([]);
    setAssets([]);
    setSummary(null);
  }

  async function submitForm(endpoint, payload) {
    try {
      setError("");
      await api.post(endpoint, payload);
      await loadData();
      setActiveTab("dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Action failed.");
      throw requestError;
    }
  }

  if (!session) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const visibleTabs = tabsByRole[session.user.role];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Operational Console</p>
          <h1>Military Asset Management</h1>
          <p className="sidebar-copy">
            Secure asset tracking for commanders, logistics teams, and central administration.
          </p>
        </div>

        <div className="identity-card">
          <span>{session.user.name}</span>
          <strong>{session.user.role.toUpperCase()}</strong>
          <small>{session.user.base}</small>
        </div>

        <div className="command-strip">
          <div>
            <span className="strip-label">Access</span>
            <strong>RBAC Secured</strong>
          </div>
          <div>
            <span className="strip-label">Status</span>
            <strong>Mission Ready</strong>
          </div>
        </div>

        <nav className="nav-list">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tabLabels[tab]}
            </button>
          ))}
        </nav>

        <button className="secondary-button" onClick={handleLogout} type="button">
          Logout
        </button>
      </aside>

      <main className="main-panel">
        <section className="topbar">
          <div>
            <p className="eyebrow">Command Overview</p>
            <h2 className="topbar-title">{tabLabels[activeTab]}</h2>
          </div>
          <div className="topbar-meta">
            <div className="topbar-chip">
              <span>Officer</span>
              <strong>{session.user.name}</strong>
            </div>
            <div className="topbar-chip">
              <span>Theater</span>
              <strong>{session.user.base}</strong>
            </div>
          </div>
        </section>

        {error ? <div className="alert error">{error}</div> : null}
        {isLoading ? <div className="alert">Refreshing operational picture...</div> : null}

        {activeTab === "dashboard" ? (
          <Dashboard
            assets={assets}
            filters={filters}
            onFilterChange={setFilters}
            summary={summary}
            user={session.user}
          />
        ) : null}

        {activeTab === "purchases" ? (
          <PurchasePanel assets={assets} onSubmit={submitForm} user={session.user} />
        ) : null}

        {activeTab === "transfers" ? (
          <TransferPanel assets={assets} onSubmit={submitForm} />
        ) : null}

        {activeTab === "assignments" ? (
          <AssignmentPanel assets={assets} onSubmit={submitForm} />
        ) : null}

        {activeTab === "users" ? <UsersPanel users={users} /> : null}
      </main>
    </div>
  );
}
