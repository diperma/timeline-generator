const { getConfig } = require("../api/bisma/config");
const { createBismaClient } = require("../api/bisma/bismaClient");
const { createRealisasiService } = require("../api/bisma/realisasiService");
const { sanitizePublicRealisasiPayload } = require("../api/bisma/publicRealisasi");
const {
  createSupabasePublisher,
  getSupabasePublishConfig,
} = require("../api/bisma/supabasePublisher");

const DEFAULT_REALISASI_PATH = "realisasi/latest.json";

async function main() {
  const bismaConfig = getConfig();
  const client = createBismaClient(bismaConfig);
  const realisasi = createRealisasiService({ config: bismaConfig, client });

  console.log("Syncing BISMA realisasi locally...");
  const payload = await realisasi.fetchRealisasi({ force: true });
  const publicPayload = sanitizePublicRealisasiPayload(payload);

  console.log(`Publishing ${publicPayload.items.length} realisasi rows...`);
  const publishConfig = {
    ...getSupabasePublishConfig(),
    path: process.env.PUBLIC_REALISASI_PATH || DEFAULT_REALISASI_PATH,
  };
  const publisher = createSupabasePublisher(publishConfig);
  const result = await publisher.publishJson(publicPayload);

  console.log(`Published to: ${result.publicUrl}`);
  console.log(`Synced at: ${publicPayload.syncedAt}`);
  console.log(`Published at: ${publicPayload.publishedAt}`);
  console.log(`Rows: ${publicPayload.items.length}`);
  console.log(`Warnings: ${publicPayload.warnings.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
