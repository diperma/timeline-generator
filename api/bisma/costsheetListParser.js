const {
  absoluteUrl,
  cleanText,
  htmlToText,
  loadHtml,
  parseRupiah,
} = require("./utils");

function parseCostsheetList(payload, options = {}) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const items = [];
  const warnings = [];

  rows.forEach((row, index) => {
    try {
      const parsed = parseCostsheetRow(row, index, options);
      if (parsed) items.push(parsed);
    } catch (error) {
      warnings.push({
        stage: "list-parse",
        row: index,
        message: error.message,
      });
    }
  });

  return {
    count: items.length,
    items,
    warnings,
  };
}

function parseCostsheetRow(row, index, options = {}) {
  if (!Array.isArray(row)) return null;
  const no = Number.parseInt(row[1], 10) || index + 1;
  const statusCode = htmlToText(row[2]);
  const title = parseTitleCell(row[3]);
  const detailUrl = extractDetailUrl(row[8], options.baseUrl);
  const detailParts = parseDetailUrl(detailUrl);

  return {
    no,
    statusCode,
    costsheetId: title.costsheetId || detailParts.costsheetId,
    description: title.description,
    beban: htmlToText(row[4]),
    biaya: parseRupiah(htmlToText(row[5])),
    createdBy: htmlToTextWithBreaks(row[6]),
    approvalInfo: htmlToTextWithBreaks(row[7]),
    detailUrl,
    sourceType: detailParts.sourceType,
    pkptId: detailParts.pkptId,
    rawIndex: row[0],
  };
}

function parseTitleCell(html) {
  const normalized = String(html || "").replace(/<br\s*\/?>/gi, "\n");
  const text = htmlToText(normalized.replace(/\n/g, " || "));
  const parts = text.split("||").map(cleanText).filter(Boolean);
  return {
    costsheetId: parts[0] || "",
    description: parts.slice(1).join(" "),
  };
}

function htmlToTextWithBreaks(html) {
  return htmlToText(String(html || "").replace(/<br\s*\/?>/gi, " "));
}

function extractDetailUrl(html, baseUrl = "") {
  const $ = loadHtml(`<div id="root">${html || ""}</div>`);
  const href = $("#root a")
    .map((_i, el) => $(el).attr("href") || "")
    .get()
    .find((value) => /Getcostsheetdetail/i.test(value));
  return href ? absoluteUrl(href, baseUrl) : "";
}

function parseDetailUrl(detailUrl) {
  const match = String(detailUrl || "").match(
    /Getcostsheetdetail\/([^/]+)\/Detail\/([^/]+)\/([^/]+)\/cs/i,
  );
  return {
    costsheetId: match ? decodeURIComponent(match[1]) : "",
    sourceType: match ? decodeURIComponent(match[2]) : "",
    pkptId: match ? decodeURIComponent(match[3]) : "",
  };
}

module.exports = {
  parseCostsheetList,
  parseCostsheetRow,
  parseDetailUrl,
};
