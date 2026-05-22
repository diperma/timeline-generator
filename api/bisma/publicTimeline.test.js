const assert = require("node:assert/strict");
const test = require("node:test");

const { sanitizePublicTimelinePayload } = require("./publicTimeline");

test("sanitizePublicTimelinePayload removes private member fields", () => {
  const sanitized = sanitizePublicTimelinePayload(
    {
      source: "bisma",
      year: "2026",
      syncedAt: "2026-05-22T01:00:00.000Z",
      count: 1,
      listCount: 1,
      detailParsed: 1,
      detailFailed: 0,
      assignments: [
        {
          no: 1,
          source: "bisma",
          costsheetId: "206906-1",
          stId: "206906",
          nomorSt: "ST-1",
          pkptId: "240834",
          sourceType: "PKPT",
          statusCode: "2",
          statusLabel: "Persetujuan PPK",
          description: "melaksanakan Evaluasi",
          startDate: "2026-05-12",
          endDate: "2026-05-29",
          totalCost: 100000,
          members: [
            {
              employeeName: "Willy Hutabarat",
              nip: "198610102014021001",
              noSpd: "SPD - 01259/D3/2026",
              role: "Auditor Ahli Muda",
              grade: "III/c",
              startDate: "2026-05-21",
              endDate: "2026-05-26",
              hp: 3,
              totalCost: 1140000,
              originCity: "KOTA JAKARTA",
              destinationCity: "KOTA ADM. JAKARTA SELATAN",
            },
          ],
        },
      ],
      warnings: [],
    },
    { publishedAt: "2026-05-22T02:00:00.000Z" },
  );

  assert.equal(sanitized.publicSnapshot, true);
  assert.equal(sanitized.publishedAt, "2026-05-22T02:00:00.000Z");
  assert.equal(sanitized.assignments[0].totalCost, 100000);
  assert.equal(sanitized.assignments[0].members[0].employeeName, "Willy Hutabarat");
  assert.equal(Object.hasOwn(sanitized.assignments[0].members[0], "nip"), false);
  assert.equal(Object.hasOwn(sanitized.assignments[0].members[0], "noSpd"), false);
  assert.equal(Object.hasOwn(sanitized.assignments[0].members[0], "totalCost"), false);
});

test("sanitizePublicTimelinePayload validates the timeline shape", () => {
  assert.throws(
    () => sanitizePublicTimelinePayload({ source: "bisma", year: "2026" }),
    /syncedAt is required/,
  );
});
