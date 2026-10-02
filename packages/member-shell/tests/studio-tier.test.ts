import { describe, expect, test } from 'bun:test'
import {
  remixRequirementFromSnapshot,
  resolveStudioTier,
  studioTierCoversRemix,
} from '../src/lib/studio-tier'

describe('resolveStudioTier — ferramentas conquistadas', () => {
  test('Faísca usa o Estúdio apenas dentro das aulas', () => {
    const tier = resolveStudioTier('noob', undefined)
    expect(tier.freeStudio).toBe(false)
    expect(tier.blockProfileId).toBe('lesson-only')
    expect(tier.pro).toBe(false)
  })

  test('Construtor abre o Estúdio livre só com o que os cursos deram', () => {
    const tier = resolveStudioTier('coder', undefined, {
      blocks: ['sz_g2d_setup_stage'],
      extensions: ['game-2d'],
    })
    expect(tier.freeStudio).toBe(true)
    expect(tier.level).toBe('iniciante-2d')
    expect(tier.allowBlocks).toEqual(['sz_g2d_setup_stage'])
    expect(tier.allowedExtensions).toEqual(['game-2d'])
    expect(tier.hasPalette).toBe(true)
    // ⚠️ Nada vem instalado: a criança instala o Jogo 2D pelo painel de
    // Extensões. `allowedExtensions` diz o que ela PODE instalar.
    expect(tier.initialExtensions).toEqual([])
  })

  test.each([
    ['hacker', 'iniciante-2d'],
    ['explorer', 'iniciante-3d'],
    ['elite', 'intermediario-2d'],
    ['architect', 'intermediario-3d'],
    ['champion', 'avancado-2d'],
    ['god', 'avancado-3d'],
  ] as const)('%s recebe somente o conteúdo já concluído (%s)', (slug, level) => {
    expect(resolveStudioTier(slug, undefined).level).toBe(level)
  })

  test('Ponte abre no Gênio e PRO somente na Lenda', () => {
    // Mestre e Arquiteto ficam só-Blocos (decisão 26/07: a Ponte subiu p/ o Gênio).
    expect(resolveStudioTier('elite', undefined).bridge).toBe(false)
    expect(resolveStudioTier('elite', undefined).allowedModes).toEqual(['blocks'])
    expect(resolveStudioTier('architect', undefined).bridge).toBe(false)
    expect(resolveStudioTier('champion', undefined).bridge).toBe(true)
    expect(resolveStudioTier('champion', undefined).allowedModes).toEqual(['blocks', 'bridge'])
    expect(resolveStudioTier('champion', undefined).pro).toBe(false)
    const legend = resolveStudioTier('god', undefined)
    expect(legend.pro).toBe(true)
    expect(legend.canCreateProProject).toBe(true)
    expect(legend.canPromoteToPro).toBe(true)
  })

  test('equipe recebe o perfil máximo; papel comum não recebe bypass', () => {
    for (const role of ['superadmin', 'admin', 'staff']) {
      expect(resolveStudioTier('noob', role).blockProfileId).toBe('avancado-3d')
      expect(resolveStudioTier('noob', role).pro).toBe(true)
    }
    expect(resolveStudioTier('noob', 'member').freeStudio).toBe(false)
  })

  test('slug ausente ou desconhecido falha fechado como Faísca', () => {
    for (const slug of [undefined, '', 'banana']) {
      const tier = resolveStudioTier(slug, undefined)
      expect(tier.freeStudio).toBe(false)
      expect(tier.pro).toBe(false)
    }
  })
})

