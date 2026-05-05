"use strict";

/**
 * Investor & Tenant Portals Module
 *
 * Covers:
 *  - Tenant Portal: ACH rent payments (with autopay), lease documents, maintenance requests
 *  - Investor Portal: loan data, equity portions, performance reports for partners/investors
 */

// ─── Tenant Portal ─────────────────────────────────────────────────────────────

const PaymentMethod = Object.freeze({
  ACH: "ACH",
  CHECK: "CHECK",
  WIRE: "WIRE",
});

const PaymentStatus = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  RETURNED: "RETURNED",
});

/**
 * Create a rent payment via ACH for a tenant.
 *
 * @param {{
 *   tenantId: string,
 *   leaseId: string,
 *   amount: number,
 *   paymentDate: string,       // ISO 8601
 *   bankAccountLast4: string,  // Last 4 digits of the bank account for display
 *   autopay?: boolean
 * }} params
 * @returns {{
 *   paymentId: string,
 *   tenantId: string,
 *   leaseId: string,
 *   amount: number,
 *   method: string,
 *   paymentDate: string,
 *   bankAccountLast4: string,
 *   autopay: boolean,
 *   status: string,
 *   createdAt: string
 * }} Payment record
 */
function createRentPayment(params) {
  const { tenantId, leaseId, amount, paymentDate, bankAccountLast4, autopay = false } = params;

  if (!tenantId || !leaseId) {
    throw new TypeError("tenantId and leaseId are required");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new RangeError("amount must be a positive number");
  }
  if (!paymentDate) {
    throw new TypeError("paymentDate is required");
  }
  if (!/^\d{4}$/.test(bankAccountLast4)) {
    throw new TypeError("bankAccountLast4 must be exactly 4 digits");
  }

  return {
    paymentId: `PAY-${Date.now()}`,
    tenantId,
    leaseId,
    amount,
    method: PaymentMethod.ACH,
    paymentDate,
    bankAccountLast4,
    autopay,
    status: PaymentStatus.PENDING,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Configure autopay for a tenant.
 *
 * @param {{
 *   tenantId: string,
 *   leaseId: string,
 *   bankAccountLast4: string,
 *   dayOfMonth: number,        // 1-28; day of month to auto-charge
 *   enabled: boolean
 * }} params
 * @returns {{
 *   autopayId: string,
 *   tenantId: string,
 *   leaseId: string,
 *   bankAccountLast4: string,
 *   dayOfMonth: number,
 *   enabled: boolean,
 *   updatedAt: string
 * }} Autopay configuration record
 */
function configureAutopay(params) {
  const { tenantId, leaseId, bankAccountLast4, dayOfMonth, enabled } = params;

  if (!tenantId || !leaseId) {
    throw new TypeError("tenantId and leaseId are required");
  }
  if (typeof dayOfMonth !== "number" || dayOfMonth < 1 || dayOfMonth > 28) {
    throw new RangeError("dayOfMonth must be between 1 and 28");
  }
  if (!/^\d{4}$/.test(bankAccountLast4)) {
    throw new TypeError("bankAccountLast4 must be exactly 4 digits");
  }

  return {
    autopayId: `AP-${Date.now()}`,
    tenantId,
    leaseId,
    bankAccountLast4,
    dayOfMonth,
    enabled,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get the tenant portal summary for a given tenant, including:
 *  - Lease overview
 *  - Recent payments
 *  - Open maintenance/work order requests
 *  - Available documents
 *
 * @param {{
 *   tenantId: string,
 *   lease: object,
 *   recentPayments: Array<object>,
 *   openWorkOrders: Array<object>,
 *   documents: Array<object>
 * }} data
 * @returns {object} Tenant portal summary
 */
function getTenantPortalSummary(data) {
  const { tenantId, lease, recentPayments, openWorkOrders, documents } = data;

  if (!tenantId) {
    throw new TypeError("tenantId is required");
  }

  return {
    tenantId,
    lease: lease || null,
    recentPayments: Array.isArray(recentPayments) ? recentPayments : [],
    openWorkOrders: Array.isArray(openWorkOrders) ? openWorkOrders : [],
    documents: Array.isArray(documents) ? documents : [],
    summary: {
      totalPaymentsThisYear: (recentPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0),
      openRequestsCount: (openWorkOrders || []).length,
      documentsCount: (documents || []).length,
    },
  };
}

// ─── Investor Portal ───────────────────────────────────────────────────────────

/**
 * Generate an Investor Portal report for a specific investor/partner.
 *
 * @param {{
 *   investorId: string,
 *   investorName: string,
 *   holdings: Array<{
 *     propertyId: string,
 *     propertyName: string,
 *     ownershipPercentage: number,  // 0–100
 *     propertyValue: number,
 *     loanBalance: number,
 *     noi: number,
 *     annualDebtService: number,
 *     equityValue?: number          // Optional override; computed if omitted
 *   }>
 * }} data
 * @returns {{
 *   investorId: string,
 *   investorName: string,
 *   holdings: Array<object>,
 *   totalEquity: number,
 *   totalProRataNOI: number,
 *   totalProRataCashFlow: number,
 *   generatedAt: string
 * }} Investor portal report
 */
function generateInvestorReport(data) {
  const { investorId, investorName, holdings } = data;

  if (!investorId || !investorName) {
    throw new TypeError("investorId and investorName are required");
  }
  if (!Array.isArray(holdings) || holdings.length === 0) {
    throw new TypeError("holdings must be a non-empty array");
  }

  const enrichedHoldings = holdings.map((h) => {
    const equityValue =
      h.equityValue !== undefined
        ? h.equityValue
        : (h.propertyValue - h.loanBalance) * (h.ownershipPercentage / 100);
    const proRataNOI = h.noi * (h.ownershipPercentage / 100);
    const proRataCashFlow = (h.noi - h.annualDebtService) * (h.ownershipPercentage / 100);
    return {
      propertyId: h.propertyId,
      propertyName: h.propertyName,
      ownershipPercentage: h.ownershipPercentage,
      propertyValue: h.propertyValue,
      loanBalance: h.loanBalance,
      equityValue: Math.round(equityValue * 100) / 100,
      proRataNOI: Math.round(proRataNOI * 100) / 100,
      proRataCashFlow: Math.round(proRataCashFlow * 100) / 100,
    };
  });

  const totalEquity = enrichedHoldings.reduce((sum, h) => sum + h.equityValue, 0);
  const totalProRataNOI = enrichedHoldings.reduce((sum, h) => sum + h.proRataNOI, 0);
  const totalProRataCashFlow = enrichedHoldings.reduce((sum, h) => sum + h.proRataCashFlow, 0);

  return {
    investorId,
    investorName,
    holdings: enrichedHoldings,
    totalEquity: Math.round(totalEquity * 100) / 100,
    totalProRataNOI: Math.round(totalProRataNOI * 100) / 100,
    totalProRataCashFlow: Math.round(totalProRataCashFlow * 100) / 100,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  PaymentMethod,
  PaymentStatus,
  createRentPayment,
  configureAutopay,
  getTenantPortalSummary,
  generateInvestorReport,
};
