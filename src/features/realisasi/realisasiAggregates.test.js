const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const aggregates = loadTypeScriptModule("realisasiAggregates.ts");

test("buildRealisasiAggregates groups by RO and keeps totals consistent", () => {
  const result = aggregates.buildRealisasiAggregates(sampleItems());

  assert.equal(result.byRO.length, 2);
  assert.equal(result.byRO[0].roCode, "FAG.001");
  assert.equal(result.byRO[0].itemCount, 2);
  assert.equal(result.byRO[0].totals.pagu, 300);
  assert.equal(result.byRO[0].totals.realisasi, 75);
  assert.equal(result.byRO[0].totals.outstanding, 30);
  assert.equal(result.byRO[0].totals.availableAfterRealisasi, 195);
  assert.equal(sumTotals(result.byRO, "pagu"), result.totals.pagu);
  assert.equal(sumTotals(result.byRO, "realisasi"), result.totals.realisasi);
  assert.equal(sumTotals(result.byRO, "outstanding"), result.totals.outstanding);
});

test("buildRealisasiAggregates groups by jenis belanja label", () => {
  const result = aggregates.buildRealisasiAggregates(sampleItems());

  assert.equal(result.byJenisBelanja.length, 2);
  assert.equal(result.byJenisBelanja[0].jenisCode, "52");
  assert.equal(result.byJenisBelanja[0].jenisLabel, "Belanja Barang");
  assert.equal(result.byJenisBelanja[0].itemCount, 2);
  assert.equal(sumTotals(result.byJenisBelanja, "pagu"), result.totals.pagu);
  assert.equal(sumTotals(result.byJenisBelanja, "realisasi"), result.totals.realisasi);
  assert.equal(sumTotals(result.byJenisBelanja, "outstanding"), result.totals.outstanding);
});

test("getRealisasiRO falls back to kdindex prefix when output fields are absent", () => {
  const ro = aggregates.getRealisasiRO({
    ...baseItem(),
    outputCode: "",
    suboutputCode: "",
    kdindex: "202645049108901CH7989FAG001401 B524111A9A",
  });

  assert.equal(ro.roCode, "202645049108901CH7989FAG001401");
});

test("parseJenisBelanja falls back when label is missing", () => {
  const jenis = aggregates.parseJenisBelanja("");

  assert.equal(jenis.jenisCode, "unknown");
  assert.equal(jenis.jenisLabel, "Tanpa Jenis Belanja");
});

function sampleItems() {
  return [
    {
      ...baseItem(),
      rowNo: 1,
      outputCode: "FAG",
      suboutputCode: "001",
      componentCode: "401",
      accountCode: "524111",
      pagu: 100,
      realisasi: 25,
      outstanding: 10,
      label: "52 - Belanja Barang",
    },
    {
      ...baseItem(),
      rowNo: 2,
      outputCode: "FAG",
      suboutputCode: "001",
      componentCode: "402",
      accountCode: "524113",
      pagu: 200,
      realisasi: 50,
      outstanding: 20,
      label: "52 - Belanja Barang",
    },
    {
      ...baseItem(),
      rowNo: 3,
      outputCode: "FAG",
      suboutputCode: "002",
      componentCode: "401",
      accountCode: "532111",
      pagu: 300,
      realisasi: 100,
      outstanding: 30,
      label: "53 - Belanja Modal",
    },
  ];
}

function baseItem() {
  return {
    rowNo: 1,
    kdindex: "",
    programCode: "CH",
    activityCode: "7989",
    outputCode: "FAG",
    suboutputCode: "001",
    componentCode: "401",
    subcomponentCode: "B",
    accountCode: "524111",
    accountName: "Belanja Perjalanan Dinas Biasa",
    label: "52 - Belanja Barang",
    pagu: 0,
    rupiahUnit: 0,
    blokir: 0,
    draft: 0,
    realisasi: 0,
    sp2d: 0,
    outstanding: 0,
    selisihLs: 0,
    availableAfterRealisasi: 0,
    realisasiPct: 0,
    sp2dPct: 0,
    draftPct: 0,
  };
}

function sumTotals(groups, key) {
  return groups.reduce((sum, group) => sum + group.totals[key], 0);
}

function loadTypeScriptModule(filename) {
  const filePath = path.join(__dirname, filename);
  const source = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
  });
  const mod = { exports: {} };
  const evaluate = new Function("exports", "require", "module", "__filename", "__dirname", transpiled.outputText);
  evaluate(mod.exports, require, mod, filePath, __dirname);
  return mod.exports;
}
