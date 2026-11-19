import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import type { CenaCompilada, PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import { encodeGlbContainer, readGltfDocument } from '../../../../molda/src/import/gltf'
import { exemplo, glb } from '../../../../molda-cenarios-motor/tests/fixtures/glb-compilacao'
import { RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { decodeProjectAsset, digestAssetBytes, encodeAssetBase64 } from '../assetBinary'
import { createEmptyProject } from '../project'
import type { ProjectAsset } from '../projectAssets'
import { buildPythonAssetBundle } from '../pythonAssets'
import {
  OrcamentoDeImportacaoDeCenaExcedido,
  prepararImportacaoDeCena3D,
} from '../scene3d/importar'
import { aplicarFontesPythonDoCenario } from '../scene3d/python'
import { lerAssetDeCena3D } from '../scene3d/referencias'
import { assertScene3DAssets } from '../scene3d/validacao'

async function pacote(
  instancias = 1,
  malhasPorArquivo = 1,
  tamanho?: number,
): Promise<PacoteCompilado> {
  const m = exemplo()
  m.j.nodes = Array.from({ length: malhasPorArquivo }, () => ({ mesh: 0 }))
  m.j.scenes = [{ nodes: m.j.nodes.map((_, i) => i) }]
  let bin = m.bin,
    bytes = glb(m.j, bin)
  if (tamanho) {
    // A real GLB with unused BIN capacity, not a fake MIME/header or a forged mesh count.
    for (let i = 0; i < 8 && bytes.byteLength !== tamanho; i++) {
      bin = new Uint8Array(bin.byteLength + tamanho - bytes.byteLength)
      m.j.buffers[0]!.byteLength = bin.byteLength
      bytes = glb(m.j, bin)
    }
    if (bytes.byteLength !== tamanho) throw Error('fixture size')
  }
  const arquivo = {
      caminho: 'modelos/arvore.glb',
      digest: await digestAssetBytes(bytes),
      bytes: bytes.byteLength,
      mime: 'model/gltf-binary' as const,
      papel: 'modelo' as const,
      malhas: malhasPorArquivo,
      triangulos: malhasPorArquivo,
      verticesMaximos: 3,
    },
    cena: CenaCompilada = {
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Faísca',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { cenario: 'faisca', revisao: 3, digest: 'a'.repeat(64) },
      arquivos: [arquivo],
      entidades: [],
      nos: Array.from({ length: instancias }, (_, i) => ({
        id: `no-${i}`,
        entidade: null,
        arquivo: arquivo.caminho,
        matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, i, 0, 0, 1],
        volume: { min: { x: i, y: 0, z: 0 }, max: { x: i, y: 0, z: 0 } },
      })),
      colisoes: [],
      aguas: [],
      caminhos: [],
      marcadores: [],
      texturas: [],
      fontes: { modelos: [], texturas: [], conjuntos: [] },
      licencas: [],
      ambiente: { hora: 12 },
    }
  return { cena, arquivos: new Map([[arquivo.caminho, bytes]]) }
}

test('Python Classic/Pro prepara recursos e módulo ao lado do entrypoint sem alterar as fontes', async () => {
  for (const kind of ['classic', 'pro'] as const) {
    const { project } = await pythonEnvironmentFixture(kind)
    project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
    if (project.kind === 'pro') {
      const main = project.tree[project.python.entrypoint]
      if (main?.kind !== 'file') throw Error('fixture')
      project.tree.src = { kind: 'dir' }
      project.tree['src/main.py'] = main
      project.python.entrypoint = 'src/main.py'
    }
    const antes = canonicalJson(project),
      p = await pacote(),
      origem = canonicalJson(p.cena),
      plano = await prepararImportacaoDeCena3D(project, p)
    expect(canonicalJson(project)).toBe(antes)
    expect(canonicalJson(p.cena)).toBe(origem)
    expect(plano.fontesPython).toHaveLength(1)
    const fonte = plano.fontesPython![0]!,
      primario = plano.assets.find((a) => a.id === plano.assetId)!
    expect(primario.cena3dPython?.modulo).toBe(fonte.caminho)
    expect(fonte.texto).toContain('arquivos=_ARQUIVOS')
    expect(fonte.texto).toContain(`.parents[${project.python.entrypoint.split('/').length - 1}]`)
    expect(plano.assets.find((a) => a.kind === 'model3d')?.proPath).toStartWith('cenarios/modelos/')
    const aplicado = aplicarFontesPythonDoCenario(project, plano.assets, plano.fontesPython ?? []),
      layout =
        aplicado.kind === 'pro'
          ? Object.entries(aplicado.tree).flatMap(([p, n]) => (n.kind === 'file' ? [p] : []))
          : Object.keys(aplicado.files),
      bundle = await buildPythonAssetBundle(aplicado.assets, { files: layout })
    expect(bundle.files.has(primario.proPath!)).toBe(true)
    const repetido = await prepararImportacaoDeCena3D(aplicado, p)
    expect(repetido.assets).toEqual(plano.assets)
    expect(repetido.fontesPython).toEqual([])
    expect(repetido.adicionados).toBe(0)
  }
})

test('Python conserva módulos autorais e fontes geradas editadas, com nomes livres e aviso de precedência', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw Error('fixture')
  project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
  project.files['cenario.py'] = 'IDENTIDADE = "autoral"\n'
  const p = await pacote(),
    primeiro = await prepararImportacaoDeCena3D(project, p),
    caminho = primeiro.fontesPython![0]!.caminho
  project.files[caminho] = '# arquivo autoral com nome coincidente\n'
  const plano = await prepararImportacaoDeCena3D(project, p)
  expect(plano.fontesPython![0]!.caminho).not.toBe(caminho)
  expect(plano.avisos?.join(' ')).toContain('prioridade')
  const aplicado = aplicarFontesPythonDoCenario(project, plano.assets, plano.fontesPython ?? [])
  if (aplicado.kind !== 'classic') throw Error('fixture')
  const gerado = plano.fontesPython![0]!.caminho
  aplicado.files[gerado] = '# minha edição do módulo gerado\n'
  const repetido = await prepararImportacaoDeCena3D(aplicado, p)
  expect(repetido.fontesPython).toEqual([])
  expect(aplicado.files['cenario.py']).toBe(project.files['cenario.py'])
  expect(aplicado.files[caminho]).toBe(project.files[caminho])
  expect(aplicado.files[gerado]).toBe('# minha edição do módulo gerado\n')
})

