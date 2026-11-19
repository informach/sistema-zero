import {
  conferirLicencasDaCompilacao,
  digestDoDocumentoDeCenario,
  type PreparoDeExportacao,
  referenciasDaCenaParaCompilacao,
} from '@sistemazero/molda-cenarios-core/compilar'
import { validarDocumento } from '@sistemazero/molda-cenarios-core/v2'
import type { Ator, Cenario, Espaco } from '../../domain/cenarios/cenarios'
import { TETO_DO_BLOB, tiposDeBlobCompativeis } from '../../domain/cenarios/cenarios'
import {
  BibliotecaRestritaError,
  CenarioArquivoAusenteError,
  CenarioDesatualizadoError,
  CenarioInvalidoError,
  CenarioNaoEncontradoError,
} from '../../domain/cenarios/cenarios.errors'
import type { CenariosRepository } from '../../domain/ports/cenarios-repository.port'

/** Leitura da revisão salva. A autorização vem do serviço da conta, nunca do corpo HTTP. */
export class ExportacaoDeCenariosService {
  constructor(
    private readonly repo: CenariosRepository,
    private readonly abrir: (
      ator: Ator,
      id: string,
    ) => Promise<{ cenario: Cenario; espaco: Espaco }>,
  ) {}

  async preparar(ator: Ator, id: string, revisaoEsperada: number): Promise<PreparoDeExportacao> {
    const { cenario, espaco } = await this.abrir(ator, id)
    if (
      !Number.isSafeInteger(revisaoEsperada) ||
      revisaoEsperada < 0 ||
      revisaoEsperada > 2147483647
    )
      throw new CenarioInvalidoError(['A revisão da exportação é inválida'])
    if (cenario.revisao !== revisaoEsperada) throw new CenarioDesatualizadoError(cenario.revisao)
    const documento = validarDocumento(cenario.documento),
      refs = referenciasDaCenaParaCompilacao(documento),
      disponiveis = new Map((await this.repo.bibliotecas(espaco.id)).map((b) => [b.id, b])),
      bibliotecas = refs.bibliotecas.map((id) => {
        const b = disponiveis.get(id)
        if (!b) throw new CenarioNaoEncontradoError('A biblioteca usada pelo cenário')
        return { id: b.id, nome: b.nome, licenca: b.licenca }
      }),
      contexto = { equipe: ator.equipe && !ator.suporte, bibliotecas },
      restrita = bibliotecas.find((b) => b.licenca === 'restrita')
    if (restrita && !contexto.equipe)
      throw new BibliotecaRestritaError(
        `A biblioteca “${restrita.nome}” só pode ser exportada pela equipe`,
      )
    conferirLicencasDaCompilacao(refs.bibliotecas, contexto)
    if (refs.conjuntos.some((d) => d.conteudo.origem.espaco !== espaco.id))
      throw new CenarioNaoEncontradoError('O conjunto usado pelo cenário')
    const recursos = [
        ...refs.modelos.map((m) => ({ digest: m.digest, tipo: 'modelo' as const })),
        ...refs.texturas.map((t) => ({ digest: t.digest, tipo: 'textura' as const })),
        ...refs.terreno.map((t) => ({ digest: t.digest, tipo: 'terreno' as const })),
      ],
      confirmados = await this.repo.blobsConfirmados(espaco.id, [
        ...new Set(recursos.map((r) => r.digest)),
      ]),
      ausentes = recursos.filter((r) => {
        const b = confirmados.get(r.digest)
        return (
          !b ||
          !tiposDeBlobCompativeis(b.tipo, r.tipo) ||
          b.bytes < 1 ||
          b.bytes > TETO_DO_BLOB[r.tipo] ||
          (r.tipo === 'modelo' && b.tipoDoConteudo !== 'model/gltf-binary') ||
          (r.tipo === 'textura' && !['image/png', 'image/webp'].includes(b.tipoDoConteudo)) ||
          (r.tipo === 'terreno' && b.tipoDoConteudo !== 'application/octet-stream')
        )
      })
    if (ausentes.length)
      throw new CenarioArquivoAusenteError([...new Set(ausentes.map((r) => r.digest))])
    const digest = await digestDoDocumentoDeCenario(documento),
      atual = await this.abrir(ator, id)
    if (atual.cenario.revisao !== revisaoEsperada)
      throw new CenarioDesatualizadoError(atual.cenario.revisao)
    return {
      espacoId: espaco.id,
      fonte: { cenario: id, revisao: revisaoEsperada },
      digest,
      documento,
      contexto,
    }
  }
}
