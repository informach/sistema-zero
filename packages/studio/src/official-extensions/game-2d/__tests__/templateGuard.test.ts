import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gameTwoDPromptContext } from '../ai'
import { gameTwoDDocs } from '../docs'
import { gameTwoDRuntime } from '../runtime'

/**
 * Clone da guarda de template do gk (Jogo 2D Avançado): o `runtime.ts`, o `ai.ts`
 * e o manual de `docs.ts` são UM template literal cada. Uma crase CRUA lá
 * dentro fecha a string no meio e o módulo inteiro deixa de parsear — e o sintoma
 * cai LONGE da causa. Além da crase, também pega `${` cru: interpolação dentro do
 * literal avalia no load e é SEMPRE acidente aqui (o runtime é string pura de ES5).
 *
 * A regra: DENTRO do literal, crase só escapada (\\`) e cifrão-chave só escapado
 * (\\$\{). Fora dele (o JSDoc do topo) é markdown normal e pode.
 */

const DIR = join(import.meta.dir, '..')

/**
 * Linhas (1-indexado) com crase OU `${` NÃO escapados no MIOLO do literal — entre
 * a linha que o abre e a que o fecha. Fora do intervalo é TS normal.
 */
function rawTemplateHazardsInside(src: string, openerNeedle: string): number[] {
  const declaration = src.indexOf(openerNeedle)
  if (declaration < 0) throw new Error(`não achei a declaração: ${openerNeedle}`)
  const opener = src.indexOf('`', declaration)
  if (opener < 0) throw new Error(`não achei a abertura do literal: ${openerNeedle}`)
  const out: number[] = []
  let line = src.slice(0, opener).split('\n').length
  for (let index = opener + 1; index < src.length; index += 1) {
    const char = src[index]
    if (char === '\n') line += 1
    let backslashes = 0
    for (let cursor = index - 1; cursor >= 0 && src[cursor] === '\\'; cursor -= 1) {
      backslashes += 1
    }
    const escaped = backslashes % 2 === 1
    if (char === '`' && !escaped) return out
    if (char === '$' && src[index + 1] === '{' && !escaped) out.push(line)
  }
  throw new Error(`não achei o fechamento do literal: ${openerNeedle}`)
}

function composedTemplateHazards(
  src: string,
  openerNeedle: string,
  /** `null` = não fixar a contagem (a varredura derivada só cobra PARIDADE). */
  expectedBoundaries: number | null,
): { interpolations: number[]; boundaryCount: number } {
  const start = src.indexOf(openerNeedle)
  if (start < 0) throw new Error(`não achei a composição: ${openerNeedle}`)
  const content = src.slice(start)
  const interpolations: number[] = []
  let inTemplate = false
  let boundaryCount = 0
  let line = src.slice(0, start).split('\n').length
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (char === '\n') line += 1
    let slashes = 0
    for (let cursor = index - 1; cursor >= 0 && content[cursor] === '\\'; cursor -= 1) {
      slashes += 1
    }
    const escaped = slashes % 2 === 1
    if (char === '`' && !escaped) {
      inTemplate = !inTemplate
      boundaryCount += 1
    } else if (inTemplate && char === '$' && content[index + 1] === '{' && !escaped) {
      interpolations.push(line)
    }
  }
  if (expectedBoundaries !== null) expect(boundaryCount).toBe(expectedBoundaries)
  return { interpolations, boundaryCount }
}

/**
 * ⚠️ A lista destes arquivos era ESCRITA À MÃO, e por isso tinha um buraco exatamente
 * onde o trabalho estava acontecendo: `enemies.ts`, `classicPlatformer.ts` e
 * `worldSystems.ts` — os três mais editados pelo lote do Reino Zero, e dois dos
 * maiores do runtime — nunca foram varridos. Agora a lista é DERIVADA do diretório:
 * arquivo novo entra sozinho, e ninguém precisa lembrar de cadastrá-lo.
 */
function runtimeFragmentFiles(): string[] {
  return readdirSync(join(DIR, 'runtime'))
    .filter((name) => name.endsWith('.ts'))
    .sort()
    .map((name) => `runtime/${name}`)
}

/** O nome da constante exportada, para ancorar a varredura no ponto certo. */
function firstExportedConst(src: string, file: string): string {
  const match = src.match(/export const (\w+)\s*=/)
  if (!match?.[1]) throw new Error(`${file}: nenhuma constante exportada`)
  return `${match[1]} =`
}

