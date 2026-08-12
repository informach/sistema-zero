import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gameKitPromptContext } from '../ai'
import { gameKitManifest } from '../manifest'
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

  it('fragmentos do runtime não contêm crase nem interpolação crua', () => {
    for (const [file, declaration] of [
      ['runtime/animation.ts', 'gameKitAnimationRuntime ='],
      ['runtime/audio.ts', 'gameKitAudioRuntime ='],
      ['runtime/cards.ts', 'gameKitCardsRuntime ='],
      ['runtime/campaign.ts', 'gameKitCampaignRuntime ='],
      ['runtime/campaignEvents.ts', 'gameKitCampaignEventsRuntime ='],
      ['runtime/campaignInput.ts', 'gameKitCampaignInputStateRuntime ='],
      ['runtime/campaignInput.ts', 'gameKitCampaignInputRuntime ='],
      ['runtime/campaignPersistence.ts', 'gameKitCampaignPersistenceRuntime ='],
      ['runtime/monsterBattle.ts', 'gameKitMonsterBattleRuntime ='],
      ['runtime/platformer.ts', 'gameKitPlatformerRuntime ='],
      ['runtime/rpgBattle.ts', 'gameKitRpgBattleRuntime ='],
      ['runtime/rpgNavigation.ts', 'gameKitRpgNavigationRuntime ='],
      ['runtime/shell.ts', 'gameKitShellRuntime ='],
      ['runtime/towerDefense.ts', 'towerDefenseRuntime ='],
      ['runtime/visualEffects.ts', 'gameKitVisualEffectsRuntime ='],
      ['../runtimeDomains.ts', 'gameRuntimeDomains ='],
    ] as const) {
      const src = readFileSync(join(DIR, file), 'utf8')
      expect(
        rawTemplateHazardsInside(
          src,
          declaration,
          file === 'runtime/campaign.ts'
            ? new Set([
                'CAMPAIGN_ENTITY_RUNTIME_CATALOG_JSON',
                'gameKitCampaignEventsRuntime',
                'gameKitCampaignInputRuntime',
                'gameKitCampaignInputStateRuntime',
                'gameKitCampaignPersistenceRuntime',
              ])
            : declaration === 'gameKitCampaignInputStateRuntime ='
              ? new Set(['gameKitActionBitsJson', 'gameKitActionsJson'])
              : new Set(),
        ),
      ).toEqual([])
    }
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
    expect(gameKitManifest.docs.length).toBeGreaterThan(500)
  })

  it('o runtime é avaliável como corpo de função (crase quebraria o parse)', () => {
    expect(() => new Function('window', 'requestAnimationFrame', gameKitRuntime)).not.toThrow()
  })
})
