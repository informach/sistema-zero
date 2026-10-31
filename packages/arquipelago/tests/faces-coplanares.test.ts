import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { Group, type Object3D } from 'three'
import {
  CADA_NO_SOZINHO,
  carregarGlb,
  type Emenda,
  emendasAbertas,
  type Juntos,
  type Sobreposicao,
  sobreposicoes,
  TODOS_JUNTOS,
} from '../scripts/faces-coplanares'
import {
  ALTURA_DA_TERRA,
  BANCADA,
  CENTRO_DA_CASA,
  FAROL,
  HORTA,
  LONGE_DA_CAMERA,
  NEVOA,
  PERTO_DA_CAMERA,
  PIER,
  RAIO_DA_ILHA_DO_ANEL,
  RAIO_DA_SONDA_DA_CAMERA,
  RAIO_DAS_ESTRELAS,
  RAIO_DO_ANEL,
} from '../src/mundo/medidas'
import { planta } from '../src/sistemas/construcao/comodos'
import { LOTE_DA_CASA } from '../src/sistemas/construcao/lote'
import { NADA_CORTADO, pecasDaObra } from '../src/sistemas/construcao/pecas'

/**
 * Nenhuma face coplanar de materiais diferentes se sobrepõe e nenhuma superfície tem emenda em T:
 * as duas coisas piscam na tela (z-fighting e costura tracejada). A busca está em
 * `scripts/faces-coplanares.ts` (rode o script num GLB para ver onde fica cada uma).
 */

const ASSETS = join(import.meta.dir, '..', 'src', 'assets')

/** O canteiro aparece junto com UM estágio de planta por vez. */
const CANTEIRO_COM_UM_ESTAGIO: Juntos = (a, b) => a === b || a === 'canteiro' || b === 'canteiro'

interface Arquivo {
  caminho: string
  juntos: Juntos
  /** Pares `nó/material x nó/material` que não disputam profundidade, com o motivo. */
  ignorar?: (s: { a: string; b: string }) => boolean
}

