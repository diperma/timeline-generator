import type { SyncResponse, TimelinePayload } from "@/types/bisma";

export async function fetchTimeline(): Promise<TimelinePayload> {
  return requestJson<TimelinePayload>("/api/bisma/timeline");
}

export async function syncTimeline(): Promise<TimelinePayload> {
  await requestJson<SyncResponse>("/api/bisma/sync", { method: "POST" });
  return fetchTimeline();
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
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
