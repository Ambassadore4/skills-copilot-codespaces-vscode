"use strict";

/**
 * Commercial Real Estate Management Platform
 *
 * Entry point demonstrating all four key functional pillars:
 *   1. Financial Management  — QuickBooks Bridge, global dashboard, loan tracking
 *   2. Operations Management — CAM reconciliation, lease escalations, work orders
 *   3. Asset Management      — Document vault, rent rolls, COI tracking
 *   4. Investor & Tenant Portals
 */

const {
  buildGlobalDashboard,
  buildLoanDashboard,
} = require("./financial-management");

const {
  reconcileCAM,
  processLeaseEscalations,
  createWorkOrder,
  updateWorkOrderStatus,
  WorkOrderStatus,
  WorkOrderPriority,
} = require("./operations-management");

const {
  generateRentRoll,
  addDocument,
  DocumentCategory,
  upsertCOI,
  checkCOIExpirations,
} = require("./asset-management");

const {
  createRentPayment,
  configureAutopay,
  generateInvestorReport,
} = require("./portals");

// ─── Sample Data ───────────────────────────────────────────────────────────────

const entities = [
  {
    entityName: "Oakwood Plaza LLC",
    grossRentalIncome: 850000,
    operatingExpenses: 210000,
    annualDebtService: 320000,
    loanBalance: 4200000,
    propertyValue: 7000000,
  },
  {
    entityName: "Harbor View Partners",
    grossRentalIncome: 1200000,
    operatingExpenses: 330000,
    annualDebtService: 450000,
    loanBalance: 6500000,
    propertyValue: 11000000,
  },
];

const loans = [
  {
    loanId: "LN-001",
    propertyName: "Oakwood Plaza",
    loanBalance: 4200000,
    propertyValue: 7000000,
    noi: 640000,
    annualDebtService: 320000,
    maturityDate: "2027-03-01",
  },
  {
    loanId: "LN-002",
    propertyName: "Harbor View",
    loanBalance: 6500000,
    propertyValue: 11000000,
    noi: 870000,
    annualDebtService: 450000,
    maturityDate: "2025-09-15",
  },
];

const tenants = [
  { tenantId: "T-001", tenantName: "Acme Corp", leasedSF: 4500 },
  { tenantId: "T-002", tenantName: "Beta Tech", leasedSF: 3000 },
  { tenantId: "T-003", tenantName: "Gamma Foods", leasedSF: 2500 },
];

const leases = [
  {
    leaseId: "LS-001", tenantName: "Acme Corp",
    currentRent: 108000, escalationType: "percentage", percentageIncrease: 3,
  },
  {
    leaseId: "LS-002", tenantName: "Beta Tech",
    currentRent: 72000, escalationType: "fixed", fixedIncrease: 2400,
  },
  {
    leaseId: "LS-003", tenantName: "Gamma Foods",
    currentRent: 60000, escalationType: "cpi", baseCPI: 280, currentCPI: 295.6,
  },
];

// ─── Main Demo ─────────────────────────────────────────────────────────────────

