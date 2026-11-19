import {
  avaliarOrcamentoDaCena,
  type PreparoDeExportacao,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  compilarCenario,
  type ProgressoDaCompilacao,
} from '@sistemazero/molda-cenarios-motor/compilar'
import type { CenariosHost } from '../oficina/portas'
import { naFilaDeCompilacao } from './fila'
import { nomeDoArquivoExportado } from './nomes'

export type DestinoDeArquivo = 'three' | 'glb' | 'raylib'
export interface OpcoesDoArquivo {
  destino: DestinoDeArquivo
  juntar: boolean
  tamanhoDaRegiao: number
}
export interface ArquivoDaExportacao {
  blob: Blob
  nome: string
  medidas: { malhas: number; triangulos: number; recursos: number; bytesDosRecursos: number }
  avisos: string[]
}

/** Uma execução isolada. Somente o Blob/medidas escapam; o pacote intermediário
 * deixa de ser retido ao retornar. O compilador possui e descarta seus recursos 3D. */
export async function prepararArquivoDaExportacao(
  host: CenariosHost,
  preparo: PreparoDeExportacao,
  opcoes: OpcoesDoArquivo,
  sinal: AbortSignal,
  progresso: (p: ProgressoDaCompilacao) => void,
): Promise<ArquivoDaExportacao> {
  return naFilaDeCompilacao(sinal, () => gerarArquivo(host, preparo, opcoes, sinal, progresso))
}

async function gerarArquivo(
  host: CenariosHost,
  preparo: PreparoDeExportacao,
  opcoes: OpcoesDoArquivo,
  sinal: AbortSignal,
  progresso: (p: ProgressoDaCompilacao) => void,
): Promise<ArquivoDaExportacao> {
  sinal.throwIfAborted()
  const pacote = await compilarCenario(
    preparo.documento,
    preparo.fonte,
    preparo.contexto,
    {
      modelo: (ref, s) => host.conteudoDoModelo({ ...ref, espacoId: preparo.espacoId }, s),
      textura: (ref, s) => host.conteudoDaTextura({ ...ref, espacoId: preparo.espacoId }, s),
      terreno: (digest, s) => host.conteudoDoTerreno(preparo.fonte.cenario, digest, s),
    },
    sinal,
    {
      progresso,
      // Propriedades são opacas ao exportador genérico. Não presumir que uma
      // peça anotada possa ser assada/juntada: o consumidor pode movimentá-la.
      preservarHierarquia: (o) => Object.keys(o.propriedades ?? {}).length > 0,
      ...(opcoes.juntar && opcoes.destino !== 'raylib'
        ? { juncaoEstatica: { tamanhoDaRegiao: opcoes.tamanhoDaRegiao } }
        : {}),
    },
  )
  if (pacote.cena.fonte.digest !== preparo.digest)
    throw Error('A compilação não corresponde ao cenário conferido pelo servidor.')
  const arquivos = new Map(pacote.cena.arquivos.map((a) => [a.caminho, a])),
    medidas = {
      malhas: pacote.cena.nos.reduce((s, n) => s + (arquivos.get(n.arquivo)!.malhas ?? 0), 0),
      triangulos: pacote.cena.nos.reduce(
        (s, n) => s + (arquivos.get(n.arquivo)!.triangulos ?? 0),
        0,
      ),
      recursos: pacote.cena.arquivos.length,
      bytesDosRecursos: pacote.cena.arquivos.reduce((s, a) => s + a.bytes, 0),
    },
    orcamento = avaliarOrcamentoDaCena(
      {
        malhas: medidas.malhas,
        arquivos: pacote.cena.arquivos.map((a) => ({
          caminho: a.caminho,
          bytes: a.bytes,
          tipo: a.mime === 'model/gltf-binary' ? 'modelo' : 'recurso',
        })),
      },
      opcoes.destino,
    )
  if (!orcamento.permitido)
    throw Error('Os recursos ultrapassam o limite deste destino. Confira o tamanho do cenário.')
  const avisos = pacote.avisos.map((a) => a.mensagem)
  let blob: Blob
  if (opcoes.destino === 'three') {
    const { exportarPacoteThree } = await import('./three')
    progresso({ etapa: 'arquivos', feitos: 0, total: 1, nome: 'Criando o pacote' })
    blob = await exportarPacoteThree(pacote, sinal, (feitos, total) =>
      progresso({ etapa: 'arquivos', feitos, total, nome: 'Criando o pacote' }),
    )
  } else if (opcoes.destino === 'raylib') {
    const { exportarPacoteRaylib } = await import('./raylib'),
      r = await exportarPacoteRaylib(pacote, sinal, {
        tamanhoDaRegiao: opcoes.tamanhoDaRegiao,
        progressoDaCompilacao: progresso,
        progresso: (feitos, total) =>
          progresso({ etapa: 'arquivos', feitos, total, nome: 'Criando o pacote Raylib' }),
      })
    blob = r.blob
    Object.assign(medidas, r.medidas)
    avisos.push(...r.avisos)
  } else if (opcoes.destino === 'glb') {
    const { exportarGlbUnico } = await import('./glb'),
      glb = await exportarGlbUnico(pacote, sinal, { progresso })
    blob = glb.blob
    medidas.malhas = glb.medidas.malhas ?? 0
    medidas.triangulos = glb.medidas.triangulos ?? 0
    avisos.push(...glb.avisos)
  } else throw Error('Escolha um destino de exportação disponível.')
  sinal.throwIfAborted()
  return {
    blob,
    nome: nomeDoArquivoExportado(preparo.documento.nome, preparo.fonte.revisao, opcoes.destino),
    medidas,
    avisos: [...new Set(avisos)],
  }
}
