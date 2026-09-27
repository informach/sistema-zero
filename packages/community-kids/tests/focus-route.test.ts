import { describe, expect, test } from 'bun:test'
import { isEmbeddedAppPath } from '../src/lib/embedded-app-path'
import { FOCUS_ONLY_PREFIXES, isFocusOnlyPath, isFocusRoutePath } from '../src/lib/focus-route'

describe('isFocusRoutePath', () => {
  test('soma a aula, os apps embarcados e as telas de foco de altura livre', () => {
    expect(isFocusRoutePath('/cursos/corre-dino/aulas/abc123')).toBe(true)
    expect(isFocusRoutePath('/estudio')).toBe(true)
    expect(isFocusRoutePath('/molda')).toBe(true)
    expect(isFocusRoutePath('/meu-avatar')).toBe(true)
    expect(isFocusRoutePath('/quarto')).toBe(true)
  })

  test('as demais rotas seguem com o menu aberto', () => {
    expect(isFocusRoutePath('/')).toBe(false)
    expect(isFocusRoutePath('/criar')).toBe(false)
    expect(isFocusRoutePath('/perfil')).toBe(false)
    expect(isFocusRoutePath('/cursos')).toBe(false)
  })

  test('tolera null/undefined/vazio', () => {
    expect(isFocusRoutePath(null)).toBe(false)
    expect(isFocusRoutePath(undefined)).toBe(false)
    expect(isFocusRoutePath('')).toBe(false)
  })
})

describe('isFocusOnlyPath', () => {
  test('⚠️ o Quarto recolhe o menu mas NÃO trava a altura', () => {
    // É o invariante inteiro deste arquivo. O regime dos apps embarcados usa
    // `h-dvh + overflow-hidden`, e as bandejas de móveis do Quarto ROLAM: pôr `/quarto` naquela
    // lista cortaria o conteúdo sem nenhum caminho de rolagem.
    expect(isFocusOnlyPath('/quarto')).toBe(true)
    expect(isEmbeddedAppPath('/quarto')).toBe(false)
  })

  test('as telas que travam a altura não são foco-só (senão a régua se sobreporia)', () => {
    for (const rota of ['/estudio', '/pensa', '/pinta', '/molda', '/meu-avatar'])
      expect(isFocusOnlyPath(rota)).toBe(false)
  })

  test('compara o segmento inteiro, como o irmão embarcado', () => {
    expect(isFocusOnlyPath('/quarto/qualquer')).toBe(true)
    expect(isFocusOnlyPath('/quartinho')).toBe(false)
  })

  test('a lista é a fonte única', () => {
    expect([...FOCUS_ONLY_PREFIXES]).toEqual(['/quarto'])
  })
})
