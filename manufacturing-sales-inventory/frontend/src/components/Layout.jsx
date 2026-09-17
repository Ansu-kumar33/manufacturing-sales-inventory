import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/customers", label: "Customers" },
    { to: "/enquiries", label: "Enquiries" },
    { to: "/quotations", label: "Quotations" },
    { to: "/sales-orders", label: "Sales Orders" },
    { to: "/inventory", label: "Inventory" },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Manufacturing Sales &amp; Inventory</div>
        <div className="user-box">
          <span className="user-name">{user?.name}</span>
          <span className="role-tag">{user?.role}</span>
          <button className="btn btn-light" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
