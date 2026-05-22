const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getConfig() {
  const baseUrl = trimTrailingSlash(process.env.BISMA_BASE_URL || "https://bisma.bpkp.go.id");
  return {
    baseUrl,
    username: process.env.BISMA_USERNAME || "",
    password: process.env.BISMA_PASSWORD || "",
    year: process.env.BISMA_YEAR || "2026",
    cacheTtlMs: readInt("BISMA_CACHE_TTL_SECONDS", 900) * 1000,
    detailConcurrency: readInt("BISMA_DETAIL_CONCURRENCY", 4),
    debugHtml: /^true$/i.test(process.env.BISMA_DEBUG_HTML || ""),
    corsOrigin: process.env.CORS_ORIGIN || "",
    port: readInt("PORT", 3000),
  };
}

function getPublicConfig(config) {
  return {
    baseUrl: config.baseUrl,
    year: config.year,
    hasUsername: Boolean(config.username),
    hasPassword: Boolean(config.password),
    cacheTtlSeconds: Math.round(config.cacheTtlMs / 1000),
    detailConcurrency: config.detailConcurrency,
    debugHtml: config.debugHtml,
    corsRestricted: Boolean(config.corsOrigin),
  };
}

function requireCredentials(config) {
  if (!config.username || !config.password) {
    const error = new Error("BISMA_USERNAME and BISMA_PASSWORD must be set in .env");
    error.statusCode = 400;
    error.stage = "config";
    throw error;
  }
}

function readInt(name, fallback) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

module.exports = {
  getConfig,
  getPublicConfig,
  requireCredentials,
};
