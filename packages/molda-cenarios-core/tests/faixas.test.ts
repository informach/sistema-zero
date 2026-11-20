import { describe, expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  type DocumentoDeCenario,
  FAMILIA_DA_FERRAMENTA,
  FAMILIAS_DA_OFICINA,
  FERRAMENTAS_DE_TERRENO,
  familiasDasFaixas,
  familiasMudadas,
  familiasTrancadas,
  type InstanciaDeCenario,
} from '../src/v2'
import { AparenciaDaAguaSchema } from '../src/v2/parametros-de-agua'

const vazio = () => criarDocumentoVazio('c', 'Ilha')
const objeto = (id: string, extra: Partial<InstanciaDeCenario> = {}): InstanciaDeCenario => ({
  id,
  nome: 'Árvore',
  grupo: null,
  modelo: 'm',
  oculto: false,
  bloqueado: false,
  apoio: { tipo: 'absoluto' },
  colisao: 'caixa',
  transformacao: {
    posicao: { x: 0, y: 0, z: 0 },
    rotacao: { x: 0, y: 0, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
  ...extra,
})
const mudar = (doc: DocumentoDeCenario, fn: (d: DocumentoDeCenario) => void) => {
  const novo = structuredClone(doc)
  fn(novo)
  return novo
}

describe('catálogo das faixas da oficina', () => {
  test('cada família tem uma faixa conhecida e id único', () => {
    const ids = FAMILIAS_DA_OFICINA.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(familiasDasFaixas(['basic', 'intermediate', 'professional'])).toEqual(ids)
    const basicas = new Set<string>(familiasDasFaixas(['basic']))
    for (const f of FAMILIAS_DA_OFICINA) expect(basicas.has(f.id)).toBe(f.faixa === 'basic')
  })
  test('toda ferramenta de terreno tem família, e o mapa só aponta para famílias que existem', () => {
    for (const f of FERRAMENTAS_DE_TERRENO) expect(FAMILIA_DA_FERRAMENTA.terreno[f]).toBeDefined()
    const ids = new Set<string>(FAMILIAS_DA_OFICINA.map((f) => f.id))
    for (const aba of Object.values(FAMILIA_DA_FERRAMENTA))
      for (const familia of Object.values(aba)) expect(ids.has(familia)).toBe(true)
  })
})

describe('o que o lote criou ou mudou', () => {
  test('o básico não acusa nada: pôr, mover, girar, tamanho igual, hora, mar e trilha', () => {
    const antes = vazio()
    const depois = mudar(antes, (d) => {
      d.instancias.push(
        objeto('a', {
          transformacao: {
            posicao: { x: 3, y: 0, z: 1 },
            rotacao: { x: 0, y: 1, z: 0 },
            escala: { x: 2, y: 2, z: 2 },
          },
        }),
      )
      d.iluminacao.hora = 18
      d.aguas.push({
        id: 'mar',
        nome: 'Mar',
        tipo: 'mar',
        nivel: 0,
        nado: true,
        aparencia: AparenciaDaAguaSchema.parse({}),
      } as never)
      d.caminhos.push({ id: 't', nome: 'Trilha', tipo: 'trilha' } as never)
      d.marcadores.push({ id: 'i', configuracao: { tipo: 'inicio', principal: true } } as never)
    })
    expect(familiasMudadas(antes, depois)).toEqual([])
  })

  test('rio, estrada, tamanho por eixo, zona, câmera e sol são reconhecidos', () => {
    const antes = vazio()
    const depois = mudar(antes, (d) => {
      d.aguas.push({ id: 'rio', nome: 'Rio', tipo: 'rio' } as never)
      d.caminhos.push({ id: 'e', nome: 'Estrada', tipo: 'estrada' } as never)
      d.instancias.push(
        objeto('a', {
          transformacao: {
            posicao: { x: 0, y: 0, z: 0 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 3, z: 1 },
          },
        }),
      )
      d.marcadores.push({
        id: 'z',
        configuracao: { tipo: 'zona', forma: { tipo: 'esfera', raio: 2 } },
      } as never)
      d.marcadores.push({ id: 'cam', configuracao: { tipo: 'camera' } } as never)
      d.iluminacao.sol = {
        direcao: { x: 0, y: -1, z: 0 },
        cor: '#ffffff',
        intensidade: 1,
        sombra: true,
      } as never
    })
    expect(familiasMudadas(antes, depois)).toEqual([
      'agua.rio-represa-cachoeira',
      'objetos.precisao',
      'caminhos.construcoes',
      'jogo.zonas-e-rotas',
      'luz.sol-e-ambiente',
      'jogo.cameras',
    ])
  })

  test('mexer em outra coisa de um cenário que já usa a família não conta; mudar a família conta', () => {
    const antes = mudar(vazio(), (d) => {
      d.instancias.push(
        objeto('a', {
          transformacao: {
            posicao: { x: 0, y: 0, z: 0 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 3, z: 1 },
          },
        }),
      )
      d.aguas.push({ id: 'rio', nome: 'Rio', tipo: 'rio' } as never)
    })
    // Mover o objeto (as chaves chegam em outra ordem, como do banco) e renomear nada da família.
    const movido = mudar(antes, (d) => {
      const [i] = d.instancias
      i!.transformacao = {
        escala: { z: 1, y: 3, x: 1 },
        rotacao: { x: 0, y: 0, z: 0 },
        posicao: { x: 9, y: 0, z: 9 },
      }
      d.iluminacao.hora = 6
    })
    expect(familiasMudadas(antes, movido)).toEqual([])
    // Apagar o rio também não conta.
    expect(
      familiasMudadas(
        antes,
        mudar(antes, (d) => (d.aguas = [])),
      ),
    ).toEqual([])
    // Mudar a escala por eixo conta.
    const esticado = mudar(antes, (d) => {
      d.instancias[0]!.transformacao.escala = { x: 1, y: 5, z: 1 }
    })
    expect(familiasMudadas(antes, esticado)).toEqual(['objetos.precisao'])
  })

  test('colisão só conta num objeto que já existia; tamanho do chão só num chão que já existia', () => {
    const antes = mudar(vazio(), (d) => d.instancias.push(objeto('a')))
    const novo = mudar(antes, (d) => d.instancias.push(objeto('b', { colisao: 'malha' })))
    expect(familiasMudadas(antes, novo)).toEqual([])
    const trocada = mudar(antes, (d) => {
      d.instancias[0]!.colisao = 'nenhuma'
    })
    expect(familiasMudadas(antes, trocada)).toEqual(['objetos.colisao'])
    const maior = mudar(antes, (d) => {
      d.base = { tipo: 'plano', largura: 512, comprimento: 256 }
    })
    expect(familiasMudadas(antes, maior)).toEqual(['terreno.tamanho'])
  })

  test('propriedades personalizadas, buracos e mais de cinco camadas de chão', () => {
    const terreno = {
      tipo: 'terreno',
      origem: { x: 0, z: 0 },
      passo: 1,
      colunas: 64,
      linhas: 64,
      min: 0,
      max: 1,
      fundo: -1,
      pecas: [],
    } as unknown as DocumentoDeCenario['base']
    const antes = mudar(vazio(), (d) => {
      d.base = terreno
      d.instancias.push(objeto('a'))
    })
    const depois = mudar(antes, (d) => {
      d.instancias[0]!.propriedades = { vida: 3 }
      const base = d.base as Extract<DocumentoDeCenario['base'], { tipo: 'terreno' }>
      base.buracos = [{ coluna: 0, linha: 0, digest: 'a'.repeat(64) }]
      base.solo = {
        camadas: Array.from({ length: 6 }, (_, n) => ({
          id: `s${n}`,
          nome: `S${n}`,
          cor: '#000000',
        })),
        pecas: [],
      }
    })
    expect(familiasMudadas(antes, depois)).toEqual([
      'terreno.camadas',
      'terreno.buraco',
      'jogo.propriedades',
    ])
  })

  test('a aparência da água só conta quando foge do padrão, e tirar o nado conta', () => {
    const antes = vazio()
    const com = (extra: object) =>
      mudar(antes, (d) => {
        d.aguas.push({ id: 'l', nome: 'Lago', tipo: 'lago', ...extra } as never)
      })
    expect(
      familiasMudadas(antes, com({ nado: true, aparencia: AparenciaDaAguaSchema.parse({}) })),
    ).toEqual([])
    expect(familiasMudadas(antes, com({ nado: false }))).toEqual(['agua.aparencia'])
    expect(
      familiasMudadas(
        antes,
        com({ aparencia: AparenciaDaAguaSchema.parse({ corRasa: '#ff0000' }) }),
      ),
    ).toEqual(['agua.aparencia'])
  })

  test('as trancadas são as mudadas fora das faixas de quem pede', () => {
    const antes = vazio()
    const depois = mudar(antes, (d) => {
      d.aguas.push({ id: 'rio', nome: 'Rio', tipo: 'rio' } as never)
      d.marcadores.push({ id: 'cam', configuracao: { tipo: 'camera' } } as never)
    })
    expect(familiasTrancadas(antes, depois, ['basic']).map((f) => f.id)).toEqual([
      'agua.rio-represa-cachoeira',
      'jogo.cameras',
    ])
    expect(familiasTrancadas(antes, depois, ['basic', 'intermediate']).map((f) => f.id)).toEqual([
      'jogo.cameras',
    ])
    expect(familiasTrancadas(antes, depois, ['basic', 'intermediate', 'professional'])).toEqual([])
  })
})
