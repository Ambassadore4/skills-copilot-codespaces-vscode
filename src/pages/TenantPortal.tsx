import { useState } from "react";
import TopBar from "../components/TopBar";
import { tenants, workOrders, documents } from "../data/mockData";
import { clsx } from "clsx";
import { CreditCard, FileText, Wrench, CheckCircle, ToggleLeft, ToggleRight } from "lucide-react";

const myTenant = tenants[0]; // Simulating logged-in tenant: TechCorp Solutions

type Tab = "payments" | "lease" | "maintenance";

function fmt(n: number) { return `$${n.toLocaleString()}`; }

export default function TenantPortal() {
  const [tab, setTab] = useState<Tab>("payments");
  const [autopay, setAutopay] = useState(myTenant.autopay);
  const [paySuccess, setPaySuccess] = useState(false);
  const [woSubmitted, setWoSubmitted] = useState(false);

  const myWorkOrders = workOrders.filter((w) => w.tenant === myTenant.name);
  const myDocs = documents.filter((d) => d.property === myTenant.property && d.tags.includes("lease"));

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Tenant Portal" />

      {/* Welcome banner */}
      <div className="bg-primary-600 text-white px-6 py-4">
        <p className="text-sm opacity-80">Welcome back,</p>
        <p className="text-lg font-bold">{myTenant.name} – Suite {myTenant.suite}, {myTenant.property}</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {(["payments", "lease", "maintenance"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === t ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {t === "payments" ? "💳 Payments" : t === "lease" ? "📄 My Lease" : "🔧 Maintenance"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Payments ── */}
        {tab === "payments" && (
          <div className="max-w-xl space-y-4">
            {/* Balance card */}
            <div className={clsx("card border-l-4", myTenant.balance > 0 ? "border-red-500" : "border-green-500")}>
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className={clsx("text-3xl font-bold mt-1", myTenant.balance > 0 ? "text-red-600" : "text-green-600")}>
                {myTenant.balance > 0 ? fmt(myTenant.balance) : "All Paid ✓"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Monthly Rent: {fmt(myTenant.rent)} | Due: 1st of each month</p>
            </div>

            {/* Autopay Toggle */}
            <div className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">ACH Autopay</p>
                <p className="text-xs text-gray-500 mt-0.5">Automatically pay rent on the 1st via bank transfer</p>
              </div>
              <button onClick={() => setAutopay(!autopay)} className="flex items-center gap-2">
                {autopay
                  ? <ToggleRight className="w-8 h-8 text-green-600" />
                  : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                <span className={clsx("text-sm font-medium", autopay ? "text-green-600" : "text-gray-500")}>
                  {autopay ? "Enabled" : "Disabled"}
                </span>
              </button>
            </div>

            {/* Pay Now form */}
            {!paySuccess ? (
              <div className="card space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary-600" /> Pay Rent via ACH
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bank Routing Number</label>
                  <input placeholder="e.g. 021000021" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                  <input placeholder="Checking account" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                  <input defaultValue={fmt(myTenant.rent)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <button onClick={() => setPaySuccess(true)} className="btn-primary w-full py-2.5">
                  Submit Payment
                </button>
              </div>
            ) : (
              <div className="card border-green-200 bg-green-50 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-700">Payment Submitted!</p>
                  <p className="text-sm text-green-600">Your ACH payment of {fmt(myTenant.rent)} has been submitted for processing.</p>
                </div>
              </div>
            )}

            {/* Payment history */}
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">Payment History</h3>
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-right px-2 py-2">Amount</th>
                  <th className="text-left px-2 py-2">Method</th>
                  <th className="text-left px-2 py-2">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {["2025-04-01", "2025-03-01", "2025-02-01", "2025-01-01"].map((d) => (
                    <tr key={d}>
                      <td className="px-2 py-2">{d}</td>
                      <td className="px-2 py-2 text-right font-mono">{fmt(myTenant.rent)}</td>
                      <td className="px-2 py-2">ACH</td>
                      <td className="px-2 py-2"><span className="badge bg-green-100 text-green-700">Paid</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Lease ── */}
        {tab === "lease" && (
          <div className="max-w-xl space-y-4">
            <div className="card space-y-3">
              <h3 className="font-semibold text-gray-800">Lease Summary</h3>
              {[
                ["Property", myTenant.property],
                ["Suite", myTenant.suite],
                ["Sq Ft", myTenant.sqft.toLocaleString()],
                ["Lease Term", `${myTenant.leaseStart} → ${myTenant.leaseEnd}`],
                ["Monthly Rent", fmt(myTenant.rent)],
                ["Escalation", `${myTenant.escalationType.toUpperCase()} @ ${myTenant.escalationValue}%`],
                ["Next Escalation", myTenant.nextEscalation],
                ["Pro-Rata Share", `${myTenant.proRata}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" /> Lease Documents
              </h3>
              {myDocs.length === 0
                ? <p className="text-sm text-gray-400">No documents available.</p>
                : myDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{doc.name}</span>
                    </div>
                    <button className="text-xs text-primary-600 font-medium">Download</button>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── Maintenance ── */}
        {tab === "maintenance" && (
          <div className="max-w-xl space-y-4">
            {!woSubmitted ? (
              <div className="card space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary-600" /> Submit Maintenance Request
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Issue Title</label>
                  <input placeholder="e.g. Leaking faucet in break room" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {["Plumbing", "Electrical", "HVAC", "Doors/Windows", "Janitorial", "Other"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {["Low", "Medium", "High", "Emergency"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea rows={3} placeholder="Describe the issue..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <button onClick={() => setWoSubmitted(true)} className="btn-primary w-full py-2.5">Submit Request</button>
              </div>
            ) : (
              <div className="card border-green-200 bg-green-50 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-700">Request Submitted!</p>
                  <p className="text-sm text-green-600">Your maintenance request has been received and will be addressed shortly.</p>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">My Open Requests</h3>
              {myWorkOrders.length === 0
                ? <p className="text-sm text-gray-400">No open maintenance requests.</p>
                : myWorkOrders.map((wo) => (
                  <div key={wo.id} className="py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{wo.title}</p>
                      <span className={clsx("badge",
                        wo.status === "completed" ? "bg-green-100 text-green-700" :
                        wo.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      )}>{wo.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{wo.id} • {wo.updated}</p>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
