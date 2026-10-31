import { expect, test } from 'bun:test'
import { sectionProjectChecksEnvironmentIssue } from '../../../packages/core/src/learning/python-project-checks'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { StudioProjectDocumentSchema } from '../../../packages/core/src/studio/project-document'
import { AMBIENTE_PYTHON_C02 } from '../ambiente-python'
import { conferirDesafioC02 } from '../textos-c02'
import { criarManifestoPython } from './gerar-manifesto-python'
import {
  codigoDoPico,
  ERROS_DO_PICO_PYTHON,
  type ErroDoPicoPython,
  PLATAFORMAS_DA_FASE_1,
} from './python-projetos'

test('C02 Pico em Python: JSON corresponde à fonte e cumpre as réguas comuns', async () => {
  for (const publico of ['kids', 'adulto'] as const) {
    const manifesto = criarManifestoPython(publico)
    const arquivo = `./pico-python${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`
    expect(await Bun.file(new URL(arquivo, import.meta.url)).json()).toEqual(manifesto)
    for (const d of manifesto.desafios) {
      expect(d.ilha).toBe('pico')
      conferirDesafioC02(d)
      for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
        const projeto = StudioProjectDocumentSchema.parse(raw)
        expect(projeto).toMatchObject({
          programmingLanguage: 'python',
          kind: 'classic',
          runtime: { manifestSha256: AMBIENTE_PYTHON_C02.manifestSha256 },
        })
        expect(
          sectionProjectChecksEnvironmentIssue(
            d.conteudo.objetivos as unknown as SectionProjectCheck[],
            raw,
          ),
        ).toBeNull()
      }
    }
  }
})

test('as fases são dados: o gabarito só acrescenta a terceira fase e completa três funções', () => {
  expect(PLATAFORMAS_DA_FASE_1).toBe(29)
  const gabarito = codigoDoPico('gabarito')
  const inicial = codigoDoPico('inicial')
  expect(gabarito).not.toMatch(/^\s*class\s/m)
  // O laço do jogo, a montagem e o desenho são o apoio: iguais no inicial e no gabarito.
  const apoio = (codigo: string) => codigo.slice(codigo.indexOf('def montar'))
  expect(apoio(inicial)).toBe(apoio(gabarito))
  for (const fase of [inicial, gabarito])
    for (const bloco of fase.matchAll(/\[\n((?: {8}"[^"]*",\n)+) {4}\]/g)) {
      const linhas = bloco[1]!.trim().split('\n')
      expect(linhas).toHaveLength(12)
      for (const linha of linhas) expect(linha.trim()).toMatch(/^"[.#CSJ]{16}",$/)
      for (const letra of ['J', 'C', 'S']) expect(bloco[1]!.split(letra).length - 1).toBe(1)
    }
  for (const erro of Object.keys(ERROS_DO_PICO_PYTHON) as ErroDoPicoPython[])
    expect(codigoDoPico(erro)).not.toBe(gabarito)
})
