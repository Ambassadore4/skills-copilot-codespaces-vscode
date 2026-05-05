import { useState } from "react";
import type { ReactElement } from "react";
import TopBar from "../components/TopBar";
import { documents, rentRoll, tenants } from "../data/mockData";
import { clsx } from "clsx";
import { FileText, Download, AlertTriangle, CheckCircle, Clock, Upload } from "lucide-react";

type Tab = "vault" | "rentroll" | "coi";

function fmt(n: number) {
  return `$${n.toLocaleString()}`;
}

const coiStatusConfig: Record<string, { color: string; icon: ReactElement }> = {
  valid: { color: "text-green-600", icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
  "expiring-soon": { color: "text-amber-600", icon: <Clock className="w-4 h-4 text-amber-600" /> },
  expired: { color: "text-red-600", icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
};

const docTypeColors: Record<string, string> = {
  Lease: "bg-blue-100 text-blue-700",
  Legal: "bg-purple-100 text-purple-700",
  Insurance: "bg-green-100 text-green-700",
  Survey: "bg-amber-100 text-amber-700",
  Inspection: "bg-orange-100 text-orange-700",
  Appraisal: "bg-pink-100 text-pink-700",
};

export default function Assets() {
  const [tab, setTab] = useState<Tab>("vault");
  const [filter, setFilter] = useState("All");

  const properties = ["All", ...Array.from(new Set(documents.map((d) => d.property)))];
  const filteredDocs = filter === "All" ? documents : documents.filter((d) => d.property === filter);

  const totalRentRollRent = rentRoll.reduce((s, r) => s + r.annualRent, 0);
  const totalSqft = rentRoll.reduce((s, r) => s + r.sqft, 0);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Asset Management" />

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {(["vault", "rentroll", "coi"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === t ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {t === "vault" ? "Document Vault" : t === "rentroll" ? "Rent Roll" : "COI Tracker"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Document Vault ── */}
        {tab === "vault" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {properties.map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilter(p)}
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                      filter === p ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button className="btn-primary flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Document
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="card hover:shadow-md transition-shadow flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm leading-tight truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{doc.property} • {doc.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={clsx("badge", docTypeColors[doc.type] || "bg-gray-100 text-gray-700")}>
                      {doc.type}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{doc.date}</span>
                      <button className="p-1 text-gray-400 hover:text-primary-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Rent Roll ── */}
        {tab === "rentroll" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Rent Roll Report</h2>
                <p className="text-sm text-gray-500">As of May 2025 – Lender Ready</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary">Export PDF</button>
                <button className="btn-secondary">Export Excel</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600">Total Annual Rent</p>
                <p className="text-xl font-bold text-blue-700 mt-0.5">{fmt(totalRentRollRent)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600">Total Sq Ft (Leased)</p>
                <p className="text-xl font-bold text-green-700 mt-0.5">{totalSqft.toLocaleString()} SF</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-600">Avg Rent PSF</p>
                <p className="text-xl font-bold text-purple-700 mt-0.5">
                  ${(totalRentRollRent / totalSqft).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-3 py-2">Tenant</th>
                    <th className="text-left px-3 py-2">Suite</th>
                    <th className="text-left px-3 py-2">Property</th>
                    <th className="text-right px-3 py-2">Sq Ft</th>
                    <th className="text-left px-3 py-2">Lease Start</th>
                    <th className="text-left px-3 py-2">Lease End</th>
                    <th className="text-right px-3 py-2">Monthly Rent</th>
                    <th className="text-right px-3 py-2">Annual Rent</th>
                    <th className="text-right px-3 py-2">Rent/SF</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rentRoll.map((r) => (
                    <tr key={r.id} className={clsx("hover:bg-gray-50", r.status === "vacant" && "bg-red-50")}>
                      <td className="px-3 py-2.5 font-medium">{r.tenant}</td>
                      <td className="px-3 py-2.5 text-gray-500">{r.suite}</td>
                      <td className="px-3 py-2.5 text-gray-500">{r.property}</td>
                      <td className="px-3 py-2.5 text-right">{r.sqft.toLocaleString()}</td>
                      <td className="px-3 py-2.5">{r.leaseStart || "—"}</td>
                      <td className="px-3 py-2.5">{r.leaseEnd || "—"}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.monthlyRent ? fmt(r.monthlyRent) : "—"}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.annualRent ? fmt(r.annualRent) : "—"}</td>
                      <td className="px-3 py-2.5 text-right">{r.rentPsf ? `$${r.rentPsf.toFixed(2)}` : "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={clsx("badge", r.status === "occupied" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-sm">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5">Totals</td>
                    <td className="px-3 py-2.5 text-right">{totalSqft.toLocaleString()}</td>
                    <td colSpan={2} />
                    <td className="px-3 py-2.5 text-right">{fmt(totalRentRollRent / 12)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(totalRentRollRent)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── COI Tracker ── */}
        {tab === "coi" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Valid COIs", count: tenants.filter(t => t.coiStatus === "valid").length, color: "green" },
                { label: "Expiring Soon (< 90 days)", count: tenants.filter(t => t.coiStatus === "expiring-soon").length, color: "amber" },
                { label: "Expired / Missing", count: tenants.filter(t => t.coiStatus === "expired").length, color: "red" },
              ].map((item) => (
                <div key={item.label} className={clsx("card border-l-4", item.color === "green" ? "border-green-500" : item.color === "amber" ? "border-amber-500" : "border-red-500")}>
                  <p className="text-3xl font-bold text-gray-900">{item.count}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Certificate of Insurance Tracker</h2>
                <button className="btn-primary flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Send Reminder Emails
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-3 py-2">Tenant</th>
                    <th className="text-left px-3 py-2">Property</th>
                    <th className="text-left px-3 py-2">Suite</th>
                    <th className="text-left px-3 py-2">COI Expiry</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">AI Flag</th>
                    <th className="text-left px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tenants.map((t) => {
                    const cfg = coiStatusConfig[t.coiStatus];
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-medium">{t.name}</td>
                        <td className="px-3 py-2.5 text-gray-500">{t.property}</td>
                        <td className="px-3 py-2.5">{t.suite}</td>
                        <td className="px-3 py-2.5">{t.coiExpiry}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {cfg.icon}
                            <span className={clsx("text-xs font-medium", cfg.color)}>{t.coiStatus.replace("-", " ")}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {t.coiStatus !== "valid" && (
                            <span className="badge bg-red-100 text-red-700">⚠ AI Alert</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <button className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                            {t.coiStatus === "valid" ? "View" : "Send Reminder"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