test('Python sem Raylib 3D recusa a importação e conserva o documento', async () => {
  const { project } = await pythonEnvironmentFixture('classic'),
    antes = canonicalJson(project)
  await expect(prepararImportacaoDeCena3D(project, await pacote())).rejects.toThrow('Raylib 3D')
  expect(canonicalJson(project)).toBe(antes)
})

test('Python reaproveita o arquivo existente e resolve dois caminhos lógicos sem duplicar bytes', async () => {
  const { project } = await pythonEnvironmentFixture('classic'),
    p = await pacote(),
    original = p.cena.arquivos[0]!,
    outro = { ...original, caminho: 'outros/arvore.glb' }
  project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
  project.assets = [
    {
      id: 'modelo-da-crianca',
      name: 'meu-bosque',
      kind: 'model3d',
      source: 'upload',
      originalFileName: 'arvore.glb',
      proPath: 'models/minha-arvore.glb',
      dataUrl: `data:${original.mime};base64,${encodeAssetBase64(p.arquivos.get(original.caminho)!)}`,
    },
  ]
  p.cena.arquivos.push(outro)
  p.arquivos = new Map([...p.arquivos, [outro.caminho, p.arquivos.get(original.caminho)!]])
  p.cena.nos.push({ ...p.cena.nos[0]!, id: 'segunda', arquivo: outro.caminho })
  const antes = canonicalJson(project),
    plano = await prepararImportacaoDeCena3D(project, p),
    primario = plano.assets.find((a) => a.id === plano.assetId)!,
    cena = lerAssetDeCena3D(primario)
  expect(plano.assets.filter((a) => a.kind === 'model3d')).toEqual(project.assets)
  expect(cena.recursos.map((r) => r.asset)).toEqual(['modelo-da-crianca', 'modelo-da-crianca'])
  expect(cena.cena.arquivos.map((a) => a.caminho)).toEqual([original.caminho, outro.caminho])
  expect(plano.fontesPython![0]!.texto).toContain('models/minha-arvore.glb')
  const bundle = await buildPythonAssetBundle(plano.assets)
  expect([...bundle.files.keys()].sort()).toEqual(
    ['models/minha-arvore.glb', primario.proPath!].sort(),
  )
  expect(canonicalJson(project)).toBe(antes)
})

