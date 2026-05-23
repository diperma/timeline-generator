function sanitizePublicRealisasiPayload(payload, options = {}) {
  validateRealisasiPayload(payload);

  const publishedAt = options.publishedAt || new Date().toISOString();
  return stripUndefined({
    source: payload.source,
    year: payload.year,
    syncedAt: payload.syncedAt,
    obtainedAt: payload.syncedAt,
    publishedAt,
    publicSnapshot: true,
    count: payload.count,
    recordsTotal: payload.recordsTotal,
    recordsFiltered: payload.recordsFiltered,
    totals: payload.totals,
    items: payload.items.map((item) =>
      stripUndefined({
        rowNo: item.rowNo,
        bagipaguId: item.bagipaguId,
        kdindex: item.kdindex,
        year: item.year,
        programCode: item.programCode,
        activityCode: item.activityCode,
        outputCode: item.outputCode,
        suboutputCode: item.suboutputCode,
        componentCode: item.componentCode,
        subcomponentCode: item.subcomponentCode,
        accountCode: item.accountCode,
        accountName: item.accountName,
        satkerCode: item.satkerCode,
        satkerName: item.satkerName,
        unitCode: item.unitCode,
        unitId: item.unitId,
        unitE2Code: item.unitE2Code,
        unitE2Name: item.unitE2Name,
        unitE3Code: item.unitE3Code,
        unitE3Name: item.unitE3Name,
        label: item.label,
        pagu: item.pagu,
        rupiahUnit: item.rupiahUnit,
        blokir: item.blokir,
        draft: item.draft,
        realisasi: item.realisasi,
        sp2d: item.sp2d,
        outstanding: item.outstanding,
        selisihLs: item.selisihLs,
        availableAfterRealisasi: item.availableAfterRealisasi,
        realisasiPct: item.realisasiPct,
        sp2dPct: item.sp2dPct,
        draftPct: item.draftPct,
      }),
    ),
    warnings: Array.isArray(payload.warnings)
      ? payload.warnings.map((warning) =>
          stripUndefined({
            stage: warning.stage,
            rowNo: warning.rowNo,
            message: warning.message,
          }),
        )
      : [],
  });
}

function validateRealisasiPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Realisasi payload must be an object");
  }
  if (payload.source !== "bisma") {
    throw new Error("Realisasi payload source must be bisma");
  }
  if (!payload.year) {
    throw new Error("Realisasi payload year is required");
  }
  if (!payload.syncedAt) {
    throw new Error("Realisasi payload syncedAt is required");
  }
  if (!Array.isArray(payload.items)) {
    throw new Error("Realisasi payload items must be an array");
  }
  if (!payload.totals || typeof payload.totals !== "object") {
    throw new Error("Realisasi payload totals are required");
  }
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefined(entryValue)]),
  );
}

module.exports = {
  sanitizePublicRealisasiPayload,
  validateRealisasiPayload,
};
