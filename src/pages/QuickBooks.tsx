import { useState, useCallback } from "react";
import TopBar from "../components/TopBar";
import { clsx } from "clsx";
import {
  createQBOClient,
  buildAuthUrl,
  mockAccounts,
  mockTransactions,
  defaultAccountMapping,
  type QBOTokenSet,
  type SyncResult,
} from "../services/quickbooks";
import { tenants, workOrders, camData } from "../data/mockData";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Link2,
  Link2Off,
  Settings,
  Clock,
  DollarSign,
  FileText,
  Wrench,
  BarChart2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyncLogEntry {
  id: string;
  timestamp: string;
  action: string;
  status: "success" | "error" | "running";
  message: string;
  details?: string;
}

type Tab = "overview" | "mapping" | "sync" | "transactions" | "log";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString()}`;
}

function nowStr() {
  return new Date().toLocaleString();
}

// Mock OAuth config (user fills in their real client ID)
const MOCK_CONFIG = {
  clientId: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET",
  redirectUri: window.location.origin + "/qbo/callback",
  environment: "sandbox" as const,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuickBooks() {
  const [tab, setTab] = useState<Tab>("overview");
  const [tokens, setTokens] = useState<QBOTokenSet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [accountMapping, setAccountMapping] = useState(defaultAccountMapping);
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [transactions] = useState(mockTransactions);
  const [clientId, setClientId] = useState("AB1CdEfGhIjKlMnOpQrStUvWxYz");

  const connected = tokens !== null;

  // ── Connect / Disconnect ─────────────────────────────────────────────────

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    // In a real app, open the OAuth URL in a popup or redirect
    const authUrl = buildAuthUrl({ ...MOCK_CONFIG, clientId }, "random_state_" + Date.now());
    console.log("QBO Auth URL:", authUrl); // dev would use this

    // Simulate OAuth flow completing (mock)
    await new Promise((r) => setTimeout(r, 1500));
    const mockTokens: QBOTokenSet = {
      accessToken: "mock_access_" + Date.now(),
      refreshToken: "mock_refresh_" + Date.now(),
      realmId: "4620816365186088254",
      expiresAt: Date.now() + 3600_000,
    };
    setTokens(mockTokens);
    setConnecting(false);
    addLog("Connect", "success", "Connected to QuickBooks Online – Sandbox", `Realm ID: ${mockTokens.realmId}`);
  }, [clientId]);

  const handleDisconnect = () => {
    setTokens(null);
    addLog("Disconnect", "success", "Disconnected from QuickBooks Online");
  };

  // ── Sync actions ──────────────────────────────────────────────────────────

  function addLog(action: string, status: SyncLogEntry["status"], message: string, details?: string) {
    const entry: SyncLogEntry = {
      id: Date.now().toString(),
      timestamp: nowStr(),
      action,
      status,
      message,
      details,
    };
    setSyncLog((prev) => [entry, ...prev]);
  }

  async function runSync(
    key: string,
    label: string,
    fn: (client: ReturnType<typeof createQBOClient>) => Promise<SyncResult>
  ) {
    if (!tokens) return;
    setSyncing(key);
    addLog(label, "running", `${label} in progress…`);
    const client = createQBOClient(tokens);
    try {
      const result = await fn(client);
      setSyncLog((prev) => {
        const copy = [...prev];
        const running = copy.findIndex((e) => e.status === "running");
        if (running >= 0) copy[running] = { ...copy[running], status: result.success ? "success" : "error", message: result.message };
        return copy;
      });
    } catch (e) {
      setSyncLog((prev) => {
        const copy = [...prev];
        const running = copy.findIndex((e) => e.status === "running");
        if (running >= 0) copy[running] = { ...copy[running], status: "error", message: String(e) };
        return copy;
      });
    } finally {
      setSyncing(null);
    }
  }

  // Build invoices from tenant rent roll
  const pushRentInvoices = (client: ReturnType<typeof createQBOClient>) =>
    client.batchCreateInvoices(
      tenants.map((t) => ({
        TxnDate: new Date().toISOString().slice(0, 10),
        DueDate: new Date(Date.now() + 15 * 86400_000).toISOString().slice(0, 10),
        CustomerRef: { value: t.id, name: t.name },
        Line: [
          {
            DetailType: "SalesItemLineDetail" as const,
            Amount: t.rent,
            Description: `Rent – ${t.property} Suite ${t.suite}`,
            SalesItemLineDetail: { ItemRef: { value: "RENT", name: "Monthly Rent" }, Qty: 1, UnitPrice: t.rent },
          },
        ],
      }))
    );

  // Build CAM invoices
  const pushCamInvoices = (client: ReturnType<typeof createQBOClient>) =>
    client.batchCreateInvoices(
      camData.properties.flatMap((p) =>
        p.tenants
          .filter((t) => t.camCharge > 0)
          .map((t) => ({
            TxnDate: new Date().toISOString().slice(0, 10),
            DueDate: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
            CustomerRef: { value: t.name, name: t.name },
            Line: [
              {
                DetailType: "SalesItemLineDetail" as const,
                Amount: t.camCharge,
                Description: `CAM Reconciliation – ${p.property}`,
                SalesItemLineDetail: { ItemRef: { value: "CAM", name: "CAM Charges" } },
              },
            ],
          }))
      )
    );

  // Build vendor bills from completed work orders
  const pushVendorBills = (client: ReturnType<typeof createQBOClient>) =>
    client.batchCreateBills(
      workOrders
        .filter((w) => w.vendor)
        .map((w) => ({
          TxnDate: w.updated,
          DueDate: w.updated,
          VendorRef: { value: w.id, name: w.vendor! },
          Line: [
            {
              DetailType: "AccountBasedExpenseLineDetail" as const,
              Amount: 2500, // placeholder — real app would have cost field
              Description: `${w.title} – ${w.property}`,
              AccountBasedExpenseLineDetail: {
                AccountRef: { value: "6", name: "Repairs & Maintenance" },
              },
            },
          ],
        }))
    );

  // Pull transactions
  const pullTransactions = (client: ReturnType<typeof createQBOClient>) =>
    client.getTransactions("2025-04-01").then((txns) => ({
      success: true,
      created: txns.length,
      updated: 0,
      errors: [],
      message: `Pulled ${txns.length} transaction(s) from QuickBooks`,
    }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <TopBar title="QuickBooks Integration" />

      {/* Connection banner */}
      <div className={clsx("px-6 py-3 flex items-center justify-between border-b", connected ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200")}>
        <div className="flex items-center gap-3">
          <div className={clsx("w-2.5 h-2.5 rounded-full", connected ? "bg-green-500" : "bg-amber-400")} />
          <span className="text-sm font-medium">
            {connected
              ? `Connected to QuickBooks Online Sandbox — Realm ${tokens!.realmId}`
              : "Not connected to QuickBooks Online"}
          </span>
        </div>
        {connected ? (
          <button onClick={handleDisconnect} className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 font-medium">
            <Link2Off className="w-4 h-4" /> Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="btn-primary flex items-center gap-2"
          >
            {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {connecting ? "Connecting…" : "Connect QuickBooks"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {(["overview", "mapping", "sync", "transactions", "log"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize",
              tab === t ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {t === "mapping" ? "Account Mapping" : t === "sync" ? "Sync Center" : t === "transactions" ? "Transactions" : t === "log" ? "Sync Log" : "Overview"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="space-y-6 max-w-3xl">
            {/* Connection card */}
            <div className="card space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary-600" /> QuickBooks Connection
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client ID (from Intuit Developer Portal)</label>
                  <input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Your QBO Client ID"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Environment</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>Sandbox</option>
                    <option>Production</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Redirect URI</label>
                  <input
                    readOnly
                    value={window.location.origin + "/qbo/callback"}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Add this to your app's allowed redirect URIs in the Intuit Developer Portal</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Token Status</label>
                  <div className={clsx("border rounded-lg px-3 py-2 text-sm flex items-center gap-2", connected ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-400")}>
                    {connected ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {connected ? `Valid · expires ${new Date(tokens!.expiresAt).toLocaleTimeString()}` : "No token"}
                  </div>
                </div>
              </div>
              {!connected && (
                <button onClick={handleConnect} disabled={connecting} className="btn-primary flex items-center gap-2 w-fit">
                  {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  {connecting ? "Opening OAuth…" : "Authorize with QuickBooks"}
                </button>
              )}
            </div>

            {/* Integration capabilities */}
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4">Integration Capabilities</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <DollarSign className="w-5 h-5 text-green-600" />, title: "Rent Invoices", desc: "Push monthly rent invoices for all tenants directly into QBO" },
                  { icon: <FileText className="w-5 h-5 text-blue-600" />, title: "CAM Charges", desc: "Auto-generate CAM reconciliation invoices from one-click recon" },
                  { icon: <Wrench className="w-5 h-5 text-orange-600" />, title: "Vendor Bills", desc: "Push work order costs as vendor bills to QBO Accounts Payable" },
                  { icon: <ArrowDownLeft className="w-5 h-5 text-purple-600" />, title: "Bank Transactions", desc: "Pull bank feed transactions for reconciliation review" },
                  { icon: <BarChart2 className="w-5 h-5 text-primary-600" />, title: "P&L Reports", desc: "Pull Profit & Loss report from QBO into Financial dashboard" },
                  { icon: <Settings className="w-5 h-5 text-gray-600" />, title: "Account Mapping", desc: "Map CRE categories to your Chart of Accounts in QBO" },
                ].map((cap) => (
                  <div key={cap.title} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="mt-0.5">{cap.icon}</div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">{cap.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{cap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* API info */}
            <div className="card bg-gray-900 text-green-400 font-mono text-xs space-y-1">
              <p className="text-gray-400 mb-2"># QBO API endpoints used</p>
              <p>GET  /v3/company/&#123;realmId&#125;/query?query=SELECT * FROM Account</p>
              <p>POST /v3/company/&#123;realmId&#125;/invoice</p>
              <p>POST /v3/company/&#123;realmId&#125;/bill</p>
              <p>GET  /v3/company/&#123;realmId&#125;/query?query=SELECT * FROM Transaction</p>
              <p>GET  /v3/company/&#123;realmId&#125;/reports/ProfitAndLoss</p>
              <p className="text-gray-400 mt-2"># OAuth 2.0</p>
              <p>GET  https://appcenter.intuit.com/connect/oauth2</p>
              <p>POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer</p>
            </div>
          </div>
        )}

        {/* ── Account Mapping ── */}
        {tab === "mapping" && (
          <div className="max-w-2xl space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-800">Chart of Accounts Mapping</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Map PropManage categories to your QuickBooks account IDs</p>
                </div>
                <button
                  disabled={!connected}
                  className={clsx("btn-secondary flex items-center gap-2 text-xs", !connected && "opacity-40 cursor-not-allowed")}
                  onClick={() => { }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Fetch from QBO
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(accountMapping).map(([category, qboId]) => {
                  const matched = mockAccounts.find((a) => a.Id === qboId);
                  return (
                    <div key={category} className="grid grid-cols-2 gap-3 items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{category}</p>
                        <p className="text-xs text-gray-400">PropManage category</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={qboId}
                          onChange={(e) => setAccountMapping((prev) => ({ ...prev, [category]: e.target.value }))}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">— Select QBO Account —</option>
                          {mockAccounts.map((a) => (
                            <option key={a.Id} value={a.Id}>{a.Name}</option>
                          ))}
                        </select>
                        {matched && (
                          <span className={clsx("badge text-xs whitespace-nowrap",
                            matched.AccountType === "Income" ? "bg-green-100 text-green-700" :
                            matched.AccountType === "Expense" ? "bg-orange-100 text-orange-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {matched.AccountType}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn-primary text-xs">Save Mapping</button>
                <button className="btn-secondary text-xs" onClick={() => setAccountMapping(defaultAccountMapping)}>Reset Defaults</button>
              </div>
            </div>

            {/* QBO Accounts list */}
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-3">QuickBooks Accounts (from QBO)</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Account Name</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockAccounts.map((a) => (
                    <tr key={a.Id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">{a.Id}</td>
                      <td className="px-3 py-2 font-medium">{a.Name}</td>
                      <td className="px-3 py-2">
                        <span className={clsx("badge",
                          a.AccountType === "Income" ? "bg-green-100 text-green-700" :
                          a.AccountType === "Expense" ? "bg-orange-100 text-orange-700" :
                          a.AccountType === "Bank" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {a.AccountType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{a.CurrentBalance ? fmt(a.CurrentBalance) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Sync Center ── */}
        {tab === "sync" && (
          <div className="space-y-4 max-w-2xl">
            {!connected && (
              <div className="card border-amber-200 bg-amber-50 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-700">Not connected</p>
                  <p className="text-sm text-amber-600">Connect to QuickBooks on the Overview tab to enable syncing.</p>
                </div>
              </div>
            )}

            {[
              {
                key: "rent",
                icon: <DollarSign className="w-5 h-5 text-green-600" />,
                title: "Push Rent Invoices → QBO",
                desc: `Creates ${tenants.length} tenant invoices in QuickBooks for current month rent`,
                direction: "push",
                run: pushRentInvoices,
              },
              {
                key: "cam",
                icon: <FileText className="w-5 h-5 text-blue-600" />,
                title: "Push CAM Charges → QBO",
                desc: "Creates CAM reconciliation invoices from the Operations module",
                direction: "push",
                run: pushCamInvoices,
              },
              {
                key: "bills",
                icon: <Wrench className="w-5 h-5 text-orange-600" />,
                title: "Push Vendor Bills → QBO",
                desc: `Creates ${workOrders.filter((w) => w.vendor).length} vendor bills from work orders with assigned vendors`,
                direction: "push",
                run: pushVendorBills,
              },
              {
                key: "transactions",
                icon: <ArrowDownLeft className="w-5 h-5 text-purple-600" />,
                title: "Pull Transactions ← QBO",
                desc: "Fetches recent bank feed transactions for reconciliation",
                direction: "pull",
                run: pullTransactions,
              },
            ].map((action) => {
              const isRunning = syncing === action.key;
              const lastLog = syncLog.find((l) => l.action.toLowerCase().includes(action.key) || l.action.toLowerCase().includes(action.title.split(" ")[1].toLowerCase()));
              return (
                <div key={action.key} className="card flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg mt-0.5">{action.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{action.title}</p>
                        <span className={clsx("badge text-xs", action.direction === "push" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700")}>
                          {action.direction === "push" ? <ArrowUpRight className="w-3 h-3 inline mr-0.5" /> : <ArrowDownLeft className="w-3 h-3 inline mr-0.5" />}
                          {action.direction}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{action.desc}</p>
                      {lastLog && lastLog.status !== "running" && (
                        <p className={clsx("text-xs mt-1 font-medium", lastLog.status === "success" ? "text-green-600" : "text-red-600")}>
                          {lastLog.status === "success" ? "✓" : "✗"} {lastLog.message} · {lastLog.timestamp}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    disabled={!connected || isRunning}
                    onClick={() => runSync(action.key, action.title, action.run)}
                    className={clsx(
                      "btn-primary flex items-center gap-2 whitespace-nowrap flex-shrink-0",
                      (!connected || isRunning) && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    {isRunning ? "Syncing…" : "Run Sync"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Transactions ── */}
        {tab === "transactions" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">QBO Bank Feed Transactions</h2>
              <button
                disabled={!connected}
                className={clsx("btn-secondary flex items-center gap-2 text-xs", !connected && "opacity-40 cursor-not-allowed")}
                onClick={() => runSync("transactions", "Pull Transactions ← QBO", pullTransactions)}
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", syncing === "transactions" && "animate-spin")} /> Refresh
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600">Total Deposits</p>
                <p className="text-xl font-bold text-green-700">
                  {fmt(transactions.filter((t) => t.Amount > 0).reduce((s, t) => s + t.Amount, 0))}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-600">Total Payments</p>
                <p className="text-xl font-bold text-red-700">
                  {fmt(transactions.filter((t) => t.Amount < 0).reduce((s, t) => s + t.Amount, 0))}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600">Net</p>
                <p className="text-xl font-bold text-blue-700">
                  {fmt(transactions.reduce((s, t) => s + t.Amount, 0))}
                </p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Payee / Customer</th>
                  <th className="text-left px-3 py-2">Account</th>
                  <th className="text-left px-3 py-2">Memo</th>
                  <th className="text-right px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((txn) => (
                  <tr key={txn.Id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">{txn.TxnDate}</td>
                    <td className="px-3 py-2.5">
                      <span className={clsx("badge", txn.TxnType === "Deposit" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                        {txn.TxnType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{txn.EntityRef?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{txn.AccountRef.name}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{txn.Memo}</td>
                    <td className={clsx("px-3 py-2.5 text-right font-mono font-semibold", txn.Amount >= 0 ? "text-green-700" : "text-red-700")}>
                      {txn.Amount >= 0 ? "+" : ""}{fmt(txn.Amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Sync Log ── */}
        {tab === "log" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Sync History</h2>
              <button onClick={() => setSyncLog([])} className="btn-secondary text-xs">Clear Log</button>
            </div>

            {syncLog.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No sync history yet. Run a sync from the Sync Center tab.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-3 py-2">Timestamp</th>
                    <th className="text-left px-3 py-2">Action</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {syncLog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">{entry.timestamp}</td>
                      <td className="px-3 py-2.5 font-medium text-xs">{entry.action}</td>
                      <td className="px-3 py-2.5">
                        {entry.status === "running" ? (
                          <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
                            <RefreshCw className="w-3 h-3 animate-spin" /> running
                          </span>
                        ) : entry.status === "success" ? (
                          <span className="badge bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" /> success
                          </span>
                        ) : (
                          <span className="badge bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> error
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">
                        {entry.message}
                        {entry.details && <span className="text-gray-400 ml-2">({entry.details})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
