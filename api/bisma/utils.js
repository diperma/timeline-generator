const cheerio = require("cheerio");

function loadHtml(html) {
  return cheerio.load(html || "", { decodeEntities: true });
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToText(html) {
  const $ = loadHtml(`<div id="root">${html || ""}</div>`);
  return cleanText($("#root").text());
}

function parseRupiah(value) {
  const text = String(value || "");
  const negative = /-/.test(text);
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return negative ? -parsed : parsed;
}

function fieldValue($, selector, scope) {
  const root = scope || $.root();
  const element = root.find(selector).first();
  if (!element.length) return "";
  if (element.is("textarea")) return cleanText(element.text());
  if (element.is("select")) return selectedOptionText(element);
  const value = element.attr("value");
  return cleanText(value !== undefined ? value : element.text());
}

function fieldValueById($, id, scope) {
  return fieldValue($, `[id="${id}"]`, scope);
}

function selectedOptionText(selectElement) {
  const selected = selectElement.find("option[selected]").first();
  if (selected.length) return cleanText(selected.text());
  return cleanText(selectElement.find("option").first().text());
}

function selectedOptionValue(selectElement) {
  const selected = selectElement.find("option[selected]").first();
  if (selected.length) return cleanText(selected.attr("value"));
  return cleanText(selectElement.find("option").first().attr("value"));
}

function scriptVar(html, name) {
  const escaped = escapeRegExp(name);
  const patterns = [
    new RegExp(`(?:var|let|const)\\s+${escaped}\\s*=\\s*["']([^"']*)["']`, "m"),
    new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`, "m"),
  ];
  for (const pattern of patterns) {
    const match = String(html || "").match(pattern);
    if (match) return cleanText(match[1]);
  }
  return "";
}

function parseHp(value) {
  const text = cleanText(value);
  if (!text) return null;
  if (text.includes(";")) {
    const parts = text.split(";").map((part) => Number.parseFloat(part) || 0);
    return parts.reduce((sum, part) => sum + part, 0);
  }
  const numeric = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function inclusiveDateDiff(startDate, endDate) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function absoluteUrl(pathOrUrl, baseUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return baseUrl.replace(/\/+$/, "") + "/" + String(pathOrUrl).replace(/^\/+/, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  absoluteUrl,
  cleanText,
  fieldValue,
  fieldValueById,
  htmlToText,
  inclusiveDateDiff,
  isIsoDate,
  loadHtml,
  parseHp,
  parseRupiah,
  scriptVar,
  selectedOptionText,
  selectedOptionValue,
};
