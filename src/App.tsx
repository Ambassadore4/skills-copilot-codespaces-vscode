import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Financial from "./pages/Financial";
import Operations from "./pages/Operations";
import Assets from "./pages/Assets";
import TenantPortal from "./pages/TenantPortal";
import InvestorPortal from "./pages/InvestorPortal";
import QuickBooks from "./pages/QuickBooks";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/tenant" element={<TenantPortal />} />
            <Route path="/investor" element={<InvestorPortal />} />
            <Route path="/quickbooks" element={<QuickBooks />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
