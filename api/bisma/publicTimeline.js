function sanitizePublicTimelinePayload(payload, options = {}) {
  validateTimelinePayload(payload);

  const publishedAt = options.publishedAt || new Date().toISOString();
  const assignments = payload.assignments.map((assignment) => ({
    no: assignment.no,
    source: assignment.source,
    costsheetId: assignment.costsheetId,
    stId: assignment.stId,
    nomorSt: assignment.nomorSt,
    pkptId: assignment.pkptId,
    sourceType: assignment.sourceType,
    statusCode: assignment.statusCode,
    statusLabel: assignment.statusLabel,
    description: assignment.description,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    mak: assignment.mak,
    kdakun: assignment.kdakun,
    bebanAnggaran: assignment.bebanAnggaran,
    totalCost: assignment.totalCost,
    members: Array.isArray(assignment.members)
      ? assignment.members.map((member) => ({
          employeeName: member.employeeName,
          role: member.role,
          grade: member.grade,
          startDate: member.startDate,
          endDate: member.endDate,
          hp: member.hp,
          isActive: member.isActive,
          originCity: member.originCity,
          destinationCity: member.destinationCity,
        }))
      : [],
  }));

  return stripUndefined({
    source: payload.source,
    year: payload.year,
    syncedAt: payload.syncedAt,
    publishedAt,
    publicSnapshot: true,
    count: payload.count,
    listCount: payload.listCount,
    detailParsed: payload.detailParsed,
    detailFailed: payload.detailFailed,
    assignments,
    warnings: Array.isArray(payload.warnings)
      ? payload.warnings.map((warning) =>
          stripUndefined({
            costsheetId: warning.costsheetId,
            stage: warning.stage,
            rowNo: warning.rowNo,
            message: warning.message,
          }),
        )
      : [],
  });
}

function validateTimelinePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Timeline payload must be an object");
  }
  if (payload.source !== "bisma") {
    throw new Error("Timeline payload source must be bisma");
  }
  if (!payload.year) {
    throw new Error("Timeline payload year is required");
  }
  if (!payload.syncedAt) {
    throw new Error("Timeline payload syncedAt is required");
  }
  if (!Array.isArray(payload.assignments)) {
    throw new Error("Timeline payload assignments must be an array");
  }
  if (!Array.isArray(payload.warnings)) {
    throw new Error("Timeline payload warnings must be an array");
  }
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefined(entryValue)]),
  );
}

module.exports = {
  sanitizePublicTimelinePayload,
  validateTimelinePayload,
};
