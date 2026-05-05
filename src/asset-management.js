"use strict";

/**
 * Asset Management Module
 *
 * Covers:
 *  - Document Vault: centralized storage for property documents, photos, and legal files
 *  - Rent Roll generation: lender-ready property performance snapshots
 *  - COI (Certificate of Insurance) Tracking: AI-powered expiration alerts
 */

// ─── Document Vault ────────────────────────────────────────────────────────────

const DocumentCategory = Object.freeze({
  LEASE: "LEASE",
  LEGAL: "LEGAL",
  FINANCIAL: "FINANCIAL",
  PHOTO: "PHOTO",
  INSPECTION: "INSPECTION",
  OTHER: "OTHER",
});

/**
 * Add a document to the property's digital vault.
 *
 * @param {{
 *   propertyId: string,
 *   fileName: string,
 *   category: string,
 *   uploadedBy: string,
 *   fileUrl: string,
 *   uploadedAt?: string  // ISO 8601; defaults to now
 * }} params
 * @returns {{
 *   documentId: string,
 *   propertyId: string,
 *   fileName: string,
 *   category: string,
 *   uploadedBy: string,
 *   fileUrl: string,
 *   uploadedAt: string
 * }} Document record
 */
function addDocument(params) {
  const { propertyId, fileName, category, uploadedBy, fileUrl, uploadedAt } = params;

  if (!propertyId || !fileName || !fileUrl || !uploadedBy) {
    throw new TypeError("propertyId, fileName, fileUrl, and uploadedBy are required");
  }
  if (!Object.values(DocumentCategory).includes(category)) {
    throw new RangeError(
      `category must be one of: ${Object.values(DocumentCategory).join(", ")}`
    );
  }

  return {
    documentId: `DOC-${Date.now()}`,
    propertyId,
    fileName,
    category,
    uploadedBy,
    fileUrl,
    uploadedAt: uploadedAt || new Date().toISOString(),
  };
}

/**
 * Filter documents in the vault by property and optional category.
 *
 * @param {Array<object>} documents - All documents in the vault
 * @param {string} propertyId - Property to filter by
 * @param {string} [category] - Optional category filter
 * @returns {Array<object>} Matching documents
 */
function filterDocuments(documents, propertyId, category) {
  if (!Array.isArray(documents)) {
    throw new TypeError("documents must be an array");
  }
  return documents.filter(
    (doc) =>
      doc.propertyId === propertyId && (category === undefined || doc.category === category)
  );
}

// ─── Rent Roll ─────────────────────────────────────────────────────────────────

/**
 * Generate a lender-ready Rent Roll for a property.
 *
 * @param {{
 *   propertyId: string,
 *   propertyName: string,
 *   totalSF: number,
 *   tenants: Array<{
 *     tenantId: string,
 *     tenantName: string,
 *     suiteNumber: string,
 *     leasedSF: number,
 *     monthlyRent: number,
 *     leaseStart: string,   // ISO 8601
 *     leaseEnd: string,     // ISO 8601
 *     securityDeposit: number
 *   }>
 * }} property
 * @param {string} [asOfDate] - ISO 8601 date (defaults to today)
 * @returns {{
 *   propertyId: string,
 *   propertyName: string,
 *   asOfDate: string,
 *   occupancyRate: number,
 *   totalMonthlyRent: number,
 *   totalAnnualRent: number,
 *   totalLeasedSF: number,
 *   vacantSF: number,
 *   tenants: Array<object>
 * }} Rent Roll report
 */
