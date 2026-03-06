export const STORE_DAY_LIMIT = 3;

export function dayKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

export function buildStoreDayKey(storeId, saleDate) {
  return `${storeId}__${dayKey(saleDate)}`;
}

export function validateSingleStore(rows) {
  const storeIds = [...new Set(rows.map((row) => row.storeId))];
  if (storeIds.length > 1) {
    return { ok: false, message: '複数店舗の商品を同時購入できません。' };
  }
  return { ok: true };
}

export function validateStoreDayLimit(rows) {
  const singleStore = validateSingleStore(rows);
  if (!singleStore.ok) {
    return singleStore;
  }

  const bucket = new Map();
  for (const row of rows) {
    const key = buildStoreDayKey(row.storeId, row.saleDate);
    const current = bucket.get(key) || 0;
    const next = current + row.quantity;

    if (next > STORE_DAY_LIMIT) {
      return {
        ok: false,
        message: `同一店舗・同一日の購入上限は${STORE_DAY_LIMIT}個です。`
      };
    }

    bucket.set(key, next);
  }

  return { ok: true };
}
