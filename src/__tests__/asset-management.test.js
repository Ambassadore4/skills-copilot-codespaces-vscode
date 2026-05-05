"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  DocumentCategory,
  addDocument,
  filterDocuments,
  generateRentRoll,
  upsertCOI,
  checkCOIExpirations,
} = require("../asset-management");

describe("Asset Management", () => {
  describe("addDocument", () => {
    it("creates a document record with a generated ID", () => {
      const doc = addDocument({
        propertyId: "P1",
        fileName: "lease.pdf",
        category: DocumentCategory.LEASE,
        uploadedBy: "admin",
        fileUrl: "https://example.com/lease.pdf",
      });
      assert.ok(doc.documentId.startsWith("DOC-"));
      assert.equal(doc.category, DocumentCategory.LEASE);
      assert.equal(doc.fileName, "lease.pdf");
    });

    it("throws TypeError for missing required fields", () => {
      assert.throws(
        () => addDocument({ fileName: "x.pdf", category: DocumentCategory.LEASE, uploadedBy: "admin" }),
        TypeError
      );
    });

    it("throws RangeError for invalid category", () => {
      assert.throws(
        () => addDocument({ propertyId: "P1", fileName: "x.pdf", category: "BOGUS", uploadedBy: "admin", fileUrl: "http://x" }),
        RangeError
      );
    });
  });

  describe("filterDocuments", () => {
    const docs = [
      { documentId: "D1", propertyId: "P1", category: DocumentCategory.LEASE },
      { documentId: "D2", propertyId: "P1", category: DocumentCategory.PHOTO },
      { documentId: "D3", propertyId: "P2", category: DocumentCategory.LEASE },
    ];

    it("filters by propertyId", () => {
      const result = filterDocuments(docs, "P1");
      assert.equal(result.length, 2);
    });

    it("filters by propertyId and category", () => {
      const result = filterDocuments(docs, "P1", DocumentCategory.LEASE);
      assert.equal(result.length, 1);
      assert.equal(result[0].documentId, "D1");
    });

    it("returns empty array when no match", () => {
      const result = filterDocuments(docs, "P3");
      assert.equal(result.length, 0);
    });
  });

  describe("generateRentRoll", () => {
    const property = {
      propertyId: "P1",
      propertyName: "Test Plaza",
      totalSF: 10000,
      tenants: [
        { tenantId: "T1", tenantName: "Alpha", suiteNumber: "100", leasedSF: 4000, monthlyRent: 8000, leaseStart: "2023-01-01", leaseEnd: "2027-12-31", securityDeposit: 16000 },
        { tenantId: "T2", tenantName: "Beta", suiteNumber: "200", leasedSF: 2000, monthlyRent: 4000, leaseStart: "2022-06-01", leaseEnd: "2026-05-31", securityDeposit: 8000 },
      ],
    };

    it("calculates occupancy rate correctly", () => {
      const rr = generateRentRoll(property, "2026-05-05");
      assert.equal(rr.occupancyRate, 60); // 6000 / 10000 * 100
    });

    it("calculates total annual rent", () => {
      const rr = generateRentRoll(property, "2026-05-05");
      assert.equal(rr.totalAnnualRent, 144000); // (8000 + 4000) * 12
    });

    it("calculates vacant SF correctly", () => {
      const rr = generateRentRoll(property, "2026-05-05");
      assert.equal(rr.vacantSF, 4000);
    });

    it("includes rentPerSF in enriched tenants", () => {
      const rr = generateRentRoll(property, "2026-05-05");
      assert.ok(rr.tenants[0].rentPerSF > 0);
    });

    it("throws TypeError for missing propertyId", () => {
      assert.throws(() => generateRentRoll({ propertyName: "X", totalSF: 5000, tenants: [] }), TypeError);
    });
  });

  describe("COI Tracking", () => {
    const baseCOI = {
      propertyId: "P1",
      holderType: "TENANT",
      holderId: "T1",
      holderName: "Acme Corp",
      policyNumber: "POL-001",
      insurer: "InsureCo",
      coverageType: "GL",
      coverageAmount: 2000000,
      effectiveDate: "2025-01-01",
      expirationDate: "2026-04-01",
    };

    it("upsertCOI creates a valid COI record", () => {
      const coi = upsertCOI(baseCOI);
      assert.ok(coi.coiId.startsWith("COI-"));
      assert.equal(coi.holderName, "Acme Corp");
    });

    it("upsertCOI throws RangeError for invalid holderType", () => {
      assert.throws(() => upsertCOI({ ...baseCOI, holderType: "EMPLOYEE" }), RangeError);
    });

    it("upsertCOI throws TypeError for missing required field", () => {
      const { policyNumber: _pn, ...rest } = baseCOI;
      assert.throws(() => upsertCOI(rest), TypeError);
    });

    it("checkCOIExpirations flags expired COIs", () => {
      const coi = upsertCOI({ ...baseCOI, expirationDate: "2026-04-01", coiId: "COI-EXPIRED" });
      const result = checkCOIExpirations([coi], 30, "2026-05-05");
      assert.equal(result.expired.length, 1);
      assert.equal(result.expired[0].daysOverdue, 34);
    });

    it("checkCOIExpirations flags COIs expiring soon", () => {
      const coi = upsertCOI({ ...baseCOI, expirationDate: "2026-05-20", coiId: "COI-SOON" });
      const result = checkCOIExpirations([coi], 30, "2026-05-05");
      assert.equal(result.expiringSoon.length, 1);
    });

    it("checkCOIExpirations marks valid COIs", () => {
      const coi = upsertCOI({ ...baseCOI, expirationDate: "2027-01-01", coiId: "COI-VALID" });
      const result = checkCOIExpirations([coi], 30, "2026-05-05");
      assert.equal(result.valid.length, 1);
    });
  });
});
