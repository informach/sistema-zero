import { expect, test } from 'bun:test'
import { projectBlockTypes } from '../../../packages/studio/src/core/projectDocumentGuards'
import {
  GENERATED_JS_HEADER,
  generateProjectFiles,
} from '../../../packages/studio/src/generators/project'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { runBridgeReverseParse } from '../../../packages/studio/src/modes/bridgeReverseParse'
import { conferirDesafioC02 } from '../textos-c02'
import { criarManifestoTexto } from './gerar-manifesto-texto'
import { codigoDoVale, ERROS_DO_VALE, type ErroDoVale, montarProjetoTexto } from './texto-projetos'

test('C02 Vale em texto: JSON corresponde à fonte e cumpre as réguas comuns', async () => {
  for (const publico of ['kids', 'adulto'] as const) {
    const manifesto = criarManifestoTexto(publico)
    const arquivo = `./vale-texto${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`
    // O arquivo sai do gerador já formatado pelo Biome (`gravar-manifesto.ts`): vale o conteúdo.
    expect(await Bun.file(new URL(arquivo, import.meta.url)).json()).toEqual(manifesto)
    expect(manifesto.desafios).toHaveLength(1)
    for (const d of manifesto.desafios) {
      expect(d.ilha).toBe('vale-dos-dinos')
      conferirDesafioC02(d)
      for (const o of d.conteudo.objetivos) expect(o.programmingLanguage).toBe('javascript')
    }
  }
})

test('os projetos são JavaScript clássico na Ponte, e a Ponte reconhece o código guardado', () => {
  for (const versao of ['inicial', 'gabarito'] as const) {
    const projeto = montarProjetoTexto(versao)
    expect(projeto).toMatchObject({ programmingLanguage: 'javascript', mode: 'bridge' })
    const ir = SZIRV2Schema.parse(projeto.ir)
    expect(projectBlockTypes(projeto.blocksState).length).toBeGreaterThan(0)
    // Os arquivos são os que o gerador produz do IR: abrir na Ponte não muda nada.
    expect(projeto.files).toEqual(
      generateProjectFiles({ ir, projectName: projeto.name, jsHeader: GENERATED_JS_HEADER }),
    )
    const lido = runBridgeReverseParse({
      files: projeto.files,
      html: ir.html,
      cssSource: projeto.files['style.css'],
      jsSource: projeto.files['script.js'],
      ir,
      projectName: projeto.name,
      installedExtensionIds: [],
    })
    expect(lido.kind).toBe('generated-match')
  }
})

test('o inicial só difere do gabarito nas três funções e no R; cada erro muda uma parte', () => {
  const linhas = (texto: string) => new Set(texto.split('\n'))
  const gabarito = codigoDoVale('gabarito')
  const inicial = codigoDoVale('inicial')
  const faltam = [...linhas(gabarito)].filter((l) => !linhas(inicial).has(l))
  // Nada do apoio (andar, atualizar, desenhar, Enter) muda.
  for (const apoio of ['function andar', 'function atualizar', 'function desenhar', "'Enter'"])
    expect(faltam.some((l) => l.includes(apoio))).toBe(false)
  for (const erro of Object.keys(ERROS_DO_VALE) as ErroDoVale[]) {
    expect(codigoDoVale(erro)).not.toBe(gabarito)
    expect(() => montarProjetoTexto(erro)).not.toThrow()
  }
})
