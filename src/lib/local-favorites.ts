// Local favorites for guests (not signed in). Synced via custom event.
const KEY = "favorites";

export function getLocalFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function toggleLocalFavorite(placeId: string): boolean {
  const cur = getLocalFavorites();
  const idx = cur.indexOf(placeId);
  let next: string[];
  let added: boolean;
  if (idx >= 0) {
    next = cur.filter((id) => id !== placeId);
    added = false;
  } else {
    next = [...cur, placeId];
    added = true;
  }
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("favorites-changed"));
  return added;
}

export function isLocalFavorite(placeId: string): boolean {
  return getLocalFavorites().includes(placeId);
}