test('Python recusa colisão de pasta/material e nunca sobrescreve fonte pelo aplicador', async () => {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw Error('fixture')
  project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
  const antes = canonicalJson(project)
  expect(() =>
    aplicarFontesPythonDoCenario(
      project,
      [],
      [{ caminho: project.python.entrypoint, texto: 'outra fonte' }],
    ),
  ).toThrow('colide')
  expect(canonicalJson(project)).toBe(antes)
  project.files.cenarios = '# arquivo autoral que impede a pasta de assets\n'
  const bloqueado = canonicalJson(project)
  await expect(prepararImportacaoDeCena3D(project, await pacote())).rejects.toThrow(/conflit|colid/)
  expect(canonicalJson(project)).toBe(bloqueado)
})

test('Python adapta vínculos equivalentes pela conversão Raylib compartilhada, sem alterar o pacote de origem', async () => {
  const { inspecionarGlbDaCompilacao } = await import('@sistemazero/molda-cenarios-motor/conteudo'),
    leitura = readGltfDocument(
      new Uint8Array(
        readFileSync(
          new URL('../../../scripts/raylib/scenes/assets/models/molda-pesos.glb', import.meta.url),
        ),
      ),
    )
  if (leitura.status !== 'ready') throw Error('fixture')
  // Two equivalent bindings in an encoded GLB, using the real fixture's geometry/BIN/clips.
  const json = structuredClone(leitura.document.source.json),
    skins = json.skins as Record<string, unknown>[]
  json.skins = [skins[0], structuredClone(skins[0])]
  let indice = 0
  for (const node of json.nodes as Record<string, unknown>[])
    if (node.skin !== undefined) node.skin = indice++ % 2
  const bytes = encodeGlbContainer(json, leitura.document.resources.buffers),
    medidas = inspecionarGlbDaCompilacao(bytes),
    p = await pacote(),
    arquivo = p.cena.arquivos[0]!,
    antes = bytes.slice(),
    { project } = await pythonEnvironmentFixture('classic')
  Object.assign(arquivo, {
    digest: await digestAssetBytes(bytes),
    bytes: bytes.length,
    malhas: medidas.malhas,
    triangulos: medidas.triangulos,
    verticesMaximos: medidas.verticesMaximos,
  })
  p.arquivos = new Map([[arquivo.caminho, bytes]])
  p.cena.nos[0]!.preservarHierarquia = true
  project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
  const original = canonicalJson(p.cena),
    plano = await prepararImportacaoDeCena3D(project, p),
    convertido = plano.assets.find((a) => a.kind === 'model3d')!,
    a = readGltfDocument(bytes),
    b = readGltfDocument(decodeProjectAsset(convertido.dataUrl).bytes)
  if (a.status !== 'ready' || b.status !== 'ready') throw Error('fixture')
  expect(a.document.skins.length).toBeGreaterThan(1)
  expect(b.document.skins).toHaveLength(1)
  expect(b.document.source.json.animations).toEqual(a.document.source.json.animations)
  expect(b.document.resources.buffers).toEqual(a.document.resources.buffers)
  expect(plano.avisos?.join(' ')).toContain('equivalentes')
  expect(canonicalJson(p.cena)).toBe(original)
  expect(bytes).toEqual(antes)
})

test('preparo conta instâncias/partes reais: 48 cabe, 49 é excesso nominal e não altera o projeto', async () => {
  const projeto = createEmptyProject('p', 'Jogo'),
    antes = JSON.stringify(projeto),
    plano = await prepararImportacaoDeCena3D(projeto, await pacote(24, 2))
  expect(plano.orcamento.malhas).toBe(48)
  expect(plano.orcamento.permitido).toBe(true)
  expect(plano.assets.filter((a) => a.kind === 'model3d')).toHaveLength(1)
  let erro: unknown
  try {
    await prepararImportacaoDeCena3D(projeto, await pacote(49))
  } catch (e) {
    erro = e
  }
  expect(erro).toBeInstanceOf(OrcamentoDeImportacaoDeCenaExcedido)
  if (!(erro instanceof OrcamentoDeImportacaoDeCenaExcedido)) throw Error('missing typed budget')
  expect(erro.orcamento.excessos).toContainEqual({ tipo: 'malhas', atual: 49, limite: 48 })
  expect(erro.orcamento.sugerirJuncao).toBe(true)
  expect(JSON.stringify(projeto)).toBe(antes)
})

