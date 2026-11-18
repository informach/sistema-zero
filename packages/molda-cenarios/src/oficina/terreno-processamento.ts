import {
  type BaseDeTerreno,
  type CamadaDeSolo,
  codificarPngDeAlturas,
  type EstadoDoTerreno,
  imagemDoCampo,
  lerPngDeAlturas,
  type ReceitaDeTerreno,
  type RegraDeChao,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  type EdicaoPreparada,
  prepararCamadas,
  prepararDimensoes,
  prepararImagemDeAlturas,
  prepararPinturaAutomatica,
  prepararReceita,
} from './operacoes-de-terreno'

export type OperacaoDeTerreno =
  | { tipo: 'receita'; receita: ReceitaDeTerreno }
  | { tipo: 'dimensoes'; forma: BaseDeTerreno }
  | { tipo: 'camadas'; camadas: CamadaDeSolo[] }
  | { tipo: 'regras'; regras: readonly RegraDeChao[] }
  | { tipo: 'importar'; bytes: Uint8Array; preto: number; branco: number }
  | { tipo: 'exportar' }
export interface PedidoDeTerreno {
  base: BaseDeTerreno
  estado: EstadoDoTerreno | null
  operacao: OperacaoDeTerreno
}
export type ResultadoDoTerreno =
  | { tipo: 'edicao'; edicao: EdicaoPreparada }
  | { tipo: 'png'; bytes: Uint8Array<ArrayBuffer> }
export async function processarTerreno({
  base,
  estado,
  operacao: a,
}: PedidoDeTerreno): Promise<ResultadoDoTerreno> {
  if (a.tipo === 'receita')
    return { tipo: 'edicao', edicao: prepararReceita(base, estado, a.receita) }
  if (a.tipo === 'importar')
    return {
      tipo: 'edicao',
      edicao: prepararImagemDeAlturas(
        base,
        estado,
        await lerPngDeAlturas(a.bytes),
        a.preto,
        a.branco,
      ),
    }
  if (!estado) throw Error('Aguarde o terreno antes de usar esta operação.')
  if (a.tipo === 'exportar')
    return { tipo: 'png', bytes: await codificarPngDeAlturas(imagemDoCampo(estado.campo)) }
  if (a.tipo === 'camadas')
    return { tipo: 'edicao', edicao: prepararCamadas(base, estado, a.camadas) }
  if (a.tipo === 'dimensoes')
    return { tipo: 'edicao', edicao: prepararDimensoes(base, estado, a.forma) }
  return { tipo: 'edicao', edicao: prepararPinturaAutomatica(base, estado, a.regras) }
}
export const buffersDoEstado = (estado: EstadoDoTerreno | null): ArrayBuffer[] =>
  estado
    ? ([
        estado.campo.alturas.buffer,
        estado.pintura.pesos.buffer,
        estado.buracos.celulas.buffer,
      ] as ArrayBuffer[])
    : []
