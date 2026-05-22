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
  assert.equal(sanitized.obtainedAt, "2026-05-22T01:00:00.000Z");
  assert.equal(sanitized.publishedAt, "2026-05-22T02:00:00.000Z");
  assert.equal(sanitized.dataStartDate, "2026-05-12");
  assert.equal(sanitized.dataEndDate, "2026-05-29");
  assert.equal(sanitized.assignments[0].totalCost, 100000);
  assert.equal(sanitized.assignments[0].members[0].employeeName, "Willy Hutabarat");
  assert.equal(Object.hasOwn(sanitized.assignments[0].members[0], "nip"), false);
  assert.equal(Object.hasOwn(sanitized.assignments[0].members[0], "noSpd"), false);
  assert.equal(Object.hasOwn(sanitized.assignments[0].members[0], "totalCost"), false);
});

test("sanitizePublicTimelinePayload computes date range from member dates", () => {
  const sanitized = sanitizePublicTimelinePayload(
    {
      source: "bisma",
      year: "2026",
      syncedAt: "2026-05-22T01:00:00.000Z",
      count: 1,
      assignments: [
        {
          no: 1,
          source: "bisma",
          costsheetId: "206906-1",
          description: "melaksanakan Evaluasi",
          startDate: "2026-05-12",
          endDate: "2026-05-20",
          members: [
            {
              employeeName: "Member One",
              startDate: "2026-05-09",
              endDate: "2026-05-21",
              hp: 3,
            },
            {
              employeeName: "Member Two",
              startDate: "2026-05-15",
              endDate: "2026-05-30",
              hp: 2,
            },
          ],
        },
      ],
      warnings: [],
    },
    { publishedAt: "2026-05-22T02:00:00.000Z" },
  );

  assert.equal(sanitized.dataStartDate, "2026-05-09");
  assert.equal(sanitized.dataEndDate, "2026-05-30");
});

test("sanitizePublicTimelinePayload falls back to assignment dates when member dates are absent", () => {
  const sanitized = sanitizePublicTimelinePayload({
    source: "bisma",
    year: "2026",
    syncedAt: "2026-05-22T01:00:00.000Z",
    count: 1,
    assignments: [
      {
        no: 1,
        source: "bisma",
        costsheetId: "206906-1",
        description: "melaksanakan Evaluasi",
        startDate: "2026-06-01",
        endDate: "2026-06-15",
        members: [],
      },
    ],
    warnings: [],
  });

  assert.equal(sanitized.dataStartDate, "2026-06-01");
  assert.equal(sanitized.dataEndDate, "2026-06-15");
});

test("sanitizePublicTimelinePayload validates the timeline shape", () => {
  assert.throws(
    () => sanitizePublicTimelinePayload({ source: "bisma", year: "2026" }),
    /syncedAt is required/,
  );
});
