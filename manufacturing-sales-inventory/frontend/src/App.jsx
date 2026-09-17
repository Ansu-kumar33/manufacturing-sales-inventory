import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Customers from "./pages/Customers.jsx";
import Enquiries from "./pages/Enquiries.jsx";
import Quotations from "./pages/Quotations.jsx";
import SalesOrders from "./pages/SalesOrders.jsx";
import Inventory from "./pages/Inventory.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/enquiries" element={<Enquiries />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/sales-orders" element={<SalesOrders />} />
        <Route path="/inventory" element={<Inventory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
