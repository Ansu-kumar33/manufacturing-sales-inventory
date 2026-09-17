import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Loading,
  ErrorMessage,
  SuccessMessage,
  StatusBadge,
  money,
  formatDate,
} from "../components/Ui.jsx";

export default function SalesOrders() {
  const { isAdmin } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState(null);

  // dispatch form state
  const [dispatchFor, setDispatchFor] = useState(null);
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");

  async function load() {
    try {
      const res = await api.get("/sales-orders");
      setOrders(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function action(id, path, body, successMessage) {
    setError("");
    setSuccess("");
    setBusyId(id);
    try {
      await api.post(`/sales-orders/${id}/${path}`, body);
      setSuccess(successMessage);
      setDispatchFor(null);
      setVehicleNo("");
      setDriverName("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2>Sales Orders</h2>
      {isAdmin && (
        <p className="muted">
          Confirm reserves stock (physical stays the same). Dispatch reduces both physical
          and reserved quantity.
        </p>
      )}

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      {dispatchFor && (
        <div className="card">
          <h3>Dispatch order {dispatchFor.orderNo}</h3>
          <div className="form-grid">
            <div>
              <label>Vehicle number *</label>
              <input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
            </div>
            <div>
              <label>Driver name *</label>
              <input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </div>
          </div>
          <div className="mt btn-row">
            <button
              className="btn btn-green"
              disabled={!vehicleNo || !driverName || busyId === dispatchFor.id}
              onClick={() =>
                action(dispatchFor.id, "dispatch", { vehicleNo, driverName }, "Order dispatched")
              }
            >
              Confirm dispatch
            </button>
            <button className="btn btn-grey" onClick={() => setDispatchFor(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <Loading />
        ) : orders.length === 0 ? (
          <p className="muted">No sales orders yet. Convert an accepted quotation first.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Customer</th>
                  <th>Quotation</th>
                  <th>Order date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNo}</td>
                    <td>{o.customer.company}</td>
                    <td>{o.quotation?.quotationNo}</td>
                    <td>{formatDate(o.orderDate)}</td>
                    <td>
                      {o.items.map((i) => (
                        <div key={i.id}>
                          {i.product.code} x {i.quantity}
                        </div>
                      ))}
                    </td>
                    <td>{money(o.totalAmount)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                      {o.dispatch && (
                        <div className="muted">
                          {o.dispatch.dispatchNo} / {o.dispatch.vehicleNo}
                        </div>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="btn-row">
                          {o.status === "PENDING" && (
                            <button
                              className="btn btn-green btn-sm"
                              disabled={busyId === o.id}
                              onClick={() =>
                                action(o.id, "confirm", {}, "Order confirmed and stock reserved")
                              }
                            >
                              Confirm
                            </button>
                          )}
                          {o.status === "CONFIRMED" && (
                            <button className="btn btn-sm" onClick={() => setDispatchFor(o)}>
                              Dispatch
                            </button>
                          )}
                          {(o.status === "PENDING" || o.status === "CONFIRMED") && (
                            <button
                              className="btn btn-red btn-sm"
                              disabled={busyId === o.id}
                              onClick={() => action(o.id, "cancel", {}, "Order cancelled")}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
