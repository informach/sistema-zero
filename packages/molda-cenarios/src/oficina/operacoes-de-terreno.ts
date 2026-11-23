import { passoDoTerreno } from '@sistemazero/molda-cenarios-core/compilar'
import {
  abrirEdicaoDeTerreno,
  acrescentarCamadaDeChao,
  aplicarReceitaDeTerreno,
  type BaseDeCenario,
  type BaseDeTerreno,
  BaseDeTerrenoSchema,
  type CamadaDeSolo,
  colocarImagemNoCampo,
  criarPinturaDeChao,
  type EstadoDoTerreno,
  type ImagemDeAlturas,
  pintarChaoPorRegras,
  type ReceitaDeTerreno,
  type RegioesDeTerreno,
  type RegraDeChao,
  reamostrarTerreno,
  retirarCamadaDeChao,
} from '@sistemazero/molda-cenarios-core/v2'

export interface EdicaoPreparada {
  base: BaseDeTerreno
  estado: EstadoDoTerreno
  regioes: RegioesDeTerreno
}
export const regiaoInteira = (base: BaseDeTerreno) => ({
  x0: 0,
  z0: 0,
  x1: base.colunas,
  z1: base.linhas,
})
export function baseInicialDeTerreno(base: BaseDeCenario): BaseDeTerreno {
  if (base.tipo === 'terreno') return base
  if (base.tipo === 'perfil')
    throw Error('Converta o perfil do jogo em terreno antes de editar o relevo.')
  // O espaçamento acompanha o tamanho (plano "Mundos de 2 km", lote 4): 1 m até 1 km, 2 m até
  // 2 km, 4 m até 4 km; todo mundo novo fica com até 1024 × 1024 células.
  const alvo = passoDoTerreno(Math.min(8192, Math.max(base.largura, base.comprimento))),
    colunas = Math.min(4096, Math.max(64, Math.ceil(base.largura / alvo / 64) * 64)),
    linhas = Math.min(4096, Math.max(64, Math.ceil(base.comprimento / alvo / 64) * 64)),
    passo = Math.max(base.largura / colunas, base.comprimento / linhas, 0.25)
  return BaseDeTerrenoSchema.parse({
    tipo: 'terreno',
    origem: { x: -(colunas * passo) / 2, z: -(linhas * passo) / 2 },
    colunas,
    linhas,
    passo,
    min: -50,
    max: 150,
    fundo: 0,
    cobertura: 'grade',
    pecas: [],
    solo: { camadas: [{ id: 'grama', nome: 'Grama', cor: '#80a568' }], pecas: [] },
  })
}
export function prepararReceita(
  base: BaseDeTerreno,
  estado: EstadoDoTerreno | null,
  receita: ReceitaDeTerreno,
): EdicaoPreparada {
  const e = estado ?? abrirEdicaoDeTerreno(base, new Map())
  const alturas = aplicarReceitaDeTerreno(e.campo, receita)
  return { base, estado: e, regioes: { alturas } }
}
export function prepararDimensoes(
  base: BaseDeTerreno,
  estado: EstadoDoTerreno,
  forma: BaseDeTerreno,
): EdicaoPreparada {
  const nova = {
    ...forma,
    pecas: [],
    buracos: [],
    ...(base.solo ? { solo: { camadas: base.solo.camadas, pecas: [] } } : {}),
  }
  BaseDeTerrenoSchema.parse(nova)
  return {
    base: nova,
    estado: reamostrarTerreno(estado, nova),
    regioes: {
      alturas: regiaoInteira(nova),
      ...(base.solo ? { pintura: regiaoInteira(nova) } : {}),
      buracos: regiaoInteira(nova),
    },
  }
}
export function prepararCamadas(
  base: BaseDeTerreno,
  estado: EstadoDoTerreno,
  camadas: CamadaDeSolo[],
): EdicaoPreparada {
  const anteriores = base.solo?.camadas ?? [{ id: 'grama', nome: 'Grama', cor: '#80a568' }]
  let pintura = estado.pintura
  const ids = anteriores.map((c) => c.id)
  BaseDeTerrenoSchema.parse({ ...base, solo: { camadas, pecas: [] } })
  for (let i = ids.length - 1; i >= 0; i--)
    if (!camadas.some((c) => c.id === ids[i])) {
      if (ids.length === 1) {
        pintura = criarPinturaDeChao(pintura, 1)
        ids[0] = camadas[0]!.id
        break
      }
      pintura = retirarCamadaDeChao(pintura, i)
      ids.splice(i, 1)
    }
  for (const c of camadas)
    if (!ids.includes(c.id)) {
      pintura = acrescentarCamadaDeChao(pintura)
      ids.push(c.id)
    }
  if (camadas.some((c, i) => c.id !== ids[i]))
    throw Error('Mantenha a ordem das camadas existentes.')
  const nova = BaseDeTerrenoSchema.parse({ ...base, solo: { camadas, pecas: [] } })
  return { base: nova, estado: { ...estado, pintura }, regioes: { pintura: regiaoInteira(nova) } }
}
export function prepararPinturaAutomatica(
  base: BaseDeTerreno,
  estado: EstadoDoTerreno,
  regras: readonly RegraDeChao[],
): EdicaoPreparada {
  if (!base.solo) throw Error('Adicione as camadas de chão antes de pintar.')
  return {
    base,
    estado,
    regioes: { pintura: pintarChaoPorRegras(estado.campo, estado.pintura, regras) },
  }
}
export function prepararImagemDeAlturas(
  base: BaseDeTerreno,
  estado: EstadoDoTerreno | null,
  imagem: ImagemDeAlturas,
  preto: number,
  branco: number,
): EdicaoPreparada {
  const e = estado ?? abrirEdicaoDeTerreno(base, new Map())
  return {
    base,
    estado: e,
    regioes: { alturas: colocarImagemNoCampo(e.campo, imagem, { base: preto, topo: branco }) },
  }
}
