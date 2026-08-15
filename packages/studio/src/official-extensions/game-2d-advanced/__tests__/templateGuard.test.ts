import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gameKitPromptContext } from '../ai'
import { gameKitDocs } from '../docs'
import { gameKitRuntime } from '../runtime'

/**
 * ⭐ A mesma guarda do kit 3D (templateGuard de lá), agora aqui — o gk caiu na
 * crase crua 7 vezes em 4 lotes antes de o irmão ganhar o teste.
 *
 * `runtime.ts`, seus fragmentos, `ai.ts` e `docs.ts` usam template literals.
 * Uma crase CRUA lá dentro fecha a string no meio e o módulo inteiro
 * deixa de parsear — e o sintoma cai longe da causa. Além da crase, este clone
 * também pega `${` cru: só fragmentos nomeados e auditados podem ser
 * interpolados; qualquer outra interpolação é acidente.
 *
 * A regra: DENTRO do literal, crase só escapada (\\`) e cifrão-chave só
 * escapado (\\$\{) ou allowlisted. Fora dele, o JSDoc é markdown normal.
 */

const DIR = join(import.meta.dir, '..')

/**
 * Linhas (1-indexado) com crase OU `${` NÃO escapados no MIOLO do literal —
 * entre a linha que o abre e a que o fecha. Fora do intervalo é TS normal.
 */
function rawTemplateHazardsInside(
  src: string,
  openerNeedle: string,
  allowedInterpolations: ReadonlySet<string> = new Set(),
): number[] {
  const lines = src.split('\n')
  const declaration = lines.findIndex((line) => line.includes(openerNeedle))
  if (declaration < 0) throw new Error(`não achei a declaração: ${openerNeedle}`)
  const opener = lines.findIndex((line, index) => index >= declaration && line.includes('`'))
  if (opener < 0) throw new Error(`não achei a abertura do literal: ${openerNeedle}`)
  const out: number[] = []
  for (let i = opener; i < lines.length; i++) {
    const line = lines[i] as string
    // O FECHO pretendido é uma linha que só tem a crase (com ou sem vírgula).
    if (line.trim() === '`' || line.trim() === '`,') return out
    const startColumn = i === opener ? line.indexOf('`') + 1 : 0
    for (let c = startColumn; c < line.length; c++) {
      const escaped = c > 0 && line[c - 1] === '\\'
      if (line[c] === '`' && !escaped) out.push(i + 1) // crase CRUA antes do fecho
      if (line[c] === '$' && line[c + 1] === '{' && !escaped) {
        const interpolation = line.slice(c).match(/^\$\{([A-Za-z_$][\w$]*)\}/)?.[1]
        if (!interpolation || !allowedInterpolations.has(interpolation)) out.push(i + 1)
      }
    }
  }
  return out
}

/**
 * ⚠️ Esta lista era ESCRITA À MÃO — dezesseis pares arquivo/declaração. Hoje ela
 * está completa, e era exatamente assim que a do irmão g2d estava até o lote do
 * Reino Zero somar três fragmentos e descobrir que ela listava 22 de 24,
 * faltando justo os três que o lote tinha acabado de tocar. Derivar não conserta
 * hoje: conserta amanhã, quando alguém somar um fragmento e não lembrar daqui.
 *
 * ⚠️ Diferença do irmão, e ela morde: aqui um arquivo pode exportar MAIS DE UM
 * literal (o campaignInput.ts exporta dois), então a varredura pega TODOS. Pegar
 * só o primeiro, como o g2d faz, deixaria um fragmento inteiro sem guarda.
 */
function fragmentosDoRuntime(): Array<{ file: string; declaration: string }> {
  const arquivos = [
    ...readdirSync(join(DIR, 'runtime'))
      .filter((nome) => nome.endsWith('.ts'))
      .sort()
      .map((nome) => `runtime/${nome}`),
    '../runtimeDomains.ts',
  ]
  return arquivos.flatMap((file) => {
    const src = readFileSync(join(DIR, file), 'utf8')
    const decls = [...src.matchAll(/^export const (\w+)\s*=/gm)].map((m) => `${m[1]} =`)
    if (decls.length === 0) throw new Error(`${file}: nenhuma constante exportada`)
    return decls.map((declaration) => ({ file, declaration }))
  })
}

/** Interpolação legítima, por DECLARAÇÃO (não por arquivo: um arquivo pode ter duas). */
const INTERPOLACOES_PERMITIDAS: Record<string, ReadonlySet<string>> = {
  'gameKitCampaignRuntime =': new Set([
    'CAMPAIGN_ENTITY_RUNTIME_CATALOG_JSON',
    'CAMPAIGN_PHYSICS_JSON',
    'gameKitCampaignEventsRuntime',
    'gameKitCampaignInputRuntime',
    'gameKitCampaignInputStateRuntime',
    'gameKitCampaignPersistenceRuntime',
  ]),
  'gameKitCampaignInputStateRuntime =': new Set(['gameKitActionBitsJson', 'gameKitActionsJson']),
}

