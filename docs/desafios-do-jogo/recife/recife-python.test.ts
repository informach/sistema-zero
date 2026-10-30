import { expect, test } from 'bun:test'
import { sectionProjectChecksEnvironmentIssue } from '../../../packages/core/src/learning/python-project-checks'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { StudioProjectDocumentSchema } from '../../../packages/core/src/studio/project-document'
import { AMBIENTE_PYTHON_C02 } from '../ambiente-python'
import { conferirDesafioC02 } from '../textos-c02'
import { criarManifestoPython } from './gerar-manifesto-python'
import { codigoDoRecife, ERROS_DO_RECIFE_PYTHON, type ErroDoRecifePython } from './python-projetos'

test('C02 Recife em Python: JSON corresponde à fonte e cumpre as réguas comuns', async () => {
  for (const publico of ['kids', 'adulto'] as const) {
    const manifesto = criarManifestoPython(publico)
    const arquivo = `./recife-python${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`
    expect(await Bun.file(new URL(arquivo, import.meta.url)).text()).toBe(
      `${JSON.stringify(manifesto, null, 2)}\n`,
    )
    for (const d of manifesto.desafios) {
      expect(d.ilha).toBe('recife')
      conferirDesafioC02(d)
      for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
        // Documento Python que o Estúdio aceita, no ambiente da prova, com Pygame Zero.
        const projeto = StudioProjectDocumentSchema.parse(raw)
        expect(projeto).toMatchObject({
          programmingLanguage: 'python',
          kind: 'classic',
          runtime: {
            profileId: AMBIENTE_PYTHON_C02.profileId,
            manifestSha256: AMBIENTE_PYTHON_C02.manifestSha256,
          },
        })
        expect(projeto.installedExtensions.map((e) => e.id)).toEqual(['python-pgzero'])
        // A mesma conferência de ambiente do Members (perfil, orçamento e gráfico Pygame Zero).
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

test('repertório do Explorador: sem listas, sem classes; o apoio fica igual no inicial', () => {
  const gabarito = codigoDoRecife('gabarito')
  const inicial = codigoDoRecife('inicial')
  for (const codigo of [gabarito, inicial]) {
    expect(codigo).not.toMatch(/^\s*class\s/m)
    expect(codigo).not.toContain('[')
    expect(codigo).not.toMatch(/\bappend\(|\blist\(/)
  }
  // O desenho e o estado inicial não mudam: só as quatro funções.
  const fora = (codigo: string) => codigo.slice(codigo.indexOf('def draw'))
  expect(fora(inicial)).toBe(fora(gabarito))
  expect(inicial.slice(0, inicial.indexOf('def sortear_toca'))).toBe(
    gabarito.slice(0, gabarito.indexOf('def sortear_toca')),
  )
  for (const erro of Object.keys(ERROS_DO_RECIFE_PYTHON) as ErroDoRecifePython[])
    expect(codigoDoRecife(erro)).not.toBe(gabarito)
})
