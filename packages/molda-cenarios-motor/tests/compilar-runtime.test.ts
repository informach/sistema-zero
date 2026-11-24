import { expect, test } from 'bun:test'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  AnimationClip,
  Bone,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  Matrix4,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  PointLight,
  Raycaster,
  Scene,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from 'three'
import { ArquivosDaCompilacao } from '../src/compilar/arquivos'
import { criarInstaladorDeCenasThree } from '../src/compilar/instalar-three'
import { carregarCenaDoEndereco } from '../src/compilar/runtime-http'
import { instanciarModeloCompilado } from '../src/compilar/runtime-modelos'
import { carregarCenaNoThree } from '../src/compilar/runtime-three'
import { comAnimacao, exemplo, glb } from './fixtures/glb-compilacao'

async function pacote(comentario = '', animado = false): Promise<PacoteCompilado> {
  const { j, bin } = exemplo(),
    posicoes = new Float32Array([-2, 0, -2, 0, 0, 2, 2, 0, -2]),
    a = new ArquivosDaCompilacao(new AbortController().signal),
    matriz = new Matrix4().makeTranslation(10, 3, -4).elements,
    volume = { min: { x: 8, y: 3, z: -6 }, max: { x: 12, y: 3, z: -2 } }
  bin.set(new Uint8Array(posicoes.buffer))
  if (comentario) Object.assign(j.nodes[0]!, { extras: { comentario } })
  j.accessors[0]!.min = [-2, 0, -2]
  j.accessors[0]!.max = [2, 0, 2]
  // Dois nós na fonte, compartilhando a mesma malha.
  const animacao = animado ? comAnimacao(j, bin) : undefined,
    bytes = glb(animacao?.j ?? j, animacao?.bin ?? bin)
  await a.adicionar('modelos/solo.glb', bytes, {
    mime: 'model/gltf-binary',
    papel: 'modelo',
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
  })
  await a.adicionar('colisoes/solo.glb', bytes, {
    mime: 'model/gltf-binary',
    papel: 'colisao',
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
  })
  const cena = lerCenaCompilada({
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Fora da oficina',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'c', revisao: 3, digest: 'a'.repeat(64) },
    arquivos: a.descrever(),
    entidades: [
      {
        id: 'solo',
        nome: 'Solo',
        tipo: 'objeto',
        grupo: null,
        matriz,
        volume,
        propriedades: { uso: 'piso' },
      },
      { id: 'luz', nome: 'Luz', tipo: 'marcador', grupo: null },
    ],
    nos: [{ id: 'no', entidade: 'solo', arquivo: 'modelos/solo.glb', matriz, volume }],
    colisoes: [
      {
        id: 'colisao',
        entidade: 'solo',
        arquivo: 'colisoes/solo.glb',
        tipo: 'malha',
        matriz,
        volume,
      },
    ],
    aguas: [],
    caminhos: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    marcadores: [
      {
        id: 'luz',
        nome: 'Luz',
        posicao: { x: 9, y: 5, z: -4 },
        giro: 1,
        objeto: null,
        configuracao: {
          tipo: 'luz',
          luz: {
            tipo: 'pontual',
            cor: '#ffccaa',
            intensidade: 25,
            alcance: 10,
            decaimento: 2,
            sombra: false,
          },
        },
      },
    ],
    ambiente: { hora: 18, ceu: { tipo: 'cor', cor: '#334455' } },
  })
  return { cena, arquivos: new Map(a.arquivos) }
}

test('o jogo pode assumir a animação e colisão de uma entidade sem duplicar os motores', async () => {
  const p = await pacote('', true),
    entidades = new Set(['solo']),
    carregando = carregarCenaNoThree(p, new AbortController().signal, {
      animacaoExterna: entidades,
      colisoresExternos: entidades,
    })
  entidades.clear()
  const r = await carregando,
    normal = await carregarCenaNoThree(p, new AbortController().signal)
  try {
    const externo = r.atores.get('solo')![0]!,
      interno = normal.atores.get('solo')![0]!
    externo.mixer.clipAction(externo.animacoes[0]!).play()
    interno.mixer.clipAction(interno.animacoes[0]!).play()
    r.atualizar(0.25)
    normal.atualizar(0.25)
    expect(externo.mixer.time).toBe(0)
    expect(interno.mixer.time).toBeCloseTo(0.25)
    externo.mixer.update(0.25)
    const alvo = externo.raiz.getObjectByProperty(
      'uuid',
      externo.animacoes[0]!.tracks[0]!.name.split('.')[0]!,
    )!
    expect(alvo.position.x).toBeCloseTo(0.25)
    r.atualizar(0.25)
    expect(externo.mixer.time).toBeCloseTo(0.25)
    expect(r.colisoes.arvores).toBe(0)
    expect(normal.colisoes.arvores).toBe(1)
    expect(
      new Raycaster(new Vector3(10, 8, -4), new Vector3(0, -1, 0)).intersectObject(r.raiz, true)
        .length,
    ).toBeGreaterThan(0)
  } finally {
    r.descartar()
    normal.descartar()
  }
})

