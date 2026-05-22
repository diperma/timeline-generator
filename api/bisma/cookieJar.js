function createCookieJar() {
  const cookies = new Map();

  function mergeSetCookie(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const header of list) {
      if (!header) continue;
      const firstPart = String(header).split(";")[0];
      const eqIndex = firstPart.indexOf("=");
      if (eqIndex <= 0) continue;
      const name = firstPart.slice(0, eqIndex).trim();
      const value = firstPart.slice(eqIndex + 1).trim();
      if (value === "" || /deleted/i.test(value)) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    }
  }

  function getCookieHeader() {
    return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  function clear() {
    cookies.clear();
  }

  function hasCookies() {
    return cookies.size > 0;
  }

  function snapshot() {
    return {
      count: cookies.size,
      names: [...cookies.keys()],
    };
  }

  return {
    mergeSetCookie,
    getCookieHeader,
    clear,
    hasCookies,
    snapshot,
  };
}

module.exports = {
  createCookieJar,
};
