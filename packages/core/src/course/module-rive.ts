/**
 * Animação Rive (.riv) da unidade na trilha Kids, escolhida por módulo no Admin.
 *
 * Substituiu o SVG animado em 09/2026. O Admin confere a assinatura `RIVE` nos
 * bytes e publica no R2 público; o que trafega daqui para baixo é só a URL.
 */

/**
 * Defesa em profundidade na borda do render: devolve a URL só quando ela é
 * http(s) E termina em `.riv`.
 *
 * ⚠️ O DTO do members já recusa qualquer coisa fora de `^https?://`, então isto
 * não é o portão — é o que garante que um valor estranho no banco (uma chave de
 * arte antiga, um `.svg` legado de antes da migração 0095) vire `null` em vez de
 * chegar ao runtime do Rive, que falharia CALADO. A extensão importa: o runtime
 * lê o arquivo por `fetch().arrayBuffer()` e um não-`.riv` só produz um canvas
 * vazio, indistinguível de "ninguém subiu nada".
 */
export function moduleRiveSrc(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.pathname.toLowerCase().endsWith('.riv') ? url.href : null
  } catch {
    return null
  }
}