test('propriedade externa exige uma entidade real da cena', async () => {
  const p = await pacote()
  for (const campo of ['animacaoExterna', 'colisoresExternos'] as const)
    await expect(
      carregarCenaNoThree(p, new AbortController().signal, {
        [campo]: new Set(['inexistente']),
      }),
    ).rejects.toThrow(/entidade/)
})

test('perfil de jogo conserva céu e iluminação globais e instala as luzes locais do cenário', async () => {
  const alvo = new Scene(),
    fundo = new Color('#123456'),
    nevoa = new Fog('#234567', 100, 2000)
  alvo.background = fundo
  alvo.fog = nevoa
  const instalador = criarInstaladorDeCenasThree(
    async (_id, sinal, opcoes) => carregarCenaNoThree(await pacote(), sinal, opcoes),
    () => ({}),
  )
  try {
    const local = await instalador.instalar('local', alvo, new AbortController().signal, {
      ambiente: 'luzes-locais',
    })
    expect(alvo.background).toBe(fundo)
    expect(alvo.fog).toBe(nevoa)
    const luzes: string[] = []
    local.cena.traverse((n) => {
      if (n instanceof PointLight || n instanceof DirectionalLight) luzes.push(n.type)
    })
    expect(luzes).toEqual(['PointLight'])
    await instalador.instalar('completo', alvo, new AbortController().signal)
    expect(alvo.background).not.toBe(fundo)
    await instalador.instalar('local-2', alvo, new AbortController().signal, {
      ambiente: 'luzes-locais',
    })
    expect(alvo.background).toBe(fundo)
    expect(alvo.fog).toBe(nevoa)
  } finally {
    instalador.descartar()
  }
  expect(alvo.children).toHaveLength(0)
  expect(alvo.background).toBe(fundo)
})

test('runtime funciona sem Palco/renderer, preserva matrizes, física, dados e descarte', async () => {
  const p = await pacote(),
    antes = JSON.stringify(p.cena)
  for (let i = 0; i < 3; i++) {
    const r = await carregarCenaNoThree(p, new AbortController().signal)
    const hit = r.colisoes.rastrear(new Vector3(10, 8, -4), new Vector3(10, -2, -4))
    expect(hit!.ponto.y).toBeCloseTo(3, 7)
    expect(r.colisoes.arvores).toBe(1)
    expect(r.entidades.get('solo')!.propriedades).toEqual({ uso: 'piso' })
    expect(r.dados.fonte.revisao).toBe(3)
    const fisica = r.colisoes.resolver(new Vector3(10, 2.9, -4), 1.16, 0.2)
    expect(fisica.posicao.y).toBeCloseTo(3, 3)
    const contatos = new Raycaster(new Vector3(10, 8, -4), new Vector3(0, -1, 0)).intersectObject(
      r.raiz,
      true,
    )
    expect(contatos.length).toBeGreaterThan(0)
    expect(r.entidade(contatos[0]!)).toBe('solo')
    expect(r.entidade({ object: r.raiz, faceIndex: 0 })).toBeNull()
    expect(r.entidade({ ...contatos[0]!, faceIndex: -1 })).toBeNull()
    expect(r.agua.nivel(10, -4)).toBeNull()
    let local: PointLight | undefined
    r.cena.traverse((n) => {
      if (n instanceof PointLight) local = n
    })
    expect(local!.position.toArray()).toEqual([9, 5, -4])
    r.atualizar(1 / 60)
    expect(() => r.atualizar(NaN)).toThrow(/passo/)
    r.descartar()
    r.descartar()
    expect(r.cena.children).toHaveLength(0)
    expect(r.colisoes.arvores).toBe(0)
    expect(r.entidade(contatos[0]!)).toBeNull()
    expect(() => r.atualizar(0.1)).toThrow(/descartada/)
  }
  expect(JSON.stringify(p.cena)).toBe(antes)
})

test('runtime recusa inventário adulterado antes de carregar e cancela entre recursos', async () => {
  const p = await pacote(),
    c = new AbortController()
  c.abort(new Error('interrompido'))
  await expect(carregarCenaNoThree(p, c.signal)).rejects.toThrow('interrompido')
  const d = new AbortController()
  await expect(
    carregarCenaNoThree(p, d.signal, {
      progresso: (pronto) => {
        if (pronto === 1) d.abort(new Error('entre arquivos'))
      },
    }),
  ).rejects.toThrow('entre arquivos')
  const bytes = p.arquivos.get('modelos/solo.glb')!
  bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1
  await expect(carregarCenaNoThree(p, new AbortController().signal)).rejects.toThrow(/corresponde/)
  await expect(
    carregarCenaNoThree(p, new AbortController().signal, { maxTextura: 0 }),
  ).rejects.toThrow(/limite/)
})

