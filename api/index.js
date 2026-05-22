const express = require("express");
const cors = require("cors");
const { getConfig, getPublicConfig } = require("./bisma/config");
const { createBismaClient } = require("./bisma/bismaClient");
const { createCostsheetService } = require("./bisma/costsheetService");

const app = express();
const config = getConfig();
const client = createBismaClient(config);
const costsheets = createCostsheetService({ config, client });

app.use(cors());
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

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Timeline backend listening on http://localhost:${config.port}`);
  });
}

module.exports = app;
