const assert = require("node:assert/strict");
const test = require("node:test");

const { getPublicConfig, requireCredentials } = require("./config");

test("getPublicConfig exposes presence flags but not secrets", () => {
  const publicConfig = getPublicConfig({
    baseUrl: "https://bisma.bpkp.go.id",
    username: "alice",
    password: "secret",
    year: "2026",
    cacheTtlMs: 900000,
    detailConcurrency: 4,
    debugHtml: false,
  });

  assert.equal(publicConfig.hasUsername, true);
  assert.equal(publicConfig.hasPassword, true);
  assert.equal(Object.hasOwn(publicConfig, "username"), false);
  assert.equal(Object.hasOwn(publicConfig, "password"), false);
});

test("requireCredentials fails before login when credentials are absent", () => {
  assert.throws(
    () => requireCredentials({ username: "", password: "" }),
    /BISMA_USERNAME and BISMA_PASSWORD/,
  );
});
