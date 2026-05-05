import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import { DollarSign, TrendingUp, Building2, Users, Percent, AlertTriangle } from "lucide-react";
import StatCard from "../components/StatCard";
import TopBar from "../components/TopBar";
import { financialSummary, cashFlowTrend, loans, entities } from "../data/mockData";
import { useState } from "react";
import { clsx } from "clsx";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const loanStatusColors: Record<string, string> = {
  current: "bg-green-100 text-green-700",
  "maturing-soon": "bg-amber-100 text-amber-700",
  "at-risk": "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const [entity, setEntity] = useState("all");

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Global Dashboard">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="ml-auto text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </TopBar>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Monthly Cash Flow"
            value={fmt(financialSummary.cashFlow)}
            icon={<DollarSign className="w-5 h-5" />}
            trend={{ value: 3.1, label: "vs last month" }}
            color="green"
          />
          <StatCard
            title="Annual NOI"
            value={fmt(financialSummary.noi)}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={{ value: 2.4, label: "vs last year" }}
            color="blue"
          />
          <StatCard
            title="Global Debt"
            value={fmt(financialSummary.globalDebt)}
            subtitle="Across all entities"
            icon={<AlertTriangle className="w-5 h-5" />}
            color="amber"
          />
          <StatCard
            title="Occupancy Rate"
            value={`${financialSummary.occupancyRate}%`}
            icon={<Percent className="w-5 h-5" />}
            trend={{ value: 1.2, label: "vs last quarter" }}
            color="purple"
          />
          <StatCard
            title="Properties"
            value={`${financialSummary.totalProperties}`}
            icon={<Building2 className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Total Tenants"
            value={`${financialSummary.totalTenants}`}
            icon={<Users className="w-5 h-5" />}
            color="green"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Cash Flow Trend (6 Months)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={cashFlowTrend}>
                <defs>
                  <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Area type="monotone" dataKey="cashFlow" name="Cash Flow" stroke="#3b82f6" fill="url(#cfGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">NOI by Month</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cashFlowTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
                <Bar dataKey="noi" name="NOI" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loan Dashboard */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Loan Dashboard</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-3 py-2">Property</th>
                  <th className="text-left px-3 py-2">Lender</th>
                  <th className="text-right px-3 py-2">Balance</th>
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
                    <td className="px-3 py-2.5 font-medium">{loan.property}</td>
                    <td className="px-3 py-2.5 text-gray-500">{loan.lender}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{fmt(loan.balance)}</td>
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