test('5 MiB por modelo é medido nos bytes reais, sem aceitar arredondamento', async () => {
  const projeto = createEmptyProject('p', 'Jogo'),
    limite = 5 * 1024 * 1024
  expect(
    (await prepararImportacaoDeCena3D(projeto, await pacote(1, 1, limite))).orcamento.permitido,
  ).toBe(true)
  await expect(
    prepararImportacaoDeCena3D(projeto, await pacote(1, 1, limite + 4)),
  ).rejects.toBeInstanceOf(OrcamentoDeImportacaoDeCenaExcedido)
})

test('reimportação conserva IDs e nomes; revisão nova compartilha bytes sem reescrever a anterior', async () => {
  const projeto = createEmptyProject('p', 'Jogo'),
    p = await pacote(),
    antes = JSON.stringify(p.cena),
    primeiro = await prepararImportacaoDeCena3D(projeto, p),
    renomeados = primeiro.assets.map((a) => ({ ...a, name: `meu-${a.name}` })),
    existente = { ...projeto, assets: renomeados },
    repetido = await prepararImportacaoDeCena3D(existente, p)
  expect(repetido.assets).toEqual(renomeados)
  expect(repetido.assetId).toBe(primeiro.assetId)
  expect(repetido.adicionados).toBe(0)
  const outraRevisao = {
      ...p,
      cena: { ...p.cena, fonte: { ...p.cena.fonte, revisao: 4, digest: 'b'.repeat(64) } },
    },
    novo = await prepararImportacaoDeCena3D(existente, outraRevisao)
  expect(novo.assets.filter((a) => a.kind === 'model3d')).toHaveLength(1)
  expect(novo.assets.filter((a) => a.kind === 'scene3d')).toHaveLength(2)
  expect(novo.assets.find((a) => a.id === primeiro.assetId)).toEqual(
    renomeados.find((a) => a.id === primeiro.assetId),
  )
  await assertScene3DAssets(novo.assets)
  expect(JSON.stringify(p.cena)).toBe(antes)
})

test('recursos idênticos em dois caminhos usam um asset e conservam os dois nós', async () => {
  const p = await pacote(),
    arquivo = { ...p.cena.arquivos[0]!, caminho: 'modelos/segunda.glb' }
  p.cena.arquivos.push(arquivo)
  p.arquivos = new Map([...p.arquivos, [arquivo.caminho, p.arquivos.get('modelos/arvore.glb')!]])
  p.cena.nos.push({ ...p.cena.nos[0]!, id: 'segundo', arquivo: arquivo.caminho })
  const plano = await prepararImportacaoDeCena3D(createEmptyProject('p', 'Jogo'), p),
    cena = plano.assets.find((a) => a.id === plano.assetId)!,
    envelope = lerAssetDeCena3D(cena)
  expect(plano.assets.filter((a) => a.kind === 'model3d')).toHaveLength(1)
  expect(new Set(envelope.recursos.map((r) => r.asset)).size).toBe(1)
  expect(envelope.cena.nos).toHaveLength(2)
  expect(plano.orcamento.malhas).toBe(2)
})

test('o orçamento inclui modelos comuns e bytes já presentes no projeto', async () => {
  const p = await pacote(47),
    outro = await pacote(1, 2),
    modelo: ProjectAsset = {
      id: 'existente',
      name: 'casa',
      kind: 'model3d',
      source: 'upload',
      originalFileName: 'casa.glb',
      dataUrl: `data:model/gltf-binary;base64,${encodeAssetBase64(outro.arquivos.get('modelos/arvore.glb')!)}`,
    },
    projeto = { ...createEmptyProject('p', 'Jogo'), assets: [modelo] }
  await expect(prepararImportacaoDeCena3D(projeto, p)).rejects.toBeInstanceOf(
    OrcamentoDeImportacaoDeCenaExcedido,
  )
  const audio = new Uint8Array(5 * 1024 * 1024),
    cheia = {
      ...projeto,
      assets: Array.from(
        { length: 5 },
        (_, i): ProjectAsset => ({
          id: `a${i}`,
          name: `som-${i}`,
          kind: 'audio',
          source: 'upload',
          dataUrl: `data:audio/wav;base64,${encodeAssetBase64(audio)}`,
        }),
      ),
    }
  let erro: unknown
  try {
    await prepararImportacaoDeCena3D(cheia, await pacote())
  } catch (e) {
    erro = e
  }
  expect(erro).toBeInstanceOf(OrcamentoDeImportacaoDeCenaExcedido)
  if (!(erro instanceof OrcamentoDeImportacaoDeCenaExcedido)) throw Error('missing typed budget')
  expect(
    erro.orcamento.excessos.some((e) => e.tipo === 'projeto' && e.atual > 24 * 1024 * 1024),
  ).toBe(true)
  expect(projeto.assets[0]).toBe(modelo)
})

