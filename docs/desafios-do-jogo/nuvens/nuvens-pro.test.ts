import { expect, test } from 'bun:test'
import {
  isProCheckProject,
  proCheckSourceFiles,
} from '../../../packages/studio/src/check/serverCheck'
import { conferirDesafioC02 } from '../textos-c02'
import { criarManifestoPro } from './gerar-manifesto-pro'
import {
  ERROS_DAS_NUVENS_PRO,
  type ErroDasNuvensPro,
  MAIN_DAS_NUVENS,
  MODELO_PRO,
  regrasDasNuvens,
} from './pro-projetos'

test('C02 Nuvens em Pro: JSON corresponde à fonte e cumpre as réguas comuns', async () => {
  for (const publico of ['kids', 'adulto'] as const) {
    const manifesto = criarManifestoPro(publico)
    const arquivo = `./nuvens-pro${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`
    expect(await Bun.file(new URL(arquivo, import.meta.url)).json()).toEqual(manifesto)
    for (const d of manifesto.desafios) {
      expect(d.ilha).toBe('nuvens')
      conferirDesafioC02(d)
      for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
        expect(isProCheckProject(raw)).toBe(true)
        expect(raw).toMatchObject({
          kind: 'pro',
          mode: 'code',
          proMeta: { templateId: MODELO_PRO },
        })
        // O que o executor recebe: o modelo e a apresentação, em arquivos separados.
        const arquivos = proCheckSourceFiles(raw as Parameters<typeof proCheckSourceFiles>[0])
        expect(Object.keys(arquivos)).toEqual(
          expect.arrayContaining(['index.html', 'src/main.ts', 'src/regras.ts']),
        )
      }
      for (const o of d.conteudo.objetivos) {
        expect(o.programmingLanguage).toBe('javascript')
        if (o.rule.type === 'functionReturns') expect(o.rule.module).toBe('src/regras.ts')
      }
    }
  }
})

test('o modelo fica separado da apresentação, e a apresentação é igual no inicial e no gabarito', () => {
  expect(MAIN_DAS_NUVENS).toContain("from './regras'")
  for (const nome of ['podeConstruir', 'construir', 'colher', 'salvar', 'carregar', 'remover'])
    for (const versao of ['inicial', 'gabarito'] as const)
      expect(regrasDasNuvens(versao)).toContain(`export function ${nome}(`)
  // As regras não tocam a tela nem o armazenamento: o main.ts é quem usa localStorage.
  expect(regrasDasNuvens('gabarito')).not.toMatch(/document|localStorage|window/)
  for (const erro of Object.keys(ERROS_DAS_NUVENS_PRO) as ErroDasNuvensPro[])
    expect(regrasDasNuvens(erro)).not.toBe(regrasDasNuvens('gabarito'))
})
