import {
  alturaDoChao,
  type ComandoDeCenario,
  type ConfiguracaoDeMarcador,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  igual,
  type MarcadorDeCenario,
  MarcadorSchema,
  transformacaoDoMarcador,
} from '@sistemazero/molda-cenarios-core/v2'

export const NOMES_JOGO = {
  inicio: 'Início',
  ponto: 'Marcador',
  caixa: 'Zona em caixa',
  esfera: 'Zona em esfera',
  poligono: 'Zona poligonal',
  rota: 'Rota',
  camera: 'Câmera',
  regua: 'Régua',
  escala: 'Escala',
  pontual: 'Luz pontual',
  foco: 'Foco de luz',
} as const
export type FerramentaDoJogo = keyof typeof NOMES_JOGO
export type ComandoDeMarcador = Extract<ComandoDeCenario, { tipo: 'marcador.definir' }>

export function tipoDoMarcador(m: MarcadorDeCenario): FerramentaDoJogo {
  const c = m.configuracao
  if (c?.tipo === 'zona') return c.forma.tipo
  if (c?.tipo === 'luz') return c.luz.tipo
  return c?.tipo ?? 'ponto'
}

/** Medidas iniciais editáveis, em metros. Nenhum desses metadados concede progresso ao jogo. */
export function novoMarcador(
  doc: DocumentoDeCenario,
  tipo: FerramentaDoJogo,
  id: string,
  ponto: { x: number; y: number; z: number },
  altura = 1.16,
): MarcadorDeCenario {
  let configuracao: ConfiguracaoDeMarcador
  switch (tipo) {
    case 'caixa':
      configuracao = { tipo: 'zona', forma: { tipo: 'caixa', tamanho: { x: 4, y: 2, z: 4 } } }
      break
    case 'esfera':
      configuracao = { tipo: 'zona', forma: { tipo: 'esfera', raio: 2 } }
      break
    case 'poligono':
      configuracao = {
        tipo: 'zona',
        forma: {
          tipo: 'poligono',
          altura: 2,
          pontos: [
            { x: -2, z: -2 },
            { x: 2, z: -2 },
            { x: 2, z: 2 },
            { x: -2, z: 2 },
          ],
        },
      }
      break
    case 'rota':
      configuracao = {
        tipo: 'rota',
        pontos: [
          { x: 0, y: 0, z: 0 },
          { x: 4, y: 0, z: 0 },
        ],
        fechada: false,
        seguirTerreno: true,
      }
      break
    case 'camera':
      configuracao = { tipo: 'camera', alvo: { x: 0, y: -1, z: -4 }, campoDeVisao: 48 }
      break
    case 'regua':
      configuracao = { tipo: 'regua', fim: { x: 4, y: 0, z: 0 } }
      break
    case 'escala':
      configuracao = { tipo: 'escala', altura }
      break
    case 'inicio':
      configuracao = {
        tipo: 'inicio',
        principal: !doc.marcadores.some(
          (m) => m.id !== id && m.configuracao?.tipo === 'inicio' && m.configuracao.principal,
        ),
      }
      break
    case 'pontual':
    case 'foco': {
      const base = { cor: '#ffe4b8', intensidade: 30, alcance: 12, decaimento: 2, sombra: false }
      configuracao = {
        tipo: 'luz',
        luz:
          tipo === 'pontual'
            ? { tipo, ...base }
            : {
                tipo,
                ...base,
                alvo: { x: 0, y: -3, z: -2 },
                angulo: 35,
                penumbra: 0.5,
              },
      }
      break
    }
    default:
      configuracao = { tipo: 'ponto' }
  }
  // Y absoluto até a pessoa escolher apoio no chão; não supõe um campo de alturas disponível.
  return MarcadorSchema.parse({
    id,
    nome: NOMES_JOGO[tipo],
    grupo: null,
    oculto: false,
    bloqueado: false,
    posicao: { ...ponto },
    giro: 0,
    noChao: false,
    objeto: null,
    configuracao,
  })
}

/** Trocar o início principal é uma decisão autoral atômica, com as mesmas travas do núcleo. */
export function comandosParaGuardarMarcador(
  doc: DocumentoDeCenario,
  marcador: MarcadorDeCenario,
): ComandoDeMarcador[] {
  const resultado = MarcadorSchema.safeParse({ ...marcador, nome: marcador.nome.trim() })
  if (!resultado.success) {
    const erro = resultado.error.issues[0]
    throw Error(
      erro?.path[0] === 'nome'
        ? 'Dê um nome ao marcador, com até 120 caracteres.'
        : erro?.code === 'custom'
          ? erro.message
          : 'Confira as medidas e os pontos do marcador.',
    )
  }
  const m = resultado.data,
    comandos: ComandoDeMarcador[] = []
  if (m.configuracao?.tipo === 'inicio' && m.configuracao.principal)
    for (const anterior of doc.marcadores)
      if (
        anterior.id !== m.id &&
        anterior.configuracao?.tipo === 'inicio' &&
        anterior.configuracao.principal
      )
        comandos.push({
          tipo: 'marcador.definir',
          marcador: { ...anterior, configuracao: { ...anterior.configuracao, principal: false } },
        })
  comandos.push({ tipo: 'marcador.definir', marcador: m })
  return comandos.filter(
    (c) =>
      !igual(
        doc.marcadores.find((p) => p.id === c.marcador.id),
        c.marcador,
      ),
  )
}
export function mudarApoioDoMarcador(
  doc: DocumentoDeCenario,
  m: MarcadorDeCenario,
  noChao: boolean,
  fonte?: FonteDeAlturas,
): MarcadorDeCenario {
  const p = transformacaoDoMarcador(doc, m, fonte).posicao
  return {
    ...m,
    noChao,
    posicao: { ...p, y: p.y - (noChao ? alturaDoChao(doc.base, p.x, p.z, fonte) : 0) },
  }
}

/** Colocar pelo palco conserva o desnível autoral, usando a mesma altura do chão. */
export function mudarLugarDoMarcador(
  doc: DocumentoDeCenario,
  m: MarcadorDeCenario,
  ponto: { x: number; y: number; z: number },
  fonte?: FonteDeAlturas,
): MarcadorDeCenario {
  const antes = transformacaoDoMarcador(doc, m, fonte).posicao,
    distancia = antes.y - alturaDoChao(doc.base, antes.x, antes.z, fonte),
    y = ponto.y + distancia - (m.noChao ? alturaDoChao(doc.base, ponto.x, ponto.z, fonte) : 0)
  return MarcadorSchema.parse({ ...m, posicao: { x: ponto.x, y, z: ponto.z } })
}
