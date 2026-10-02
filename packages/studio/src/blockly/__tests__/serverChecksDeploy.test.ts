/**
 * O Members confere as atividades das aulas no SERVIDOR com o catálogo de blocos e o
 * avaliador deste pacote (`@sistemazero/studio/server-project-checks`). Se uma mudança
 * do Estúdio deployar só os apps (admin, kids, adulto), o Members fica com o catálogo
 * antigo: o bloco novo é aceito na autoria e recusado na correção, sem erro em lugar
 * nenhum além da tela da criança.
 */
import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const ROOT = '../../../../../'

describe('conformidade studio × members', () => {
  it('🚨 mudança no Estúdio também dispara o deploy do Members em staging', () => {
    const workflow = read(`${ROOT}.github/workflows/ci.yml`)
    expect(workflow).toMatch(/packages\/studio\/\*\).*add members/)
  })

  it('a dependência é de verdade (anti-vácuo: o Members importa o subpath do servidor)', () => {
    const manifest = JSON.parse(read(`${ROOT}packages/members/package.json`)) as {
      dependencies?: Record<string, string>
    }
    expect(manifest.dependencies?.['@sistemazero/studio']).toBeDefined()
    expect(read(`${ROOT}packages/members/src/domain/course/studio-activity.ts`)).toContain(
      '@sistemazero/studio/server-project-checks',
    )
  })
})