describe('Guarda dos template literals do Jogo 2D', () => {
  it('runtime composto: limites esperados e nenhuma interpolação acidental', () => {
    const src = readFileSync(join(DIR, 'runtime.ts'), 'utf8')
    expect(composedTemplateHazards(src, 'gameTwoDRuntime =', 6).interpolations).toEqual([])

    const domains = readFileSync(join(DIR, '../runtimeDomains.ts'), 'utf8')
    expect(composedTemplateHazards(domains, 'gameRuntimeDomains =', 2).interpolations).toEqual([])

    const arquivos = runtimeFragmentFiles()
    // Rede da rede: se alguém apagar a derivação e voltar a listar à mão, o número
    // cai e este piso acusa. 24 hoje (21 fragmentos + os barris arcadeKits,
    // casualKits e world), contra os 22 que a lista escrita à mão alcançava.
    expect(arquivos.length).toBeGreaterThanOrEqual(24)

    for (const file of arquivos) {
      const fragment = readFileSync(join(DIR, file), 'utf8')
      const declaration = firstExportedConst(fragment, file)
      const { interpolations, boundaryCount } = composedTemplateHazards(fragment, declaration, null)
      // Barril (só concatena importados) tem 0 crases; fragmento tem o par que abre e
      // fecha o literal. ÍMPAR = crase CRUA no meio, que é exatamente o defeito.
      // O nome do arquivo vai na asserção porque a mensagem de falha do bun não diz
      // em qual volta do laço quebrou.
      expect(`${file}: ${boundaryCount % 2}`).toBe(`${file}: 0`)
      expect(`${file}: ${interpolations.join(',')}`).toBe(`${file}: `)
    }
  })

  it('a regra MORDE: crase crua vira paridade ímpar e ${ vira interpolação', () => {
    // Anti-vácuo. Sem isto, uma varredura que simplesmente não olhasse nada passaria
    // nos 24 arquivos e daria a impressão de estar protegendo. Os dois casos são
    // montados à mão porque injetar o defeito num arquivo real quebraria o import.
    const cru = ['export const x = `', '  // um comentário com ` crase crua', '`', ''].join('\n')
    expect(composedTemplateHazards(cru, 'x =', null).boundaryCount % 2).toBe(1)

    // biome-ignore lint/suspicious/noTemplateCurlyInString: é o defeito sob teste.
    const interpolado = ['export const y = `', '  var a = ${valor};', '`', ''].join('\n')
    const achados = composedTemplateHazards(interpolado, 'y =', null)
    expect(achados.boundaryCount % 2).toBe(0)
    expect(achados.interpolations).not.toEqual([])

    const saudavel = ['export const z = `', '  var a = 1;', '`', ''].join('\n')
    const limpo = composedTemplateHazards(saudavel, 'z =', null)
    expect(limpo.boundaryCount % 2).toBe(0)
    expect(limpo.interpolations).toEqual([])
  })

  it('a derivação alcança os três que a lista à mão esquecia', () => {
    const arquivos = runtimeFragmentFiles()
    for (const esquecido of [
      'runtime/enemies.ts',
      'runtime/classicPlatformer.ts',
      'runtime/worldSystems.ts',
    ]) {
      expect(arquivos).toContain(esquecido)
    }
  })

  it('ai.ts: idem (o contexto da IA também é um literal só)', () => {
    const src = readFileSync(join(DIR, 'ai.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameTwoDPromptContext =')).toEqual([])
  })

  it('docs.ts: o manual escapa a crase (é markdown — a tentação é grande)', () => {
    const src = readFileSync(join(DIR, 'docs.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameTwoDDocs =')).toEqual([])
  })

  it('os três módulos avaliam e entregam string não-vazia (a prova final)', () => {
    // Se uma crase crua tivesse escapado, o import lá em cima nem carregaria.
    expect(gameTwoDRuntime.length).toBeGreaterThan(1000)
    expect(gameTwoDPromptContext.length).toBeGreaterThan(500)
    expect(gameTwoDDocs.length).toBeGreaterThan(500)
  })

  it('o runtime é avaliável como corpo de função (crase quebraria o parse)', () => {
    expect(() => new Function('window', 'requestAnimationFrame', gameTwoDRuntime)).not.toThrow()
  })
})
