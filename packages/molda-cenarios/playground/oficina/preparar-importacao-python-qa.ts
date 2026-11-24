import assert from 'node:assert/strict'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import { lerCenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import { isPythonProject } from '../../../studio/src/core/editableProject'
import { prepararImportacaoDeCena3D } from '../../../studio/src/core/scene3d/importar'
import { lerAssetDeCena3D, pacoteDeCena3D } from '../../../studio/src/core/scene3d/referencias'
import { buildPythonSourceFiles } from '../../../studio/src/export/pythonSource'
import { RAYLIB_3D_EXTENSION } from '../../../studio/src/runtime/python/raylib/contract'
import { pythonEnvironmentFixture } from '../../../studio/src/state/fixtures/pythonEnvironment'
import { createProjectStore } from '../../../studio/src/state/projectStore'
import { refinePythonProjectDocument } from '../../../studio/src/state/pythonProjectValidation'

// Read-only licensed input from the previous export proof, never versioned here.
const raiz = resolve(import.meta.dirname, '../../../..'),
  galeria = process.env.CENARIOS_QA_GALLERY_PROJECT_DIR,
  saida = resolve(
    raiz,
    galeria
      ? 'output/cenarios-reforma/lote8-studio-galeria/execucao-python'
      : 'output/cenarios-reforma/lote8-raylib/importacao-python',
  ),
  pacoteInicial = galeria ? null : await lerPacoteOriginal()

async function lerPacoteOriginal() {
  const entrada = resolve(raiz, 'output/cenarios-reforma/lote8-raylib/pacote/extraido'),
    cena = lerCenaCompilada(JSON.parse(await readFile(resolve(entrada, 'cenario.json'), 'utf8')))
  const arquivos = new Map(
    await Promise.all(
      cena.arquivos.map(
        async (a) =>
          [a.caminho, new Uint8Array(await readFile(resolve(entrada, a.caminho)))] as const,
      ),
    ),
  )
  return { cena, arquivos }
}

async function projetoDoEnsaio(kind: 'classic' | 'pro') {
  if (!galeria) return (await pythonEnvironmentFixture(kind)).project
  const arquivo = (await readdir(galeria)).find(
    (n) => n.startsWith(`python-${kind}-`) && n.endsWith('.project.json'),
  )
  assert.ok(arquivo, `Falta o projeto Python ${kind} importado pela galeria`)
  return refinePythonProjectDocument(JSON.parse(await readFile(resolve(galeria, arquivo), 'utf8')))
}

await mkdir(saida, { recursive: true })
for (const kind of ['classic', 'pro'] as const) {
  const project = await projetoDoEnsaio(kind),
    store = createProjectStore()
  if (!galeria) project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: 1 }]
  if (!galeria && project.kind === 'pro') {
    const principal = project.tree[project.python.entrypoint]
    assert.ok(principal?.kind === 'file')
    project.tree.src = { kind: 'dir' }
    project.tree['src/main.py'] = principal
    project.python.entrypoint = 'src/main.py'
  }
  const primarioDaGaleria = project.assets?.find((a) => a.kind === 'scene3d')
  if (galeria) assert.ok(primarioDaGaleria, 'O projeto da galeria precisa conter o cenário')
  const pacote =
      galeria && primarioDaGaleria
        ? pacoteDeCena3D(primarioDaGaleria, project.assets ?? [])
        : pacoteInicial,
    antes = JSON.stringify(project)
  assert.ok(pacote)
  store.setState({ project, isDirty: false })
  const plano = await prepararImportacaoDeCena3D(project, pacote)
  assert.equal(JSON.stringify(project), antes)
  let mudancas = 0
  const off = store.subscribe(() => mudancas++)
  assert.equal(await store.getState().importScene3DBundle(plano), null)
  assert.equal(mudancas, galeria ? 0 : 1)
  off()
  const aplicado = store.getState().project
  assert.ok(aplicado && isPythonProject(aplicado))
  if (galeria) assert.equal(JSON.stringify(aplicado), antes)
  const primario = aplicado.assets?.find((a) => a.id === plano.assetId)
  assert.ok(primario?.cena3dPython)
  const nomeModulo = primario.cena3dPython.modulo.split('/').at(-1)!.slice(0, -3),
    programa = [
      'from pathlib import Path',
      'import sys',
      'import pyray as p',
      'import cenario',
      `from ${nomeModulo} import carregar`,
      'assert not Path(cenario.__file__).resolve().is_relative_to(Path.cwd()) if "/studio/" in str(cenario.__file__) else True',
      "print('mcn-oficial', cenario.__file__)",
      'p.set_config_flags(p.FLAG_WINDOW_HIDDEN)',
      "p.init_window(640, 420, 'Cenário importado pelo store')",
      'lugar = carregar()',
      "print('mcn-carregado', lugar.dados['fonte']['digest'], len(lugar.dados['nos']), lugar.tem_chao(8, 8))",
      "for no in lugar.dados['nos']:",
      "    if no.get('preservarHierarquia') and lugar.animacoes(no['id']):",
      "        print('mcn-clipes', len(lugar.animacoes(no['id'])))",
      "        lugar.animar(no['id'], 0, 1.5)",
      'camera = p.Camera3D(p.Vector3(34, 29, 42), p.Vector3(2, 1, 0), p.Vector3(0, 1, 0), 50, p.CAMERA_PERSPECTIVE)',
      'for quadro in range(8):',
      '    p.begin_drawing()',
      '    p.clear_background(p.Color(163, 205, 233, 255))',
      '    p.begin_mode_3d(camera)',
      '    lugar.desenhar()',
      '    p.end_mode_3d()',
      '    p.end_drawing()',
      "if sys.platform == 'emscripten': input('mcn-pronto-captura: ')",
      'lugar.descartar()',
      'lugar.descartar()',
      "print('mcn-descartado')",
      'p.close_window()',
      '',
    ].join('\n')
  // Only the fixture writes its own main, after proving import did not change it.
  const executavel = await refinePythonProjectDocument(
    aplicado.kind === 'pro'
      ? {
          ...aplicado,
          tree: {
            ...aplicado.tree,
            [aplicado.python.entrypoint]: { kind: 'file', content: programa },
          },
        }
      : { ...aplicado, files: { ...aplicado.files, [aplicado.python.entrypoint]: programa } },
  )
  const reaberto = await refinePythonProjectDocument(JSON.parse(JSON.stringify(executavel))),
    desktop = await buildPythonSourceFiles(reaberto),
    pasta = resolve(saida, kind === 'pro' ? 'pro-src' : kind)
  await mkdir(pasta, { recursive: true })
  for (const [path, conteudo] of Object.entries(desktop.files)) {
    const destino = resolve(pasta, path),
      relativo = relative(pasta, destino)
    assert.ok(!relativo.startsWith('..') && !isAbsolute(relativo))
    if (path.endsWith('/')) {
      await mkdir(destino, { recursive: true })
      continue
    }
    await mkdir(resolve(destino, '..'), { recursive: true })
    await writeFile(destino, conteudo)
  }
  await writeFile(resolve(saida, `${kind}.project.json`), JSON.stringify(reaberto))
  await writeFile(
    resolve(saida, `${kind}.resultado.json`),
    JSON.stringify(
      {
        kind,
        fonte: lerAssetDeCena3D(primario).cena.fonte,
        atualizacoes: mudancas,
        nos: pacote.cena.nos.length,
        modulo: primario.cena3dPython.modulo,
        entrypoint: reaberto.python.entrypoint,
        assets: reaberto.assets?.length,
        fontesPreservadas: true,
        reabertura: true,
        orcamento: plano.orcamento,
        avisos: plano.avisos,
        nota: galeria
          ? 'Projeto importado pelo botão Trazer do Molda no ensaio HTTP, reaberto e exportado. A reimportação é idempotente. Somente a cópia de execução recebe o programa de prova; a fonte original foi preservada.'
          : 'Preparo/store/reabertura/export reais. Adapter e botão Trazer do Molda ainda não participam desta prova.',
      },
      null,
      2,
    ),
  )
  console.log(
    `${kind}: ${mudancas} atualização(ões), ${reaberto.assets?.length} assets, fonte preservada e export desktop em ${pasta}`,
  )
}
