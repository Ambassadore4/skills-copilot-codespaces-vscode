import TopBar from "../components/TopBar";
import { financialSummary, cashFlowTrend, loans } from "../data/mockData";
import { clsx } from "clsx";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const debtBreakdown = [
  { name: "Fixed Rate", value: 9800000 },
  { name: "Variable Rate", value: 4400000 },
];
const COLORS = ["#3b82f6", "#f59e0b"];

const loanStatusColors: Record<string, string> = {
  current: "bg-green-100 text-green-700",
  "maturing-soon": "bg-amber-100 text-amber-700",
  "at-risk": "bg-red-100 text-red-700",
};

export default function Financial() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Financial Management" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Cash Flow (YTD)", value: fmt(financialSummary.cashFlow * 12), sub: "Annualized" },
            { label: "Net Operating Income", value: fmt(financialSummary.noi), sub: "Annual" },
            { label: "Global Debt", value: fmt(financialSummary.globalDebt), sub: "All entities" },
          ].map((item) => (
            <div key={item.label} className="card">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4">Cash Flow & NOI Trend</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={cashFlowTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="cashFlow" name="Cash Flow" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="noi" name="NOI" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Debt Structure</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={debtBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {debtBreakdown.map((_entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {debtBreakdown.map((d, i) => (
                <div key={d.name} className="flex justify-between text-sm">
                  <span className="text-gray-600">{d.name}</span>
                  <span className="font-medium" style={{ color: COLORS[i] }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loan Details */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Loan Portfolio</h2>
            <button className="btn-primary">+ Add Loan</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Property</th>
                  <th className="text-left px-3 py-2">Lender</th>
                  <th className="text-right px-3 py-2">Balance</th>
                  <th className="text-right px-3 py-2">Value</th>
                  <th className="text-right px-3 py-2">LTV</th>
                  <th className="text-right px-3 py-2">DCR</th>
                  <th className="text-right px-3 py-2">Rate</th>
                  <th className="text-left px-3 py-2">Maturity</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{loan.id}</td>
                    <td className="px-3 py-2.5 font-medium">{loan.property}</td>
                    <td className="px-3 py-2.5 text-gray-500">{loan.lender}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(loan.balance)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(loan.value)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={clsx("font-semibold", loan.ltv > 65 ? "text-red-600" : "text-gray-800")}>
                        {loan.ltv}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={clsx("font-semibold", loan.dcr < 1.25 ? "text-red-600" : loan.dcr < 1.4 ? "text-amber-600" : "text-green-600")}>
                        {loan.dcr.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">{loan.rate}%</td>
                    <td className="px-3 py-2.5">{loan.maturity}</td>
                    <td className="px-3 py-2.5">
                      <span className={clsx("badge", loanStatusColors[loan.status])}>
                        {loan.status.replace("-", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
