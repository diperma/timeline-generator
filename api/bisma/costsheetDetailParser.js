const {
  cleanText,
  fieldValueById,
  inclusiveDateDiff,
  loadHtml,
  parseHp,
  parseRupiah,
  scriptVar,
  selectedOptionText,
  selectedOptionValue,
} = require("./utils");

const STATUS_LABELS = {
  "0": "Draft",
  "0.5": "Penyusunan Rencana oleh Es3/Es2",
  "1": "Pengajuan Rencana oleh Es3/Es2",
  "2": "Persetujuan PPK",
  "3": "Persetujuan Eselon 2/KPA",
  "3.5": "Update Realisasi SPJ",
  "3.6": "Persetujuan Pengajuan SPJ",
  "4": "Verifikasi Materil",
  "5": "Persetujuan Materil oleh PPK",
  "5.1": "Sinkronisasi SAKTI",
  "5.2": "Verifikasi Formil",
  "5.3": "Persetujuan Formil",
  "6": "Proses UP oleh Bendahara",
  "7": "Proses SPM oleh PPSPM",
  "8": "SP2D",
};

function parseCostsheetDetail(html, listItem = {}) {
  const $ = loadHtml(html);
  const warnings = [];
  const countFromScript = Number.parseInt(scriptVar(html, "countJSON"), 10);
  const rows = $("#tbUser tr.tb-tim").toArray();
  const statusCode = scriptVar(html, "id_status_cs") || listItem.statusCode || "";

  const detail = {
    costsheetId: fieldValueById($, "id_cs") || scriptVar(html, "id_cs") || listItem.costsheetId || "",
    stId: fieldValueById($, "id_st") || "",
    nomorSt: fieldValueById($, "nost"),
    tanggalSt: fieldValueById($, "tglst"),
    description: fieldValueById($, "uraianst") || listItem.description || "",
    startDate: fieldValueById($, "tglst_mulai"),
    endDate: fieldValueById($, "tglst_selesai"),
    mak: fieldValueById($, "idxskmpnenlabel"),
    kdakun: fieldValueById($, "kdakun"),
    alokasi: parseRupiah(fieldValueById($, "alokasi")),
    bebanAnggaran: fieldValueById($, "bebananggaranlabel"),
    sumberDana: fieldValueById($, "val_sumber_dana"),
    penandatangan: fieldValueById($, "ttd_"),
    menyetujui: fieldValueById($, "menyetujui"),
    mengajukan: fieldValueById($, "mengajukan"),
    realisasi: parseRupiah(fieldValueById($, "realisasi")),
    year: fieldValueById($, "thang") || scriptVar(html, "thang"),
    satker: scriptVar(html, "satker_session"),
    user: scriptVar(html, "user_session"),
    role: scriptVar(html, "role_session"),
    unit: scriptVar(html, "unit_session"),
    statusCode,
    statusLabel: STATUS_LABELS[statusCode] || "",
    sourceType: scriptVar(html, "sumber_data") || listItem.sourceType || "",
    pkptId: listItem.pkptId || "",
    detailUrl: listItem.detailUrl || "",
    countMembers: Number.isFinite(countFromScript) ? countFromScript : rows.length,
    members: [],
    warnings,
  };

  for (const rowElement of rows) {
    const row = $(rowElement);
    const rowNo = parseRowNo(row) || detail.members.length + 1;
    const member = parseMemberRow($, row, rowNo);
    if (!member.employeeName || !member.startDate || !member.endDate) {
      warnings.push({
        costsheetId: detail.costsheetId,
        stage: "detail-parse",
        rowNo,
        message: "Skipping member row because name or dates are missing",
      });
      continue;
    }
    detail.members.push(member);
  }

  if (detail.members.length === 0) {
    warnings.push({
      costsheetId: detail.costsheetId,
      stage: "detail-parse",
      message: "No timeline-ready member rows found",
    });
  }

  return detail;
}

function parseMemberRow($, row, rowNo) {
  const startDate = fieldValueById($, `tglberangkat${rowNo}`, row);
  const endDate = fieldValueById($, `tglkembali${rowNo}`, row);
  const hpFromHidden = parseHp(fieldValueById($, `jmlharidum${rowNo}`, row));
  const hp = hpFromHidden ?? inclusiveDateDiff(startDate, endDate) ?? 0;
  const originSelect = row.find(`[id="kotaasal${rowNo}"]`).first();
  const destinationSelect = row.find(`[id="kotatujuan${rowNo}"]`).first();

  return {
    rowNo,
    isActive: row.find(`input[name="is_aktif${rowNo}"][value="1"]`).length > 0,
    noSpd: fieldValueById($, `nospd${rowNo}`, row),
    employeeName: fieldValueById($, `nama${rowNo}`, row),
    nip: fieldValueById($, `nip${rowNo}`, row),
    role: fieldValueById($, `perjab${rowNo}`, row),
    grade: fieldValueById($, `gol${rowNo}`, row),
    startDate,
    endDate,
    hp,
    hpSource: hpFromHidden === null ? "date-diff" : "jmlharidum",
    originCity: selectedOptionText(originSelect),
    originCityCode: selectedOptionValue(originSelect),
    destinationCity: selectedOptionText(destinationSelect),
    destinationCityCode: selectedOptionValue(destinationSelect),
    totalCost: parseRupiah(fieldValueById($, `total${rowNo}`, row)),
  };
}

function parseRowNo(row) {
  const id = row.attr("id") || "";
  const match = id.match(/tb-tim(\d+)/);
  if (match) return Number.parseInt(match[1], 10);
  const urut = cleanText(row.find("input.nourut").first().attr("value"));
  return Number.parseInt(urut, 10) || null;
}

module.exports = {
  parseCostsheetDetail,
  parseMemberRow,
  STATUS_LABELS,
};
