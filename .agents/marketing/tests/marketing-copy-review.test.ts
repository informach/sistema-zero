import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { reviewEvent } from '../../../.claude/hooks/marketing-copy-review'

const root = mkdtempSync(join(tmpdir(), 'sz-marketing-'))
const file = join(root, 'docs/marketing/kids/produto/copy/landing.md')
mkdirSync(dirname(file), { recursive: true })
const event = (filePath: string, tool = 'Edit') => ({
  hook_event_name: 'PostToolUse', tool_name: tool,
  cwd: root, tool_input: { file_path: filePath, new_string: 'Trecho corrigido.' },
})
afterAll(() => {
  if (dirname(resolve(root)) !== resolve(tmpdir()) || !basename(root).startsWith('sz-marketing-')) {
    throw new Error('Diretório temporário inesperado')
  }
  rmSync(root, { recursive: true, force: true })
})

describe('hook consultivo de marketing', () => {
  test('lê a peça completa depois de Edit e preserva o arquivo', async () => {
    const original = 'Seu filho pode criar um jogo! Mesmo que nunca tenha programado.'
    writeFileSync(file, original)
    const output = reviewEvent(event(file), root)
    expect(output?.hookSpecificOutput.additionalContext).toContain('Exclamação')
    expect(output?.hookSpecificOutput.additionalContext).toContain('mesmo que')
    expect(output).not.toHaveProperty('decision')
    expect(await Bun.file(file).text()).toBe(original)
  })
  test('detecta a forma acentuada e travessão com o linter da aplicação', () => {
    writeFileSync(file, 'Não é um curso. É uma experiência — crie seu jogo.')
    const output = reviewEvent(event(file, 'Write'), root)
    expect(output?.hookSpecificOutput.additionalContext).toContain('Travessão')
    expect(output?.hookSpecificOutput.additionalContext).toContain('Não é X. É Y.')
  })
  test('resultado limpo não declara prova ou conversão verificadas', () => {
    writeFileSync(file, 'Escolha a velocidade e observe como o personagem se move.')
    const output = reviewEvent(event(file), root)
    expect(output?.hookSpecificOutput.additionalContext).toContain('Sem ocorrências mecânicas')
    expect(output?.hookSpecificOutput.additionalContext).toContain('não valida promessas')
  })
  test('código Astro recebe lembrete sem interpretar operadores como copy', () => {
    const output = reviewEvent(event(join(root, 'packages/funnel/src/pages/oferta.astro')), root)
    expect(output?.hookSpecificOutput.additionalContext).toStartWith('Revise a copy')
    expect(output?.hookSpecificOutput.additionalContext).not.toContain('Exclamação')
  })
  test('pesquisa com citações e perguntas recebe apenas lembrete editorial', () => {
    const output = reviewEvent(event(join(root, 'docs/marketing/kids/produto/pesquisa.md')), root)
    expect(output?.hookSpecificOutput.additionalContext).toStartWith('Revise a copy')
  })
  test('resolve caminho relativo ao cwd, incluindo diretório com espaços', () => {
    const output = reviewEvent({ ...event('copy/landing.md'), cwd: dirname(dirname(file)) }, root)
    expect(output?.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    const spaced = join(root, 'docs/marketing/produto com espaço/copy/anuncio.md')
    mkdirSync(dirname(spaced), { recursive: true })
    writeFileSync(spaced, 'Uma criação por vez!')
    expect(reviewEvent(event(spaced), root)?.hookSpecificOutput.additionalContext).toContain('Exclamação')
  })
  test('não interfere em aulas, outros pacotes, segredos ou fora do projeto', () => {
    for (const target of ['packages/member-shell/src/aula.tsx', '.env', '.claude/skills/teste/SKILL.md', '../fora.md']) {
      expect(reviewEvent(event(target), root)).toBeNull()
    }
    expect(reviewEvent(event(`${root}-outro/docs/marketing/kids/x/copy/teste.md`), root)).toBeNull()
  })
  test('ignora entrada inválida, ferramenta e evento não suportados', () => {
    for (const input of [null, [], {}, { tool_input: 1 }, event(file, 'Bash'), { ...event(file), hook_event_name: 'PreToolUse' }]) {
      expect(reviewEvent(input, root)).toBeNull()
    }
  })
  test('arquivo ausente não vira revisão bem sucedida ou bloqueio', () => {
    const output = reviewEvent(event(join(dirname(file), 'ausente.md')), root)
    expect(output?.hookSpecificOutput.additionalContext).toContain('não executada')
    expect(output).not.toHaveProperty('decision')
  })
  test('CLI diferencia texto limpo, ocorrência e falha de leitura', () => {
    const cli = resolve(import.meta.dir, '../../skills/revisao-copy/scripts/check-copy.ts')
    writeFileSync(file, 'Escolha um personagem e observe seu movimento.')
    expect(Bun.spawnSync([process.execPath, cli, file]).exitCode).toBe(0)
    writeFileSync(file, 'Crie um jogo!')
    const flagged = Bun.spawnSync([process.execPath, cli, file])
    expect(flagged.exitCode).toBe(1)
    expect(JSON.parse(flagged.stdout.toString())[0].issues[0].rule).toBe(2)
    expect(Bun.spawnSync([process.execPath, cli, join(root, 'ausente.txt')]).exitCode).toBe(2)
  })
  test('entrada JSON do hook produz contexto e entrada malformada não bloqueia', () => {
    const hook = resolve(import.meta.dir, '../../../.claude/hooks/marketing-copy-review.ts')
    // Fonte de código: só lembrete, sem ler nem modificar o arquivo da aplicação.
    const target = resolve(import.meta.dir, '../../../packages/funnel/src/pages/index.astro')
    const valid = Bun.spawnSync([process.execPath, hook], { stdin: Buffer.from(JSON.stringify(event(target))) })
    expect(valid.exitCode).toBe(0)
    expect(JSON.parse(valid.stdout.toString()).hookSpecificOutput.hookEventName).toBe('PostToolUse')
    const invalid = Bun.spawnSync([process.execPath, hook], { stdin: Buffer.from('{inválido') })
    expect(invalid.exitCode).toBe(0)
    expect(invalid.stdout.toString()).toBe('')
  })
})