test('falha e cancelamento não alteram o projeto ou escondem dependências', async () => {
  const p = await pacote(),
    projeto = createEmptyProject('p', 'Jogo'),
    controller = new AbortController()
  controller.abort()
  await expect(
    prepararImportacaoDeCena3D(projeto, p, { sinal: controller.signal }),
  ).rejects.toHaveProperty('name', 'AbortError')
  const antes = JSON.stringify(projeto),
    bytes = p.arquivos.get('modelos/arvore.glb')!
  bytes[bytes.length - 1] = 1
  await expect(prepararImportacaoDeCena3D(projeto, p)).rejects.toThrow(/hash/)
  expect(JSON.stringify(projeto)).toBe(antes)
})

test('uma cópia idêntica adicionada depois não muda os IDs já usados pela revisão', async () => {
  const p = await pacote(),
    projeto = createEmptyProject('p', 'Jogo'),
    primeiro = await prepararImportacaoDeCena3D(projeto, p),
    modelo = primeiro.assets.find((a) => a.kind === 'model3d')!,
    assets = [...primeiro.assets, { ...modelo, id: 'copia-com-outro-id', name: 'copia' }],
    repetido = await prepararImportacaoDeCena3D({ ...projeto, assets }, p)
  expect(repetido.assets).toEqual(assets)
  expect(repetido.assetId).toBe(primeiro.assetId)
  expect(repetido.adicionados).toBe(0)
})

test('preparo captura o projeto e o pacote antes de ceder execução', async () => {
  const p = await pacote(),
    projeto = createEmptyProject('p', 'Jogo'),
    original = canonicalJson(projeto),
    pending = prepararImportacaoDeCena3D(projeto, p)
  projeto.name = 'Outra edição'
  p.cena.nome = 'Outro cenário'
  const bytes = p.arquivos.get('modelos/arvore.glb')!
  bytes[bytes.length - 1] = 1
  const plano = await pending,
    cena = plano.assets.find((a) => a.id === plano.assetId)!
  expect(plano.baseHash).toBe(await sha256Hex(original))
  expect(lerAssetDeCena3D(cena).cena.nome).toBe('Faísca')
  await assertScene3DAssets(plano.assets)
})

test('a alternativa de junção usa o agrupador real e conserva a autoria original', async () => {
  const { juntarEstaticosDoPacote } = await import('@sistemazero/molda-cenarios-motor/compilar')
  const p = await pacote(49),
    antes = JSON.stringify(p.cena),
    agrupado = await juntarEstaticosDoPacote(p, new AbortController().signal),
    plano = await prepararImportacaoDeCena3D(createEmptyProject('p', 'Jogo'), agrupado)
  expect(plano.orcamento.malhas).toBeLessThan(49)
  expect(plano.orcamento.permitido).toBe(true)
  expect(JSON.stringify(p.cena)).toBe(antes)
})

test('nome de arquivo compilado longo conserva a procedência sem ultrapassar o nome do asset', async () => {
  const p = await pacote(),
    original = p.cena.arquivos[0]!.caminho,
    longo = `modelos/${'a'.repeat(170)}.glb`
  p.cena.arquivos[0]!.caminho = longo
  p.cena.nos[0]!.arquivo = longo
  p.arquivos = new Map([[longo, p.arquivos.get(original)!]])
  const plano = await prepararImportacaoDeCena3D(createEmptyProject('p', 'Jogo'), p),
    cena = plano.assets.find((a) => a.id === plano.assetId)!
  expect(plano.assets.every((a) => (a.originalFileName?.length ?? 0) <= 128)).toBe(true)
  expect(lerAssetDeCena3D(cena).cena.arquivos[0]!.caminho).toBe(longo)
  await assertScene3DAssets(plano.assets)
})
