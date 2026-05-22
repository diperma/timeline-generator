import type { SyncResponse, TimelinePayload } from "@/types/bisma";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const TIMELINE_DATA_URL = (import.meta.env.VITE_TIMELINE_DATA_URL || "").trim();

export const isStaticTimelineMode = Boolean(TIMELINE_DATA_URL);

export async function fetchTimeline(): Promise<TimelinePayload> {
  if (TIMELINE_DATA_URL) {
    return requestJson<TimelinePayload>(withCacheBust(TIMELINE_DATA_URL));
  }
  return requestJson<TimelinePayload>("/api/bisma/timeline");
}

export async function syncTimeline(): Promise<TimelinePayload> {
  if (TIMELINE_DATA_URL) {
    return fetchTimeline();
  }
  await requestJson<SyncResponse>("/api/bisma/sync", { method: "POST" });
  return fetchTimeline();
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const requestUrl = isAbsoluteUrl(url) ? url : `${API_BASE_URL}${url}`;
  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    ...init,
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : `Request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function withCacheBust(value: string) {
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}v=${Date.now()}`;
}
