import type { PythonProjectDocument } from '../core/editableProject'
import type { ProAssetManifestEntry } from '../core/proAssets'
import type { ProExample } from '../core/proExamples'
import { projectUsesRaylib3D } from '../core/raylibMediaPaths'
import { hasTurtleExtension } from '../runtime/python/turtle/contract'

export function pythonProAssetExample(
  asset: ProAssetManifestEntry,
  path: string,
  project: PythonProjectDocument,
): ProExample | null {
  const cenario = project.assets?.find((a) => a.id === asset.id && a.kind === 'scene3d'),
    modulo = cenario?.cena3dPython?.modulo.split('/').at(-1)?.slice(0, -3)
  if (/\.py$/.test(path) && modulo && projectUsesRaylib3D(project)) {
    const nome = `carregar_${modulo}`
    return {
      id: `python-${modulo}`,
      name: nome,
      label: `usar o cenário ${asset.name} no Raylib`,
      explanation:
        'Carrega a revisão que está no projeto. Chame depois de init_window; desenhe dentro de begin_mode_3d e descarte antes de close_window. Seu programa continua controlando a câmera e o movimento.',
      code: `# Depois de init_window: lugar = ${nome}()\n# A cada quadro, com regiões: lugar.atualizar(x, z) com a posição do personagem\n# Entre begin_mode_3d e end_mode_3d: lugar.desenhar()\n# Antes de close_window: lugar.descartar()\ndef ${nome}():\n    from ${modulo} import carregar\n    return carregar()`,
    }
  }
  if (
    !/\.py$/.test(path) ||
    asset.kind !== 'image' ||
    asset.mime !== 'image/gif' ||
    !hasTurtleExtension(project.installedExtensions)
  )
    return null
  const paths = Object.keys(project.kind === 'pro' ? project.tree : project.files)
  const entryDirectory = project.python.entrypoint.slice(
    0,
    project.python.entrypoint.lastIndexOf('/') + 1,
  )
  if (
    paths.some((path) =>
      ['', entryDirectory].some(
        (base) => path === `${base}turtle.py` || path.startsWith(`${base}turtle/`),
      ),
    )
  )
    return null
  return {
    id: 'python-turtle-image',
    name: 'criar_personagem',
    label: `usar a imagem ${asset.name} no Turtle`,
    explanation:
      'Registra uma imagem GIF e cria uma tartaruga com essa aparência. O caminho e os comandos também funcionam com o Turtle do Python no computador.',
    code: `# Uso: personagem = criar_personagem()\n# Depois: personagem.forward(40)\ndef criar_personagem():\n    import turtle\n\n    caminho = ${JSON.stringify(asset.path)}\n    tela = turtle.Screen()\n    tela.register_shape(caminho)\n    return turtle.Turtle(shape=caminho)`,
  }
}

export function pythonProCodeExamples(path: string): ProExample[] {
  if (!/\.py$/.test(path)) return []
  return [
    {
      id: 'python-score',
      name: 'somar_pontos',
      label: 'somar pontos',
      explanation:
        'Recebe os pontos atuais e devolve o novo total. Você escolhe quando somar e onde mostrar o placar.',
      code: '# Uso: pontos = somar_pontos(pontos)\ndef somar_pontos(pontos, quantidade=1):\n    return pontos + quantidade',
    },
    {
      id: 'python-random-position',
      name: 'sortear_posicao',
      label: 'sortear uma posição',
      explanation:
        'Usa a biblioteca padrão random para escolher duas coordenadas inteiras dentro dos limites que você informar.',
      code: '# Uso: x, y = sortear_posicao(-100, 100)\ndef sortear_posicao(minimo, maximo):\n    from random import randint\n    return randint(minimo, maximo), randint(minimo, maximo)',
    },
  ]
}
