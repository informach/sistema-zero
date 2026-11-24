import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  MarcadorSchema,
  transformacaoDoMarcador,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  Color,
  DirectionalLight,
  type Fog,
  Group,
  HemisphereLight,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PointLight,
  Scene,
  SpotLight,
  Texture,
  Vector3,
  WebGLRenderTarget,
} from 'three'
import { AmbienteDoPalco } from '../src/ambiente/ambiente'
import { LuzesLocaisDoPalco } from '../src/ambiente/luzes-locais'
import { configurarSombra } from '../src/ambiente/sombras'
import { luzDaHora } from '../src/matematica'

const luz = (id: string, foco = false) =>
  MarcadorSchema.parse({
    id,
    nome: id,
    grupo: null,
    oculto: false,
    bloqueado: false,
    posicao: { x: 2, y: 3, z: 4 },
    giro: Math.PI / 2,
    noChao: false,
    objeto: null,
    configuracao: {
      tipo: 'luz',
      luz: {
        tipo: foco ? 'foco' : 'pontual',
        cor: '#ffcc88',
        intensidade: 20,
        alcance: 15,
        decaimento: 2,
        sombra: true,
        ...(foco ? { alvo: { x: 0, y: -1, z: -2 }, angulo: 30, penumbra: 0.4 } : {}),
      },
    },
  })

test('o céu e o alcance da sombra usam a posição global de câmeras filhas, inclusive ortográficas', () => {
  const cena = new Scene(),
    ambiente = new AmbienteDoPalco(cena),
    grupo = new Group(),
    ceu = ambiente.grupo.children.find((o) => o instanceof Mesh),
    sol = ambiente.grupo.children.find((o) => o instanceof DirectionalLight),
    alvo = new Vector3(100, 11, -200)
  if (!ceu || !sol) throw Error('O ambiente precisa ter céu e sol para este ensaio.')
  grupo.position.set(100, 10, -200)
  cena.add(grupo)
  try {
    for (const camera of [
      new PerspectiveCamera(60, 1, 0.1, 1000),
      new OrthographicCamera(-5, 5, 5, -5, 0.1, 1000),
    ]) {
      grupo.add(camera)
      camera.position.set(0, 1.5, 0)
      ambiente.quadro(camera, alvo)
      expect(ceu.position.distanceTo(camera.getWorldPosition(new Vector3()))).toBeLessThan(1e-9)
      expect(sol.shadow.camera.right).toBe(24)
    }
  } finally {
    ambiente.descartar()
  }
})

