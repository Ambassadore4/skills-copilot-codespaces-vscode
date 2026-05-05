// ─────────────────────────────────────────────────────────────────────────────
// QuickBooks Online API Service Layer
//
// Mirrors the real QBO REST API v3 endpoints.
// Replace MOCK_MODE = false and supply real OAuth tokens to go live.
//
// OAuth2 endpoints (Intuit):
//   Auth:  https://appcenter.intuit.com/connect/oauth2
//   Token: https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
//   Base:  https://quickbooks.api.intuit.com/v3/company/{realmId}
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_MODE = true;
const QBO_BASE = "https://quickbooks.api.intuit.com/v3/company";
const OAUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";

// ── Types ────────────────────────────────────────────────────────────────────

export interface QBOConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
}

export interface QBOTokenSet {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  expiresAt: number; // epoch ms
}

export interface QBOAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType: string;
  CurrentBalance: number;
  Active: boolean;
}

export interface QBOInvoice {
  Id?: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate: string;
  CustomerRef: { value: string; name: string };
  Line: QBOInvoiceLine[];
  TotalAmt?: number;
  Balance?: number;
  EmailStatus?: string;
}

export interface QBOInvoiceLine {
  DetailType: "SalesItemLineDetail";
  Amount: number;
  Description?: string;
  SalesItemLineDetail: {
    ItemRef: { value: string; name: string };
    Qty?: number;
    UnitPrice?: number;
  };
}

export interface QBOBill {
  Id?: string;
  TxnDate: string;
  DueDate: string;
  VendorRef: { value: string; name: string };
  Line: QBOBillLine[];
  TotalAmt?: number;
}

export interface QBOBillLine {
  DetailType: "AccountBasedExpenseLineDetail";
  Amount: number;
  Description?: string;
  AccountBasedExpenseLineDetail: {
    AccountRef: { value: string; name: string };
  };
}

