"use strict";

/**
 * Financial Management Module — "The QuickBooks Bridge"
 *
 * Consolidates data across multiple legal entities and LLCs into a single
 * global dashboard. Provides real-time visibility into Cash Flow, NOI
 * (Net Operating Income), and Global Debt. Includes a Loan Dashboard to
 * track LTV, DCR, and upcoming loan maturities across all assets.
 */

/**
 * Calculate Net Operating Income (NOI) for a property.
 *
 * NOI = Gross Rental Income - Operating Expenses
 * (does NOT include debt service)
 *
 * @param {number} grossRentalIncome - Total rental income collected
 * @param {number} operatingExpenses - Total operating expenses (maintenance, taxes, insurance, etc.)
 * @returns {number} Net Operating Income
 */
function calculateNOI(grossRentalIncome, operatingExpenses) {
  if (typeof grossRentalIncome !== "number" || typeof operatingExpenses !== "number") {
    throw new TypeError("grossRentalIncome and operatingExpenses must be numbers");
  }
  return grossRentalIncome - operatingExpenses;
}

/**
 * Calculate Cash Flow for a property.
 *
 * Cash Flow = NOI - Annual Debt Service
 *
 * @param {number} noi - Net Operating Income
 * @param {number} annualDebtService - Total annual mortgage / loan payments
 * @returns {number} Cash Flow (positive = surplus, negative = deficit)
 */
function calculateCashFlow(noi, annualDebtService) {
  if (typeof noi !== "number" || typeof annualDebtService !== "number") {
    throw new TypeError("noi and annualDebtService must be numbers");
  }
  return noi - annualDebtService;
}

/**
 * Calculate Loan-to-Value ratio (LTV).
 *
 * LTV = (Loan Balance / Property Value) * 100
 *
 * @param {number} loanBalance - Outstanding loan balance
 * @param {number} propertyValue - Current market value of the property
 * @returns {number} LTV as a percentage
 */
function calculateLTV(loanBalance, propertyValue) {
  if (typeof loanBalance !== "number" || typeof propertyValue !== "number") {
    throw new TypeError("loanBalance and propertyValue must be numbers");
  }
  if (propertyValue <= 0) {
    throw new RangeError("propertyValue must be greater than zero");
  }
  return (loanBalance / propertyValue) * 100;
}

/**
 * Calculate Debt Coverage Ratio (DCR / DSCR).
 *
 * DCR = NOI / Annual Debt Service
 * Lenders typically require DCR >= 1.25
 *
 * @param {number} noi - Net Operating Income
 * @param {number} annualDebtService - Total annual mortgage / loan payments
 * @returns {number} Debt Coverage Ratio
 */
function calculateDCR(noi, annualDebtService) {
  if (typeof noi !== "number" || typeof annualDebtService !== "number") {
    throw new TypeError("noi and annualDebtService must be numbers");
  }
  if (annualDebtService <= 0) {
    throw new RangeError("annualDebtService must be greater than zero");
  }
  return noi / annualDebtService;
}

/**
 * Build a consolidated global financial dashboard across multiple entities/LLCs.
 *
 * @param {Array<{
 *   entityName: string,
 *   grossRentalIncome: number,
 *   operatingExpenses: number,
 *   annualDebtService: number,
 *   loanBalance: number,
 *   propertyValue: number
 * }>} entities - Array of legal entity / LLC financial records
 * @returns {{
 *   entities: Array,
 *   globalNOI: number,
 *   globalCashFlow: number,
 *   globalDebt: number,
 *   summary: string
 * }} Consolidated dashboard data
 */
function buildGlobalDashboard(entities) {
  if (!Array.isArray(entities) || entities.length === 0) {
    throw new TypeError("entities must be a non-empty array");
  }

  const enriched = entities.map((e) => {
    const noi = calculateNOI(e.grossRentalIncome, e.operatingExpenses);
    const cashFlow = calculateCashFlow(noi, e.annualDebtService);
    const ltv = calculateLTV(e.loanBalance, e.propertyValue);
    const dcr = calculateDCR(noi, e.annualDebtService);
    return { ...e, noi, cashFlow, ltv, dcr };
  });

  const globalNOI = enriched.reduce((sum, e) => sum + e.noi, 0);
  const globalCashFlow = enriched.reduce((sum, e) => sum + e.cashFlow, 0);
  const globalDebt = enriched.reduce((sum, e) => sum + e.loanBalance, 0);

  return {
    entities: enriched,
    globalNOI,
    globalCashFlow,
    globalDebt,
    summary: `${entities.length} entities | Global NOI: $${globalNOI.toLocaleString()} | Global Cash Flow: $${globalCashFlow.toLocaleString()} | Global Debt: $${globalDebt.toLocaleString()}`,
  };
}

/**
 * Build a Loan Dashboard listing all loans with maturity dates and risk flags.
 *
 * @param {Array<{
 *   loanId: string,
 *   propertyName: string,
 *   loanBalance: number,
 *   propertyValue: number,
 *   noi: number,
 *   annualDebtService: number,
 *   maturityDate: string  // ISO 8601 date string, e.g. "2027-06-01"
 * }>} loans - Array of loan records
 * @param {string} [asOfDate] - ISO 8601 date to use as "today" (defaults to now)
 * @returns {Array<{
 *   loanId: string,
 *   propertyName: string,
 *   ltv: number,
 *   dcr: number,
 *   maturityDate: string,
 *   daysToMaturity: number,
 *   riskFlag: string
 * }>} Enriched loan records with risk flags
 */
function buildLoanDashboard(loans, asOfDate) {
  if (!Array.isArray(loans) || loans.length === 0) {
    throw new TypeError("loans must be a non-empty array");
  }

  const today = asOfDate ? new Date(asOfDate) : new Date();

  return loans.map((loan) => {
    const ltv = calculateLTV(loan.loanBalance, loan.propertyValue);
    const dcr = calculateDCR(loan.noi, loan.annualDebtService);
    const maturity = new Date(loan.maturityDate);
    const daysToMaturity = Math.round((maturity - today) / (1000 * 60 * 60 * 24));

    let riskFlag = "OK";
    if (ltv > 80) riskFlag = "HIGH_LTV";
    else if (dcr < 1.25) riskFlag = "LOW_DCR";
    else if (daysToMaturity < 180) riskFlag = "MATURING_SOON";

    return {
      loanId: loan.loanId,
      propertyName: loan.propertyName,
      ltv: Math.round(ltv * 100) / 100,
      dcr: Math.round(dcr * 100) / 100,
      maturityDate: loan.maturityDate,
      daysToMaturity,
      riskFlag,
    };
  });
}

module.exports = {
  calculateNOI,
  calculateCashFlow,
  calculateLTV,
  calculateDCR,
  buildGlobalDashboard,
  buildLoanDashboard,
};
