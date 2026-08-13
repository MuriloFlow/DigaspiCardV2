"use client";

const eventName = "records:changed";
const channelName = "records-realtime";

function notifyWindow() {
  window.dispatchEvent(new Event(eventName));
}

export function notifyRecordsChanged() {
  if (typeof window === "undefined") return;

  notifyWindow();

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage({ type: eventName, at: Date.now() });
    channel.close();
  }

  try {
    localStorage.setItem("@muriloflow:recordsChangedAt", String(Date.now()));
  } catch {
    // Some browser modes can block localStorage. Same-window dispatch still works.
  }
}

export function subscribeToLocalRecordChanges(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleWindow = () => callback();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === "@muriloflow:recordsChangedAt") callback();
  };

  window.addEventListener(eventName, handleWindow);
  window.addEventListener("storage", handleStorage);

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(channelName);
    channel.onmessage = (event) => {
      if (event.data?.type === eventName) callback();
    };
  }

  return () => {
    window.removeEventListener(eventName, handleWindow);
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}
