const express = require("express");
const cors = require("cors");
const crypto = require("node:crypto");
const { getConfig, getPublicConfig } = require("./bisma/config");
const { createBismaClient } = require("./bisma/bismaClient");
const { createCostsheetService } = require("./bisma/costsheetService");

const app = express();
const config = getConfig();
const client = createBismaClient(config);
const costsheets = createCostsheetService({ config, client });

app.use(cors(createCorsOptions(config)));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "timeline-generator-backend",
    time: new Date().toISOString(),
  });
});

app.get("/api/bisma/status", async (_req, res) => {
  try {
    res.json({
      ok: true,
      config: getPublicConfig(config),
      session: client.getSessionStatus(),
      cache: costsheets.getCacheStatus(),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/bisma/login-probe", async (_req, res) => {
  try {
    const urls = [
      config.baseUrl + "/",
      config.baseUrl + "/?probe=1",
      config.baseUrl + "/Auth",
      config.baseUrl + "/Auth/Auth/login",
    ];
    const headerSets = [
      {
        name: "default",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
        },
      },
      {
        name: "browser-like",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Upgrade-Insecure-Requests": "1",
        },
      },
    ];

    const probes = [];
    for (const url of urls) {
      for (const headerSet of headerSets) {
        probes.push(await probeBismaLoginUrl(url, headerSet));
      }
    }

    res.json({
      ok: true,
      runtime: {
        node: process.version,
        region: process.env.VERCEL_REGION || null,
      },
      probes,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/bisma/login", async (_req, res) => {
  try {
    await client.ensureSession();
    res.json({
      ok: true,
      session: client.getSessionStatus(),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/bisma/costsheets", async (req, res) => {
  try {
    const force = req.query.force === "true";
    res.json(await costsheets.fetchCostsheetList({ force }));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/bisma/costsheets/:costsheetId", async (req, res) => {
  try {
    const force = req.query.force === "true";
    res.json(await costsheets.fetchCostsheetDetail(req.params.costsheetId, { force }));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/bisma/timeline", async (req, res) => {
  try {
    const force = req.query.force === "true";
    res.json(await costsheets.fetchTimelineData({ force }));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/bisma/sync", async (_req, res) => {
  try {
    res.json(await costsheets.syncAll());
  } catch (error) {
    sendError(res, error);
  }
});

function sendError(res, error) {
  const status = error.statusCode || 500;
  res.status(status).json({
    ok: false,
    stage: error.stage || "backend",
    message: error.message || "Unexpected backend error",
  });
}

function createCorsOptions(config) {
  const allowedOrigins = String(config.corsOrigin || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!allowedOrigins.length) return {};

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
  };
}

async function probeBismaLoginUrl(url, headerSet) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headerSet.headers,
      redirect: "manual",
    });
    const text = await response.text();
    const normalized = text.replace(/\s+/g, " ").trim();
    return {
      url,
      headerSet: headerSet.name,
      status: response.status,
      responseUrl: response.url,
      location: response.headers.get("location"),
      contentType: response.headers.get("content-type"),
      bytes: Buffer.byteLength(text, "utf8"),
      hasEnckey: /name=["']enckey["']/i.test(text),
      hasActAuth: /Auth\/Auth\/act_auth/i.test(text),
      title: extractTitle(text),
      sha256: crypto.createHash("sha256").update(text).digest("hex"),
      sample: normalized.slice(0, 160),
    };
  } catch (error) {
    return {
      url,
      headerSet: headerSet.name,
      error: error.message,
    };
  }
}

function extractTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim().slice(0, 80) : "";
}

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Timeline backend listening on http://localhost:${config.port}`);
  });
}

module.exports = app;
