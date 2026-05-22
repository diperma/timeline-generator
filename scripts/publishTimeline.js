#!/usr/bin/env node

const { getConfig } = require("../api/bisma/config");
const { createBismaClient } = require("../api/bisma/bismaClient");
const { createCostsheetService } = require("../api/bisma/costsheetService");
const { sanitizePublicTimelinePayload } = require("../api/bisma/publicTimeline");
const {
  createSupabasePublisher,
  getSupabasePublishConfig,
} = require("../api/bisma/supabasePublisher");

async function main() {
  const bismaConfig = getConfig();
  const publishConfig = getSupabasePublishConfig();
  const client = createBismaClient(bismaConfig);
  const costsheets = createCostsheetService({ config: bismaConfig, client });

  console.log("Syncing BISMA timeline locally...");
  const timeline = await costsheets.fetchTimelineData({ force: true });
  const publicTimeline = sanitizePublicTimelinePayload(timeline);

  console.log(
    `Publishing ${publicTimeline.assignments.length} assignments with ${publicTimeline.warnings.length} warnings...`,
  );
  const publisher = createSupabasePublisher(publishConfig);
  const result = await publisher.publishJson(publicTimeline);

  console.log("Timeline snapshot published.");
  console.log(`Synced at: ${publicTimeline.syncedAt}`);
  console.log(`Published at: ${publicTimeline.publishedAt}`);
  console.log(`Assignments: ${publicTimeline.assignments.length}`);
  console.log(`Warnings: ${publicTimeline.warnings.length}`);
  console.log(`Storage: ${result.bucket}/${result.path}`);
  console.log(`Bytes: ${result.bytes}`);
  console.log(`Public URL: ${result.publicUrl}`);
  if (result.historyPath) {
    console.log(`History: ${result.bucket}/${result.historyPath}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
};
