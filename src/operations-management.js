"use strict";

/**
 * Operations Management & Automation Module
 *
 * Covers:
 *  - CAM Reconciliation: "one-click" calculation of tenant pro-rata shares
 *  - Lease Escalations: automatic rent increases (fixed, percentage, or CPI)
 *  - Work Order Tracking: maintenance requests, vendor management, service logs
 */

// ─── CAM Reconciliation ────────────────────────────────────────────────────────

/**
 * Calculate CAM (Common Area Maintenance) charges for each tenant using
 * pro-rata share based on leased square footage.
 *
 * Pro-rata share = tenant's leased SF / total building SF
 * Tenant CAM charge = pro-rata share * total CAM expenses
 *
 * @param {number} totalBuildingSF - Total leasable square footage of the building
 * @param {number} totalCAMExpenses - Total annual CAM expenses for the building
 * @param {Array<{ tenantId: string, tenantName: string, leasedSF: number }>} tenants
 * @returns {Array<{ tenantId: string, tenantName: string, leasedSF: number, proRataShare: number, camCharge: number }>}
 */
function reconcileCAM(totalBuildingSF, totalCAMExpenses, tenants) {
  if (typeof totalBuildingSF !== "number" || totalBuildingSF <= 0) {
    throw new RangeError("totalBuildingSF must be a positive number");
  }
  if (typeof totalCAMExpenses !== "number" || totalCAMExpenses < 0) {
    throw new RangeError("totalCAMExpenses must be a non-negative number");
  }
  if (!Array.isArray(tenants) || tenants.length === 0) {
    throw new TypeError("tenants must be a non-empty array");
  }

  return tenants.map((tenant) => {
    const proRataShare = tenant.leasedSF / totalBuildingSF;
    const camCharge = proRataShare * totalCAMExpenses;
    return {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      leasedSF: tenant.leasedSF,
      proRataShare: Math.round(proRataShare * 10000) / 10000,
      camCharge: Math.round(camCharge * 100) / 100,
    };
  });
}

// ─── Lease Escalations ─────────────────────────────────────────────────────────

/**
 * Apply a fixed-dollar rent escalation.
 *
 * @param {number} currentRent - Current annual rent
 * @param {number} fixedIncrease - Fixed dollar amount to add
 * @returns {number} New annual rent
 */
function applyFixedEscalation(currentRent, fixedIncrease) {
  if (typeof currentRent !== "number" || typeof fixedIncrease !== "number") {
    throw new TypeError("currentRent and fixedIncrease must be numbers");
  }
  return currentRent + fixedIncrease;
}

/**
 * Apply a percentage-based rent escalation.
 *
 * @param {number} currentRent - Current annual rent
 * @param {number} percentageIncrease - Percentage increase (e.g. 3 for 3%)
 * @returns {number} New annual rent
 */
function applyPercentageEscalation(currentRent, percentageIncrease) {
  if (typeof currentRent !== "number" || typeof percentageIncrease !== "number") {
    throw new TypeError("currentRent and percentageIncrease must be numbers");
  }
  return currentRent * (1 + percentageIncrease / 100);
}

/**
 * Apply a CPI-based rent escalation.
 *
 * CPI escalation = currentRent * (currentCPI / baseCPI)
 *
 * @param {number} currentRent - Current annual rent
 * @param {number} baseCPI - CPI at lease commencement
 * @param {number} currentCPI - Current CPI value
 * @returns {number} New annual rent adjusted for CPI
 */
function applyCPIEscalation(currentRent, baseCPI, currentCPI) {
  if (
    typeof currentRent !== "number" ||
    typeof baseCPI !== "number" ||
    typeof currentCPI !== "number"
  ) {
    throw new TypeError("currentRent, baseCPI, and currentCPI must be numbers");
  }
  if (baseCPI <= 0) {
    throw new RangeError("baseCPI must be greater than zero");
  }
  return currentRent * (currentCPI / baseCPI);
}

