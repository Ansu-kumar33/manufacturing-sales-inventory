import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Loading,
  ErrorMessage,
  SuccessMessage,
  StatusBadge,
  formatDate,
} from "../components/Ui.jsx";

export default function Enquiries() {
  const { isSales } = useAuth();

  const [enquiries, setEnquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadEnquiries() {
    const res = await api.get("/enquiries");
    setEnquiries(res.data);
  }

  useEffect(() => {
    async function load() {
      try {
        const [c, p] = await Promise.all([api.get("/customers"), api.get("/products")]);
        setCustomers(c.data);
        setProducts(p.data);
        await loadEnquiries();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateItem(index, field, value) {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: value };
    setItems(copy);
  }

  function addItem() {
    setItems([...items, { productId: "", quantity: 1 }]);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api.post("/enquiries", {
        customerId: Number(customerId),
        requiredDate: requiredDate || null,
        notes,
        items: items.map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
        })),
      });
      setSuccess("Enquiry created successfully");
      setCustomerId("");
      setRequiredDate("");
      setNotes("");
      setItems([{ productId: "", quantity: 1 }]);
      await loadEnquiries();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Enquiries</h2>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      {isSales && (
        <div className="card">
          <h3>New enquiry</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label>Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Required date</label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>
              <div>
                <label>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <h3 className="mt">Items</h3>
            {items.map((item, index) => (
              <div className="form-grid mt" key={index}>
                <div>
                  <label>Product *</label>
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(index, "productId", e.target.value)}
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    className="btn btn-grey btn-sm"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="mt btn-row">
              <button type="button" className="btn btn-grey" onClick={addItem}>
                Add item
              </button>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create enquiry"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3>All enquiries</h3>
        {loading ? (
          <Loading />
        ) : enquiries.length === 0 ? (
          <p className="muted">No enquiries yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Enquiry No</th>
                  <th>Customer</th>
                  <th>Enquiry date</th>
                  <th>Required date</th>
                  <th>Items</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.enquiryNo}</td>
                    <td>{e.customer.company}</td>
                    <td>{formatDate(e.enquiryDate)}</td>
                    <td>{formatDate(e.requiredDate)}</td>
                    <td>
                      {e.items.map((i) => (
                        <div key={i.id}>
                          {i.product.code} x {i.quantity}
                        </div>
                      ))}
                    </td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
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
