import { describe, expect, test } from 'bun:test'
import { linhasVisiveis, listarFontes, varrerCopy } from './helpers/copy-scan'

/**
 * A voz da casa é humana e **sem travessão** (—): ele é marca registrada de texto de IA, e
 * a plataforma fala com criança. A regra já existia, mas foi violada em ~20 lugares porque
 * ninguém a verificava — cada componente novo trazia mais um.
 *
 * Este teste é o freio. Ele lê o código, DESCARTA os comentários (esses são nossos, e podem
 * ter travessão à vontade) e falha se sobrar um travessão no que o usuário lê: texto JSX,
 * string de copy, `aria-label` (o leitor de tela fala) e `<title>` (a aba mostra).
 *
 * Deu falso positivo? Trocar por vírgula, ponto ou "que" resolve em um minuto — e é
 * exatamente a reescrita que a regra pede.
 */

const comTravessao = (texto: string) => texto.includes('—')

describe('copy do aluno: sem travessão', () => {
  test('nenhum travessão fora de comentário em src/', () => {
    // ⚠️ Sem isto o teste passaria VAZIO se o caminho quebrasse (pasta renomeada, `src/`
    // movido) — um guarda que não lê nada aprova tudo, e em silêncio.
    expect(listarFontes().length).toBeGreaterThan(100)

    expect(varrerCopy(comTravessao)).toEqual([])
  })

  test('o detector realmente pega copy e realmente ignora comentário', () => {
    // Sem estes dois casos o teste acima passaria mesmo com o detector quebrado.
    const achar = (fonte: string) => linhasVisiveis(fonte).filter((l) => comTravessao(l.texto))
    expect(achar('const a = "oi — tudo bem"')).toHaveLength(1)
    expect(achar('// comentário — com travessão')).toEqual([])
    expect(achar('/* bloco — com travessão */')).toEqual([])
    expect(achar('{/* JSX\n   multi — linha */}')).toEqual([])
    expect(achar('const url = "https://x.com" // nota\nconst b = "a — b"')).toHaveLength(1)
  })
})
