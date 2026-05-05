import { useState } from "react";
import type { ReactElement } from "react";
import TopBar from "../components/TopBar";
import { tenants, workOrders, camData } from "../data/mockData";
import { clsx } from "clsx";
import { CheckCircle, Clock, AlertCircle, PlusCircle } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────
function fmt(n: number) {
  return `$${n.toLocaleString()}`;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const statusIcons: Record<string, ReactElement> = {
  open: <Clock className="w-4 h-4 text-amber-500" />,
  "in-progress": <AlertCircle className="w-4 h-4 text-blue-500" />,
  completed: <CheckCircle className="w-4 h-4 text-green-500" />,
};

type Tab = "cam" | "escalations" | "workorders";

export default function Operations() {
  const [tab, setTab] = useState<Tab>("cam");
  const [camDone, setCamDone] = useState(false);
  const [woForm, setWoForm] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Operations Management" />

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {(["cam", "escalations", "workorders"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === t ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {t === "cam" ? "CAM Reconciliation" : t === "escalations" ? "Lease Escalations" : "Work Orders"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── CAM Reconciliation ── */}
        {tab === "cam" && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-800">CAM Reconciliation – 2024</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Auto-calculates tenant pro-rata share of common area expenses</p>
                </div>
                <button
                  onClick={() => setCamDone(true)}
                  className={clsx("btn-primary", camDone && "bg-green-600 hover:bg-green-700")}
                >
                  {camDone ? "✓ Reconciliation Complete" : "Run One-Click CAM Recon"}
                </button>
              </div>

              {/* Expense Summary */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {[
                  { label: "Total Expenses", value: camData.totalExpenses },
                  { label: "Management Fee", value: camData.managementFee },
                  { label: "Insurance", value: camData.insurance },
                  { label: "Property Taxes", value: camData.taxes },
                  { label: "Maintenance", value: camData.maintenance },
                  { label: "Utilities", value: camData.utilities },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{fmt(item.value)}</p>
                  </div>
                ))}
              </div>

              {camData.properties.map((prop) => (
                <div key={prop.property} className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">{prop.property} – Total CAM Pool: {fmt(prop.totalExpenses)}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="table-header">
                        <th className="text-left px-3 py-2">Tenant</th>
                        <th className="text-right px-3 py-2">Sq Ft</th>
                        <th className="text-right px-3 py-2">Pro-Rata %</th>
                        <th className="text-right px-3 py-2">CAM Charge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prop.tenants.map((t) => (
                        <tr key={t.name} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5">{t.name}</td>
                          <td className="px-3 py-2.5 text-right">{t.sqft.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right">{t.proRata}%</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-primary-700">{fmt(t.camCharge)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Lease Escalations ── */}
        {tab === "escalations" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Lease Escalation Tracker</h2>
              <button className="btn-primary">Apply All Pending</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-3 py-2">Tenant</th>
                  <th className="text-left px-3 py-2">Property</th>
                  <th className="text-right px-3 py-2">Current Rent</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Value</th>
                  <th className="text-right px-3 py-2">New Rent</th>
                  <th className="text-left px-3 py-2">Next Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((t) => {
                  const newRent =
                    t.escalationType === "fixed"
                      ? typeof t.escalationValue === "number" && t.escalationValue < 20
                        ? Math.round(t.rent * (1 + t.escalationValue / 100))
                        : t.rent + t.escalationValue
                      : Math.round(t.rent * (1 + t.escalationValue / 100));
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-medium">{t.name}</td>
                      <td className="px-3 py-2.5 text-gray-500">{t.property}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{fmt(t.rent)}</td>
                      <td className="px-3 py-2.5">
                        <span className={clsx("badge",
                          t.escalationType === "cpi" ? "bg-purple-100 text-purple-700" :
                          t.escalationType === "percentage" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {t.escalationType.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {t.escalationType === "fixed" && t.escalationValue >= 20
                          ? fmt(t.escalationValue)
                          : `${t.escalationValue}%`}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-700">{fmt(newRent)}</td>
                      <td className="px-3 py-2.5">{t.nextEscalation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Work Orders ── */}
        {tab === "workorders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {["all", "open", "in-progress", "completed"].map((s) => (
                  <button key={s} className="btn-secondary capitalize text-xs">{s}</button>
                ))}
              </div>
              <button onClick={() => setWoForm(!woForm)} className="btn-primary flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> New Work Order
              </button>
            </div>

            {woForm && (
              <div className="card border-primary-200">
                <h3 className="font-semibold mb-3">New Work Order</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Title", placeholder: "e.g. HVAC Repair" },
                    { label: "Property", placeholder: "Select property" },
                    { label: "Category", placeholder: "e.g. Electrical" },
                    { label: "Vendor", placeholder: "Assign vendor" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input placeholder={f.placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      {["low", "medium", "high", "urgent"].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <input placeholder="Additional notes" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="btn-primary">Submit</button>
                  <button onClick={() => setWoForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}

            {workOrders.map((wo) => (
              <div key={wo.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{statusIcons[wo.status]}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{wo.title}</p>
                        <span className={clsx("badge", priorityColors[wo.priority])}>{wo.priority}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{wo.property} {wo.tenant ? `• ${wo.tenant}` : ""}</p>
                      <p className="text-xs text-gray-400 mt-1">{wo.notes}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p className="font-mono">{wo.id}</p>
                    <p>{wo.category}</p>
                    {wo.vendor && <p className="text-primary-600 font-medium">{wo.vendor}</p>}
                    <p>Updated: {wo.updated}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
