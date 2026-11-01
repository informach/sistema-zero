import { expect, test } from 'bun:test'
import {
  linguagemDoProjeto,
  postoDoCursoBase,
} from '../../../packages/arquipelago-contracts/src/desafios'
import {
  EXECUTION_LIMITS,
  executionRuleBudgetMs,
  isSectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import {
  isSectionCompletion,
  type SectionProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { evaluateStudioProjectStructure } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { criarManifestoDaLinguagem, type LinguagemDoFarol } from './gerar-manifesto-linguagens'
import { codigoDoFarolPython } from './linguagens'

const LINGUAGEM: Record<LinguagemDoFarol, ReturnType<typeof linguagemDoProjeto>> = {
  python: 'python',
  ponte: 'texto',
  pro: 'pro',
}

for (const linguagem of ['python', 'ponte', 'pro'] as const)
  test(`Farol em ${linguagem}: o arquivo corresponde à fonte e cumpre as réguas (A29)`, async () => {
    for (const publico of ['kids', 'adulto'] as const) {
      const manifesto = criarManifestoDaLinguagem(linguagem, publico)
      expect(
        await Bun.file(
          new URL(
            `./farol-${linguagem}${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
            import.meta.url,
          ),
        ).json(),
      ).toEqual(manifesto)
      const [d] = manifesto.desafios
      if (!d) throw Error('sem desafio')
      expect(d.ilha).toBe('farol')
      expect(d.tipo).toBe('quadro-das-cores')
      expect(d.quadro).toBe({ python: 2, ponte: 3, pro: 4 }[linguagem])
      expect(d.publicar).toBe(true)
      expect(d.conteudo.recompensa.cor).toBe(false)
      expect(d.conteudo.recompensa.atracao).toBe('meu-jogo-do-arquipelago')
      // A linguagem sai do projeto inicial e decide o curso-base que abre o quadro.
      for (const p of [d.conteudo.projetoInicial, d.conteudo.gabarito])
        expect(linguagemDoProjeto(p)).toBe(LINGUAGEM[linguagem])
      expect(postoDoCursoBase(LINGUAGEM[linguagem], 'farol')).toBe(
        ({ python: 'explorer', ponte: 'architect', pro: 'champion' } as const)[linguagem],
      )
      const textos = [
        d.conteudo.titulo,
        d.conteudo.enunciado,
        ...d.conteudo.dicas,
        d.conteudo.desafioExtra?.texto,
        ...d.conteudo.objetivos.flatMap((o) => [o.label, o.hint]),
      ].filter((t): t is string => typeof t === 'string')
      for (const texto of textos) {
        expect(texto, d.slug).not.toMatch(/[!—]/)
        expect(texto.split(/[.\n]/)[0], d.slug).not.toContain('?')
      }
      const checks = d.conteudo.objetivos as unknown as SectionProjectCheck[]
      expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks })).toBe(true)
      expect(checks.some((c) => !c.optional)).toBe(true)
      // Lenda (lacunas, 01/11/2026): o extra é a versão 2, conferida pelo serviço, sem objetivo
      // opcional; o aprovado vai à revisão humana.
      expect(checks.some((c) => c.optional)).toBe(false)
      expect(d.conteudo.recompensa.extraNaVersao2).toBe(true)
      expect(d.conteudo.recompensa.revisaoHumana).toBe(true)
      const espera = checks.reduce(
        (s, c) =>
          s +
          (isSectionExecutionRule(c.rule as { type: string })
            ? executionRuleBudgetMs(c.rule as Parameters<typeof executionRuleBudgetMs>[0])
            : 0),
        0,
      )
      expect(espera).toBeLessThanOrEqual(EXECUTION_LIMITS.maxSectionWaitMs)
      // A Ponte confere pela regra causal: o gabarito cumpre, o inicial não.
      if (linguagem === 'ponte')
        for (const c of checks) {
          if (isSectionExecutionRule(c.rule as { type: string })) continue
          // A Ponte é JavaScript: as regras de estrutura são as do Estúdio clássico.
          const regra = c.rule as Parameters<typeof evaluateStudioProjectStructure>[0]
          expect(evaluateStudioProjectStructure(regra, d.conteudo.gabarito), c.id).toBe(true)
          expect(evaluateStudioProjectStructure(regra, d.conteudo.projetoInicial), c.id).toBe(false)
        }
    }
  })

test('o Python do Farol começa aberto: a janela, o guia andando e a ficha vazia', () => {
  const inicial = codigoDoFarolPython('inicial')
  expect(inicial).toContain('guia = Rect((60, 400), (40, 40))')
  // Nada de cenário pronto: sem estrela, sem pontos.
  expect(inicial).not.toContain('estrela')
  expect(inicial).not.toContain('pontos')
  expect(inicial).toContain('OBJETIVO = ""')
  expect(inicial).toContain('FUNCIONALIDADE_3 = ""')
  expect(inicial).toContain('guia.x = guia.x + 4')
  expect(inicial).toContain('def on_key_down(key):\n    pass')
  const gabarito = codigoDoFarolPython('gabarito')
  expect(gabarito).toContain('if key == keys.R:')
  expect(gabarito).not.toContain('OBJETIVO = ""')
})
