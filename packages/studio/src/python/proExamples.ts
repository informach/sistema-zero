import type { PythonProjectDocument } from '../core/editableProject'
import type { ProAssetManifestEntry } from '../core/proAssets'
import type { ProExample } from '../core/proExamples'
import { hasTurtleExtension } from '../runtime/python/turtle/contract'

export function pythonProAssetExample(
  asset: ProAssetManifestEntry,
  path: string,
  project: PythonProjectDocument,
): ProExample | null {
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
