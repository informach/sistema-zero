import { expect, test } from 'bun:test'
import { lerCenaCompilada } from '../src/compilar/schema'
import { RotaCompiladaSchema, TerrenoCompiladoSchema } from '../src/compilar/schema-metadados'
import { AguaSchema } from '../src/v2'

const matriz = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const volume = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }

test('terreno compilado conserva limites e domínio da autoria', () => {
  const t = {
    origem: { x: 0, z: 0 },
    passo: 1,
    colunas: 64,
    linhas: 64,
    min: -1,
    max: 1,
    fundo: 0,
    cobertura: 'grade',
    pecas: [],
    recortes: [],
    alturas: 'terreno/alturas.bin',
    pngAlturas: 'terreno/alturas.png',
  }
  expect(TerrenoCompiladoSchema.safeParse(t).success).toBe(true)
  for (const patch of [{ fundo: 2 }, { origem: { x: 100001, z: 0 } }, { colunas: 4096, passo: 32 }])
    expect(TerrenoCompiladoSchema.safeParse({ ...t, ...patch }).success).toBe(false)
})
function cena() {
  return {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Praça',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'praca', revisao: 3, digest: 'a'.repeat(64) },
    arquivos: [
      {
        caminho: 'modelos/a.glb',
        digest: 'b'.repeat(64),
        bytes: 100,
        mime: 'model/gltf-binary',
        papel: 'modelo',
        malhas: 1,
        triangulos: 1,
        verticesMaximos: 3,
      },
    ],
    entidades: [
      { id: 'casa', nome: 'Casa', tipo: 'objeto', grupo: null, propriedades: { uso: 'oficina' } },
    ],
    nos: [{ id: 'n0', entidade: 'casa', arquivo: 'modelos/a.glb', matriz: [...matriz], volume }],
    colisoes: [],
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  }
}

test('restauração de efeito só pode apontar para água com parâmetros e arquivo correspondentes', () => {
  const d = cena()
  expect(() =>
    lerCenaCompilada({ ...d, nos: d.nos.map((n) => ({ ...n, efeito: 'agua' })) }),
  ).toThrow(/efeito de água/)
  const agua = {
    ...d,
    entidades: d.entidades.map((e) => ({ ...e, tipo: 'agua' })),
    arquivos: d.arquivos.map((a) => ({ ...a, papel: 'agua' })),
    nos: d.nos.map((n) => ({ ...n, efeito: 'agua' })),
    aguas: [
      AguaSchema.parse({
        id: 'casa',
        nome: 'Mar',
        grupo: null,
        oculto: false,
        bloqueado: false,
        tipo: 'mar',
        nivel: 0,
      }),
    ],
  }
  expect(lerCenaCompilada(agua).nos[0]!.efeito).toBe('agua')
  expect(() => lerCenaCompilada({ ...agua, aguas: [] })).toThrow(/efeito de água/)
})

test('leitor portátil conserva revisão, matrizes e propriedades sem interpretar código', () => {
  const d = cena(),
    antes = JSON.stringify(d),
    r = lerCenaCompilada(antes)
  expect(r.fonte).toEqual(d.fonte)
  expect(r.nos[0]!.matriz).toEqual(matriz)
  expect(r.entidades[0]!.propriedades).toEqual({ uso: 'oficina' })
  expect(JSON.stringify(d)).toBe(antes)
})

test('entidades conservam âncoras e organização, mas ocultas não criam desenho ou colisão', () => {
  const d = cena(),
    comAncora = {
      ...d,
      entidades: d.entidades.map((e) => ({ ...e, matriz: [...matriz], volume })),
    },
    r = lerCenaCompilada(comAncora)
  expect(r.entidades[0]!.matriz).toEqual(matriz)
  const oculta = {
    ...comAncora,
    entidades: comAncora.entidades.map((e) => ({ ...e, oculto: true })),
  }
  expect(() => lerCenaCompilada(oculta)).toThrow(/oculta|oculto/)
  expect(lerCenaCompilada({ ...oculta, nos: [] }).entidades[0]!.oculto).toBe(true)
})