const ARQUIVOS: Arquivo[] = [
  { caminho: 'mundo/casa.glb', juntos: TODOS_JUNTOS },
  { caminho: 'mundo/terreno.glb', juntos: TODOS_JUNTOS },
  { caminho: 'mundo/arvores.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'mundo/horta.glb', juntos: CANTEIRO_COM_UM_ESTAGIO },
  {
    caminho: 'mundo/bancada.glb',
    juntos: TODOS_JUNTOS,
    // O holograma é luz somada sem escrever profundidade (`bancada.tsx`): a ordem não muda a cor.
    ignorar: (s) => s.a.startsWith('holograma/') && s.b.startsWith('holograma/'),
  },
  { caminho: 'mundo/farol.glb', juntos: TODOS_JUNTOS },
  { caminho: 'mundo/pier.glb', juntos: TODOS_JUNTOS },
  { caminho: 'mundo/ponte.glb', juntos: TODOS_JUNTOS },
  { caminho: 'mundo/ilhas-do-anel.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'mundo/boias.glb', juntos: CADA_NO_SOZINHO },
  // A florada (cada nível é um canteirinho sozinho) e o segredo do cipó da sua ilha (31/10/2026).
  { caminho: 'mundo/florada.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'mundo/segredos-da-ilha.glb', juntos: TODOS_JUNTOS },
  { caminho: 'itens/quadro-das-cores.glb', juntos: TODOS_JUNTOS },
  { caminho: 'ilhas/vila-doce.glb', juntos: TODOS_JUNTOS },
  { caminho: 'ilhas/vila-doce-props.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'ilhas/recife.glb', juntos: TODOS_JUNTOS },
  { caminho: 'ilhas/recife-props.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'ilhas/barco.glb', juntos: TODOS_JUNTOS },
  { caminho: 'ilhas/pico.glb', juntos: TODOS_JUNTOS },
  { caminho: 'ilhas/vale-dos-dinos.glb', juntos: TODOS_JUNTOS },
  { caminho: 'ilhas/nuvens.glb', juntos: TODOS_JUNTOS },
  // Os fósseis do Vale (nós soltos do catálogo de props e itens do museu), as pegadas e as plantas
  // do céu (um estágio por vez, como a horta), 31/10/2026.
  { caminho: 'ilhas/vale-dos-dinos-props.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'itens/plantas-do-ceu.glb', juntos: CADA_NO_SOZINHO },
  ...[
    'fossil-cranio-rex',
    'fossil-dente',
    'fossil-garra',
    'fossil-vertebra',
    'fossil-chifre-triceratopo',
    'fossil-ovo',
    'pegada-rex',
    'pegada-triceratopo',
    'pegada-passaro',
    'pegada-capivara',
    'flor-de-nuvem',
    'estrela-trepadeira',
    'arco-iris-de-petala',
    'semente-flor-de-nuvem',
    'semente-estrela-trepadeira',
    'semente-arco-iris-de-petala',
  ].map((id) => ({ caminho: `itens/${id}.glb`, juntos: TODOS_JUNTOS })),
  // Casa (31/10/2026): o segundo andar, o café e a decoração de festa, uma peça por nó.
  { caminho: 'casa/casa-andar.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'casa/casa-cafe.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'casa/casa-festas.glb', juntos: CADA_NO_SOZINHO },
  { caminho: 'casa/casa-paredes-andar.glb', juntos: CADA_NO_SOZINHO },
  // As versões retro e moderna da galeria (31/10/2026; na banda e no museu cada nó é uma peça solta).
  ...[
    'geladeira',
    'forno',
    'aquario',
    'lareira',
    'banda',
    'fliperama',
    'museu',
    'casinha',
    'planta-interior',
  ]
    .flatMap((objeto) => [`${objeto}-retro`, `${objeto}-moderna`])
    .map((id) => ({
      caminho: `objetos/${id}.glb`,
      juntos: /^(banda|museu)-/.test(id) ? CADA_NO_SOZINHO : TODOS_JUNTOS,
    })),
]

/**
 * O Bosque (`arte/ilhas/bosque.py`) está sendo mexido em outra frente: estes pares já existiam e
 * ficam anotados até o script dele ser corrigido. Qualquer par NOVO falha. Ao corrigir, apague daqui.
 */
const PENDENTES_DO_BOSQUE = new Set([
  'construcoes/tabua x construcoes/tabuaEscura',
  'construcoes/placaBranca x construcoes/vidroJanela',
  'construcoes/troncoClaro x construcoes/vidroJanela',
  'construcoes/cabanaEscura x construcoes/deque',
  'construcoes/deque x construcoes/toraAnel',
  'construcoes/deque x construcoes/portaNova',
  'construcoes/toldoAmarelo x construcoes/toldoAzul',
  'construcoes/cabanaEscura x construcoes/portaNova',
  'construcoes/tronco x construcoes/troncoClaro',
  'construcoes/cabana x construcoes/cabanaEscura',
])

const par = (s: { a: string; b: string }) => `${s.a} x ${s.b}`
const lista = (xs: (Sobreposicao | Emenda)[]) => xs.map(par)

describe('faces coplanares e emendas abertas', () => {
  const cenas = new Map<string, Object3D>()
  beforeAll(async () => {
    for (const nome of [...ARQUIVOS.map((a) => a.caminho), 'ilhas/bosque.glb'])
      cenas.set(nome, await carregarGlb(join(ASSETS, nome)))
  })

  for (const arquivo of ARQUIVOS) {
    test(arquivo.caminho, () => {
      const raiz = cenas.get(arquivo.caminho) as Object3D
      const ignorar = arquivo.ignorar ?? (() => false)
      expect(lista(sobreposicoes(raiz, arquivo.juntos).filter((s) => !ignorar(s)))).toEqual([])
      expect(lista(emendasAbertas(raiz, arquivo.juntos).filter((s) => !ignorar(s)))).toEqual([])
    })
  }

  test('ilhas/bosque.glb não ganha sobreposição nova', () => {
    const raiz = cenas.get('ilhas/bosque.glb') as Object3D
    const novas = [...sobreposicoes(raiz), ...emendasAbertas(raiz)]
      .map(par)
      .filter((p) => !PENDENTES_DO_BOSQUE.has(p))
    expect(novas).toEqual([])
  })

  test('as peças da ilha central no lugar do jogo, em cima do chão', () => {
    const ilha = new Group()
    const por = (
      nome: string,
      arquivo: string,
      x: number,
      y: number,
      z: number,
      nos?: string[],
    ) => {
      const g = new Group()
      g.name = nome
      g.position.set(x, y, z)
      const raiz = (cenas.get(arquivo) as Object3D).clone()
      for (const filho of [...raiz.children])
        if (!nos || nos.includes(filho.name)) g.add(filho.clone())
      ilha.add(g)
    }
    por('terreno', 'mundo/terreno.glb', 0, 0, 0)
    por('segredos', 'mundo/segredos-da-ilha.glb', 0, 0, 0)
    por('casa', 'mundo/casa.glb', CENTRO_DA_CASA.x, ALTURA_DA_TERRA + 0.02, CENTRO_DA_CASA.z)
    por('bancada', 'mundo/bancada.glb', BANCADA.x, ALTURA_DA_TERRA, BANCADA.z, ['projetor'])
    por('farol', 'mundo/farol.glb', FAROL.x, ALTURA_DA_TERRA, FAROL.z)
    por('pier', 'mundo/pier.glb', PIER.x, 0, PIER.z)
    for (let i = 0; i < HORTA.colunas * HORTA.linhas; i++) {
      const col = i % HORTA.colunas
      const lin = Math.floor(i / HORTA.colunas)
      por(
        `canteiro-${i}`,
        'mundo/horta.glb',
        HORTA.x + (col - (HORTA.colunas - 1) / 2) * HORTA.passo,
        ALTURA_DA_TERRA,
        HORTA.z + (lin - (HORTA.linhas - 1) / 2) * HORTA.passo,
        ['canteiro'],
      )
    }
    // Só entre peças diferentes: dentro de cada arquivo os testes de cima já conferem.
    const outras: Juntos = (a, b) => a !== b
    expect(lista(sobreposicoes(ilha, outras))).toEqual([])
    expect(lista(emendasAbertas(ilha, outras))).toEqual([])
  })

  test('a casa construída: o kit da obra inicial junto com o que fica da casa de antes', async () => {
    // Na casa construída (`Casa` em `mundo/casa.tsx`), a frente e a direita são do kit e da casa de
    // antes ficam o revestimento, o telhado e a varanda. Pedido dela (31/10/2026): a porta
    // principal piscava embaixo, onde o degrau de pedra do kit encontrava o tampo do deque.
    const kit = {
      paredes: await carregarGlb(join(ASSETS, 'casa/casa-paredes.glb')),
      portas: await carregarGlb(join(ASSETS, 'casa/casa-portas.glb')),
    }
    const cena = new Group()
    const base = ALTURA_DA_TERRA + 0.02
    const casa = new Group()
    casa.name = 'casa'
    casa.position.set(CENTRO_DA_CASA.x, base, CENTRO_DA_CASA.z)
    for (const filho of (cenas.get('mundo/casa.glb') as Object3D).children)
      if (['revestimento', 'telhado', 'varanda'].includes(filho.name)) casa.add(filho.clone())
    cena.add(casa)
    const obra = LOTE_DA_CASA.obraInicial
    const pecas = pecasDaObra(obra, planta(obra, LOTE_DA_CASA), NADA_CORTADO)
    for (const p of [...pecas.paredes, ...pecas.quinas, ...pecas.folhas]) {
      const raiz = p.arquivo === 'portas' ? kit.portas : kit.paredes
      const no = raiz.getObjectByName(p.no)
      if (!no) throw new Error(`sem o nó ${p.no}`)
      const g = new Group()
      g.name = `kit-${p.chave}`
      g.position.set(p.x, base + (p.y ?? 0), p.z)
      g.rotation.y = p.giro
      const copia = no.clone()
      copia.position.set(0, 0, 0)
      copia.quaternion.identity()
      g.add(copia)
      cena.add(g)
    }
    expect(pecas.folhas.length).toBe(1)
    // Só entre a casa de antes e o kit: dentro de cada arquivo os testes de cima já conferem.
    const doKit = (n: string) => n.startsWith('kit-')
    const entreOsDois: Juntos = (a, b) => doKit(a) !== doKit(b)
    expect(lista(sobreposicoes(cena, entreOsDois))).toEqual([])
  })
})

describe('planos de corte da câmera', () => {
  // fov 55 em `cena.tsx`; 2,4 cobre de celular deitado a monitor ultralargo.
  const meiaAltura = PERTO_DA_CAMERA * Math.tan((55 / 2) * (Math.PI / 180))
  const canto = Math.hypot(PERTO_DA_CAMERA, meiaAltura, meiaAltura * 2.4)

  test('o canto do plano de perto fica dentro da bolinha que afasta a câmera do que é sólido', () => {
    expect(canto).toBeLessThan(RAIO_DA_SONDA_DA_CAMERA)
  })

  test('o near dá pelo menos 1 mm de folga de profundidade a 60 m (24 bits)', () => {
    expect(60 ** 2 / (PERTO_DA_CAMERA * 2 ** 24)).toBeLessThan(0.001)
  })

  test('o far alcança as estrelas vistas da ilha do anel mais longe e passa do fim da névoa', () => {
    const cameraMaisLonge = RAIO_DO_ANEL + RAIO_DA_ILHA_DO_ANEL + 20
    expect(LONGE_DA_CAMERA).toBeGreaterThan(RAIO_DAS_ESTRELAS + cameraMaisLonge)
    expect(LONGE_DA_CAMERA).toBeGreaterThan(NEVOA.fim)
  })
})
