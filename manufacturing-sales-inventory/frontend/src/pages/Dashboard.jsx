import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Loading, ErrorMessage, StatusBadge, money } from "../components/Ui.jsx";

// All numbers come from the real backend APIs.
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [customers, enquiries, quotations, orders, inventory] = await Promise.all([
          api.get("/customers"),
          api.get("/enquiries"),
          api.get("/quotations"),
          api.get("/sales-orders"),
          api.get("/inventory"),
        ]);
        setData({
          customers: customers.data,
          enquiries: enquiries.data,
          quotations: quotations.data,
          orders: orders.data,
          inventory: inventory.data,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  const pending = data.orders.filter((o) => o.status === "PENDING").length;
  const lowStock = data.inventory.filter((i) => i.availableQty <= 0).length;

  return (
    <div>
      <h2>Welcome, {user?.name}</h2>

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{data.customers.length}</div>
          <div className="stat-label">Customers</div>
        </div>
        <div className="stat">
          <div className="stat-value">{data.enquiries.length}</div>
          <div className="stat-label">Enquiries</div>
        </div>
        <div className="stat">
          <div className="stat-value">{data.quotations.length}</div>
          <div className="stat-label">Quotations</div>
        </div>
        <div className="stat">
          <div className="stat-value">{data.orders.length}</div>
          <div className="stat-label">Sales Orders</div>
        </div>
        <div className="stat">
          <div className="stat-value">{pending}</div>
          <div className="stat-label">Pending Confirmation</div>
        </div>
        <div className="stat">
          <div className="stat-value">{lowStock}</div>
          <div className="stat-label">Products Out of Stock</div>
        </div>
      </div>

      <div className="card">
        <h3>Latest sales orders</h3>
        {data.orders.length === 0 ? (
          <p className="muted">No sales orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNo}</td>
                    <td>{order.customer.company}</td>
                    <td>{money(order.totalAmount)}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
