/**
 * Preferência de brilho de leitura do e-book — persistida no navegador (por
 * dispositivo, não por conta: é conforto visual local, como volume de player).
 * `parseBrightness` é puro (testado em tests/ebook-prefs.test.ts); load/save
 * são wrappers finos de localStorage com try/catch (private mode/storage cheio
 * não podem quebrar o leitor).
 */

export const BRIGHTNESS_KEY = 'sz:ebook:brightness'
export const BRIGHTNESS_MIN = 0.5
export const BRIGHTNESS_MAX = 1
export const BRIGHTNESS_DEFAULT = 1

/** Parse + clamp do valor salvo — ausente/lixo cai no padrão (brilho total). */
export function parseBrightness(raw: string | null): number {
  if (raw === null) return BRIGHTNESS_DEFAULT
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) return BRIGHTNESS_DEFAULT
  return Math.min(BRIGHTNESS_MAX, Math.max(BRIGHTNESS_MIN, value))
}

export function loadBrightness(): number {
  try {
    return parseBrightness(window.localStorage.getItem(BRIGHTNESS_KEY))
  } catch {
    return BRIGHTNESS_DEFAULT
  }
}

export function saveBrightness(value: number): void {
  try {
    window.localStorage.setItem(BRIGHTNESS_KEY, String(value))
  } catch {
    // best-effort — sem storage a preferência só não sobrevive ao reload
  }
}
