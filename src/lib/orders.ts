const ORDER_IDS_KEY = 'nkay_order_ids';
const MAX_REMEMBERED = 30;

export function rememberOrderId(orderId: string): void {
  if (!orderId) return;
  try {
    const existing = getRememberedOrderIds();
    const next = [orderId, ...existing.filter((id) => id !== orderId)].slice(0, MAX_REMEMBERED);
    localStorage.setItem(ORDER_IDS_KEY, JSON.stringify(next));
  } catch {
    // localStorage can be unavailable in private mode; order links still work.
  }
}

export function getRememberedOrderIds(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