describe('Guarda dos template literals do gk (Jogo 2D Avançado)', () => {
  it('runtime.ts: só interpola fragmentos auditados, sem crase crua', () => {
    const src = readFileSync(join(DIR, 'runtime.ts'), 'utf8')
    expect(
      rawTemplateHazardsInside(
        src,
        'gameKitRuntime =',
        new Set([
          'gameKitAudioRuntime',
          'gameKitAnimationRuntime',
          'gameKitCardsRuntime',
          'gameKitCampaignRuntime',
          'gameKitMonsterBattleRuntime',
          'gameKitOverlapIndexRuntime',
          'gameKitPlatformerRuntime',
          'gameKitRpgBattleRuntime',
          'gameKitRpgNavigationRuntime',
          'gameKitShellRuntime',
          'gameKitVisualEffectsRuntime',
          'gameRuntimeDomains',
          'towerDefenseRuntime',
        ]),
      ),
    ).toEqual([])
  })

  it('⭐ fragmentos do runtime: a LISTA sai do diretório, não da mão', () => {
    const fragmentos = fragmentosDoRuntime()
    // Rede da rede: se alguém apagar a derivação e voltar a listar à mão, o
    // número cai e este piso acusa. 17 hoje (16 arquivos + o runtimeDomains
    // compartilhado; o campaignInput.ts conta DUAS vezes, exporta duas consts).
    expect(fragmentos.length).toBeGreaterThanOrEqual(17)
    for (const { file, declaration } of fragmentos) {
      const src = readFileSync(join(DIR, file), 'utf8')
      const achados = rawTemplateHazardsInside(
        src,
        declaration,
        INTERPOLACOES_PERMITIDAS[declaration] ?? new Set(),
      )
      // A mensagem carrega o arquivo: um `toEqual([])` seco não diz QUEM quebrou.
      expect(`${file} (${declaration}): ${achados.join(', ')}`).toBe(`${file} (${declaration}): `)
    }
  })

  it('⚠️ a derivação MORDE: fragmento com crase crua é PEGO', () => {
    // ANTI-VÁCUO, e o gk não tinha NENHUM — no arquivo cujo próprio cabeçalho
    // registra sete quedas na crase crua. Sem isto, um varredor que devolvesse
    // sempre `[]` passaria nos dezesseis e daria a impressão de proteger.
    const sujo = [
      'export const exemploRuntime = `',
      '  var oi = 1;',
      '  // um comentario com `crase` crua',
      '`',
    ].join('\n')
    // Duas ocorrências na MESMA linha, e é assim mesmo: a forma real do defeito
    // é um par de crases citando um identificador num comentário, e foi assim
    // que ele mordeu duas vezes no irmão g2d no mesmo dia.
    expect(rawTemplateHazardsInside(sujo, 'exemploRuntime =')).toEqual([3, 3])

    const limpo = sujo.replace('`crase`', 'crase')
    expect(rawTemplateHazardsInside(limpo, 'exemploRuntime =')).toEqual([])
  })

  it('⚠️ a derivação MORDE: interpolação FORA da allowlist é PEGA', () => {
    // A fixture PRECISA do cifrão-chave CRU dentro de uma string comum: é
    // justamente o que o varredor tem que achar. Montado por concatenação para
    // não acionar o lint, que (com razão, em geral) desconfia disso.
    const cru = `$${'{umaCoisaQualquer}'}`
    const sujo = ['export const exemploRuntime = `', `  var oi = ${cru};`, '`'].join('\n')
    expect(rawTemplateHazardsInside(sujo, 'exemploRuntime =')).toEqual([2])
    expect(
      rawTemplateHazardsInside(sujo, 'exemploRuntime =', new Set(['umaCoisaQualquer'])),
    ).toEqual([])
  })

  it('ai.ts: idem (o contexto da IA também é um literal só)', () => {
    const src = readFileSync(join(DIR, 'ai.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameKitPromptContext =')).toEqual([])
  })

  it('docs.ts: o markdown escapa crases e interpolações', () => {
    const src = readFileSync(join(DIR, 'docs.ts'), 'utf8')
    expect(rawTemplateHazardsInside(src, 'gameKitDocs =')).toEqual([])
  })

  it('os três módulos avaliam e entregam string não-vazia (a prova final)', () => {
    // Se uma crase crua tivesse escapado, o import lá em cima nem carregaria.
    expect(gameKitRuntime.length).toBeGreaterThan(1000)
    expect(gameKitPromptContext.length).toBeGreaterThan(500)
    expect(gameKitDocs.length).toBeGreaterThan(500)
  })

  it('o runtime é avaliável como corpo de função (crase quebraria o parse)', () => {
    expect(() => new Function('window', 'requestAnimationFrame', gameKitRuntime)).not.toThrow()
  })
})