function generateRentRoll(property, asOfDate) {
  const { propertyId, propertyName, totalSF, tenants } = property;

  if (!propertyId || !propertyName) {
    throw new TypeError("propertyId and propertyName are required");
  }
  if (typeof totalSF !== "number" || totalSF <= 0) {
    throw new RangeError("totalSF must be a positive number");
  }
  if (!Array.isArray(tenants)) {
    throw new TypeError("tenants must be an array");
  }

  const today = asOfDate || new Date().toISOString().split("T")[0];

  const totalLeasedSF = tenants.reduce((sum, t) => sum + t.leasedSF, 0);
  const totalMonthlyRent = tenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalAnnualRent = totalMonthlyRent * 12;
  const vacantSF = totalSF - totalLeasedSF;
  const occupancyRate = Math.round((totalLeasedSF / totalSF) * 10000) / 100;

  const enrichedTenants = tenants.map((t) => ({
    ...t,
    annualRent: t.monthlyRent * 12,
    rentPerSF: Math.round((t.monthlyRent * 12 / t.leasedSF) * 100) / 100,
  }));

  return {
    propertyId,
    propertyName,
    asOfDate: today,
    totalSF,
    totalLeasedSF,
    vacantSF,
    occupancyRate,
    totalMonthlyRent: Math.round(totalMonthlyRent * 100) / 100,
    totalAnnualRent: Math.round(totalAnnualRent * 100) / 100,
    tenants: enrichedTenants,
  };
}

// ─── COI (Certificate of Insurance) Tracking ──────────────────────────────────

/**
 * Add or update a Certificate of Insurance record for a tenant or vendor.
 *
 * @param {{
 *   coiId?: string,
 *   propertyId: string,
 *   holderType: "TENANT" | "VENDOR",
 *   holderId: string,
 *   holderName: string,
 *   policyNumber: string,
 *   insurer: string,
 *   coverageType: string,
 *   coverageAmount: number,
 *   effectiveDate: string,   // ISO 8601
 *   expirationDate: string,  // ISO 8601
 *   uploadedAt?: string      // ISO 8601; defaults to now
 * }} params
 * @returns {object} COI record
 */
function upsertCOI(params) {
  const required = ["propertyId", "holderType", "holderId", "holderName", "policyNumber",
    "insurer", "coverageType", "coverageAmount", "effectiveDate", "expirationDate"];
  for (const field of required) {
    if (params[field] === undefined || params[field] === null || params[field] === "") {
      throw new TypeError(`${field} is required`);
    }
  }
  if (!["TENANT", "VENDOR"].includes(params.holderType)) {
    throw new RangeError('holderType must be "TENANT" or "VENDOR"');
  }

  return {
    coiId: params.coiId || `COI-${Date.now()}`,
    propertyId: params.propertyId,
    holderType: params.holderType,
    holderId: params.holderId,
    holderName: params.holderName,
    policyNumber: params.policyNumber,
    insurer: params.insurer,
    coverageType: params.coverageType,
    coverageAmount: params.coverageAmount,
    effectiveDate: params.effectiveDate,
    expirationDate: params.expirationDate,
    uploadedAt: params.uploadedAt || new Date().toISOString(),
  };
}

/**
 * Identify COIs that are expired or expiring within a given number of days.
 * Simulates the AI-powered expiration alert system.
 *
 * @param {Array<object>} cois - All COI records
 * @param {number} [alertDaysAhead=30] - Days before expiry to flag as "expiring soon"
 * @param {string} [asOfDate] - ISO 8601 date (defaults to today)
 * @returns {{
 *   expired: Array<object>,
 *   expiringSoon: Array<object>,
 *   valid: Array<object>
 * }} Categorised COI lists
 */
function checkCOIExpirations(cois, alertDaysAhead = 30, asOfDate) {
  if (!Array.isArray(cois)) {
    throw new TypeError("cois must be an array");
  }

  const today = asOfDate ? new Date(asOfDate) : new Date();
  const alertThreshold = new Date(today);
  alertThreshold.setDate(alertThreshold.getDate() + alertDaysAhead);

  const expired = [];
  const expiringSoon = [];
  const valid = [];

  for (const coi of cois) {
    const expiry = new Date(coi.expirationDate);
    if (expiry < today) {
      expired.push({ ...coi, daysOverdue: Math.round((today - expiry) / (1000 * 60 * 60 * 24)) });
    } else if (expiry <= alertThreshold) {
      expiringSoon.push({
        ...coi,
        daysUntilExpiry: Math.round((expiry - today) / (1000 * 60 * 60 * 24)),
      });
    } else {
      valid.push(coi);
    }
  }

  return { expired, expiringSoon, valid };
}

module.exports = {
  DocumentCategory,
  addDocument,
  filterDocuments,
  generateRentRoll,
  upsertCOI,
  checkCOIExpirations,
};
