/**
 * BigInt(volume)는 JSON.stringify가 처리하지 못하므로, API 응답 직전에
 * BigInt를 number로 변환한다. 거래량은 Number.MAX_SAFE_INTEGER(약 9천조)
 * 이내이므로 정밀도 손실이 없다.
 */
export function jsonSafe<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}