test('arquivo pequeno repetido não contorna o orçamento das cópias de nós e extras', async () => {
  const p = await pacote('a'.repeat(16384)),
    no = p.cena.nos[0]!
  p.cena.nos = Array.from({ length: 4000 }, (_, i) => ({ ...no, id: `copia-${i}` }))
  await expect(carregarCenaNoThree(p, new AbortController().signal)).rejects.toThrow(
    /instâncias.*memória/,
  )
})

test('instâncias compartilham material/geometria, isolam pele/morph/clipes e liberam só seus ossos', () => {
  const raiz = new Group(),
    osso = new Bone(),
    g = new BufferGeometry(),
    material = new MeshStandardMaterial()
  g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
  g.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(12), 4))
  g.setAttribute(
    'skinWeight',
    new BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]), 4),
  )
  g.morphAttributes.position = [
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 2, 0]), 3),
  ]
  const m = new SkinnedMesh(g, material)
  m.add(osso)
  m.bind(new Skeleton([osso]))
  raiz.add(m)
  const canal = new NumberKeyframeTrack(`${osso.uuid}.position[x]`, [0, 1], [0, 2]),
    morph = new NumberKeyframeTrack(`${m.uuid}.morphTargetInfluences[0]`, [0, 1], [0, 1]),
    clips = [new AnimationClip('Mover', 1, [canal, morph])],
    a = instanciarModeloCompilado(raiz, clips),
    b = instanciarModeloCompilado(raiz, clips)
  const ma = a.raiz.children[0] as SkinnedMesh,
    mb = b.raiz.children[0] as SkinnedMesh
  let fonteDescartada = 0
  g.addEventListener('dispose', () => fonteDescartada++)
  material.addEventListener('dispose', () => fonteDescartada++)
  try {
    expect(ma.geometry).toBe(g)
    expect(mb.material).toBe(material)
    expect(ma.skeleton).not.toBe(mb.skeleton)
    expect(ma.skeleton.bones[0]).not.toBe(osso)
    expect(a.animacoes[0]!.tracks[0]!.name).toContain(ma.skeleton.bones[0]!.uuid)
    expect(
      (a.animacoes[0]!.tracks[0]! as unknown as { createInterpolant: unknown }).createInterpolant,
    ).toBe((canal as unknown as { createInterpolant: unknown }).createInterpolant)
    a.mixer.clipAction(a.animacoes[0]!).play()
    a.mixer.update(0.5)
    expect(ma.skeleton.bones[0]!.position.x).toBeCloseTo(1, 7)
    expect(ma.morphTargetInfluences![0]).toBeCloseTo(0.5, 7)
    expect(mb.skeleton.bones[0]!.position.x).toBe(0)
    expect(osso.position.x).toBe(0)
    expect(m.morphTargetInfluences![0]).toBe(0)
    a.descartar()
    a.descartar()
    expect(fonteDescartada).toBe(0)
    expect(b.raiz.children).toHaveLength(1)
  } finally {
    a.descartar()
    b.descartar()
    g.dispose()
    material.dispose()
    m.skeleton.dispose()
  }
})

test('carregamento HTTP usa somente arquivos do pacote e recusa excesso, truncamento e redirecionamento', async () => {
  const p = await pacote(),
    consultas: string[] = []
  let modo = 'normal'
  const servidor = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(r) {
      const caminho = new URL(r.url).pathname
      consultas.push(caminho)
      if (caminho === '/cenario.json') return Response.json(p.cena)
      if (modo === 'redirecionar') return Response.redirect(new URL('/fora', r.url), 302)
      const bytes = p.arquivos.get(caminho.slice(1))
      if (!bytes) return new Response('ausente', { status: 404 })
      if (modo === 'excesso') return new Response(new Uint8Array(bytes.length + 1))
      if (modo === 'truncado') return new Response(bytes.slice(0, -1))
      return new Response(bytes.slice())
    },
  })
  const url = new URL('/cenario.json', servidor.url),
    sinal = new AbortController().signal
  try {
    const r = await carregarCenaDoEndereco(url, sinal)
    expect(r.dados.fonte.revisao).toBe(3)
    r.descartar()
    expect(consultas).toEqual(['/cenario.json', '/modelos/solo.glb', '/colisoes/solo.glb'])
    modo = 'excesso'
    await expect(carregarCenaDoEndereco(url, sinal)).rejects.toThrow(/tamanho/)
    modo = 'truncado'
    await expect(carregarCenaDoEndereco(url, sinal)).rejects.toThrow(/incompleto/)
    modo = 'redirecionar'
    await expect(carregarCenaDoEndereco(url, sinal)).rejects.toThrow()
    expect(consultas).not.toContain('/fora')
    for (const endereco of [
      'file:///c:/cenario.json',
      'https://a:b@example.org/cenario.json',
      `${url}?token=a`,
      `${url}#hash`,
    ])
      await expect(carregarCenaDoEndereco(endereco, sinal)).rejects.toThrow(/HTTP/)
  } finally {
    servidor.stop(true)
  }
})