/**
 * Process lease escalations for a portfolio of leases.
 *
 * Each lease specifies its escalation type ("fixed", "percentage", or "cpi")
 * and the parameters required for that type.
 *
 * @param {Array<{
 *   leaseId: string,
 *   tenantName: string,
 *   currentRent: number,
 *   escalationType: "fixed" | "percentage" | "cpi",
 *   fixedIncrease?: number,
 *   percentageIncrease?: number,
 *   baseCPI?: number,
 *   currentCPI?: number
 * }>} leases
 * @returns {Array<{ leaseId: string, tenantName: string, previousRent: number, newRent: number, increase: number }>}
 */
function processLeaseEscalations(leases) {
  if (!Array.isArray(leases) || leases.length === 0) {
    throw new TypeError("leases must be a non-empty array");
  }

  return leases.map((lease) => {
    let newRent;
    switch (lease.escalationType) {
      case "fixed":
        newRent = applyFixedEscalation(lease.currentRent, lease.fixedIncrease);
        break;
      case "percentage":
        newRent = applyPercentageEscalation(lease.currentRent, lease.percentageIncrease);
        break;
      case "cpi":
        newRent = applyCPIEscalation(lease.currentRent, lease.baseCPI, lease.currentCPI);
        break;
      default:
        throw new Error(`Unknown escalation type: ${lease.escalationType}`);
    }
    return {
      leaseId: lease.leaseId,
      tenantName: lease.tenantName,
      previousRent: lease.currentRent,
      newRent: Math.round(newRent * 100) / 100,
      increase: Math.round((newRent - lease.currentRent) * 100) / 100,
    };
  });
}

// ─── Work Order Tracking ───────────────────────────────────────────────────────

const WorkOrderStatus = Object.freeze({
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CLOSED: "CLOSED",
});

const WorkOrderPriority = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  EMERGENCY: "EMERGENCY",
});

/**
 * Create a new work order.
 *
 * @param {{
 *   propertyId: string,
 *   tenantId?: string,
 *   description: string,
 *   priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
 *   vendorId?: string,
 *   createdAt?: string  // ISO 8601; defaults to now
 * }} params
 * @returns {{
 *   workOrderId: string,
 *   propertyId: string,
 *   tenantId: string | null,
 *   description: string,
 *   priority: string,
 *   status: string,
 *   vendorId: string | null,
 *   createdAt: string,
 *   updatedAt: string,
 *   serviceLog: Array
 * }} New work order record
 */
function createWorkOrder(params) {
  const {
    propertyId,
    tenantId = null,
    description,
    priority,
    vendorId = null,
    createdAt,
  } = params;

  if (!propertyId || !description) {
    throw new TypeError("propertyId and description are required");
  }
  if (!Object.values(WorkOrderPriority).includes(priority)) {
    throw new RangeError(`priority must be one of: ${Object.values(WorkOrderPriority).join(", ")}`);
  }

  const now = createdAt || new Date().toISOString();
  return {
    workOrderId: `WO-${Date.now()}`,
    propertyId,
    tenantId,
    description,
    priority,
    status: WorkOrderStatus.OPEN,
    vendorId,
    createdAt: now,
    updatedAt: now,
    serviceLog: [],
  };
}

/**
 * Update the status of a work order and append a service log entry.
 *
 * @param {object} workOrder - Existing work order record
 * @param {string} newStatus - One of WorkOrderStatus values
 * @param {string} note - Log note describing the action taken
 * @param {string} [updatedAt] - ISO 8601 timestamp (defaults to now)
 * @returns {object} Updated work order record
 */
function updateWorkOrderStatus(workOrder, newStatus, note, updatedAt) {
  if (!Object.values(WorkOrderStatus).includes(newStatus)) {
    throw new RangeError(`newStatus must be one of: ${Object.values(WorkOrderStatus).join(", ")}`);
  }
  const now = updatedAt || new Date().toISOString();
  return {
    ...workOrder,
    status: newStatus,
    updatedAt: now,
    serviceLog: [
      ...workOrder.serviceLog,
      { timestamp: now, status: newStatus, note },
    ],
  };
}

module.exports = {
  reconcileCAM,
  applyFixedEscalation,
  applyPercentageEscalation,
  applyCPIEscalation,
  processLeaseEscalations,
  WorkOrderStatus,
  WorkOrderPriority,
  createWorkOrder,
  updateWorkOrderStatus,
};
