const { encryptField } = require("./encryption");
const { createCookieJar } = require("./cookieJar");
const { requireCredentials } = require("./config");
const https = require("node:https");

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

function createBismaClient(config) {
  const cookieJar = createCookieJar();
  let lastLoginAt = null;
  let loginPromise = null;

  async function ensureSession() {
    requireCredentials(config);
    if (cookieJar.hasCookies() && lastLoginAt) return;
    if (!loginPromise) {
      loginPromise = login().finally(() => {
        loginPromise = null;
      });
    }
    await loginPromise;
  }

  async function login() {
    cookieJar.clear();
    const { response: loginPage, html } = await fetchLoginPage();

    const enckey = extractEnckey(html);
    if (!enckey) {
      throw stageError(
        "login",
        `Could not find BISMA enckey on login page (${describeLoginResponse(loginPage, html)})`,
        502,
      );
    }

    const form = new URLSearchParams();
    form.set("enckey", enckey);
    form.set("username", encryptField(config.username, enckey));
    form.set("password", encryptField(config.password, enckey));
    form.set("thang", encryptField(config.year, enckey));

    const response = await rawRequest(config, config.baseUrl + "/Auth/Auth/act_auth", {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Origin: config.baseUrl,
        Referer: config.baseUrl + "/",
        Cookie: cookieJar.getCookieHeader(),
      },
      body: form.toString(),
    });
    mergeCookies(response);

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (_error) {
      throw stageError("login", "BISMA login response was not JSON", 502);
    }

    if (result.status !== "success") {
      throw stageError("login", `BISMA login failed: ${result.msg || "unknown error"}`, 401);
    }

    if (result.redirect_url) {
      const redirectUrl = absoluteUrl(result.redirect_url, config.baseUrl);
      const redirectResponse = await rawRequest(config, redirectUrl, {
        method: "GET",
        headers: {
          ...baseHeaders(),
          Referer: config.baseUrl + "/",
          Cookie: cookieJar.getCookieHeader(),
        },
      });
      mergeCookies(redirectResponse);
      await redirectResponse.arrayBuffer();
    }

    lastLoginAt = new Date();
    console.log(`BISMA login success for year ${config.year}`);
  }

  async function fetchLoginPage() {
    let url = config.baseUrl + "/";
    let response;
    let html = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await rawRequest(config, url, {
        method: "GET",
        headers: baseHeaders(),
      });
      mergeCookies(response);

      const location = response.headers.get("location");
      if ([301, 302, 303, 307, 308].includes(response.status) && location) {
        url = absoluteUrl(location, config.baseUrl);
        continue;
      }

      html = await response.text();
      break;
    }

    return { response, html };
  }

  async function bismaGet(pathOrUrl, options = {}) {
    return authenticatedRequest("GET", pathOrUrl, null, options);
  }

  async function bismaPost(pathOrUrl, formData = {}, options = {}) {
    return authenticatedRequest("POST", pathOrUrl, formData, options);
  }

  async function authenticatedRequest(method, pathOrUrl, formData, options, retried = false) {
    await ensureSession();
    const url = absoluteUrl(pathOrUrl, config.baseUrl);
    const headers = {
      ...baseHeaders(),
      Referer: absoluteUrl(options.referer || "/Main/Home", config.baseUrl),
      Cookie: cookieJar.getCookieHeader(),
    };

    let body;
    if (method === "POST") {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(formData || {})) {
        if (value !== undefined && value !== null) params.set(key, String(value));
      }
      body = params.toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      headers["X-Requested-With"] = "XMLHttpRequest";
      headers.Origin = config.baseUrl;
    }

    const response = await rawRequest(config, url, { method, headers, body });
    mergeCookies(response);
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!retried && isLikelyLoginPage(text, response.url)) {
      cookieJar.clear();
      lastLoginAt = null;
      await ensureSession();
      return authenticatedRequest(method, pathOrUrl, formData, options, true);
    }

    if (!response.ok) {
      throw stageError(options.stage || "bisma-request", `BISMA request failed with HTTP ${response.status}`, 502);
    }

    return {
      url: response.url,
      status: response.status,
      contentType,
      text,
      json() {
        return JSON.parse(text);
      },
    };
  }

  function logout() {
    cookieJar.clear();
    lastLoginAt = null;
  }

  function getSessionStatus() {
    const cookieSnapshot = cookieJar.snapshot();
    return {
      authenticated: cookieJar.hasCookies() && Boolean(lastLoginAt),
      lastLoginAt: lastLoginAt ? lastLoginAt.toISOString() : null,
      cookieCount: cookieSnapshot.count,
    };
  }

  function mergeCookies(response) {
    if (typeof response.headers.getSetCookie === "function") {
      cookieJar.mergeSetCookie(response.headers.getSetCookie());
      return;
    }
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookieJar.mergeSetCookie(splitCombinedSetCookie(setCookie));
  }

  return {
    ensureSession,
    bismaGet,
    bismaPost,
    getSessionStatus,
    logout,
  };
}

