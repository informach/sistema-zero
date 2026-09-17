import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createElement } from 'react'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { cleanup } = await import('@testing-library/react')
const { afterEach } = await import('bun:test')
afterEach(cleanup)

/**
 * ⚠️⚠️ Os globais do NAVEGADOR voltam ao original depois de cada teste (full review de 16/09/2026).
 *
 * O bun roda todos os arquivos no mesmo processo e não isola `window`: um falso esquecido vaza para o
 * resto da suíte, e o defeito aparece em outro arquivo, conforme a ORDEM (que muda entre Windows, Linux e
 * `--randomize`). Aconteceu duas vezes: o `matchMedia` do `focus-mode.test.tsx` respondia `true` a
 * `prefers-reduced-motion` e o player de cena de todo arquivo seguinte rodava com "menos movimento"; e o
 * `requestAnimationFrame` falso de um `describe` do `lesson-scene-design` virava o "original" guardado pelo
 * arquivo seguinte. Quem troca um destes globais continua restaurando no próprio arquivo (é o que deixa o
 * arquivo certo sozinho); esta rede pega o que escapar. Os originais são lidos AQUI, no preload, antes de
 * qualquer arquivo de teste. ⚠️ Global que não existia (a voz do navegador, a medida própria do
 * `HTMLElement`) é APAGADO, e não posto em `undefined`: `'speechSynthesis' in window` continuaria `true`.
 */
const GLOBAIS_DA_JANELA = [
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
  'speechSynthesis',
  'SpeechSynthesisUtterance',
  'IntersectionObserver',
] as const
const MEDIDAS = [HTMLElement.prototype, Element.prototype] as const
const originaisDaJanela = GLOBAIS_DA_JANELA.map(
  (nome) => [nome, Object.getOwnPropertyDescriptor(window, nome)] as const,
)
const originaisDaMedida = MEDIDAS.map(
  (proto) => [proto, Object.getOwnPropertyDescriptor(proto, 'getBoundingClientRect')] as const,
)
function restaurar(
  alvo: object,
  nome: PropertyKey,
  original: PropertyDescriptor | undefined,
): void {
  const atual = Object.getOwnPropertyDescriptor(alvo, nome)
  if (original) {
    if (atual?.value !== original.value || atual?.get !== original.get)
      Object.defineProperty(alvo, nome, original)
  } else if (atual) Reflect.deleteProperty(alvo, nome)
}
afterEach(() => {
  for (const [nome, original] of originaisDaJanela) restaurar(window, nome, original)
  for (const [proto, original] of originaisDaMedida)
    restaurar(proto, 'getBoundingClientRect', original)
  // O palpite e o rascunho de uma cena guardados por um teste não podem abrir a cena do seguinte.
  localStorage.clear()
  sessionStorage.clear()
})

/**
 * O mascote Zappy animado (Rive) fora dos testes: o `dynamic(ssr:false)` resolve
 * mesmo no happy-dom, o runtime tenta buscar `/rive/rive.wasm` — que nenhum servidor
 * serve aqui — e cada suíte que monta uma celebração cospe
 * `Aborted(both async and sync fetching of the wasm failed)`. Nada QUEBRA (é
 * exatamente o caminho de falha que devolve o WebP, e ver isso funcionando foi
 * tranquilizador), mas é ruído por cima de toda saída e trabalho jogado fora.
 *
 * ⚠️ O que fica de fora é só o CANVAS. O `KidsMascotAnimated` — fallback, `key` por
 * pose, régua evento × estado — segue sendo exercitado de verdade em
 * `tests/mascot-rive.test.tsx`; o que não dá para testar daqui é o desenho, que
 * precisa de WebGL e mora no e2e.
 */
const { mock } = await import('bun:test')
/**
 * ⚠️ O falso EMITE o `data-tocando`: é como o teste vê o regime que o canvas recebeu (parado,
 * tocando, ou solto como sempre) sem WebGL nenhum. Ele é um `<span>` vazio e decorativo — quem
 * conta nós ou `aria-hidden` no balão olha o caso ADULTO, que não tem mascote.
 *
 * ⚠️⚠️ Ele NÃO chama `onPronto` sozinho — guarda a função em `zappyRiveDesenhou`. Chamar na
 * montagem tiraria o WebP de baixo em TODA suíte (e os testes que provam "a primeira pintura é
 * sempre o WebP" passariam a medir outra coisa); deixá-la ao alcance de quem precisa é o que
 * permite testar o que acontece DEPOIS de o Rive desenhar — por exemplo, se a remontagem do
 * canvas devolve o WebP enquanto o novo carrega.
 */
mock.module('./src/components/kids/mascot-rive-canvas', () => ({
  MascotRiveCanvas: ({ tocando, onPronto }: { tocando?: boolean; onPronto: () => void }) => {
    ;(globalThis as Record<string, unknown>).zappyRiveDesenhou = onPronto
    return createElement('span', { 'data-tocando': String(tocando), 'aria-hidden': 'true' })
  },
  aquecerRuntimeRive: () => {},
}))
