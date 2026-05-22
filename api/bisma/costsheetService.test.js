const assert = require("node:assert/strict");
const test = require("node:test");

const { createCostsheetService } = require("./costsheetService");

const config = {
  baseUrl: "https://bisma.bpkp.go.id",
  year: "2026",
  cacheTtlMs: 900000,
  detailConcurrency: 2,
};

test("fetchCostsheetList posts trigger=All and caches parsed rows", async () => {
  const calls = [];
  const client = {
    async bismaPost(path, formData, options) {
      calls.push({ path, formData, options });
      return {
        json() {
          return {
            data: [
              [
                "1",
                1,
                "<span>1</span>",
                "209611-1<br>melaksanakan Quality Assurance",
                "DIPA: D3",
                "Rp 100.000",
                "Created By<br>",
                "",
                '<a href="/Transaksi/Apisima/Getcostsheetdetail/209611-1/Detail/PKPT/240848/cs">Detail</a>',
              ],
            ],
          };
        },
      };
    },
  };
  const service = createCostsheetService({ config, client });

  const first = await service.fetchCostsheetList();
  const second = await service.fetchCostsheetList();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/Transaksi/Apisima/Getcostsheet_ajax");
  assert.deepEqual(calls[0].formData, { trigger: "All" });
  assert.equal(first.count, 1);
  assert.equal(second.cacheHit, true);
});

test("fetchTimelineData returns partial results when detail fetch fails", async () => {
  const client = {
    async bismaPost() {
      return {
        json() {
          return {
            data: [
              [
                "1",
                1,
                "<span>1</span>",
                "209611-1<br>good row",
                "DIPA: D3",
                "Rp 100.000",
                "",
                "",
                '<a href="/Transaksi/Apisima/Getcostsheetdetail/209611-1/Detail/PKPT/240848/cs">Detail</a>',
              ],
              [
                "2",
                2,
                "<span>1</span>",
                "209612-1<br>bad row",
                "DIPA: D3",
                "Rp 100.000",
                "",
                "",
                '<a href="/Transaksi/Apisima/Getcostsheetdetail/209612-1/Detail/PKPT/240849/cs">Detail</a>',
              ],
            ],
          };
        },
      };
    },
    async bismaGet(url) {
      if (url.includes("209612-1")) {
        const error = new Error("detail unavailable");
        error.stage = "detail-fetch";
        throw error;
      }
      return {
        text: `
          <input id="id_cs" value="209611-1">
          <input id="id_st" value="209611">
          <input id="nost" value="ST-1">
          <textarea id="uraianst">good row</textarea>
          <input id="tglst_mulai" value="2026-05-21">
          <input id="tglst_selesai" value="2026-05-26">
          <table id="tbUser">
            <tr id="tb-tim1" class="tb-tim">
              <td>
                <input id="nama1" value="Willy Hutabarat">
                <input id="nip1" value="198610102014021001">
                <input id="perjab1" value="Auditor Ahli Muda">
                <input id="gol1" value="III/c">
                <input id="tglberangkat1" value="2026-05-21">
                <input id="tglkembali1" value="2026-05-26">
                <input id="jmlharidum1" value="0;3">
                <input name="is_aktif1" value="0">
                <input name="is_aktif1" value="1">
              </td>
            </tr>
          </table>
        `,
      };
    },
  };
  const service = createCostsheetService({ config, client });

  const timeline = await service.fetchTimelineData();

  assert.equal(timeline.listCount, 2);
  assert.equal(timeline.detailParsed, 1);
  assert.equal(timeline.detailFailed, 1);
  assert.equal(timeline.assignments.length, 1);
  assert.equal(timeline.assignments[0].members[0].hp, 3);
  assert.equal(timeline.warnings.length, 1);
  assert.equal(timeline.warnings[0].costsheetId, "209612-1");
});
