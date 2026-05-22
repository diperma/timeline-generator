const { createClient } = require("@supabase/supabase-js");

const DEFAULT_BUCKET = "bisma-timeline";
const DEFAULT_PATH = "timeline/latest.json";
const DEFAULT_CACHE_CONTROL_SECONDS = 60;

function getSupabasePublishConfig(env = process.env) {
  const url = trimTrailingSlash(env.SUPABASE_URL || "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const bucket = env.SUPABASE_BUCKET || DEFAULT_BUCKET;
  const path = normalizeStoragePath(env.PUBLIC_TIMELINE_PATH || DEFAULT_PATH);
  const cacheControlSeconds = readPositiveInt(
    env.SUPABASE_CACHE_CONTROL_SECONDS,
    DEFAULT_CACHE_CONTROL_SECONDS,
  );
  const publishHistory = /^true$/i.test(env.SUPABASE_PUBLISH_HISTORY || "");

  if (!url) {
    throw new Error("SUPABASE_URL must be set in .env");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  }

  return {
    url,
    serviceRoleKey,
    bucket,
    path,
    cacheControlSeconds,
    publishHistory,
  };
}

function createSupabasePublisher(config) {
  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  async function publishJson(payload) {
    await ensureBucket();

    const body = JSON.stringify(payload, null, 2);
    await upload(config.path, body);

    let historyPath = null;
    if (config.publishHistory) {
      historyPath = `timeline/history/${safeTimestamp(payload.publishedAt || new Date().toISOString())}.json`;
      await upload(historyPath, body);
    }

    const { data } = supabase.storage.from(config.bucket).getPublicUrl(config.path);

    return {
      bucket: config.bucket,
      path: config.path,
      publicUrl: data.publicUrl,
      historyPath,
      bytes: Buffer.byteLength(body, "utf8"),
    };
  }

  async function ensureBucket() {
    const { data: bucket, error: getError } = await supabase.storage.getBucket(config.bucket);
    if (!getError) {
      if (!bucket.public) {
        const { error: updateError } = await supabase.storage.updateBucket(config.bucket, {
          public: true,
          fileSizeLimit: "5MB",
          allowedMimeTypes: ["application/json"],
        });
        if (updateError) {
          throw new Error(`Could not make Supabase bucket ${config.bucket} public: ${updateError.message}`);
        }
      }
      return;
    }

    const { error: createError } = await supabase.storage.createBucket(config.bucket, {
      public: true,
      fileSizeLimit: "5MB",
      allowedMimeTypes: ["application/json"],
    });
    if (createError && !/already exists/i.test(createError.message || "")) {
      throw new Error(`Could not create Supabase bucket ${config.bucket}: ${createError.message}`);
    }
  }

  async function upload(path, body) {
    const { error } = await supabase.storage.from(config.bucket).upload(path, body, {
      cacheControl: String(config.cacheControlSeconds),
      contentType: "application/json",
      upsert: true,
    });
    if (error) {
      throw new Error(`Could not upload ${path} to Supabase Storage: ${error.message}`);
    }
  }

  return {
    publishJson,
  };
}

function normalizeStoragePath(value) {
  return String(value || DEFAULT_PATH).replace(/^\/+/, "");
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function readPositiveInt(value, fallback) {
  const number = Number.parseInt(value || "", 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function safeTimestamp(value) {
  return String(value).replace(/[:.]/g, "-");
}

module.exports = {
  DEFAULT_BUCKET,
  DEFAULT_PATH,
  createSupabasePublisher,
  getSupabasePublishConfig,
};
