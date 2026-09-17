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

const EMPTY_ITEM = { productId: "", quantity: 1, unitPrice: "", discountPct: 0, gstPct: 18 };

export default function Quotations() {
  const { isSales } = useAuth();

  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [enquiryId, setEnquiryId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadQuotations() {
    const res = await api.get("/quotations");
    setQuotations(res.data);
  }

  useEffect(() => {
    async function load() {
      try {
        const [c, p, e] = await Promise.all([
          api.get("/customers"),
          api.get("/products"),
          api.get("/enquiries"),
        ]);
        setCustomers(c.data);
        setProducts(p.data);
        setEnquiries(e.data);
        await loadQuotations();
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await api.post("/quotations", {
        customerId: Number(customerId),
        enquiryId: enquiryId ? Number(enquiryId) : null,
        validUntil: validUntil || null,
        items: items.map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          unitPrice: i.unitPrice === "" ? null : Number(i.unitPrice),
          discountPct: Number(i.discountPct || 0),
          gstPct: Number(i.gstPct || 0),
        })),
      });
      setSuccess(
        `Quotation ${res.data.quotationNo} created. Total calculated by backend: ${money(
          res.data.totalAmount
        )}`
      );
      setCustomerId("");
      setEnquiryId("");
      setValidUntil("");
      setItems([{ ...EMPTY_ITEM }]);
      await loadQuotations();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id, status) {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/quotations/${id}/status`, { status });
      setSuccess(`Quotation marked ${status}`);
      await loadQuotations();
    } catch (err) {
      setError(err.message);
    }
  }

  async function convert(id) {
    setError("");
    setSuccess("");
    try {
      const res = await api.post(`/quotations/${id}/convert`);
      setSuccess(`Sales order ${res.data.orderNo} created`);
      await loadQuotations();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Quotations</h2>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      {isSales && (
        <div className="card">
          <h3>New quotation</h3>
          <p className="muted">
            Leave unit price empty to use the product base price. The total is always
            calculated by the backend.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label>Customer *</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Enquiry (optional)</label>
                <select value={enquiryId} onChange={(e) => setEnquiryId(e.target.value)}>
                  <option value="">No enquiry</option>
                  {enquiries
                    .filter((e) => !customerId || e.customerId === Number(customerId))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.enquiryNo} - {e.customer.company}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label>Valid until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
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
                  <label>Unit price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                    placeholder="base price"
                  />
                </div>
                <div>
                  <label>Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discountPct}
                    onChange={(e) => updateItem(index, "discountPct", e.target.value)}
                  />
                </div>
                <div>
                  <label>GST %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.gstPct}
                    onChange={(e) => updateItem(index, "gstPct", e.target.value)}
                  />
                </div>
                <div>
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    className="btn btn-grey btn-sm"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    disabled={items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="mt btn-row">
              <button
                type="button"
                className="btn btn-grey"
                onClick={() => setItems([...items, { ...EMPTY_ITEM }])}
              >
                Add item
              </button>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create quotation"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3>All quotations</h3>
        {loading ? (
          <Loading />
        ) : quotations.length === 0 ? (
          <p className="muted">No quotations yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quotation No</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Valid until</th>
                  <th>Total</th>
                  <th>Status</th>
                  {isSales && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id}>
                    <td>{q.quotationNo}</td>
                    <td>{q.customer.company}</td>
                    <td>
                      {q.items.map((i) => (
                        <div key={i.id}>
                          {i.product.code} x {i.quantity} = {money(i.lineAmount)}
                        </div>
                      ))}
                    </td>
                    <td>{formatDate(q.validUntil)}</td>
                    <td>{money(q.totalAmount)}</td>
                    <td>
                      <StatusBadge status={q.status} />
                      {q.salesOrder && (
                        <div className="muted">SO: {q.salesOrder.orderNo}</div>
                      )}
                    </td>
                    {isSales && (
                      <td>
                        <div className="btn-row">
                          {q.status === "DRAFT" && (
                            <button className="btn btn-sm" onClick={() => changeStatus(q.id, "SENT")}>
                              Send
                            </button>
                          )}
                          {q.status === "SENT" && (
                            <>
                              <button
                                className="btn btn-green btn-sm"
                                onClick={() => changeStatus(q.id, "ACCEPTED")}
                              >
                                Accept
                              </button>
                              <button
                                className="btn btn-red btn-sm"
                                onClick={() => changeStatus(q.id, "REJECTED")}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {q.status === "ACCEPTED" && !q.salesOrder && (
                            <button className="btn btn-sm" onClick={() => convert(q.id)}>
                              Convert to Sales Order
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
