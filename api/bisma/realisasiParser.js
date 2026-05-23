const { cleanText, parseRupiah } = require("./utils");

function parseRealisasiPayload(payload, options = {}) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const warnings = [];
  const items = rows.map((row, index) => parseRealisasiRow(row, index, warnings));
  const totals = summarizeRealisasi(items);

  return {
    source: "bisma",
    year: options.year || inferYear(items),
    syncedAt: new Date().toISOString(),
    count: items.length,
    recordsTotal: toNumber(payload?.recordsTotal, items.length),
    recordsFiltered: toNumber(payload?.recordsFiltered, items.length),
    items,
    totals,
    warnings,
  };
}

function parseRealisasiRow(row, index, warnings = []) {
  const raw = row && typeof row === "object" ? row : {};
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    warnings.push({
      stage: "realisasi-parse",
      rowNo: index + 1,
      message: "Realisasi row was not an object",
    });
  }

  const account = parseAccount(raw.kdakun, raw.nmakun);
  const satker = parseCodeLabel(raw.satker);
  const unitE2 = parseCodeLabel(raw.unit_e2);
  const unitE3 = parseCodeLabel(raw.unit_e3);
  const pagu = money(raw.pagu);
  const realisasi = money(raw.realisasi);
  const sp2d = money(raw.sp2d);
  const draft = money(raw.draft);

  return stripUndefined({
    rowNo: index + 1,
    bagipaguId: cleanText(raw.bagipagu_id),
    kdindex: cleanText(raw.kdindex),
    year: cleanText(raw.thang),
    programCode: cleanText(raw.kdprogram),
    activityCode: cleanText(raw.kdgiat),
    outputCode: cleanText(raw.kdoutput),
    suboutputCode: cleanText(raw.kdsoutput),
    componentCode: cleanText(raw.kdkmpnen),
    subcomponentCode: cleanText(raw.kdskmpnen),
    accountCode: account.code,
    accountName: account.name,
    satkerCode: cleanText(raw.kdsatker) || satker.code,
    satkerName: cleanText(raw.nmsatker) || satker.label,
    unitCode: cleanText(raw.kdunit) || unitE2.code || unitE3.code,
    unitId: cleanText(raw.unit_id),
    unitE2Code: unitE2.code,
    unitE2Name: unitE2.label,
    unitE3Code: unitE3.code,
    unitE3Name: unitE3.label,
    label: cleanText(raw.label),
    pagu,
    rupiahUnit: money(raw.rupiah_unit),
    blokir: money(raw.blokir),
    draft,
    realisasi,
    sp2d,
    outstanding: money(raw.outstand),
    selisihLs: money(raw.selisih_ls),
    availableAfterRealisasi: pagu - realisasi,
    realisasiPct: percent(realisasi, pagu),
    sp2dPct: percent(sp2d, pagu),
    draftPct: percent(draft, pagu),
  });
}

function summarizeRealisasi(items) {
  const totals = items.reduce(
    (summary, item) => ({
      pagu: summary.pagu + (item.pagu || 0),
      rupiahUnit: summary.rupiahUnit + (item.rupiahUnit || 0),
      blokir: summary.blokir + (item.blokir || 0),
      draft: summary.draft + (item.draft || 0),
      realisasi: summary.realisasi + (item.realisasi || 0),
      sp2d: summary.sp2d + (item.sp2d || 0),
      outstanding: summary.outstanding + (item.outstanding || 0),
      selisihLs: summary.selisihLs + (item.selisihLs || 0),
    }),
    {
      pagu: 0,
      rupiahUnit: 0,
      blokir: 0,
      draft: 0,
      realisasi: 0,
      sp2d: 0,
      outstanding: 0,
      selisihLs: 0,
    },
  );

  return {
    ...totals,
    availableAfterRealisasi: totals.pagu - totals.realisasi,
    realisasiPct: percent(totals.realisasi, totals.pagu),
    sp2dPct: percent(totals.sp2d, totals.pagu),
    draftPct: percent(totals.draft, totals.pagu),
  };
}

function parseAccount(kdakun, nmakun) {
  const code = cleanText(kdakun);
  const text = cleanText(nmakun);
  const match = text.match(/^(\d+)\s*-\s*(.+)$/);
  return {
    code: code || (match ? match[1] : ""),
    name: match ? match[2] : text,
  };
}

function parseCodeLabel(value) {
  const text = cleanText(value);
  const match = text.match(/^([A-Z0-9]+)\s*-\s*(.+)$/i);
  return {
    code: match ? match[1] : "",
    label: match ? match[2] : text,
  };
}

function inferYear(items) {
  return items.find((item) => item.year)?.year || "";
}

function money(value) {
  return parseRupiah(value);
}

function toNumber(value, fallback = 0) {
  const number = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(number) ? number : fallback;
}

function percent(value, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Number(((value || 0) / total * 100).toFixed(2));
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

module.exports = {
  parseRealisasiPayload,
  parseRealisasiRow,
  summarizeRealisasi,
};
