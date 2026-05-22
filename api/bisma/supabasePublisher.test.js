const assert = require("node:assert/strict");
const test = require("node:test");

const { getSupabasePublishConfig } = require("./supabasePublisher");

test("getSupabasePublishConfig fails clearly without Supabase env vars", () => {
  assert.throws(() => getSupabasePublishConfig({}), /SUPABASE_URL/);
  assert.throws(
    () =>
      getSupabasePublishConfig({
        SUPABASE_URL: "https://example.supabase.co",
      }),
    /SUPABASE_SERVICE_ROLE_KEY/,
  );
});

test("getSupabasePublishConfig reads local publish defaults", () => {
  const config = getSupabasePublishConfig({
    SUPABASE_URL: "https://example.supabase.co/",
    SUPABASE_SERVICE_ROLE_KEY: "secret",
  });

  assert.equal(config.url, "https://example.supabase.co");
  assert.equal(config.bucket, "bisma-timeline");
  assert.equal(config.path, "timeline/latest.json");
  assert.equal(config.cacheControlSeconds, 60);
  assert.equal(config.publishHistory, false);
});

test("getSupabasePublishConfig supports explicit storage settings", () => {
  const config = getSupabasePublishConfig({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "secret",
    SUPABASE_BUCKET: "custom",
    PUBLIC_TIMELINE_PATH: "/exports/latest.json",
    SUPABASE_CACHE_CONTROL_SECONDS: "120",
    SUPABASE_PUBLISH_HISTORY: "true",
  });

  assert.equal(config.bucket, "custom");
  assert.equal(config.path, "exports/latest.json");
  assert.equal(config.cacheControlSeconds, 120);
  assert.equal(config.publishHistory, true);
});
