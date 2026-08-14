import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

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

const SRC = join(import.meta.dir, '..', 'src')

/**
 * Arquivos que NÃO falam com o usuário. `instrumentation.ts` só monta mensagem de erro de
 * BOOT, lida por quem opera o deploy no log do Railway.
 */
const FORA = new Set(['instrumentation.ts'])

function listarFontes(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      listarFontes(full, out)
      continue
    }
    if (!/\.tsx?$/.test(entry) || FORA.has(entry)) continue
    out.push(full)
  }
  return out
}

/**
 * Tira comentários linha a linha, guardando o estado de bloco aberto (os comentários JSX
 * `{/* … *\/}` deste código são multi-linha). ⚠️ `//` só conta como comentário quando NÃO
 * vem logo depois de `:` — senão `https://…` cortaria o resto da linha e esconderia um
 * travessão de verdade depois dele.
 */
function semComentarios(fonte: string): { linha: number; texto: string }[] {
  const saida: { linha: number; texto: string }[] = []
  let emBloco = false
  fonte.split('\n').forEach((original, i) => {
    let linha = original
    let limpa = ''
    while (linha.length > 0) {
      if (emBloco) {
        const fim = linha.indexOf('*/')
        if (fim === -1) return
        linha = linha.slice(fim + 2)
        emBloco = false
        continue
      }
      const abre = linha.indexOf('/*')
      const inline = linha.search(/(?<!:)\/\//)
      if (abre !== -1 && (inline === -1 || abre < inline)) {
        limpa += linha.slice(0, abre)
        linha = linha.slice(abre + 2)
        emBloco = true
        continue
      }
      if (inline !== -1) {
        limpa += linha.slice(0, inline)
        break
      }
      limpa += linha
      break
    }
    if (limpa.includes('—')) saida.push({ linha: i + 1, texto: limpa.trim() })
  })
  return saida
}

describe('copy do aluno: sem travessão', () => {
  test('nenhum travessão fora de comentário em src/', () => {
    const arquivos = listarFontes(SRC)
    // ⚠️ Sem isto o teste passaria VAZIO se o caminho quebrasse (pasta renomeada, `src/`
    // movido) — um guarda que não lê nada aprova tudo, e em silêncio.
    expect(arquivos.length).toBeGreaterThan(100)

    const achados: string[] = []
    for (const arquivo of arquivos) {
      for (const { linha, texto } of semComentarios(readFileSync(arquivo, 'utf8'))) {
        achados.push(`${arquivo.slice(arquivo.indexOf('src'))}:${linha} → ${texto.slice(0, 90)}`)
      }
    }
    expect(achados).toEqual([])
  })

  test('o detector realmente pega copy e realmente ignora comentário', () => {
    // Sem estes dois casos o teste acima passaria mesmo com o detector quebrado.
    expect(semComentarios('const a = "oi — tudo bem"')).toHaveLength(1)
    expect(semComentarios('// comentário — com travessão')).toEqual([])
    expect(semComentarios('/* bloco — com travessão */')).toEqual([])
    expect(semComentarios('{/* JSX\n   multi — linha */}')).toEqual([])
    expect(semComentarios('const url = "https://x.com" // nota\nconst b = "a — b"')).toHaveLength(1)
  })
})