test('hora mantém o padrão existente e overrides de luz/névoa sobrevivem ao recorte da câmera', () => {
  const cena = new Scene(),
    ambiente = new AmbienteDoPalco(cena),
    d = criarDocumentoVazio('d', 'Luz'),
    camera = new PerspectiveCamera(48, 1.6, 0.1, 6000),
    obter = () => ({})
  try {
    d.iluminacao = { hora: 18 }
    ambiente.definir(d, undefined, obter)
    const sol = ambiente.grupo.children.find(
        (o) => o instanceof DirectionalLight,
      ) as DirectionalLight,
      luzCeu = ambiente.grupo.children.find((o) => o instanceof HemisphereLight) as HemisphereLight
    expect(sol.intensity).toBe(luzDaHora(18).forcaDoSol)
    expect(luzCeu.intensity).toBe(luzDaHora(18).forcaDoCeu)
    d.iluminacao = {
      hora: 18,
      sol: { direcao: { x: -2, y: 3, z: 1 }, cor: '#bbccdd', intensidade: 3, sombra: false },
      ambiente: { ceu: '#5599dd', chao: '#334422', intensidade: 0.7 },
      nevoa: { tipo: 'linear', cor: '#aabbcc', perto: 3, longe: 21 },
      sombras: { resolucao: 512, alcance: 40 },
    }
    const antes = structuredClone(d)
    ambiente.definir(d, undefined, obter)
    camera.position.set(40, 20, 30)
    ambiente.quadro(camera, new Vector3(7, 2, -4))
    ambiente.atualizarNevoa(1000, 10000)
    expect(sol.intensity).toBe(3)
    expect(sol.castShadow).toBe(false)
    expect(sol.color.getHex()).toBe(new Color('#bbccdd').getHex())
    expect(luzCeu.intensity).toBe(0.7)
    expect(sol.target.position.toArray()).toEqual([7, 2, -4])
    expect(sol.position.clone().sub(sol.target.position).normalize().toArray()).toEqual(
      new Vector3(-2, 3, 1).normalize().toArray(),
    )
    expect(sol.shadow.camera.right).toBe(40)
    expect((cena.fog as Fog).near).toBe(3)
    expect((cena.fog as Fog).far).toBe(21)
    expect(d).toEqual(antes)
    d.iluminacao.sombras!.alcance = 41
    ambiente.definir(d, undefined, obter)
    ambiente.quadro(camera, new Vector3(7, 2, -4))
    expect(sol.shadow.camera.right).toBe(41)
    d.iluminacao = { hora: 12, nevoa: { tipo: 'nenhuma' } }
    ambiente.definir(d, undefined, obter)
    expect(cena.fog).toBeNull()
    expect(sol.intensity).toBe(luzDaHora(12).forcaDoSol)
    expect(luzCeu.groundColor.getHex()).toBe(new Color('#8a9a7a').getHex())
  } finally {
    ambiente.descartar()
  }
})
test('panorama compartilha a imagem, isola mapping, troca e libera apenas seus próprios recursos', () => {
  const cena = new Scene(),
    ambiente = new AmbienteDoPalco(cena),
    d = criarDocumentoVazio('d', 'Céu'),
    t = new Texture({ width: 512, height: 256 }),
    outra = new Texture({ width: 256, height: 128 }),
    originalMapping = t.mapping
  d.texturas = [{ id: 'p', biblioteca: 'b', textura: 'p', digest: 'a'.repeat(64) }]
  d.iluminacao = { hora: 12, ceu: { tipo: 'panorama', textura: 'p', giro: 1.2, intensidade: 0.8 } }
  let disposeOriginal = 0,
    disposeClone = 0
  t.addEventListener('dispose', () => {
    disposeOriginal++
  })
  try {
    expect(ambiente.definir(d, undefined, () => ({})).ceu).toBe('carregando')
    expect(ambiente.definir(d, undefined, () => ({ textura: t })).ceu).toBe('panorama')
    const clone = cena.background as Texture
    clone.addEventListener('dispose', () => {
      disposeClone++
    })
    expect(clone).not.toBe(t)
    expect(clone.image).toBe(t.image)
    expect(t.mapping).toBe(originalMapping)
    expect(cena.backgroundRotation.y).toBe(1.2)
    expect(cena.backgroundIntensity).toBe(0.8)
    ambiente.definir(d, undefined, () => ({ textura: t }))
    expect(cena.background).toBe(clone)
    ambiente.definir(d, undefined, () => ({ textura: outra }))
    expect(disposeClone).toBe(1)
    expect(disposeOriginal).toBe(0)
    d.iluminacao = { hora: 12, ceu: { tipo: 'cor', cor: '#7399cc' } }
    ambiente.definir(d, undefined, () => ({ textura: t }))
    expect((cena.background as Color).getHex()).toBe(new Color('#7399cc').getHex())
    ambiente.descartar()
    ambiente.descartar()
    expect(cena.children).toHaveLength(0)
    expect(cena.background).toBeNull()
    expect(disposeOriginal).toBe(0)
  } finally {
    ambiente.descartar()
    t.dispose()
    outra.dispose()
  }
})
test('panorama inválido ou erro de leitura informa a falha e não vira um céu esticado', () => {
  const cena = new Scene(),
    ambiente = new AmbienteDoPalco(cena),
    d = criarDocumentoVazio('d', 'Céu'),
    t = new Texture({ width: 256, height: 256 })
  d.texturas = [{ id: 'p', biblioteca: 'b', textura: 'p', digest: 'a'.repeat(64) }]
  d.iluminacao = { hora: 12, ceu: { tipo: 'panorama', textura: 'p', giro: 0, intensidade: 1 } }
  try {
    expect(ambiente.definir(d, undefined, () => ({ textura: t })).falhas[0]).toContain('2:1')
    expect(cena.background).toBeNull()
    expect(ambiente.definir(d, undefined, () => ({ erro: 'Arquivo indisponível' })).falhas).toEqual(
      ['Arquivo indisponível'],
    )
  } finally {
    ambiente.descartar()
    t.dispose()
  }
})
test('luzes reutilizam instâncias, alvo local gira uma vez e ocultar/remove libera targets e sombras', () => {
  const d = criarDocumentoVazio('d', 'Locais'),
    locais = new LuzesLocaisDoPalco()
  d.marcadores = [luz('p'), luz('f', true)]
  try {
    expect(locais.definir(d)).toEqual({ luzes: 2, sombras: 2, carregando: 0 })
    const ponto = locais.grupo.children.find((o) => o instanceof PointLight) as PointLight,
      foco = locais.grupo.children.find((o) => o instanceof SpotLight) as SpotLight
    expect(foco.target.position.toArray()).toEqual([0, 2, 4])
    expect(foco.angle).toBeCloseTo(Math.PI / 6)
    expect(foco.penumbra).toBe(0.4)
    expect(foco.shadow.mapSize.x).toBe(512)
    locais.definir(d)
    expect(locais.grupo.children).toContain(ponto)
    d.marcadores[1]!.oculto = true
    expect(locais.definir(d).luzes).toBe(1)
    expect(locais.grupo.children).not.toContain(foco.target)
    d.marcadores = []
    locais.definir(d)
    expect(locais.grupo.children).toHaveLength(0)
  } finally {
    locais.descartar()
  }
})
test('luz apoiada aguarda o campo real e respeita orçamento de luzes e sombras', () => {
  const d = criarDocumentoVazio('d', 'Locais'),
    locais = new LuzesLocaisDoPalco()
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  d.marcadores = [{ ...luz('p'), noChao: true }]
  try {
    expect(locais.definir(d).carregando).toBe(1)
    expect(locais.grupo.children).toHaveLength(0)
    locais.definir(d, () => 5)
    expect((locais.grupo.children[0] as PointLight).position.y).toBe(8)
    d.marcadores = Array.from({ length: 5 }, (_, i) => luz(`p${i}`))
    expect(() => locais.definir(d, () => 5)).toThrow('quatro sombras')
  } finally {
    locais.descartar()
  }
})
test('alterar resolução ou desligar sombra libera o target e permite recriação', () => {
  const luz = new PointLight(),
    alvo = new WebGLRenderTarget(16, 16)
  let descartou = 0
  alvo.addEventListener('dispose', () => {
    descartou++
  })
  luz.shadow.map = alvo
  luz.shadow.mapSize.set(16, 16)
  configurarSombra(luz, true, 512)
  expect(descartou).toBe(1)
  expect(luz.shadow.map).toBeNull()
  expect(luz.castShadow).toBe(true)
  configurarSombra(luz, false, 512)
  expect(luz.castShadow).toBe(false)
  configurarSombra(luz, true, 512)
  expect(luz.castShadow).toBe(true)
  luz.dispose()
})

