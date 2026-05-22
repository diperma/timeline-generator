const { createCache } = require("./cache");
const { parseCostsheetList } = require("./costsheetListParser");
const { parseCostsheetDetail } = require("./costsheetDetailParser");
const { buildTimelinePayload } = require("./timelineAdapter");

const LIST_CACHE_KEY = "costsheet:list:All";
const TIMELINE_CACHE_KEY = "timeline:All";
const LIST_REFERER = "/Transaksi/Apisima/Getcostsheet/All";

function createCostsheetService({ config, client }) {
  const cache = createCache(config.cacheTtlMs);

  async function fetchCostsheetList({ force = false } = {}) {
    if (!force) {
      const cached = cache.get(LIST_CACHE_KEY);
      if (cached) return { ...cached, cacheHit: true };
    }

    const response = await client.bismaPost(
      "/Transaksi/Apisima/Getcostsheet_ajax",
      { trigger: "All" },
      { referer: LIST_REFERER, stage: "list-fetch" },
    );

    let payload;
    try {
      payload = response.json();
    } catch (_error) {
      throw stageError("list-fetch", "BISMA costsheet list response was not JSON", 502);
    }

    const parsed = {
      ...parseCostsheetList(payload, { baseUrl: config.baseUrl }),
      source: "bisma",
      year: config.year,
      syncedAt: new Date().toISOString(),
      cacheHit: false,
    };
    console.log(`Fetched ${parsed.count} costsheets`);
    cache.set(LIST_CACHE_KEY, parsed);
    return parsed;
  }

  async function fetchCostsheetDetail(costsheetIdOrItem, { force = false } = {}) {
    const item = await resolveListItem(costsheetIdOrItem, { forceList: false });
    if (!item) {
      throw stageError("detail-fetch", `Costsheet ${costsheetIdOrItem} was not found in list`, 404);
    }
    if (!item.detailUrl) {
      throw stageError("detail-fetch", `Costsheet ${item.costsheetId} has no detail URL`, 422);
    }

    const cacheKey = detailCacheKey(item.costsheetId);
    if (!force) {
      const cached = cache.get(cacheKey);
      if (cached) return { ...cached, cacheHit: true };
    }

    const response = await client.bismaGet(item.detailUrl, {
      referer: LIST_REFERER,
      stage: "detail-fetch",
    });
    const detail = {
      ...parseCostsheetDetail(response.text, item),
      cacheHit: false,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, detail);
    return detail;
  }

  async function fetchTimelineData({ force = false } = {}) {
    if (!force) {
      const cached = cache.get(TIMELINE_CACHE_KEY);
      if (cached) return { ...cached, cacheHit: true };
    }

    const list = await fetchCostsheetList({ force });
    const details = [];
    const warnings = [...(list.warnings || [])];

    await mapWithConcurrency(list.items, config.detailConcurrency, async (item) => {
      try {
        const detail = await fetchCostsheetDetail(item, { force });
        details.push(detail);
      } catch (error) {
        warnings.push({
          costsheetId: item.costsheetId,
          stage: error.stage || "detail-fetch",
          message: error.message,
        });
      }
    });

    details.sort((left, right) => {
      const a = list.items.findIndex((item) => item.costsheetId === left.costsheetId);
      const b = list.items.findIndex((item) => item.costsheetId === right.costsheetId);
      return a - b;
    });

    const timeline = buildTimelinePayload(details, { year: config.year });
    timeline.warnings = [...warnings, ...timeline.warnings];
    timeline.listCount = list.count;
    timeline.detailParsed = details.length;
    timeline.detailFailed = Math.max(0, list.count - details.length);
    timeline.cacheHit = false;
    console.log(`Parsed ${timeline.detailParsed} detail pages, ${timeline.detailFailed} failed`);
    cache.set(TIMELINE_CACHE_KEY, timeline);
    return timeline;
  }

  async function syncAll() {
    cache.del(LIST_CACHE_KEY);
    cache.del(TIMELINE_CACHE_KEY);
    const timeline = await fetchTimelineData({ force: true });
    return {
      ok: true,
      listCount: timeline.listCount,
      detailParsed: timeline.detailParsed,
      detailFailed: timeline.detailFailed,
      syncedAt: timeline.syncedAt,
      warnings: timeline.warnings,
    };
  }

  function getCacheStatus() {
    const status = cache.status();
    return {
      ...status,
      hasList: Boolean(cache.get(LIST_CACHE_KEY)),
      hasTimeline: Boolean(cache.get(TIMELINE_CACHE_KEY)),
    };
  }

  async function resolveListItem(costsheetIdOrItem, { forceList = false } = {}) {
    if (typeof costsheetIdOrItem === "object" && costsheetIdOrItem?.detailUrl) {
      return costsheetIdOrItem;
    }
    const list = await fetchCostsheetList({ force: forceList });
    const wanted = String(costsheetIdOrItem || "");
    return list.items.find((item) => item.costsheetId === wanted || item.stId === wanted);
  }

  return {
    fetchCostsheetList,
    fetchCostsheetDetail,
    fetchTimelineData,
    syncAll,
    getCacheStatus,
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const limit = Math.max(1, Number.parseInt(concurrency, 10) || 1);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await mapper(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
}

function detailCacheKey(costsheetId) {
  return `costsheet:detail:${costsheetId}`;
}

function stageError(stage, message, statusCode) {
  const error = new Error(message);
  error.stage = stage;
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  createCostsheetService,
  mapWithConcurrency,
};
