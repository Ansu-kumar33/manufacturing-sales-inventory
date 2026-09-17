import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Loading, ErrorMessage, SuccessMessage } from "../components/Ui.jsx";

export default function Inventory() {
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null); // productId being edited
  const [qty, setQty] = useState("");

  async function load() {
    try {
      const res = await api.get("/inventory");
      setRows(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveQty(productId) {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/inventory/${productId}`, { physicalQty: Number(qty) });
      setSuccess("Physical stock updated");
      setEditing(null);
      setQty("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Inventory</h2>
      <p className="muted">Available = Physical - Reserved</p>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <div className="card">
        {loading ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Physical</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.productCode}</td>
                    <td>{r.productName}</td>
                    <td>{r.unit}</td>
                    <td>{r.physicalQty}</td>
                    <td>{r.reservedQty}</td>
                    <td>
                      <b>{r.availableQty}</b>
                    </td>
                    {isAdmin && (
                      <td>
                        {editing === r.productId ? (
                          <div className="btn-row">
                            <input
                              type="number"
                              min="0"
                              value={qty}
                              onChange={(e) => setQty(e.target.value)}
                              style={{ width: 90 }}
                            />
                            <button
                              className="btn btn-green btn-sm"
                              onClick={() => saveQty(r.productId)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-grey btn-sm"
                              onClick={() => setEditing(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setEditing(r.productId);
                              setQty(String(r.physicalQty));
                            }}
                          >
                            Edit stock
                          </button>
                        )}
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