describe('remix do Mural — cobertura de ferramentas por nível', () => {
  test('studioTierCoversRemix: Faísca nunca cobre (sem Estúdio livre)', () => {
    const tier = resolveStudioTier('noob', undefined)
    expect(studioTierCoversRemix(tier, { pro: false, extensions: [] })).toBe(false)
  })

  test('studioTierCoversRemix: extensão que os cursos não deram → não cobre', () => {
    const coder = resolveStudioTier('coder', undefined, {
      blocks: ['sz_g2d_setup_stage'],
      extensions: ['game-2d'],
    })
    expect(studioTierCoversRemix(coder, { pro: false, extensions: ['game-2d'] })).toBe(true)
    expect(studioTierCoversRemix(coder, { pro: false, extensions: ['world-3d'] })).toBe(false)
    // Sem curso concluído não há extensão nenhuma, nem a do Jogo 2D.
    const semCurso = resolveStudioTier('coder', undefined)
    expect(studioTierCoversRemix(semCurso, { pro: false, extensions: ['game-2d'] })).toBe(false)
  })

  test('studioTierCoversRemix: jogo Pro exige a Lenda (ou equipe)', () => {
    expect(
      studioTierCoversRemix(resolveStudioTier('champion', undefined), {
        pro: true,
        extensions: [],
      }),
    ).toBe(false)
    expect(
      studioTierCoversRemix(resolveStudioTier('god', undefined), { pro: true, extensions: [] }),
    ).toBe(true)
    expect(
      studioTierCoversRemix(resolveStudioTier('noob', 'admin'), { pro: true, extensions: [] }),
    ).toBe(true)
  })

  test('remixRequirementFromSnapshot: extrai kind + ids de extensão; lixo → vazio', () => {
    expect(
      remixRequirementFromSnapshot({
        kind: 'pro',
        installedExtensions: [{ id: 'game-2d' }, { id: 'world-3d' }, { nope: true }, null],
      }),
    ).toEqual({ pro: true, extensions: ['game-2d', 'world-3d'] })
    expect(remixRequirementFromSnapshot({ files: {} })).toEqual({ pro: false, extensions: [] })
    expect(remixRequirementFromSnapshot(null)).toEqual({ pro: false, extensions: [] })
    expect(remixRequirementFromSnapshot('lixo')).toEqual({ pro: false, extensions: [] })
  })
})

/**
 * A paleta do Estúdio livre vem do CURRÍCULO: cada curso declara os blocos que libera e o
 * aluno tem a união dos que concluiu + publicou. O NÍVEL continua decidindo o MODO (Estúdio
 * livre, Ponte, Pro). Sem reserva desde 02/10/2026: sem curso, sem blocos.
 */
describe('resolveStudioTier — paleta pelo currículo', () => {
  const unlocks = {
    blocks: ['sz_g2d_create_ship', 'sz_g2d_on_key'],
    extensions: ['game-2d'],
  }

  test('currículo MANDA na paleta quando existe', () => {
    const tier = resolveStudioTier('coder', undefined, unlocks)
    expect(tier.allowBlocks).toEqual(unlocks.blocks)
    expect(tier.allowedExtensions).toEqual(unlocks.extensions)
  })

  test('⭐ sem curso concluído não há bloco nem extensão: o Estúdio livre fica trancado', () => {
    for (const slug of ['coder', 'hacker', 'god'] as const) {
      const semNada = resolveStudioTier(slug, undefined, { blocks: [], extensions: [] })
      expect(semNada.allowBlocks).toEqual([])
      expect(semNada.allowedExtensions).toEqual([])
      expect(semNada.hasPalette).toBe(false)
    }
    // Sem o argumento é o mesmo (quem só lê `freeStudio`/`pro` chama assim).
    const semArgumento = resolveStudioTier('coder', undefined)
    expect(semArgumento.allowBlocks).toEqual([])
    expect(semArgumento.hasPalette).toBe(false)
    expect(semArgumento.freeStudio).toBe(true)
  })

  test('o NÍVEL segue decidindo o MODO, não a paleta', () => {
    // Currículo pequeno num nível alto não tira a Ponte nem o Pro.
    const lenda = resolveStudioTier('god', undefined, unlocks)
    expect(lenda.allowBlocks).toEqual(unlocks.blocks)
    expect(lenda.bridge).toBe(true)
    expect(lenda.pro).toBe(true)
    const construtor = resolveStudioTier('coder', undefined, unlocks)
    expect(construtor.bridge).toBe(false)
    expect(construtor.pro).toBe(false)
  })

  test('⚠️ a EQUIPE ignora o currículo (passe livre para conferir o Estúdio inteiro)', () => {
    const staff = resolveStudioTier('noob', 'staff', unlocks)
    expect(staff.pro).toBe(true)
    expect(staff.allowBlocks).toBeUndefined()
    expect(staff.allowedExtensions).toContain('game-3d-advanced')
    expect(staff.hasPalette).toBe(true)
    // Sem curso nenhum a equipe segue com tudo.
    expect(resolveStudioTier('noob', 'admin', { blocks: [], extensions: [] }).hasPalette).toBe(true)
  })
})