function describeLoginResponse(response, html) {
  const titleMatch = String(html || "").match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? normalizeSpace(titleMatch[1]).slice(0, 80) : "none";
  const contentType = response?.headers?.get("content-type") || "unknown";
  return [
    `status=${response?.status || "unknown"}`,
    `url=${response?.url || "unknown"}`,
    `contentType=${contentType}`,
    `bytes=${Buffer.byteLength(String(html || ""), "utf8")}`,
    `title=${title}`,
  ].join(", ");
}

function normalizeSpace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function rawRequest(config, url, options) {
  if (config.connectHost) return rawRequestViaConnectHost(config, url, options);
  return fetch(url, {
    ...options,
    redirect: "manual",
  });
}

async function rawRequestViaConnectHost(config, url, options = {}) {
  const target = new URL(url);
  const base = new URL(config.baseUrl);
  if (target.protocol !== "https:" || target.hostname !== base.hostname) {
    return fetch(url, {
      ...options,
      redirect: "manual",
    });
  }

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: config.connectHost,
        port: target.port || 443,
        servername: target.hostname,
        path: `${target.pathname}${target.search}`,
        method: options.method || "GET",
        headers: {
          ...(options.headers || {}),
          Host: target.host,
        },
        timeout: 30000,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          const body = Buffer.concat(chunks);
          resolve(createResponseLike({
            body,
            headers: response.headers,
            setCookieHeaders: response.headers["set-cookie"] || [],
            status: response.statusCode || 0,
            url,
          }));
        });
      },
    );

    request.on("timeout", () => request.destroy(new Error("BISMA request timed out")));
    request.on("error", reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

function createResponseLike({ body, headers, setCookieHeaders, status, url }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        const value = headers[key];
        if (Array.isArray(value)) return value.join(", ");
        return value || null;
      },
      getSetCookie() {
        return setCookieHeaders;
      },
    },
    async text() {
      return body.toString("utf8");
    },
    async arrayBuffer() {
      return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
    },
  };
}

function extractEnckey(html) {
  const match = html.match(/name=["']enckey["'][^>]*value=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function isLikelyLoginPage(html, responseUrl) {
  return (
    /Auth\/Auth\/act_auth/.test(html) ||
    /name=["']enckey["']/.test(html) ||
    /\/Auth\/Auth\/logout/.test(responseUrl || "")
  );
}

function baseHeaders() {
  return {
    "User-Agent": DEFAULT_UA,
    Accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
  };
}

function absoluteUrl(pathOrUrl, baseUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return baseUrl + "/" + String(pathOrUrl).replace(/^\/+/, "");
}

function stageError(stage, message, statusCode) {
  const error = new Error(message);
  error.stage = stage;
  error.statusCode = statusCode;
  return error;
}

function splitCombinedSetCookie(header) {
  return String(header).split(/,(?=\s*[^;,]+=)/g);
}

module.exports = {
  createBismaClient,
  extractEnckey,
  isLikelyLoginPage,
};
