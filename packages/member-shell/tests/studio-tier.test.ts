import { describe, expect, test } from 'bun:test'
import { ESSENTIAL_2D_ALLOW_BLOCKS } from '@sistemazero/studio'
import {
  minCareerLevelForRemix,
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

  test('Construtor recebe somente o Jogo 2D Essencial', () => {
    const tier = resolveStudioTier('coder', undefined)
    expect(tier.freeStudio).toBe(true)
    expect(tier.level).toBe('iniciante-2d')
    expect(tier.allowBlocks).toEqual(ESSENTIAL_2D_ALLOW_BLOCKS)
    expect(tier.allowedExtensions).toEqual(['game-2d'])
    expect(tier.initialExtensions).toEqual(['game-2d'])
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

  test('Ponte abre no Mestre e PRO somente na Lenda', () => {
    expect(resolveStudioTier('explorer', undefined).bridge).toBe(false)
    expect(resolveStudioTier('elite', undefined).allowedModes).toEqual(['blocks', 'bridge'])
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

  test('studioTierCoversRemix: extensão fora da allowlist do degrau → não cobre', () => {
    const coder = resolveStudioTier('coder', undefined)
    expect(studioTierCoversRemix(coder, { pro: false, extensions: ['game-2d'] })).toBe(true)
    expect(studioTierCoversRemix(coder, { pro: false, extensions: ['world-3d'] })).toBe(false)
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

  test('minCareerLevelForRemix: primeiro nível com Estúdio livre que cobre as extensões', () => {
    // Sem extensão → o primeiro nível com Estúdio livre (Construtor).
    expect(minCareerLevelForRemix({ pro: false, extensions: [] })).toBe('coder')
    expect(minCareerLevelForRemix({ pro: false, extensions: ['game-2d'] })).toBe('coder')
    // 3D abre no Explorador de Mundos (perfil iniciante-3d).
    expect(minCareerLevelForRemix({ pro: false, extensions: ['game-3d'] })).toBe('explorer')
    expect(minCareerLevelForRemix({ pro: false, extensions: ['world-3d'] })).toBe('architect')
    expect(minCareerLevelForRemix({ pro: false, extensions: ['game-3d-advanced'] })).toBe('god')
    // Pro é só da Lenda.
    expect(minCareerLevelForRemix({ pro: true, extensions: [] })).toBe('god')
  })

  test('minCareerLevelForRemix: extensão desconhecida (metadado forjado) → null', () => {
    expect(minCareerLevelForRemix({ pro: false, extensions: ['hax-ext'] })).toBeNull()
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
