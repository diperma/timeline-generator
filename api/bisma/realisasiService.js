const { createCache } = require("./cache");
const { parseRealisasiPayload } = require("./realisasiParser");

const REALISASI_CACHE_KEY = "realisasi:All";
const REALISASI_REFERER = "/Anggaran/Realisasi";

function createRealisasiService({ config, client }) {
  const cache = createCache(config.cacheTtlMs);

  async function fetchRealisasi({ force = false } = {}) {
    if (!force) {
      const cached = cache.get(REALISASI_CACHE_KEY);
      if (cached) return { ...cached, cacheHit: true };
    }

    const response = await client.bismaPost(
      "/Anggaran/Realisasi/getData",
      dataTablesForm(),
      { referer: REALISASI_REFERER, stage: "realisasi-fetch" },
    );

    let payload;
    try {
      payload = response.json();
    } catch (_error) {
      throw stageError("realisasi-fetch", "BISMA realisasi response was not JSON", 502);
    }

    const parsed = {
      ...parseRealisasiPayload(payload, { year: config.year }),
      cacheHit: false,
    };
    console.log(`Fetched ${parsed.count} realisasi budget rows`);
    cache.set(REALISASI_CACHE_KEY, parsed);
    return parsed;
  }

  async function syncAll() {
    cache.del(REALISASI_CACHE_KEY);
    const realisasi = await fetchRealisasi({ force: true });
    return {
      ok: true,
      count: realisasi.count,
      recordsTotal: realisasi.recordsTotal,
      recordsFiltered: realisasi.recordsFiltered,
      syncedAt: realisasi.syncedAt,
      warnings: realisasi.warnings,
    };
  }

  function getCacheStatus() {
    return {
      ...cache.status(),
      hasRealisasi: Boolean(cache.get(REALISASI_CACHE_KEY)),
    };
  }

  return {
    fetchRealisasi,
    syncAll,
    getCacheStatus,
  };
}

function dataTablesForm() {
  return {
    draw: 1,
    start: 0,
    length: -1,
    "search[value]": "",
    "search[regex]": "false",
  };
}

function stageError(stage, message, statusCode) {
  const error = new Error(message);
  error.stage = stage;
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  REALISASI_CACHE_KEY,
  createRealisasiService,
  dataTablesForm,
};
