import { afterEach, expect, test } from 'bun:test'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import { digestAssetBytes } from '../core/assetBinary'
import { createEmptyProject } from '../core/project'
import { prepararImportacaoDeCena3D } from '../core/scene3d/importar'
import { captureProjectStorageScope, setProjectStorageNamespace } from './projectStorageRuntime'
import { createProjectStore } from './projectStore'

const namespaceAnterior = captureProjectStorageScope().namespace
afterEach(() => setProjectStorageNamespace(namespaceAnterior))

async function pacote(): Promise<PacoteCompilado> {
  const bytes = new Uint8Array(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
        'base64',
      ),
    ),
    arquivo = {
      caminho: 'imagens/flor.png',
      mime: 'image/png',
      papel: 'textura',
      largura: 1,
      altura: 1,
      bytes: bytes.length,
      digest: await digestAssetBytes(bytes),
    }
  return {
    arquivos: new Map([[arquivo.caminho, bytes]]),
    cena: lerCenaCompilada({
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Vila',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { cenario: 'vila', revisao: 3, digest: 'a'.repeat(64) },
      arquivos: [arquivo],
      entidades: [],
      nos: [],
      colisoes: [],
      aguas: [],
      caminhos: [],
      marcadores: [],
      texturas: [{ id: 'flor', arquivo: arquivo.caminho }],
      fontes: { modelos: [], texturas: [], conjuntos: [] },
      licencas: [],
      ambiente: { hora: 12 },
    }),
  }
}
async function fixture() {
  const store = createProjectStore(),
    project = createEmptyProject('cena-atomica', 'Jogo')
  project.files['script.js'] = 'const programaDaCrianca = 42;'
  store.setState({ project, isDirty: false })
  return { store, project, plano: await prepararImportacaoDeCena3D(project, await pacote()) }
}

test('importação aplica cena e recursos em uma atualização e conserva o programa', async () => {
  const { store, project, plano } = await fixture()
  let mudancas = 0
  const off = store.subscribe(() => mudancas++)
  expect(await store.getState().importScene3DBundle(plano)).toBeNull()
  expect(mudancas).toBe(1)
  expect(store.getState().project?.assets).toEqual(plano.assets)
  expect(store.getState().project?.files).toEqual(project.files)
  expect(store.getState().isDirty).toBe(true)
  off()
})

test('reimportação idêntica não grava outra revisão nem marca o projeto como sujo', async () => {
  const { store, plano } = await fixture()
  expect(await store.getState().importScene3DBundle(plano)).toBeNull()
  store.setState({ isDirty: false })
  const atual = store.getState().project!,
    repetido = await prepararImportacaoDeCena3D(atual, await pacote())
  let mudancas = 0
  const off = store.subscribe(() => mudancas++)
  expect(await store.getState().importScene3DBundle(repetido)).toBeNull()
  expect(store.getState().project).toBe(atual)
  expect(store.getState().isDirty).toBe(false)
  expect(mudancas).toBe(0)
  off()
})

test('projeto editado após o preparo recusa o plano antigo sem perder o código novo', async () => {
  const { store, project, plano } = await fixture(),
    atual = { ...project, files: { ...project.files, 'script.js': 'const edicaoNova = 99;' } }
  store.setState({ project: atual })
  expect(await store.getState().importScene3DBundle(plano)).toMatch(/mudou/i)
  expect(store.getState().project).toBe(atual)
})

test('edição durante a conferência recusa o commit inteiro', async () => {
  const { store, project, plano } = await fixture(),
    pending = store.getState().importScene3DBundle(plano),
    atual = { ...project, name: 'Edição mais recente' }
  store.setState({ project: atual })
  expect(await pending).toMatch(/mudou/i)
  expect(store.getState().project).toBe(atual)
  expect(store.getState().project?.assets ?? []).toEqual([])
})

test('mudança de conteúdo também invalida a base quando o objeto mantém a mesma referência', async () => {
  const { store, project, plano } = await fixture(),
    pending = store.getState().importScene3DBundle(plano)
  project.files['script.js'] = 'const textoAtual = 100;'
  expect(await pending).toMatch(/mudou/i)
  expect(store.getState().project).toBe(project)
  expect(store.getState().project?.files?.['script.js']).toBe('const textoAtual = 100;')
  expect(store.getState().project?.assets ?? []).toEqual([])
})

test('troca de perfil A → B → A invalida a operação mesmo sem trocar o objeto do projeto', async () => {
  setProjectStorageNamespace('cena-perfil-a')
  const { store, project, plano } = await fixture(),
    pending = store.getState().importScene3DBundle(plano)
  setProjectStorageNamespace('cena-perfil-b')
  setProjectStorageNamespace('cena-perfil-a')
  expect(await pending).toMatch(/perfil|mudou/i)
  expect(store.getState().project).toBe(project)
})

test('cancelamento e perda de acesso não escrevem cena parcial', async () => {
  const { store, project, plano } = await fixture(),
    controller = new AbortController(),
    pending = store.getState().importScene3DBundle(plano, controller.signal)
  controller.abort()
  expect(await pending).toMatch(/cancel|abort/i)
  expect(store.getState().project).toBe(project)
  const observing = store.getState().importScene3DBundle(plano)
  store.getState().setEditingAccess('observer')
  expect(await observing).toMatch(/observa|acesso/i)
  expect(store.getState().project).toBe(project)
})

test('plano adulterado é recusado e bytes capturados não mudam após o início', async () => {
  const { store, project, plano } = await fixture(),
    adulterado = structuredClone(plano)
  adulterado.assets[0]!.dataUrl = 'data:application/vnd.sistemazero.cena3d+json;base64,e30='
  expect(await store.getState().importScene3DBundle(adulterado)).toBeString()
  expect(store.getState().project).toBe(project)
  const pending = store.getState().importScene3DBundle(plano)
  plano.assets.length = 0
  expect(await pending).toBeNull()
  expect(store.getState().project?.assets).toHaveLength(2)
})