test('referência ausente ou arquivo/entidade repetidos não geram uma cena parcialmente válida', () => {
  const ausente = cena()
  ausente.nos[0]!.arquivo = 'modelos/falta.glb'
  expect(() => lerCenaCompilada(ausente)).toThrow(/arquivo|referência/i)
  const entidade = cena()
  entidade.nos[0]!.entidade = 'desconhecida'
  expect(() => lerCenaCompilada(entidade)).toThrow(/entidade/i)
  const repetido = cena()
  repetido.arquivos.push({ ...repetido.arquivos[0]!, caminho: 'MODELOS/A.GLB' })
  expect(() => lerCenaCompilada(repetido)).toThrow(/repetid/i)
  const nos = cena()
  nos.nos.push({ ...nos.nos[0]! })
  expect(() => lerCenaCompilada(nos)).toThrow(/repetid/i)
  const ids = cena()
  ids.entidades.push({ ...ids.entidades[0]! })
  expect(() => lerCenaCompilada(ids)).toThrow(/repetid/i)
})

test('caminhos hostis, limites de malha, matrizes inválidas e dados não finitos são recusados', () => {
  for (const caminho of ['../a.glb', '/a.glb', 'https://x/a.glb', 'C:/a.glb', 'modelos/aux.glb']) {
    const d = cena()
    d.arquivos[0]!.caminho = caminho
    expect(() => lerCenaCompilada(d)).toThrow()
  }
  const grande = cena()
  grande.arquivos[0]!.verticesMaximos = 65_001
  expect(() => lerCenaCompilada(grande)).toThrow()
  const ruim = cena()
  ruim.nos[0]!.matriz[0] = NaN
  expect(() => lerCenaCompilada(ruim)).toThrow()
  const singular = cena()
  singular.nos[0]!.matriz[0] = 0
  expect(() => lerCenaCompilada(singular)).toThrow(/matriz/i)
  const projetiva = cena()
  projetiva.nos[0]!.matriz[3] = 1
  expect(() => lerCenaCompilada(projetiva)).toThrow(/matriz/i)
  const espelhada = cena()
  espelhada.nos[0]!.matriz[0] = -1
  expect(lerCenaCompilada(espelhada).nos[0]!.matriz[0]).toBe(-1)
  expect(() => lerCenaCompilada('{"formato":')).toThrow(/cena|JSON/i)
  expect(() => lerCenaCompilada({ ...cena(), codigo: 'executar()' })).toThrow()
})

test('origens e licenças são coerentes e céu exige uma textura de imagem presente', () => {
  const d = cena(),
    m = { id: 'm', biblioteca: 'pack', modelo: 'm', digest: 'c'.repeat(64) }
  expect(() => lerCenaCompilada({ ...d, fontes: { ...d.fontes, modelos: [m] } })).toThrow(
    /licença|biblioteca/i,
  )
  const comLicenca = {
    ...d,
    fontes: { ...d.fontes, modelos: [m] },
    licencas: [{ id: 'pack', nome: 'Adventure Land', licenca: 'restrita' }],
  }
  expect(lerCenaCompilada(comLicenca).licencas).toHaveLength(1)
  const ceu = {
    ...d,
    ambiente: { hora: 12, ceu: { tipo: 'panorama', textura: 'ceu', giro: 0, intensidade: 1 } },
  }
  expect(() => lerCenaCompilada(ceu)).toThrow(/céu|textura|panorama/i)
  const completa = {
    ...ceu,
    arquivos: [
      ...d.arquivos,
      {
        caminho: 'texturas/ceu.png',
        digest: 'd'.repeat(64),
        bytes: 32,
        mime: 'image/png',
        papel: 'ceu',
        largura: 64,
        altura: 32,
      },
    ],
    texturas: [{ id: 'ceu', arquivo: 'texturas/ceu.png' }],
  }
  expect(lerCenaCompilada(completa).ambiente.ceu?.tipo).toBe('panorama')
  const quadrada = {
    ...completa,
    arquivos: completa.arquivos.map((a) => (a.papel === 'ceu' ? { ...a, largura: 32 } : a)),
  }
  expect(() => lerCenaCompilada(quadrada)).toThrow(/2:1|panorama/i)
})

