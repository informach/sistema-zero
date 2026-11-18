import { CenarioInvalido } from '../validacao'
import {
  alturaDoCampo,
  type RegiaoDoCampo,
  regiaoDoRetangulo,
  unirRegioes,
} from './campo-de-alturas'
import { areaDoPoligono, moldarTerrenoPelaCurva, perfilDaPonte, reamostrarCurva } from './curvas'
import type { CaminhoDeCenario } from './documento'
import { clonarEstadoDoTerreno, type EstadoDoTerreno } from './edicao-de-terreno'
import { CaminhoSchema } from './entidades-schema'
import type { RegioesDeTerreno } from './ferramentas-de-terreno'
import { curvaDoCaminho } from './topologia-de-caminho'

export interface ResumoDoCaminho {
  comprimento: number
  area?: number
  maiorVao?: number
  atravessa?: boolean
  avisos: string[]
}
export interface OperacaoDeCaminhoPreparada {
  caminho: CaminhoDeCenario
  /** Só a estrada molda uma cópia do campo. As outras variantes não alteram o relevo. */
  terreno?: EstadoDoTerreno
  regioes: RegioesDeTerreno
  resumo: ResumoDoCaminho
}
const falhar = (mensagem: string): never => {
  throw new CenarioInvalido([mensagem])
}

/** Operação pura comum à oficina e ao agente. Nenhum arquivo ou recurso é publicado aqui. */
export function prepararOperacaoDeCaminho(
  entrada: unknown,
  estado: EstadoDoTerreno | null,
  /** Editar acabamento não deve repetir o corte da estrada sobre o campo já moldado. */
  opcoes: { moldarTerreno?: boolean } = {},
): OperacaoDeCaminhoPreparada {
  const caminho = CaminhoSchema.parse(entrada),
    curva = curvaDoCaminho(caminho)
  const resumo: ResumoDoCaminho = {
    comprimento: curva.comprimento,
    ...(caminho.tipo === 'praca' ? { area: areaDoPoligono(curva.pontos) } : {}),
    avisos: [],
  }
  if (
    (caminho.tipo === 'cerca' || caminho.tipo === 'muro') &&
    Math.ceil(curva.comprimento / caminho.comprimentoDoModulo) > 20_000
  )
    return falhar(
      'O caminho exige mais de 20.000 peças. Aumente o módulo ou divida-o em trechos menores.',
    )
  if (caminho.tipo === 'ponte') {
    const perfil = perfilDaPonte(
      { ...caminho.pontos[0]!, ...(caminho.cotas ? { y: caminho.cotas.de } : {}) },
      { ...caminho.pontos[1]!, ...(caminho.cotas ? { y: caminho.cotas.ate } : {}) },
      (x, z) => (estado ? alturaDoCampo(estado.campo, x, z) : 0),
      estado ? Math.min(1, estado.campo.passo / 2) : 1,
    )
    resumo.maiorVao = perfil.maiorVao
    resumo.atravessa = perfil.atravessa
    if (perfil.atravessa)
      resumo.avisos.push(
        'O terreno atravessa o tabuleiro. Revise as cabeceiras ou o relevo antes de testar.',
      )
  }
  if (caminho.tipo !== 'estrada' || opcoes.moldarTerreno === false)
    return { caminho, regioes: {}, resumo }
  if (!estado) return falhar('Crie e carregue o terreno antes de moldar uma estrada.')
  const campo = estado.campo
  for (const p of curva.pontos)
    if (
      p.x < campo.origem.x ||
      p.z < campo.origem.z ||
      p.x > campo.origem.x + campo.colunas * campo.passo ||
      p.z > campo.origem.z + campo.linhas * campo.passo
    )
      return falhar('O eixo da estrada está fora da cobertura do terreno.')

  // Conferir o mesmo trabalho do molde ANTES de copiar o campo e suas camadas.
  const passo = Math.max(campo.passo / 2, curva.comprimento / 50_000)
  if (Math.round(curva.comprimento / passo) + 1 > 20_000)
    return falhar('Esta estrada exige estações demais. Divida-a em trechos menores.')
  const estacoes = reamostrarCurva(curva, passo),
    alcance = caminho.largura / 2 + (caminho.molde?.borda ?? caminho.largura / 2)
  let trabalho = 0,
    total: RegiaoDoCampo | null = null
  for (let i = 0; i < (curva.fechada ? estacoes.length : estacoes.length - 1); i++) {
    const a = estacoes[i]!,
      b = estacoes[(i + 1) % estacoes.length]!,
      r = regiaoDoRetangulo(
        campo,
        Math.min(a.x, b.x) - alcance,
        Math.min(a.z, b.z) - alcance,
        Math.max(a.x, b.x) + alcance,
        Math.max(a.z, b.z) + alcance,
      )
    if (r) trabalho += (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1)
    total = unirRegioes(total, r)
    if (
      trabalho > 16_000_000 ||
      (total && (total.x1 - total.x0 + 1) * (total.z1 - total.z0 + 1) > 2_000_000)
    )
      return falhar(
        'Esta estrada exige amostras demais. Divida-a em trechos menores ou reduza a largura.',
      )
  }
  const terreno = clonarEstadoDoTerreno(estado),
    resultado = moldarTerrenoPelaCurva(terreno.campo, curva, {
      largura: caminho.largura,
      ...caminho.molde,
    })
  if (resultado.estacoes.some((p) => p.y === campo.min || p.y === campo.max))
    resumo.avisos.push(
      'O perfil toca o limite de altura do terreno. Confira o leito e os taludes na prévia.',
    )
  return { caminho, terreno, regioes: { alturas: resultado.regiao }, resumo }
}
