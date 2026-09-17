// ⚠️ O `[^/]` não é enfeite: sem ele, `//host-qualquer/audio.mp3` passa como se fosse
// caminho local e o player carrega áudio de terceiro, pelo protocolo da página.
const AUDIO = /^(https:\/\/|\/[^/])/

/**
 * O endereço do áudio da instrução: `https://` ou um caminho do próprio site.
 *
 * ⚠️ EXPORTADA para o editor do admin fazer a mesma pergunta em vez de copiar o regex. O editor
 * antes derivava "áudio inválido" de `!isSceneActivity(...)`, que também é falso por roteiro
 * inválido e por impulso fora de faixa — e a tela acusava um `https://` perfeito.
 *
 * ⚠️ Mora em módulo PRÓPRIO (e não no `index.ts`) só para o `voz.ts` poder usá-la sem fechar
 * ciclo de import: o `index.ts` importa o `voz.ts`.
 */
export function isSceneAudioUrl(value: unknown): boolean {
  if (value === undefined) return true
  return typeof value === 'string' && value.length <= 4000 && AUDIO.test(value)
}
