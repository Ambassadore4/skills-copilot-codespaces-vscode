"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  PaymentMethod,
  PaymentStatus,
  createRentPayment,
  configureAutopay,
  getTenantPortalSummary,
  generateInvestorReport,
} = require("../portals");

describe("Portals", () => {
  describe("Tenant Portal — createRentPayment", () => {
    const base = {
      tenantId: "T-001",
      leaseId: "LS-001",
      amount: 9000,
      paymentDate: "2026-05-01",
      bankAccountLast4: "4321",
    };

    it("creates a PENDING ACH payment record", () => {
      const pay = createRentPayment(base);
      assert.ok(pay.paymentId.startsWith("PAY-"));
      assert.equal(pay.method, PaymentMethod.ACH);
      assert.equal(pay.status, PaymentStatus.PENDING);
      assert.equal(pay.autopay, false);
    });

    it("records autopay flag when enabled", () => {
      const pay = createRentPayment({ ...base, autopay: true });
      assert.equal(pay.autopay, true);
    });

    it("throws RangeError for non-positive amount", () => {
      assert.throws(() => createRentPayment({ ...base, amount: 0 }), RangeError);
      assert.throws(() => createRentPayment({ ...base, amount: -100 }), RangeError);
    });

    it("throws TypeError for invalid bankAccountLast4", () => {
      assert.throws(() => createRentPayment({ ...base, bankAccountLast4: "12" }), TypeError);
      assert.throws(() => createRentPayment({ ...base, bankAccountLast4: "abcd" }), TypeError);
    });

    it("throws TypeError for missing tenantId", () => {
      const { tenantId: _t, ...rest } = base;
      assert.throws(() => createRentPayment(rest), TypeError);
    });
  });

  describe("Tenant Portal — configureAutopay", () => {
    const base = {
      tenantId: "T-001",
      leaseId: "LS-001",
      bankAccountLast4: "4321",
      dayOfMonth: 1,
      enabled: true,
    };

    it("creates an autopay configuration record", () => {
      const ap = configureAutopay(base);
      assert.ok(ap.autopayId.startsWith("AP-"));
      assert.equal(ap.dayOfMonth, 1);
      assert.equal(ap.enabled, true);
    });

    it("throws RangeError for dayOfMonth out of range", () => {
      assert.throws(() => configureAutopay({ ...base, dayOfMonth: 0 }), RangeError);
      assert.throws(() => configureAutopay({ ...base, dayOfMonth: 29 }), RangeError);
    });

    it("throws TypeError for invalid bankAccountLast4", () => {
      assert.throws(() => configureAutopay({ ...base, bankAccountLast4: "123" }), TypeError);
    });
  });

  describe("Tenant Portal — getTenantPortalSummary", () => {
    it("returns a summary with totals", () => {
      const summary = getTenantPortalSummary({
        tenantId: "T-001",
        lease: { leaseId: "LS-001" },
        recentPayments: [{ amount: 9000 }, { amount: 9000 }],
        openWorkOrders: [{ workOrderId: "WO-1" }],
        documents: [{ documentId: "D1" }, { documentId: "D2" }],
      });
      assert.equal(summary.summary.totalPaymentsThisYear, 18000);
      assert.equal(summary.summary.openRequestsCount, 1);
      assert.equal(summary.summary.documentsCount, 2);
    });

    it("handles missing optional arrays gracefully", () => {
      const summary = getTenantPortalSummary({ tenantId: "T-002" });
      assert.equal(summary.recentPayments.length, 0);
      assert.equal(summary.openWorkOrders.length, 0);
    });

    it("throws TypeError for missing tenantId", () => {
      assert.throws(() => getTenantPortalSummary({}), TypeError);
    });
  });

  describe("Investor Portal — generateInvestorReport", () => {
    const holdings = [
      {
        propertyId: "P1", propertyName: "Oakwood",
        ownershipPercentage: 50, propertyValue: 2000000, loanBalance: 1000000,
        noi: 200000, annualDebtService: 100000,
      },
      {
        propertyId: "P2", propertyName: "Harbor",
        ownershipPercentage: 25, propertyValue: 4000000, loanBalance: 2000000,
        noi: 400000, annualDebtService: 200000,
      },
    ];

    it("calculates equity, pro-rata NOI, and pro-rata cash flow", () => {
      const report = generateInvestorReport({
        investorId: "INV-001",
        investorName: "Test Investor",
        holdings,
      });
      // P1 equity: (2M - 1M) * 0.5 = 500000
      assert.equal(report.holdings[0].equityValue, 500000);
      // P1 pro-rata NOI: 200000 * 0.5 = 100000
      assert.equal(report.holdings[0].proRataNOI, 100000);
      // P1 pro-rata cash flow: (200000 - 100000) * 0.5 = 50000
      assert.equal(report.holdings[0].proRataCashFlow, 50000);
    });

    it("sums totals across all holdings", () => {
      const report = generateInvestorReport({
        investorId: "INV-001",
        investorName: "Test Investor",
        holdings,
      });
      // Total equity: 500000 + (2000000 * 0.25) = 500000 + 500000 = 1000000
      assert.equal(report.totalEquity, 1000000);
    });

    it("respects explicit equityValue override", () => {
      const report = generateInvestorReport({
        investorId: "INV-001",
        investorName: "Test Investor",
        holdings: [{ ...holdings[0], equityValue: 750000 }],
      });
      assert.equal(report.holdings[0].equityValue, 750000);
    });

    it("throws TypeError for empty holdings", () => {
      assert.throws(
        () => generateInvestorReport({ investorId: "INV-001", investorName: "X", holdings: [] }),
        TypeError
      );
    });

    it("throws TypeError for missing investorId", () => {
      assert.throws(
        () => generateInvestorReport({ investorName: "X", holdings }),
        TypeError
      );
    });
  });
});
