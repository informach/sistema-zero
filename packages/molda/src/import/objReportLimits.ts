/** Text counts UTF-16 units in keys/string values, not JSON bytes or peak memory. */
export const OBJ_CONVERSION_REPORT_LIMITS = {
  issues: 65_536,
  pathChars: 8_320,
  textChars: 4 * 1024 * 1024,
} as const
