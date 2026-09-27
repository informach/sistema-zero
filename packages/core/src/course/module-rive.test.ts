import { describe, expect, test } from 'bun:test'
import { moduleRiveSrc } from './module-rive'

/**
 * Última barreira antes do runtime do Rive. O DTO do members já recusa o que não
 * for `.riv` http(s), então isto é defesa em profundidade — o que importa é que
 * um valor estranho no banco vire `null` (nenhuma arte) em vez de chegar ao
 * runtime, que falharia CALADO com um canvas vazio.
 */
describe('moduleRiveSrc', () => {
  test('devolve a URL de um .riv público', () => {
    // ⚠️ A chave é SEMPRE minúscula (o Admin a monta: `<uuid>.riv`), e o padrão do
    // DTO no members é sensível a maiúsculas. Este filtro tolera `.RIV` — tolerar
    // a mais no lado que só DESCARTA é inócuo —, mas não existe caminho que
    // produza um; não trate isso como capacidade.
    const url = 'https://cdn.exemplo.test/admin/module-rive/8f2c.riv'
    expect(moduleRiveSrc(url)).toBe(url)
    expect(moduleRiveSrc('http://localhost:9000/admin/module-rive/x.riv')).toBe(
      'http://localhost:9000/admin/module-rive/x.riv',
    )
  })

  test.each([
    ['vazio', ''],
    ['nulo', null],
    ['indefinido', undefined],
    // Sobras da era do SVG animado: chaves de arte e URLs `.svg`.
    ['chave de preset antiga', 'desafio-nave'],
    ['SVG legado', 'https://cdn.exemplo.test/admin/module-illustrations/nave.svg'],
    ['caminho relativo', '/trilha/nave.riv'],
    ['esquema executável', 'javascript:alert(1)'],
    ['data URL', 'data:application/octet-stream;base64,UklWRQ=='],
    ['extensão só no meio', 'https://cdn.exemplo.test/nave.riv.png'],
  ])('descarta %s', (_nome, valor) => {
    expect(moduleRiveSrc(valor)).toBeNull()
  })

  test('a query não engana a checagem de extensão', () => {
    // A extensão é lida do PATHNAME: `?x=.riv` não transforma um .png em animação.
    expect(moduleRiveSrc('https://cdn.exemplo.test/nave.png?v=.riv')).toBeNull()
  })
})