export interface QBOTransaction {
  Id: string;
  TxnDate: string;
  TxnType: string;
  Amount: number;
  AccountRef: { name: string };
  EntityRef?: { name: string };
  Memo?: string;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  message: string;
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

export function buildAuthUrl(config: QBOConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: config.redirectUri,
    state,
  });
  return `${OAUTH_BASE}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 * In production, this MUST happen server-side to protect clientSecret.
 */
export async function exchangeCodeForTokens(
  _config: QBOConfig,
  _code: string,
  _realmId: string
): Promise<QBOTokenSet> {
  if (MOCK_MODE) {
    await delay(800);
    return {
      accessToken: "mock_access_token_" + Date.now(),
      refreshToken: "mock_refresh_token_" + Date.now(),
      realmId: "4620816365186088254",
      expiresAt: Date.now() + 3600_000,
    };
  }
  // Real implementation — POST to token endpoint (server-side proxy recommended)
  throw new Error("Real OAuth exchange not implemented in browser context");
}

export async function refreshAccessToken(
  _config: QBOConfig,
  refreshToken: string
): Promise<QBOTokenSet> {
  if (MOCK_MODE) {
    await delay(400);
    return {
      accessToken: "mock_access_token_refreshed_" + Date.now(),
      refreshToken,
      realmId: "4620816365186088254",
      expiresAt: Date.now() + 3600_000,
    };
  }
  throw new Error("Token refresh not implemented in browser context");
}

// ── API client ────────────────────────────────────────────────────────────────

class QBOClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(realmId: string, accessToken: string) {
    this.baseUrl = `${QBO_BASE}/${realmId}`;
    this.accessToken = accessToken;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  // ── Accounts ──────────────────────────────────────────────────────────────

  async getAccounts(): Promise<QBOAccount[]> {
    if (MOCK_MODE) {
      await delay(600);
      return mockAccounts;
    }
    const res = await fetch(
      `${this.baseUrl}/query?query=SELECT * FROM Account WHERE Active = true MAXRESULTS 100`,
      { headers: this.headers() }
    );
    const json = await res.json();
    return json.QueryResponse.Account ?? [];
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  async createInvoice(invoice: QBOInvoice): Promise<QBOInvoice> {
    if (MOCK_MODE) {
      await delay(300);
      return { ...invoice, Id: `INV-${Date.now()}`, TotalAmt: invoice.Line.reduce((s, l) => s + l.Amount, 0), Balance: invoice.Line.reduce((s, l) => s + l.Amount, 0) };
    }
    const res = await fetch(`${this.baseUrl}/invoice`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(invoice),
    });
    const json = await res.json();
    return json.Invoice;
  }

  async batchCreateInvoices(invoices: QBOInvoice[]): Promise<SyncResult> {
    if (MOCK_MODE) {
      await delay(1200);
      return { success: true, created: invoices.length, updated: 0, errors: [], message: `${invoices.length} invoice(s) pushed to QuickBooks` };
    }
    let created = 0;
    const errors: string[] = [];
    for (const inv of invoices) {
      try {
        await this.createInvoice(inv);
        created++;
      } catch (e) {
        errors.push(String(e));
      }
    }
    return { success: errors.length === 0, created, updated: 0, errors, message: `${created} invoice(s) created, ${errors.length} error(s)` };
  }

  // ── Bills (vendor expenses) ───────────────────────────────────────────────

  async createBill(bill: QBOBill): Promise<QBOBill> {
    if (MOCK_MODE) {
      await delay(300);
      return { ...bill, Id: `BILL-${Date.now()}`, TotalAmt: bill.Line.reduce((s, l) => s + l.Amount, 0) };
    }
    const res = await fetch(`${this.baseUrl}/bill`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(bill),
    });
    const json = await res.json();
    return json.Bill;
  }

  async batchCreateBills(bills: QBOBill[]): Promise<SyncResult> {
    if (MOCK_MODE) {
      await delay(900);
      return { success: true, created: bills.length, updated: 0, errors: [], message: `${bills.length} vendor bill(s) pushed to QuickBooks` };
    }
    let created = 0;
    const errors: string[] = [];
    for (const bill of bills) {
      try {
        await this.createBill(bill);
        created++;
      } catch (e) {
        errors.push(String(e));
      }
    }
    return { success: errors.length === 0, created, updated: 0, errors, message: `${created} bill(s) created` };
  }

  // ── Transactions (pull) ───────────────────────────────────────────────────

  async getTransactions(since: string): Promise<QBOTransaction[]> {
    if (MOCK_MODE) {
      await delay(800);
      return mockTransactions;
    }
    const query = encodeURIComponent(
      `SELECT * FROM Transaction WHERE TxnDate >= '${since}' ORDERBY TxnDate DESC MAXRESULTS 100`
    );
    const res = await fetch(`${this.baseUrl}/query?query=${query}`, { headers: this.headers() });
    const json = await res.json();
    return json.QueryResponse.Transaction ?? [];
  }

  // ── P&L Report ────────────────────────────────────────────────────────────

  async getProfitAndLoss(startDate: string, endDate: string): Promise<object> {
    if (MOCK_MODE) {
      await delay(700);
      return mockPnL;
    }
    const res = await fetch(
      `${this.baseUrl}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`,
      { headers: this.headers() }
    );
    return res.json();
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createQBOClient(tokens: QBOTokenSet): QBOClient {
  return new QBOClient(tokens.realmId, tokens.accessToken);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const mockAccounts: QBOAccount[] = [
  { Id: "1", Name: "Checking – Operating", AccountType: "Bank", AccountSubType: "Checking", CurrentBalance: 248500, Active: true },
  { Id: "2", Name: "Rental Income", AccountType: "Income", AccountSubType: "ServiceFeeIncome", CurrentBalance: 0, Active: true },
  { Id: "3", Name: "CAM Income", AccountType: "Income", AccountSubType: "ServiceFeeIncome", CurrentBalance: 0, Active: true },
  { Id: "4", Name: "Property Tax Expense", AccountType: "Expense", AccountSubType: "TaxesPaid", CurrentBalance: 0, Active: true },
  { Id: "5", Name: "Insurance Expense", AccountType: "Expense", AccountSubType: "Insurance", CurrentBalance: 0, Active: true },
  { Id: "6", Name: "Repairs & Maintenance", AccountType: "Expense", AccountSubType: "RepairsAndMaintenance", CurrentBalance: 0, Active: true },
  { Id: "7", Name: "Management Fees", AccountType: "Expense", AccountSubType: "ManagementFees", CurrentBalance: 0, Active: true },
  { Id: "8", Name: "Mortgage Interest", AccountType: "Expense", AccountSubType: "MortgageInterest", CurrentBalance: 0, Active: true },
  { Id: "9", Name: "Utilities", AccountType: "Expense", AccountSubType: "Utilities", CurrentBalance: 0, Active: true },
  { Id: "10", Name: "Accounts Receivable", AccountType: "Accounts Receivable", AccountSubType: "AccountsReceivable", CurrentBalance: 23400, Active: true },
];

export const mockTransactions: QBOTransaction[] = [
  { Id: "T001", TxnDate: "2025-04-30", TxnType: "Deposit", Amount: 8400, AccountRef: { name: "Checking – Operating" }, EntityRef: { name: "TechCorp Solutions" }, Memo: "April rent" },
  { Id: "T002", TxnDate: "2025-04-30", TxnType: "Deposit", Amount: 14030, AccountRef: { name: "Checking – Operating" }, EntityRef: { name: "Apex Financial" }, Memo: "April rent" },
  { Id: "T003", TxnDate: "2025-04-28", TxnType: "Check", Amount: -3200, AccountRef: { name: "Checking – Operating" }, EntityRef: { name: "CoolAir Services" }, Memo: "HVAC repair WO-2024-0042" },
  { Id: "T004", TxnDate: "2025-04-25", TxnType: "Check", Amount: -1850, AccountRef: { name: "Checking – Operating" }, EntityRef: { name: "ProRoof Inc." }, Memo: "Roof repair WO-2024-0040" },
  { Id: "T005", TxnDate: "2025-04-01", TxnType: "Deposit", Amount: 5500, AccountRef: { name: "Checking – Operating" }, EntityRef: { name: "Sunrise Dental" }, Memo: "April rent" },
  { Id: "T006", TxnDate: "2025-04-15", TxnType: "Bill Payment", Amount: -9800, AccountRef: { name: "Checking – Operating" }, EntityRef: { name: "First National Bank" }, Memo: "Mortgage payment" },
];

export const mockPnL = {
  Header: { ReportName: "ProfitAndLoss", StartPeriod: "2025-01-01", EndPeriod: "2025-04-30", Currency: "USD" },
  Rows: {
    Row: [
      { type: "Section", group: "Income", Summary: { ColData: [{ value: "Total Income" }, { value: "682500" }] } },
      { type: "Section", group: "Expenses", Summary: { ColData: [{ value: "Total Expenses" }, { value: "434000" }] } },
      { type: "Section", group: "NetIncome", Summary: { ColData: [{ value: "Net Income" }, { value: "248500" }] } },
    ],
  },
};

// ── Default account mapping (CRE category → QBO account ID) ──────────────────

export const defaultAccountMapping: Record<string, string> = {
  "Rental Income": "2",
  "CAM Income": "3",
  "Property Tax": "4",
  "Insurance": "5",
  "Repairs & Maintenance": "6",
  "Management Fees": "7",
  "Mortgage Interest": "8",
  "Utilities": "9",
};
