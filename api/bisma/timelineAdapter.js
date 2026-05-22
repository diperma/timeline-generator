function buildTimelinePayload(details, options = {}) {
  const warnings = [];
  const assignments = details
    .filter(Boolean)
    .map((detail, index) => {
      warnings.push(...(detail.warnings || []));
      return {
        no: index + 1,
        source: "bisma",
        costsheetId: detail.costsheetId,
        stId: detail.stId,
        nomorSt: detail.nomorSt,
        pkptId: detail.pkptId,
        sourceType: detail.sourceType,
        statusCode: detail.statusCode,
        statusLabel: detail.statusLabel,
        description: detail.description,
        startDate: detail.startDate,
        endDate: detail.endDate,
        mak: detail.mak,
        kdakun: detail.kdakun,
        bebanAnggaran: detail.bebanAnggaran,
        totalCost: detail.realisasi,
        members: detail.members.map((member) => ({
          employeeName: member.employeeName,
          nip: member.nip,
          role: member.role,
          grade: member.grade,
          startDate: member.startDate,
          endDate: member.endDate,
          hp: member.hp,
          isActive: member.isActive,
          noSpd: member.noSpd,
          originCity: member.originCity,
          destinationCity: member.destinationCity,
          costBreakdown: member.costBreakdown,
          totalCost: member.totalCost,
        })),
      };
    });

  return {
    source: "bisma",
    year: options.year || "",
    syncedAt: new Date().toISOString(),
    count: assignments.length,
    assignments,
    warnings,
  };
}

module.exports = {
  buildTimelinePayload,
};
