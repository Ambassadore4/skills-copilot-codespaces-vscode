"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  reconcileCAM,
  applyFixedEscalation,
  applyPercentageEscalation,
  applyCPIEscalation,
  processLeaseEscalations,
  createWorkOrder,
  updateWorkOrderStatus,
  WorkOrderStatus,
  WorkOrderPriority,
} = require("../operations-management");

describe("Operations Management", () => {
  describe("reconcileCAM", () => {
    const tenants = [
      { tenantId: "T1", tenantName: "Alpha", leasedSF: 5000 },
      { tenantId: "T2", tenantName: "Beta", leasedSF: 3000 },
      { tenantId: "T3", tenantName: "Gamma", leasedSF: 2000 },
    ];

    it("calculates pro-rata shares that sum to approximately 1", () => {
      const results = reconcileCAM(10000, 100000, tenants);
      const total = results.reduce((s, r) => s + r.proRataShare, 0);
      assert.ok(Math.abs(total - 1) < 0.0001);
    });

    it("calculates CAM charges that sum to total CAM expenses", () => {
      const results = reconcileCAM(10000, 100000, tenants);
      const total = results.reduce((s, r) => s + r.camCharge, 0);
      assert.ok(Math.abs(total - 100000) < 0.01);
    });

    it("calculates correct pro-rata for largest tenant", () => {
      const results = reconcileCAM(10000, 100000, tenants);
      assert.equal(results[0].proRataShare, 0.5);
      assert.equal(results[0].camCharge, 50000);
    });

    it("throws RangeError for zero totalBuildingSF", () => {
      assert.throws(() => reconcileCAM(0, 100000, tenants), RangeError);
    });

    it("throws TypeError for empty tenant array", () => {
      assert.throws(() => reconcileCAM(10000, 100000, []), TypeError);
    });
  });

  describe("Lease escalations", () => {
    it("applyFixedEscalation adds fixed amount to rent", () => {
      assert.equal(applyFixedEscalation(60000, 2400), 62400);
    });

    it("applyPercentageEscalation increases rent by given %", () => {
      assert.equal(applyPercentageEscalation(100000, 3), 103000);
    });

    it("applyCPIEscalation scales rent by CPI ratio", () => {
      const result = applyCPIEscalation(60000, 280, 295.6);
      assert.ok(Math.abs(result - 63342.86) < 0.01);
    });

    it("applyCPIEscalation throws RangeError for zero baseCPI", () => {
      assert.throws(() => applyCPIEscalation(60000, 0, 295.6), RangeError);
    });

    it("processLeaseEscalations handles mixed escalation types", () => {
      const leases = [
        { leaseId: "L1", tenantName: "A", currentRent: 100000, escalationType: "fixed", fixedIncrease: 5000 },
        { leaseId: "L2", tenantName: "B", currentRent: 100000, escalationType: "percentage", percentageIncrease: 5 },
        { leaseId: "L3", tenantName: "C", currentRent: 100000, escalationType: "cpi", baseCPI: 200, currentCPI: 210 },
      ];
      const results = processLeaseEscalations(leases);
      assert.equal(results[0].newRent, 105000);
      assert.equal(results[1].newRent, 105000);
      assert.equal(results[2].newRent, 105000);
    });

    it("processLeaseEscalations throws for unknown escalation type", () => {
      const leases = [{ leaseId: "L1", tenantName: "X", currentRent: 50000, escalationType: "unknown" }];
      assert.throws(() => processLeaseEscalations(leases), Error);
    });
  });

  describe("Work Orders", () => {
    it("creates a work order with OPEN status", () => {
      const wo = createWorkOrder({
        propertyId: "P1",
        description: "Broken window",
        priority: WorkOrderPriority.MEDIUM,
      });
      assert.equal(wo.status, WorkOrderStatus.OPEN);
      assert.equal(wo.priority, WorkOrderPriority.MEDIUM);
      assert.equal(wo.serviceLog.length, 0);
    });

    it("createWorkOrder throws TypeError for missing required fields", () => {
      assert.throws(() => createWorkOrder({ description: "test", priority: "LOW" }), TypeError);
    });

    it("createWorkOrder throws RangeError for invalid priority", () => {
      assert.throws(() => createWorkOrder({ propertyId: "P1", description: "test", priority: "CRITICAL" }), RangeError);
    });

    it("updateWorkOrderStatus changes status and appends log entry", () => {
      const wo = createWorkOrder({ propertyId: "P1", description: "Leak", priority: WorkOrderPriority.HIGH });
      const updated = updateWorkOrderStatus(wo, WorkOrderStatus.IN_PROGRESS, "Plumber on site");
      assert.equal(updated.status, WorkOrderStatus.IN_PROGRESS);
      assert.equal(updated.serviceLog.length, 1);
      assert.equal(updated.serviceLog[0].note, "Plumber on site");
    });

    it("updateWorkOrderStatus throws RangeError for invalid status", () => {
      const wo = createWorkOrder({ propertyId: "P1", description: "test", priority: WorkOrderPriority.LOW });
      assert.throws(() => updateWorkOrderStatus(wo, "ARCHIVED", "test"), RangeError);
    });
  });
});
