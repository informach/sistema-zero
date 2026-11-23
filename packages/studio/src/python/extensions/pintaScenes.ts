import { PYTHON_PINTA_REGIONS_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import type { PythonPintaScenesCanvas } from '../../runtime/python/pintaScenesContract'
import { optional, type PythonApiParam, pythonApiCallCodec, required } from '../blocks/apiCallCodec'
import type { PythonBlockCodec } from '../blocks/contract'
import { integer, name, node, text } from '../blocks/nodes'

const category = 'Cenários do Pinta'
const requiredRuntimeFeatures = [PYTHON_PINTA_REGIONS_FEATURE] as const
const scene = { module: 'pinta', name: 'carregar_cenario' }
const receiver = { label: 'cenário', default: () => name('lugar'), instance: scene }
const origin = () => node('Tuple', { elts: [integer('0'), integer('0')], ctx: node('Load') })
const off = () => node('Constant', { value: false, kind: null })
const prefix = {
  'python-pygame': 'sz_py_pygame_',
  'python-pgzero': 'sz_py_pgzero_',
  'python-raylib-2d': 'sz_py_rl2d_',
} as const

/** Only active for the 2D extension of a release that supplies the scenario API. */
export function pintaSceneCodecs(owner: PythonPintaScenesCanvas): readonly PythonBlockCodec[] {
  const method = (
    key: string,
    name: string,
    title: string,
    role: 'statement' | 'value',
    help: string,
    params: readonly PythonApiParam[] = [],
  ) =>
    pythonApiCallCodec({
      id: `${prefix[owner]}pinta_scene_${key}`,
      owner,
      title,
      category,
      role,
      level: 2,
      help,
      api: `lugar.${name}(${params.map((param) => param.name).join(', ')})`,
      callee: { kind: 'method', names: [name], receiver },
      params,
      requiredRuntimeFeatures,
    })
  const ce = owner === 'python-pygame'
  const pgzero = owner === 'python-pgzero'
  const screen = ce
    ? [required('superficie', 'na tela', () => name('tela'))]
    : pgzero
      ? [required('screen', 'na tela', () => name('screen'))]
      : []
  return [
    pythonApiCallCodec({
      id: `${prefix[owner]}pinta_scene_load`,
      owner,
      title: 'abrir cenário do Pinta',
      category,
      role: 'value',
      level: 2,
      help: 'Abre o PNG de cenário que você trouxe do Pinta. Importe pinta e guarde o cenário numa variável para desenhá-lo e consultar seus objetos.',
      api: "pinta.carregar_cenario('vila')",
      callee: { kind: 'module', module: 'pinta', names: [scene.name] },
      params: [
        required('nome', 'desenho', () => text('vila')),
        optional('lugar', 'ID do lugar inicial', () => text('cabana'), 'kw'),
      ],
      requiredRuntimeFeatures,
    }),
    method(
      'draw',
      'desenhar',
      'desenhar cenário do Pinta',
      'statement',
      `Desenhe o fundo antes dos personagens. Ative a opção “só a frente” numa segunda chamada para desenhar as peças da frente por cima deles.${
        owner === 'python-raylib-2d'
          ? ' Dentro de begin_mode_2d, use a sua Camera2D como câmera.'
          : ''
      }`,
      [
        ...screen,
        optional(ce ? 'deslocamento' : 'camera', ce ? 'deslocamento' : 'câmera', origin),
        optional('frente', 'só a frente', off),
        optional('tempo', 'tempo (ms)', () => integer('0')),
      ],
    ),
    method(
      'start',
      'ponto_inicial',
      'posição inicial do cenário',
      'value',
      'Devolve o par (x, y) do ponto inicial em pixels. Use a posição para colocar o personagem.',
    ),
    method(
      'objects',
      'objetos',
      'objetos do cenário',
      'value',
      'Percorra os objetos com um laço. Use ‘door’ para as portas padrão ou o tipo que você marcou no Pinta.',
      [optional('tipo', 'do tipo', () => text('door'))],
    ),
    method(
      'property',
      'propriedade',
      'propriedade de um objeto do cenário',
      'value',
      'Lê um valor definido no Pinta, como o destino de uma porta. O objeto vem da consulta ao cenário.',
      [
        required('objeto', 'objeto', () => name('porta')),
        required('chave', 'propriedade', () => text('destino')),
      ],
    ),
    method(
      'open_door',
      'abrir_destino',
      'lugar do outro lado da porta',
      'value',
      'Devolve o lugar para o qual a porta aponta. Guarde o lugar e decida no seu programa quando trocar de cenário e onde colocar o personagem.',
      [required('porta', 'porta', () => name('porta'))],
    ),
    method(
      'blocked',
      'bloqueado',
      'o cenário bloqueia o corpo',
      'value',
      'Diz se um corpo encontra um limite ou uma barreira do cenário. Seu código decide como mover o corpo.',
      [required('corpo', 'corpo', () => name('jogador'))],
    ),
    method(
      'landing',
      'pouso',
      'corpo apoiado numa plataforma do cenário',
      'value',
      'Nas cenas com física precisa, devolve o corpo ajustado ao pousar. Use o resultado para atualizar a posição do personagem.',
      [
        required('anterior', 'corpo antes de mover', () => name('antes')),
        required('atual', 'corpo depois de mover', () => name('jogador')),
        optional('gravidade', 'direção da gravidade', () => integer('1')),
      ],
    ),
    method(
      'dispose',
      'descartar',
      'liberar cenário do Pinta',
      'statement',
      'Libera a referência do lugar quando o jogo terminar de usá-lo. Lugares que ainda estão abertos conservam os recursos de que precisam.',
    ),
    // Method names such as `descartar` guard learner fields only in files that import pinta.
  ].map((codec) => ({ ...codec, explicitImport: scene.module }))
}
