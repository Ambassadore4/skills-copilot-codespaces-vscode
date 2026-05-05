import { useState } from "react";
import TopBar from "../components/TopBar";
import { investorAssets } from "../data/mockData";
import { clsx } from "clsx";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const investors = ["All Investors", "J. Harrington", "M. Chen", "R. Patel", "S. Williams"];

export default function InvestorPortal() {
  const [investor, setInvestor] = useState("J. Harrington");

  const myAssets = investorAssets.filter((a) =>
    investor === "All Investors" || a.investors.some((i) => i.name === investor)
  );

  const totalEquity = myAssets.reduce((s, a) => {
    const inv = a.investors.find((i) => i.name === investor);
    return s + (inv ? inv.equity : 0);
  }, 0);

  const totalNoi = myAssets.reduce((s, a) => s + a.noi, 0);

  const radarData = myAssets.map((a) => ({
    property: a.property.split(" ")[0],
    "Cap Rate": a.capRate,
    "Cash-on-Cash": a.cashOnCash,
    LTV: a.ltv / 10,
  }));

  const barData = myAssets.map((a) => ({
    name: a.property.split(" ")[0],
    Equity: investor !== "All Investors"
      ? (a.investors.find((i) => i.name === investor)?.equity ?? 0)
      : a.equity,
    Debt: a.debt,
  }));

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Investor Portal">
        <select
          value={investor}
          onChange={(e) => setInvestor(e.target.value)}
          className="ml-auto text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {investors.map((i) => <option key={i}>{i}</option>)}
        </select>
      </TopBar>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500">Your Total Equity</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalEquity)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Across {myAssets.length} properties</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Portfolio NOI (Annual)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalNoi)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Avg Cap Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {(myAssets.reduce((s, a) => s + a.capRate, 0) / (myAssets.length || 1)).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Equity vs Debt by Property</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
                <Bar dataKey="Equity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Debt" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Performance Radar</h2>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="property" tick={{ fontSize: 12 }} />
                <Radar name="Cap Rate" dataKey="Cap Rate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Cash-on-Cash" dataKey="Cash-on-Cash" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {myAssets.map((asset) => {
            const myShare = asset.investors.find((i) => i.name === investor);
            return (
              <div key={asset.id} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{asset.property}</h3>
                  <span className="badge bg-primary-100 text-primary-700">
                    {myShare ? `${myShare.share}%` : "Portfolio"}
                  </span>
                </div>

                {[
                  { label: "Property Value", value: fmt(asset.value) },
                  { label: "Your Equity", value: myShare ? fmt(myShare.equity) : fmt(asset.equity) },
                  { label: "Total Debt", value: fmt(asset.debt) },
                  { label: "LTV", value: `${asset.ltv}%` },
                  { label: "Annual NOI", value: fmt(asset.noi) },
                  { label: "Cap Rate", value: `${asset.capRate}%` },
                  { label: "Cash-on-Cash", value: `${asset.cashOnCash}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm border-b border-gray-100 pb-1.5">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}

                {/* Co-investors */}
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1.5">Ownership Structure</p>
                  {asset.investors.map((inv) => (
                    <div key={inv.name} className="flex items-center justify-between text-xs mb-1">
                      <span className={clsx("font-medium", inv.name === investor ? "text-primary-600" : "text-gray-600")}>{inv.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-600 rounded-full" style={{ width: `${inv.share}%` }} />
                        </div>
                        <span className="text-gray-500 w-8 text-right">{inv.share}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="btn-secondary w-full text-xs">View Full Report</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
