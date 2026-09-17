// Small shared UI helpers used by all pages.

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function Loading({ text = "Loading..." }) {
  return <p className="muted">{text}</p>;
}

export function ErrorMessage({ message }) {
  if (!message) return null;
  return <div className="alert alert-error">{message}</div>;
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return <div className="alert alert-success">{message}</div>;
}

export function money(value) {
  const num = Number(value || 0);
  return `\u20b9${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}
