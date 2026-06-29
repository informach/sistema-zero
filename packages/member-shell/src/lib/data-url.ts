/**
 * Converte um data URL base64 (`data:<mime>;base64,<…>`) em `Blob` SEM usar `fetch`.
 *
 * ⚠️ `fetch('data:…')` é BLOQUEADO pela CSP dos apps (`connect-src 'self' https:`
 * NÃO inclui `data:`) — o navegador recusa com "Failed to fetch". Por isso a capa
 * do "Compartilhar" (print/upload em data URL) é convertida manualmente via `atob`,
 * que não passa por `connect-src`. Espera base64 (toDataURL/`FileReader` sempre são).
 */
export function dataUrlBase64ToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const head = comma >= 0 ? dataUrl.slice(0, comma) : ''
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : ''
  const mime = /^data:([^;,]+)/.exec(head)?.[1] ?? 'image/png'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