test('terreno fixa dimensões e arquivos de altura corretos; não trata bytes faltando como chão plano', () => {
  const d = cena(),
    terreno = {
      origem: { x: 0, z: 0 },
      passo: 1,
      colunas: 64,
      linhas: 64,
      min: -10,
      max: 20,
      fundo: 0,
      cobertura: 'grade',
      pecas: [],
      recortes: [],
      alturas: 'terreno/alturas.bin',
      pngAlturas: 'terreno/alturas.png',
    },
    completa = {
      ...d,
      terreno,
      arquivos: [
        ...d.arquivos,
        {
          caminho: 'terreno/alturas.bin',
          digest: 'e'.repeat(64),
          bytes: 65 * 65 * 4,
          mime: 'application/octet-stream',
          papel: 'alturas',
        },
        {
          caminho: 'terreno/alturas.png',
          digest: 'f'.repeat(64),
          bytes: 100,
          mime: 'image/png',
          papel: 'alturas',
          largura: 65,
          altura: 65,
        },
      ],
    }
  expect(lerCenaCompilada(completa).terreno!.colunas).toBe(64)
  expect(() => lerCenaCompilada({ ...d, terreno })).toThrow(/altura|arquivo/i)
  expect(() =>
    lerCenaCompilada({
      ...completa,
      arquivos: completa.arquivos.map((a) => (a.caminho.endsWith('.bin') ? { ...a, bytes: 4 } : a)),
    }),
  ).toThrow(/altura|dimens/i)
})

test('ciclos organizacionais e associações de metadados não apontam para entidades perdidas', () => {
  const d = cena()
  expect(() =>
    lerCenaCompilada({ ...d, entidades: [{ ...d.entidades[0]!, grupo: 'casa' }] }),
  ).toThrow(/grupo|ciclo/i)
  const marcador = {
    id: 'inicio',
    nome: 'Início',
    posicao: { x: 0, y: 0, z: 0 },
    giro: 0,
    objeto: 'perdido',
    configuracao: { tipo: 'inicio', principal: true },
  }
  expect(() =>
    lerCenaCompilada({
      ...d,
      entidades: [...d.entidades, { id: 'inicio', nome: 'Início', tipo: 'marcador', grupo: null }],
      marcadores: [marcador],
    }),
  ).toThrow(/associa|entidade/i)
})

test('trajetos e câmeras não têm dados derivados contraditórios', () => {
  const d = cena(),
    entidade = { id: 'r', nome: 'Rota', tipo: 'marcador', grupo: null },
    rota = {
      id: 'r',
      nome: 'Rota',
      posicao: { x: 0, y: 0, z: 0 },
      giro: 0,
      objeto: null,
      configuracao: {
        tipo: 'rota',
        pontos: [
          { x: 0, y: 0, z: 0 },
          { x: 3, y: 0, z: 0 },
        ],
        fechada: false,
        seguirTerreno: false,
      },
      rota: {
        pontos: [
          { x: 0, y: 0, z: 0 },
          { x: 3, y: 0, z: 0 },
        ],
        distancias: [0, 3],
        comprimento: 3,
        fechada: false,
      },
    }
  expect(
    lerCenaCompilada({ ...d, entidades: [...d.entidades, entidade], marcadores: [rota] })
      .marcadores[0]!.rota!.comprimento,
  ).toBe(3)
  expect(() =>
    lerCenaCompilada({
      ...d,
      entidades: [...d.entidades, entidade],
      marcadores: [{ ...rota, rota: { ...rota.rota, distancias: [0, 4], comprimento: 4 } }],
    }),
  ).toThrow(/distância|distancia/i)
  const camera = {
    id: 'r',
    nome: 'Câmera',
    posicao: { x: 0, y: 0, z: 0 },
    giro: 0,
    objeto: null,
    configuracao: { tipo: 'camera', alvo: { x: 0, y: 0, z: -4 }, campoDeVisao: 48 },
    camera: { posicao: { x: 1, y: 0, z: 0 }, alvo: { x: 0, y: 0, z: -4 }, campoDeVisao: 48 },
  }
  expect(() =>
    lerCenaCompilada({ ...d, entidades: [...d.entidades, entidade], marcadores: [camera] }),
  ).toThrow(/câmera/i)
})

test('rota fechada termina no ponto inicial, como a amostragem compartilhada', () => {
  const pontos = [
    { x: 0, y: 0, z: 0 },
    { x: 3, y: 0, z: 0 },
  ]
  expect(
    RotaCompiladaSchema.safeParse({ pontos, distancias: [0, 3], comprimento: 3, fechada: true })
      .success,
  ).toBe(false)
  expect(
    RotaCompiladaSchema.safeParse({
      pontos: [...pontos, pontos[0]],
      distancias: [0, 3, 6],
      comprimento: 6,
      fechada: true,
    }).success,
  ).toBe(true)
})
