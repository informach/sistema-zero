import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = join(import.meta.dir, '..')

/**
 * O código de um arquivo, sem comentários.
 *
 * ⚠️ Sem isto a varredura acusa quem está CERTO: os comentários deste módulo explicam
 * justamente por que `Math.random` saiu, e citar o nome do que se proíbe é o jeito de a próxima
 * pessoa entender a regra. Aviso que reprova quem está certo ensina a ignorar avisos.
 */
function semComentarios(fonte: string) {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** Todo arquivo do módulo, menos os testes — a varredura é derivada, não uma lista à mão. */
function arquivosDaArte(dir = RAIZ): string[] {
  const saida: string[] = []
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === '__tests__') continue
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) saida.push(...arquivosDaArte(caminho))
    else if (entrada.name.endsWith('.ts')) saida.push(caminho)
  }
  return saida
}

describe('o subpath @sistemazero/studio/arte é LEVE e server-safe', () => {
  const arquivos = arquivosDaArte()

  it('a varredura encontra os arquivos (anti-vácuo)', () => {
    expect(arquivos.length).toBeGreaterThan(6)
  })

  it('não arrasta Blockly, Monaco, three nem React', () => {
    // A cena de aula renderiza dentro do member-shell, que já é pesado, e o subpath serve também
    // ao runtime do jogo. Um import de editor aqui entra no bundle de quem só quer ver um Dino.
    for (const arquivo of arquivos) {
      const fonte = semComentarios(readFileSync(arquivo, 'utf8')).toLowerCase()
      for (const proibido of ['blockly', 'monaco', 'three', 'react', '#blockly', '#monaco']) {
        expect(fonte).not.toContain(`from '${proibido}`)
      }
    }
  })

  it('⚠️ não toca o DOM em runtime: `CanvasRenderingContext2D` entra só como TIPO', () => {
    // A cena renderiza no SERVIDOR (`renderToStaticMarkup`), onde `document` não existe. O
    // `Pincel` é um `Pick` do contexto do canvas, que o TypeScript apaga no build; qualquer uso
    // de valor derrubaria a aula inteira em produção, e só na hora do render.
    for (const arquivo of arquivos) {
      const semTipos = semComentarios(readFileSync(arquivo, 'utf8'))
        .replace(/^import type .*$/gm, '')
        .replace(/:\s*Pick<[^>]+>/g, '')
      expect(semTipos).not.toMatch(/\bdocument\./)
      expect(semTipos).not.toMatch(/\bwindow\./)
      expect(semTipos).not.toMatch(/new\s+(Image|Path2D|OffscreenCanvas)\b/)
    }
  })

  it('⚠️⚠️ nenhum desenho sorteia: `Math.random` não entra na arte', () => {
    // O palco de cena re-renderiza a cada gesto da criança e também no servidor. Um sorteio
    // dentro de um desenho faria o céu piscar a cada toque e daria markup diferente a cada
    // execução do teste — por isso os fundos usam `sorteioComSemente`.
    for (const arquivo of arquivos) {
      expect(semComentarios(readFileSync(arquivo, 'utf8'))).not.toContain('Math.random')
    }
  })

  it('o subpath está declarado no package.json', () => {
    const pkg = JSON.parse(readFileSync(join(RAIZ, '..', '..', 'package.json'), 'utf8')) as {
      exports: Record<string, string>
    }
    expect(pkg.exports['./arte']).toBe('./src/arte/index.ts')
  })
})
