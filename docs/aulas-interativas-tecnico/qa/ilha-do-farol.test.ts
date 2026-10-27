import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../packages/core/src/learning'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import {
  isExecutionRule,
  isSectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { readManifestStudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { isBlockTypeAllowed } from '../../../packages/studio/src/core/levels'
import { sanitizeProjectAssets } from '../../../packages/studio/src/core/projectAssets'
import { SZIRInputSchema } from '../../../packages/studio/src/ir/schema'
import { ILHA_SCENE_GLB } from '../../../packages/studio/src/arte/ilha-farol-scene.generated'
import { isCourseModelLibId, knownCourseModels } from '../../../packages/studio/src/core/courseModels'
import { readGlbSummary } from '../../../packages/studio/src/core/glbSummary'
import { ILHA_ASSETS, ILHA_MODELS } from './ilha-do-farol-assets'
import { ilhaChecks } from './ilha-do-farol-criterios'
import { ILHA_PARTES, montarProjetoIlha } from './ilha-do-farol-projeto'

const dir = resolve(import.meta.dirname, '../../aulas-interativas/a-ilha-do-farol')
describe('A Ilha do Farol', () => {
  test('três aulas válidas, sem certificado, com exemplos portáteis dentro do orçamento', () => {
    for (let i = 1; i <= 3; i++) {
      const m = JSON.parse(readFileSync(resolve(dir, `ilha-aula-${i}.manifesto.json`), 'utf8'))
      expect(isLearningManifest(m)).toBe(true)
      expect(
        learningImportBodyBytes(
          m,
          'preserve',
          'a'.repeat(64),
          '00000000-0000-4000-8000-000000000000',
        ),
      ).toBeLessThanOrEqual(LEARNING_IMPORT_BODY_MAX_BYTES)
      expect(m.blocks.some((b: any) => b.content?.kind === 'certificate')).toBe(false)
      expect(m.blocks.filter((b: any) => b.content?.kind === 'materials')).toHaveLength(
        i === 1 ? 1 : 0,
      )
      if (i === 1) {
        expect(m.sections[0].blockKeys).toContain('jogo-pronto')
        expect(m.sections[1].blockKeys).toContain('materiais')
        expect(m.sections[1].completion.blockIds).not.toContain('materiais')
      }
      const s = m.blocks.find((b: any) => b.content?.kind === 'studio').content
      expect(readManifestStudioProjectExamples(s.projectExamples).kind).toBe('valid')
      expect(s.chain).toBe('jornada-faisca-base-3d')
      for (const type of s.allowBlocks)
        expect(
          isBlockTypeAllowed(type, 'iniciante-3d', {
            level: 'iniciante-3d',
            allowBlocks: s.allowBlocks,
          }),
          type,
        ).toBe(true)
    }
  })
  test('todas as soluções intermediárias cumprem sua montagem e só usam extensão/Programação', () => {
    for (const part of ILHA_PARTES) {
      const p = montarProjetoIlha(part)
      const parsed = SZIRInputSchema.safeParse(p.ir)
      expect(parsed.success, `${part}: ${parsed.success ? '' : parsed.error.message}`).toBe(true)
      expect(sanitizeProjectAssets(p.assets)).toHaveLength(ILHA_ASSETS.length)
      for (const model of Object.values(ILHA_MODELS))
        expect(p.files['script.js']).toContain(JSON.stringify(model.asset.name))
      const source = JSON.stringify(p.blocksState)
      expect(source).not.toMatch(/sz_(html|css|canvas|js_raw)/)
      expect(p.ir!.html).toEqual([])
      expect(p.ir!.css).toEqual([])
      if (part === 'inicio') continue
      const checks = ilhaChecks(part)
      expect(
        evaluateStudioSectionProject(
          checks.filter((c) => !isExecutionRule(c.rule)),
          p,
        ).filter((c) => !c.passed),
        part,
      ).toEqual([])
      for (const c of checks)
        if (isExecutionRule(c.rule)) expect(isSectionExecutionRule(c.rule), c.id).toBe(true)
    }
  })
  test('a entrada não contém as montagens que a criança ainda vai fazer', () => {
    const initial = montarProjetoIlha('inicio'),
      collect = montarProjetoIlha('posicao')
    expect(
      evaluateStudioSectionProject(
        ilhaChecks('movimento').filter((c) => c.id === 'movimento-no-quadro'),
        initial,
      )[0]?.passed,
    ).toBe(false)
    expect(
      evaluateStudioSectionProject(
        ilhaChecks('recolher').filter((c) => c.id === 'recolher-no-encontro'),
        collect,
      )[0]?.passed,
    ).toBe(false)
  })
  test('o projeto leva só a referência dos modelos, com todas as variações da personalização', () => {
    const p = montarProjetoIlha('personalizar')
    expect(ILHA_ASSETS).toHaveLength(24)
    for (const asset of p.assets) {
      expect(asset.kind).toBe('model3d')
      expect(isCourseModelLibId(asset.libId)).toBe(true)
      expect(knownCourseModels()).toContain(asset.libId!.slice('modelo-curso:'.length))
      expect(asset.dataUrl.length).toBeLessThan(600)
    }
    // Os nomes da Chave do Farol em 2D, para a criança reconhecer as opções.
    expect(p.assets.map((a) => a.name)).toEqual(
      expect.arrayContaining(['aventureiro', 'pirata', 'barco-pirata', 'chave-de-estrela', 'farol-de-pedra', 'noite-na-ilha']),
    )
    // O farol tem as duas animações; o personagem, parado e andando.
    expect(readGlbSummary(ILHA_MODELS.farol.asset.dataUrl)?.clips).toEqual(['acender', 'aceso'])
    expect(readGlbSummary(ILHA_MODELS.personagem.asset.dataUrl)?.clips).toEqual(['andando', 'parado'])
    expect(JSON.stringify(p).length).toBeLessThan(60_000)
  })
  test('a cena das experiências tem os nós que a experiência move e esconde', () => {
    const bytes = Buffer.from(ILHA_SCENE_GLB.split(',')[1]!, 'base64')
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))
    const roots = json.scenes[0].nodes.map((i: number) => json.nodes[i].name)
    expect(roots).toEqual(expect.arrayContaining(['Chave', 'Aventureiro', 'Pedras', 'Bancada']))
    expect(json.animations ?? []).toEqual([])
  })
})
