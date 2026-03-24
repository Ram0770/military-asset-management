export default function UsersPanel({ users }) {
  return (
    <section className="panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">RBAC</p>
          <h2>Seeded user directory</h2>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Base</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.base}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
