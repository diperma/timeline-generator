const { encryptField } = require("./encryption");
const { createCookieJar } = require("./cookieJar");
const { requireCredentials } = require("./config");

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
    const loginPage = await rawRequest(config.baseUrl + "/", {
      method: "GET",
      headers: baseHeaders(),
    });
    const html = await loginPage.text();
    mergeCookies(loginPage);

    const enckey = extractEnckey(html);
    if (!enckey) {
      throw stageError("login", "Could not find BISMA enckey on login page", 502);
    }

    const form = new URLSearchParams();
    form.set("enckey", enckey);
    form.set("username", encryptField(config.username, enckey));
    form.set("password", encryptField(config.password, enckey));
    form.set("thang", encryptField(config.year, enckey));

    const response = await rawRequest(config.baseUrl + "/Auth/Auth/act_auth", {
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
      const redirectResponse = await rawRequest(redirectUrl, {
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

    const response = await rawRequest(url, { method, headers, body });
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

async function rawRequest(url, options) {
  return fetch(url, {
    ...options,
    redirect: "manual",
  });
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
