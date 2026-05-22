const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { parseCostsheetDetail } = require("./costsheetDetailParser");
const { parseCostsheetList, parseDetailUrl } = require("./costsheetListParser");
const { buildTimelinePayload } = require("./timelineAdapter");
const { parseHp, parseRupiah } = require("./utils");

const root = path.resolve(__dirname, "..", "..");

test("parseRupiah strips currency punctuation", () => {
  assert.equal(parseRupiah("Rp 28.969.743"), 28969743);
  assert.equal(parseRupiah("- Rp 1.250"), -1250);
  assert.equal(parseRupiah(""), 0);
});

test("parseHp sums BISMA hidden day parts", () => {
  assert.equal(parseHp("0;3"), 3);
  assert.equal(parseHp("1;2"), 3);
  assert.equal(parseHp(""), null);
});

test("parseDetailUrl extracts costsheet, source type, and pkpt id", () => {
  assert.deepEqual(
    parseDetailUrl(
      "https://bisma.bpkp.go.id/Transaksi/Apisima/Getcostsheetdetail/206906-1/Detail/PKPT/240834/cs",
    ),
    {
      costsheetId: "206906-1",
      sourceType: "PKPT",
      pkptId: "240834",
    },
  );
});

test("parseCostsheetList normalizes DataTables rows", () => {
  const payload = {
    data: [
      [
        "1",
        1,
        "<span>2</span>",
        "<div></div>206906-1<br>melaksanakan Evaluasi SPIP",
        "DIPA: D3",
        "Rp 28.969.743",
        "Created By<br>Andreas Pandapotan Exaudy Hutabarat",
        "<br>",
        '<a href="/Transaksi/Apisima/Getcostsheetdetail/206906-1/Detail/PKPT/240834/cs">Detail</a>',
      ],
    ],
  };

  const parsed = parseCostsheetList(payload, { baseUrl: "https://bisma.bpkp.go.id" });

  assert.equal(parsed.count, 1);
  assert.equal(parsed.warnings.length, 0);
  assert.deepEqual(parsed.items[0], {
    no: 1,
    statusCode: "2",
    costsheetId: "206906-1",
    description: "melaksanakan Evaluasi SPIP",
    beban: "DIPA: D3",
    biaya: 28969743,
    createdBy: "Created By Andreas Pandapotan Exaudy Hutabarat",
    approvalInfo: "",
    detailUrl:
      "https://bisma.bpkp.go.id/Transaksi/Apisima/Getcostsheetdetail/206906-1/Detail/PKPT/240834/cs",
    sourceType: "PKPT",
    pkptId: "240834",
    rawIndex: "1",
  });
});

test("parseCostsheetDetail reads sample detail page into timeline-ready members", () => {
  const html = fs.readFileSync(path.join(root, "detail_page_sample.html"), "utf8");
  const detail = parseCostsheetDetail(html, {
    costsheetId: "206906-1",
    statusCode: "2",
    sourceType: "PKPT",
    pkptId: "240834",
    detailUrl:
      "https://bisma.bpkp.go.id/Transaksi/Apisima/Getcostsheetdetail/206906-1/Detail/PKPT/240834/cs",
  });

  assert.equal(detail.costsheetId, "209490-1");
  assert.equal(detail.sourceType, "PKPT");
  assert.equal(detail.pkptId, "240834");
  assert.ok(detail.members.length > 0);

  const first = detail.members[0];
  assert.ok(first.employeeName);
  assert.match(first.startDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(first.endDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(first.hpSource, "jmlharidum");
  assert.equal(typeof first.isActive, "boolean");
});

test("buildTimelinePayload preserves assignment and member metadata", () => {
  const payload = buildTimelinePayload(
    [
      {
        costsheetId: "206906-1",
        stId: "206906",
        nomorSt: "PE.09.02/ST-78/D302/1/2026",
        pkptId: "240834",
        sourceType: "PKPT",
        statusCode: "2",
        statusLabel: "Persetujuan PPK",
        description: "melaksanakan Evaluasi",
        startDate: "2026-05-12",
        endDate: "2026-05-29",
        realisasi: 1140000,
        members: [
          {
            employeeName: "Willy Hutabarat",
            nip: "198610102014021001",
            role: "Auditor Ahli Muda",
            grade: "III/c",
            startDate: "2026-05-21",
            endDate: "2026-05-26",
            hp: 3,
            isActive: true,
          },
        ],
        warnings: [],
      },
    ],
    { year: "2026" },
  );

  assert.equal(payload.source, "bisma");
  assert.equal(payload.year, "2026");
  assert.equal(payload.count, 1);
  assert.equal(payload.assignments[0].members[0].hp, 3);
});
