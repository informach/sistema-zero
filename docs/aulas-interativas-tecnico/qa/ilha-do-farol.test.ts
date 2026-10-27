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
      expect(p.files['script.js']).toContain(JSON.stringify(ILHA_MODELS.coqueiroFrente.asset.name))
      expect(p.files['script.js']).toContain(JSON.stringify(ILHA_MODELS.coqueiroTras.asset.name))
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
})
