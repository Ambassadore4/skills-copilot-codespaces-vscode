"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateNOI,
  calculateCashFlow,
  calculateLTV,
  calculateDCR,
  buildGlobalDashboard,
  buildLoanDashboard,
} = require("../financial-management");

describe("Financial Management", () => {
  describe("calculateNOI", () => {
    it("returns gross income minus operating expenses", () => {
      assert.equal(calculateNOI(500000, 150000), 350000);
    });

    it("handles zero expenses", () => {
      assert.equal(calculateNOI(100000, 0), 100000);
    });

    it("can return negative NOI", () => {
      assert.equal(calculateNOI(50000, 80000), -30000);
    });

    it("throws TypeError for non-numeric inputs", () => {
      assert.throws(() => calculateNOI("500000", 100000), TypeError);
      assert.throws(() => calculateNOI(500000, "100000"), TypeError);
    });
  });

  describe("calculateCashFlow", () => {
    it("returns NOI minus annual debt service", () => {
      assert.equal(calculateCashFlow(350000, 200000), 150000);
    });

    it("returns negative cash flow when debt exceeds NOI", () => {
      assert.equal(calculateCashFlow(100000, 120000), -20000);
    });

    it("throws TypeError for non-numeric inputs", () => {
      assert.throws(() => calculateCashFlow("350000", 200000), TypeError);
    });
  });

  describe("calculateLTV", () => {
    it("calculates correct LTV percentage", () => {
      assert.equal(calculateLTV(4200000, 7000000), 60);
    });

    it("throws RangeError when propertyValue is zero", () => {
      assert.throws(() => calculateLTV(100000, 0), RangeError);
    });

    it("throws TypeError for non-numeric inputs", () => {
      assert.throws(() => calculateLTV("4200000", 7000000), TypeError);
    });
  });

  describe("calculateDCR", () => {
    it("calculates correct DCR", () => {
      assert.equal(calculateDCR(500000, 400000), 1.25);
    });

    it("throws RangeError when annualDebtService is zero", () => {
      assert.throws(() => calculateDCR(500000, 0), RangeError);
    });

    it("throws TypeError for non-numeric inputs", () => {
      assert.throws(() => calculateDCR("500000", 400000), TypeError);
    });
  });

  describe("buildGlobalDashboard", () => {
    const entities = [
      {
        entityName: "Entity A",
        grossRentalIncome: 500000,
        operatingExpenses: 150000,
        annualDebtService: 200000,
        loanBalance: 2000000,
        propertyValue: 4000000,
      },
      {
        entityName: "Entity B",
        grossRentalIncome: 800000,
        operatingExpenses: 250000,
        annualDebtService: 300000,
        loanBalance: 3000000,
        propertyValue: 6000000,
      },
    ];

    it("returns global NOI as the sum of all entities", () => {
      const dashboard = buildGlobalDashboard(entities);
      // NOI for A: 350000, NOI for B: 550000
      assert.equal(dashboard.globalNOI, 900000);
    });

    it("returns global cash flow correctly", () => {
      const dashboard = buildGlobalDashboard(entities);
      // Cash flow A: 150000, Cash flow B: 250000
      assert.equal(dashboard.globalCashFlow, 400000);
    });

    it("returns global debt as sum of all loan balances", () => {
      const dashboard = buildGlobalDashboard(entities);
      assert.equal(dashboard.globalDebt, 5000000);
    });

    it("includes enriched entity data", () => {
      const dashboard = buildGlobalDashboard(entities);
      assert.equal(dashboard.entities.length, 2);
      assert.ok(dashboard.entities[0].ltv > 0);
      assert.ok(dashboard.entities[0].dcr > 0);
    });

    it("throws TypeError for empty entities array", () => {
      assert.throws(() => buildGlobalDashboard([]), TypeError);
    });
  });

  describe("buildLoanDashboard", () => {
    const loans = [
      {
        loanId: "L1",
        propertyName: "Prop A",
        loanBalance: 5600000,
        propertyValue: 7000000,   // LTV = 80 %
        noi: 500000,
        annualDebtService: 400000, // DCR = 1.25
        maturityDate: "2026-06-01",
      },
      {
        loanId: "L2",
        propertyName: "Prop B",
        loanBalance: 2000000,
        propertyValue: 5000000,   // LTV = 40 %
        noi: 600000,
        annualDebtService: 300000, // DCR = 2.0
        maturityDate: "2030-01-01",
      },
    ];

    it("flags loans with high LTV", () => {
      // Use LTV > 80 to trigger HIGH_LTV
      const highLTVLoan = [{
        loanId: "L3", propertyName: "P3",
        loanBalance: 9000000, propertyValue: 10000000, // LTV = 90%
        noi: 600000, annualDebtService: 300000,
        maturityDate: "2030-01-01",
      }];
      const result = buildLoanDashboard(highLTVLoan, "2026-05-05");
      assert.equal(result[0].riskFlag, "HIGH_LTV");
    });

    it("flags loans maturing soon", () => {
      // maturityDate within 180 days of asOfDate
      const result = buildLoanDashboard([loans[0]], "2026-05-05");
      assert.equal(result[0].riskFlag, "MATURING_SOON");
    });

    it("marks non-risky loans as OK", () => {
      const result = buildLoanDashboard([loans[1]], "2026-05-05");
      assert.equal(result[0].riskFlag, "OK");
    });

    it("throws TypeError for empty loans array", () => {
      assert.throws(() => buildLoanDashboard([]), TypeError);
    });
  });
});
