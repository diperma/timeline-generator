const assert = require("node:assert/strict");
const test = require("node:test");
const { parseRealisasiPayload } = require("./realisasiParser");
const { sanitizePublicRealisasiPayload } = require("./publicRealisasi");

test("parseRealisasiPayload normalizes BISMA budget realization rows", () => {
  const parsed = parseRealisasiPayload(samplePayload(), { year: "2026" });

  assert.equal(parsed.source, "bisma");
  assert.equal(parsed.year, "2026");
  assert.equal(parsed.count, 1);
  assert.equal(parsed.recordsTotal, 54);
  assert.equal(parsed.items[0].accountCode, "524111");
  assert.equal(parsed.items[0].accountName, "Belanja Perjalanan Dinas Biasa");
  assert.equal(parsed.items[0].satkerCode, "450491");
  assert.equal(parsed.items[0].unitCode, "D302");
  assert.equal(parsed.items[0].pagu, 135370000);
  assert.equal(parsed.items[0].realisasi, 27074000);
  assert.equal(parsed.items[0].availableAfterRealisasi, 108296000);
  assert.equal(parsed.items[0].realisasiPct, 20);
  assert.equal(parsed.totals.pagu, 135370000);
  assert.equal(parsed.totals.realisasiPct, 20);
});

test("sanitizePublicRealisasiPayload keeps safe public budget fields", () => {
  const parsed = parseRealisasiPayload(samplePayload(), { year: "2026" });
  const sanitized = sanitizePublicRealisasiPayload(parsed, {
    publishedAt: "2026-05-23T01:00:00.000Z",
  });

  assert.equal(sanitized.publicSnapshot, true);
  assert.equal(sanitized.publishedAt, "2026-05-23T01:00:00.000Z");
  assert.equal(sanitized.items[0].kdindex, "202645049108901CH7989FAG001401 B524111A9A");
  assert.equal(sanitized.items[0].accountName, "Belanja Perjalanan Dinas Biasa");
  assert.equal("rawHtml" in sanitized.items[0], false);
});

test("sanitizePublicRealisasiPayload validates payload shape", () => {
  assert.throws(
    () => sanitizePublicRealisasiPayload({ source: "bisma", year: "2026" }),
    /syncedAt is required/,
  );
});

function samplePayload() {
  return {
    draw: 1,
    recordsTotal: 54,
    recordsFiltered: 54,
    data: [
      {
        kdindex: "202645049108901CH7989FAG001401 B524111A9A",
        bagipagu_id: "48788",
        kdprogram: "CH",
        kdgiat: "7989",
        kdoutput: "FAG",
        kdsoutput: "001",
        kdkmpnen: "401",
        kdskmpnen: " B",
        kdakun: "524111",
        nmakun: "524111 - Belanja Perjalanan Dinas Biasa",
        kdsatker: "450491",
        nmsatker: "KANTOR PUSAT BADAN PENGAWASAN KEUANGAN DAN PEMBANGUNAN",
        kdunit: "D302",
        satker: "450491 - KANTOR PUSAT BADAN PENGAWASAN KEUANGAN DAN PEMBANGUNAN",
        unit_e2: "D302 - Direktorat Pengawasan Bidang Pemberdayaan Ekonomi Masyarakat",
        unit_e3: "D302 - Direktorat Pengawasan Bidang Pemberdayaan Ekonomi Masyarakat",
        unit_id: "615",
        thang: "2026",
        label: "52 - Belanja Barang",
        blokir: "0",
        pagu: "135370000",
        rupiah_unit: "135370000",
        outstand: "1000",
        draft: "2000",
        realisasi: "27074000",
        sp2d: "26000000",
        selisih_ls: "-1000",
      },
    ],
  };
}
