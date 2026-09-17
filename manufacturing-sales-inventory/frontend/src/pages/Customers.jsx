import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Loading, ErrorMessage, SuccessMessage } from "../components/Ui.jsx";

const EMPTY = { company: "", contact: "", mobile: "", email: "", city: "" };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api.post("/customers", form);
      setSuccess("Customer created successfully");
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Customers</h2>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <div className="card">
        <h3>Add customer</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Company *</label>
              <input name="company" value={form.company} onChange={change} required />
            </div>
            <div>
              <label>Contact person *</label>
              <input name="contact" value={form.contact} onChange={change} required />
            </div>
            <div>
              <label>Mobile (10 digits) *</label>
              <input name="mobile" value={form.mobile} onChange={change} required />
            </div>
            <div>
              <label>Email *</label>
              <input type="email" name="email" value={form.email} onChange={change} required />
            </div>
            <div>
              <label>City *</label>
              <input name="city" value={form.city} onChange={change} required />
            </div>
          </div>
          <div className="mt">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save customer"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>All customers</h3>
        {loading ? (
          <Loading />
        ) : customers.length === 0 ? (
          <p className="muted">No customers yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>City</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.company}</td>
                    <td>{c.contact}</td>
                    <td>{c.mobile}</td>
                    <td>{c.email}</td>
                    <td>{c.city}</td>
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