test('entrada compilada conserva posição apoiada e alvo girado das luzes nativas', () => {
  const doc = criarDocumentoVazio('d', 'Luzes'),
    nativas = new LuzesLocaisDoPalco(),
    compiladas = new LuzesLocaisDoPalco()
  doc.marcadores = [luz('p'), luz('f', true)]
  try {
    nativas.definir(doc)
    compiladas.definirCompiladas(
      doc.marcadores.map((m) => ({
        id: m.id,
        nome: m.nome,
        posicao: transformacaoDoMarcador(doc, m).posicao,
        giro: m.giro,
        objeto: null,
        configuracao: m.configuracao,
      })),
    )
    const a = nativas.grupo.children.filter(
        (n) => n instanceof PointLight || n instanceof SpotLight,
      ),
      b = compiladas.grupo.children.filter((n) => n instanceof PointLight || n instanceof SpotLight)
    expect(b).toHaveLength(a.length)
    for (let i = 0; i < a.length; i++) {
      expect(b[i]!.position.toArray()).toEqual(a[i]!.position.toArray())
      expect(b[i]!.intensity).toBe(a[i]!.intensity)
      if (a[i] instanceof SpotLight)
        expect((b[i] as SpotLight).target.position.toArray()).toEqual(
          (a[i] as SpotLight).target.position.toArray(),
        )
    }
    compiladas.definirCompiladas([])
    expect(compiladas.grupo.children).toHaveLength(0)
  } finally {
    nativas.descartar()
    compiladas.descartar()
  }
})

// Conferência no staging (22/11/2026): no Jogo 3D do Estúdio o céu do cenário saía preto. A esfera
// do céu tem 3000 m de raio e a câmera do motor enxerga até 1000 m: a esfera inteira caía fora do
// alcance da câmera e sobrava o fundo preto. O céu cabe no alcance de quem desenha.
test('o céu cabe dentro do alcance da câmera que desenha o quadro', () => {
  const cena = new Scene()
  const ambiente = new AmbienteDoPalco(cena)
  const ceu = ambiente.grupo.children.find(
    (filho): filho is Mesh => filho instanceof Mesh && filho.renderOrder === -1000,
  )
  if (!ceu) throw new Error('Sem a esfera do céu.')
  const perto = new PerspectiveCamera(60, 1, 0.1, 1000)
  perto.position.set(10, 5, -20)
  perto.updateMatrixWorld(true)
  ambiente.quadro(perto, new Vector3(0, 0, 0))
  expect(ceu.visible).toBe(true)
  expect(ceu.scale.x).toBeLessThan(perto.far)
  expect(ceu.scale.x).toBeGreaterThan(perto.near * 100)
  expect(ceu.position.toArray()).toEqual([10, 5, -20])
  // A oficina enxerga longe (4000 m ou mais): o céu continua com o raio de sempre.
  const longe = new PerspectiveCamera(60, 1, 0.1, 4000)
  longe.updateMatrixWorld(true)
  ambiente.quadro(longe, new Vector3(0, 0, 0))
  expect(ceu.scale.x).toBe(3000)
})
