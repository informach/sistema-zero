import { conferirCaminhoCompilado } from './caminhos'
import { LIMITES_DA_EXPORTACAO } from './limites'
import {
  DESTINOS_DE_EXPORTACAO,
  type DestinoDeExportacao,
  type EntradaDoOrcamento,
  type ExcessoDoOrcamento,
  type OrcamentoDaCena,
} from './tipos'

const quantidade = (n: number, nome: string) => {
  if (!Number.isSafeInteger(n) || n < 0) throw Error(`A quantidade de ${nome} é inválida.`)
  return n
}

/** Trabalha com as medidas finais. Não remove arquivos nem muda a autoria para caber no destino. */
export function avaliarOrcamentoDaCena(
  entrada: EntradaDoOrcamento,
  destino: DestinoDeExportacao,
): OrcamentoDaCena {
  if (!DESTINOS_DE_EXPORTACAO.includes(destino)) throw Error('O destino de exportação é inválido.')
  if (entrada.arquivos.length > LIMITES_DA_EXPORTACAO.arquivos)
    throw Error('A exportação tem arquivos demais.')
  const malhasNovas = quantidade(entrada.malhas, 'malhas'),
    malhasExistentes = quantidade(entrada.malhasExistentes ?? 0, 'malhas existentes'),
    bytesExistentes = quantidade(entrada.bytesExistentes ?? 0, 'bytes existentes'),
    caminhos = new Set<string>(),
    excessos: ExcessoDoOrcamento[] = []
  let bytesNovos = 0
  for (const f of entrada.arquivos) {
    const caminho = conferirCaminhoCompilado(f.caminho).toLowerCase()
    if (caminhos.has(caminho)) throw Error('Há um caminho de arquivo repetido na exportação.')
    caminhos.add(caminho)
    if (f.tipo !== 'modelo' && f.tipo !== 'recurso')
      throw Error('O tipo do arquivo no orçamento é inválido.')
    bytesNovos += quantidade(f.bytes, 'bytes do arquivo')
    if (!Number.isSafeInteger(bytesNovos)) throw Error('A soma de bytes da exportação é inválida.')
    if (
      destino === 'studio' &&
      f.tipo === 'modelo' &&
      f.bytes > LIMITES_DA_EXPORTACAO.studio.bytesPorModelo
    )
      excessos.push({
        tipo: 'modelo',
        atual: f.bytes,
        limite: LIMITES_DA_EXPORTACAO.studio.bytesPorModelo,
        arquivo: f.caminho,
      })
  }
  const bytes = bytesNovos + (destino === 'studio' ? bytesExistentes : 0),
    malhas = malhasNovas + (destino === 'studio' ? malhasExistentes : 0)
  if (!Number.isSafeInteger(bytes) || !Number.isSafeInteger(malhas))
    throw Error('O total do orçamento é inválido.')
  if (bytesNovos > LIMITES_DA_EXPORTACAO.bytesDoPacote)
    excessos.push({
      tipo: 'pacote',
      atual: bytesNovos,
      limite: LIMITES_DA_EXPORTACAO.bytesDoPacote,
    })
  if (destino === 'studio') {
    if (malhas > LIMITES_DA_EXPORTACAO.studio.malhas)
      excessos.push({ tipo: 'malhas', atual: malhas, limite: LIMITES_DA_EXPORTACAO.studio.malhas })
    if (bytes > LIMITES_DA_EXPORTACAO.studio.bytesDoProjeto)
      excessos.push({
        tipo: 'projeto',
        atual: bytes,
        limite: LIMITES_DA_EXPORTACAO.studio.bytesDoProjeto,
      })
  }
  return {
    destino,
    permitido: excessos.length === 0,
    bytes,
    malhas,
    excessos,
    sugerirJuncao: excessos.some((e) => e.tipo === 'malhas'),
  }
}
