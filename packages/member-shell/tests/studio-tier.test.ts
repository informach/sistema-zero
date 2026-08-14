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
    // Jogo 3D Avançado agora abre no Arquiteto (reclassificado; decisão 26/07).
    expect(minCareerLevelForRemix({ pro: false, extensions: ['game-3d-advanced'] })).toBe(
      'architect',
    )
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

/**
 * A paleta do Estúdio livre passou a vir do CURRÍCULO (08/2026): cada curso declara os
 * blocos que libera e o aluno tem a união dos que concluiu + publicou. O NÍVEL continua
 * decidindo o MODO (Estúdio livre, Ponte, Pro) e é o fail-open enquanto o catálogo não
 * está etiquetado.
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

  test('⭐ fail-open: currículo vazio cai no perfil do NÍVEL (paleta nunca fica vazia)', () => {
    const semNada = resolveStudioTier('coder', undefined, { blocks: [], extensions: [] })
    expect(semNada.allowBlocks).toEqual(ESSENTIAL_2D_ALLOW_BLOCKS)
    expect(semNada.allowedExtensions).toEqual(['game-2d'])
    // Sem o argumento é o mesmo caminho (build antigo / página que não busca).
    expect(resolveStudioTier('coder', undefined).allowBlocks).toEqual(ESSENTIAL_2D_ALLOW_BLOCKS)
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
  })
})
