import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { PALETTES } from '@sistemazero/core/palette'
import { derivePaletteTokens } from '../src/tokens/derive'
import { FIXED_TOKENS, PALETTE_TOKENS } from '../src/tokens/recipe'

const ROOT = join(import.meta.dir, '../../..')
const canonical = await Bun.file(
  join(ROOT, 'packages/ui/src/styles/community-kids-theme.css'),
).text()
const aliases = await Bun.file(join(ROOT, 'packages/ui/src/styles/theme-kids.css')).text()
const funnel = await Bun.file(join(ROOT, 'packages/funnel/src/styles/global.css')).text()
const platform = await Bun.file(join(ROOT, 'packages/community-kids/src/app/globals.css')).text()
const adulto = await Bun.file(join(ROOT, 'packages/community/src/app/globals.css')).text()

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('identidade compartilhada da Comunidade Kids', () => {
  it('⚠️ a camada `--sz-community-*` não tem valor nenhum — só aponta para a gerada', () => {
    expect(canonical.indexOf('@import "./palettes/community.css"')).toBeGreaterThan(-1)
    expect(withoutComments(canonical)).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(/i)
  })

  it('todo token gerado tem alias — nenhum some na travessia', () => {
    for (const token of [...PALETTE_TOKENS, ...Object.keys(FIXED_TOKENS)])
      expect({
        token,
        tem: canonical.includes(`--sz-community-${token}: var(--sz-${token});`),
      }).toEqual({ token, tem: true })
  })

  it('faz os aliases kids importarem e apontarem para a fonte canônica', () => {
    expect(aliases.indexOf('@import "./community-kids-theme.css"')).toBe(0)
    expect(aliases).toContain('--sz-kids-creme: var(--sz-community-ground)')
    expect(aliases).toContain('--sz-kids-acao: var(--sz-community-action)')
    expect(aliases).toContain('--sz-kids-acao-degrau: var(--sz-community-action-step)')
  })

  it('faz plataforma, adulto e funil consumirem o mesmo contrato', () => {
    expect(platform).toContain('@import "@sistemazero/ui/theme-kids.css"')
    expect(platform).toContain('--pen-chao: var(--sz-community-ground)')
    expect(platform).toContain('--pen-acao: var(--sz-community-action)')
    expect(funnel).toContain('@import "@sistemazero/ui/theme-kids.css"')
    expect(funnel).toContain('--color-bg: var(--sz-community-ground)')
    expect(funnel).toContain('--color-lime: var(--sz-community-action)')
    // A comunidade ADULTA era o buraco: ela mantinha uma cópia inteira da paleta em literais,
    // e a guarda antiga não a varria. Desde 17/09/2026 ela bebe da mesma fonte.
    expect(adulto).toContain('@import "@sistemazero/ui/community-kids-theme.css"')
    expect(adulto).toContain('--pen-chao: var(--sz-community-ground)')
    expect(adulto).toContain('--pen-acao: var(--sz-community-action)')
    expect(adulto).not.toContain('data-tema')
  })

  it('⚠️ o ZERO da logo do adulto segue a cor escolhida, como no kids', () => {
    expect(adulto).toContain('--logo-zero-claro-de: var(--sz-community-action)')
    expect(adulto).toContain('--logo-zero-escuro-de: var(--sz-community-action-light)')
  })

  it('⚠️ mas o ESTADO não segue: sucesso e erro ficam literais de propósito', () => {
    // No tema azul o verde de sucesso deixa de coincidir com a ação, e é isso que se quer: o ✓ de
    // aula concluída não pode virar rosa quando a criança escolhe rosa.
    expect(adulto).toContain('--pen-sucesso: #0b7a54')
    expect(adulto).toContain('--pen-alerta: #d92d34')
    expect(adulto).toContain('--accent: var(--pen-sucesso)')
    expect(adulto).toContain('--destructive: var(--pen-alerta)')
  })

  /**
   * ⭐ Esta guarda cresce SOZINHA com o registro: ela varre todo valor que o gerador produz, em
   * TODA paleta, em vez de uma lista de cinco hexadecimais que alguém precisava lembrar de
   * atualizar. Um valor repetido no consumidor é um valor que deixa de seguir a cor que a pessoa
   * escolheu — ele fica parado enquanto o resto da tela muda.
   */
  it('⚠️⚠️ nenhum consumidor repete um valor que a paleta produz', () => {
    // ⚠️ Descontam-se os valores que TAMBÉM são token fixo: escrever `#0b7a54` literal pode ser
    // legítimo, porque é o verde de identidade da casa — o `--success` e o `--accent` do kids são
    // ESTADO e têm de ficar parados enquanto a paleta anda. A regra é sobre o valor que existe
    // *só* como cor de paleta: esse, repetido, fica parado enquanto o resto da tela muda.
    const invariantes = new Set<string>(Object.values(FIXED_TOKENS))
    const gerados = new Set(
      PALETTES.flatMap((id) => Object.values(derivePaletteTokens(id))).filter(
        (hex) => !invariantes.has(hex),
      ),
    )
    const consumers = withoutComments(`${platform}\n${funnel}\n${adulto}`).toLowerCase()
    const repetidos = [...gerados].filter((hex) => consumers.includes(hex.toLowerCase()))
    expect(repetidos).toEqual([])
  })
})
