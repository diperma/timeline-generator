const assert = require("node:assert/strict");
const test = require("node:test");
const { createRealisasiService, dataTablesForm } = require("./realisasiService");

const config = {
  baseUrl: "https://bisma.bpkp.go.id",
  year: "2026",
  cacheTtlMs: 60_000,
};

test("dataTablesForm includes required BISMA realisasi fields", () => {
  assert.deepEqual(dataTablesForm(), {
    draw: 1,
    start: 0,
    length: -1,
    "search[value]": "",
    "search[regex]": "false",
  });
});

test("fetchRealisasi posts DataTables fields and caches response", async () => {
  const calls = [];
  const service = createRealisasiService({
    config,
    client: {
      async bismaPost(path, formData, options) {
        calls.push({ path, formData, options });
        return {
          json() {
            return {
              draw: 1,
              recordsTotal: 1,
              recordsFiltered: 1,
              data: [
                {
                  bagipagu_id: "1",
                  thang: "2026",
                  kdakun: "524111",
                  nmakun: "524111 - Belanja Perjalanan Dinas Biasa",
                  pagu: "100",
                  realisasi: "25",
                  sp2d: "20",
                  draft: "5",
                },
              ],
            };
          },
        };
      },
    },
  });

  const first = await service.fetchRealisasi();
  const second = await service.fetchRealisasi();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/Anggaran/Realisasi/getData");
  assert.equal(calls[0].formData.draw, 1);
  assert.equal(calls[0].formData.length, -1);
  assert.equal(calls[0].options.referer, "/Anggaran/Realisasi");
  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(second.items[0].realisasiPct, 25);
});