function main() {
  console.log("=".repeat(60));
  console.log(" Commercial Real Estate Management Platform — Demo");
  console.log("=".repeat(60));

  // 1. Financial Management
  console.log("\n[1] FINANCIAL MANAGEMENT — Global Dashboard");
  const dashboard = buildGlobalDashboard(entities);
  console.log(dashboard.summary);

  console.log("\n[1] FINANCIAL MANAGEMENT — Loan Dashboard");
  const loanDashboard = buildLoanDashboard(loans, "2026-05-05");
  loanDashboard.forEach((l) => {
    console.log(
      `  ${l.propertyName}: LTV=${l.ltv}% | DCR=${l.dcr} | Matures ${l.maturityDate} (${l.daysToMaturity}d) | Flag: ${l.riskFlag}`
    );
  });

  // 2. Operations Management
  console.log("\n[2] OPERATIONS — CAM Reconciliation");
  const camResults = reconcileCAM(10000, 95000, tenants);
  camResults.forEach((r) => {
    console.log(`  ${r.tenantName}: ${(r.proRataShare * 100).toFixed(1)}% → $${r.camCharge.toLocaleString()} CAM`);
  });

  console.log("\n[2] OPERATIONS — Lease Escalations");
  const escalations = processLeaseEscalations(leases);
  escalations.forEach((e) => {
    console.log(`  ${e.tenantName}: $${e.previousRent.toLocaleString()} → $${e.newRent.toLocaleString()} (+$${e.increase.toLocaleString()})`);
  });

  console.log("\n[2] OPERATIONS — Work Order");
  let wo = createWorkOrder({
    propertyId: "PROP-001",
    tenantId: "T-001",
    description: "HVAC unit not cooling in Suite 200",
    priority: WorkOrderPriority.HIGH,
    vendorId: "VND-007",
  });
  wo = updateWorkOrderStatus(wo, WorkOrderStatus.IN_PROGRESS, "Vendor dispatched", "2026-05-05T10:00:00Z");
  console.log(`  Work Order ${wo.workOrderId}: ${wo.status} — "${wo.serviceLog[0].note}"`);

  // 3. Asset Management
  console.log("\n[3] ASSET MANAGEMENT — Rent Roll");
  const rentRoll = generateRentRoll({
    propertyId: "PROP-001",
    propertyName: "Oakwood Plaza",
    totalSF: 10000,
    tenants: [
      { tenantId: "T-001", tenantName: "Acme Corp", suiteNumber: "200", leasedSF: 4500, monthlyRent: 9000, leaseStart: "2023-01-01", leaseEnd: "2027-12-31", securityDeposit: 18000 },
      { tenantId: "T-002", tenantName: "Beta Tech", suiteNumber: "300", leasedSF: 3000, monthlyRent: 6000, leaseStart: "2022-06-01", leaseEnd: "2026-05-31", securityDeposit: 12000 },
    ],
  }, "2026-05-05");
  console.log(`  ${rentRoll.propertyName}: ${rentRoll.occupancyRate}% occupied | Annual Rent: $${rentRoll.totalAnnualRent.toLocaleString()}`);

  console.log("\n[3] ASSET MANAGEMENT — Document Vault");
  const doc = addDocument({
    propertyId: "PROP-001",
    fileName: "Lease_AcmeCorp_2023.pdf",
    category: DocumentCategory.LEASE,
    uploadedBy: "admin",
    fileUrl: "https://vault.example.com/docs/lease-acme-2023.pdf",
  });
  console.log(`  Added document: ${doc.fileName} (${doc.category})`);

  console.log("\n[3] ASSET MANAGEMENT — COI Tracking");
  const cois = [
    upsertCOI({ propertyId: "PROP-001", holderType: "TENANT", holderId: "T-001", holderName: "Acme Corp", policyNumber: "POL-001", insurer: "SafeGuard Insurance", coverageType: "General Liability", coverageAmount: 2000000, effectiveDate: "2025-01-01", expirationDate: "2026-04-30" }),
    upsertCOI({ propertyId: "PROP-001", holderType: "TENANT", holderId: "T-002", holderName: "Beta Tech", policyNumber: "POL-002", insurer: "TrustShield Co", coverageType: "General Liability", coverageAmount: 2000000, effectiveDate: "2025-06-01", expirationDate: "2027-05-31" }),
  ];
  const coiCheck = checkCOIExpirations(cois, 30, "2026-05-05");
  console.log(`  COI status — Expired: ${coiCheck.expired.length} | Expiring Soon: ${coiCheck.expiringSoon.length} | Valid: ${coiCheck.valid.length}`);

  // 4. Portals
  console.log("\n[4] TENANT PORTAL — ACH Payment");
  const payment = createRentPayment({ tenantId: "T-001", leaseId: "LS-001", amount: 9000, paymentDate: "2026-05-01", bankAccountLast4: "4321" });
  console.log(`  Payment ${payment.paymentId}: $${payment.amount} via ${payment.method} — ${payment.status}`);

  console.log("\n[4] TENANT PORTAL — Autopay Setup");
  const autopay = configureAutopay({ tenantId: "T-001", leaseId: "LS-001", bankAccountLast4: "4321", dayOfMonth: 1, enabled: true });
  console.log(`  Autopay ${autopay.autopayId}: enabled=${autopay.enabled}, charges on day ${autopay.dayOfMonth} of each month`);

  console.log("\n[4] INVESTOR PORTAL — Performance Report");
  const investorReport = generateInvestorReport({
    investorId: "INV-001",
    investorName: "Sunrise Capital Partners",
    holdings: [
      { propertyId: "PROP-001", propertyName: "Oakwood Plaza", ownershipPercentage: 40, propertyValue: 7000000, loanBalance: 4200000, noi: 640000, annualDebtService: 320000 },
      { propertyId: "PROP-002", propertyName: "Harbor View", ownershipPercentage: 25, propertyValue: 11000000, loanBalance: 6500000, noi: 870000, annualDebtService: 450000 },
    ],
  });
  console.log(
    `  ${investorReport.investorName}: Total Equity $${investorReport.totalEquity.toLocaleString()} | Pro-Rata NOI $${investorReport.totalProRataNOI.toLocaleString()} | Cash Flow $${investorReport.totalProRataCashFlow.toLocaleString()}`
  );

  console.log("\n" + "=".repeat(60));
  console.log(" Demo complete.");
  console.log("=".repeat(60));
}

main();
