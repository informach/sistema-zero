import {
  capturarConteudoDeConjunto,
  conteudoDoCenarioDeConjunto,
  documentoParaEditarConjunto,
  type FragmentoBasico,
  indiceDaOrganizacao,
} from '@sistemazero/molda-cenarios-core/v2'
import { fotografarComposicao, type Palco } from '@sistemazero/molda-cenarios-motor'
import { type RefObject, useEffect, useId, useMemo, useState } from 'react'
import { conferirMedidasDoDocumento } from './acoes'
import { alvosDaTransferencia } from './area-de-transferencia'
import type { ControladorDaOficina } from './controlador'
import { DialogoDeNome } from './pecas'
import type { Biblioteca, CenariosHost, ConjuntoDeBiblioteca, PublicacaoDeConjunto } from './portas'

type FotoPendente = { conjunto: ConjuntoDeBiblioteca; revisao: number; conteudo: FragmentoBasico }
type Captura = {
  conteudo: FragmentoBasico
  operacaoId: string
  nome?: string
  biblioteca?: string
  pasta?: string
  etiquetas?: string[]
}

/** Catálogo e fotografias usam o mesmo documento e a mesma fila da oficina. */
export function useConjuntos({
  host,
  espaco,
  controlador,
  palco,
  bibliotecas,
  conjunto,
}: {
  host: CenariosHost
  espaco: string
  controlador: ControladorDaOficina
  palco: RefObject<Palco | null>
  bibliotecas: readonly Biblioteca[]
  conjunto: ConjuntoDeBiblioteca | null
}) {
  const [catalogo, setCatalogo] = useState(conjunto)
  const [captura, setCaptura] = useState<Captura | null>(null)
  const [biblioteca, setBiblioteca] = useState(bibliotecas[0]?.id ?? '')
  const [pasta, setPasta] = useState(''),
    [etiquetas, setEtiquetas] = useState('')
  const [erro, setErro] = useState<string | null>(null),
    [mensagem, setMensagem] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false),
    [fotoPendente, setFotoPendente] = useState<FotoPendente | null>(null)
  const [atualizacao, setAtualizacao] = useState(0)
  // Cada conexão/oficina tem sua própria vida; uma resposta antiga não revive na seguinte.
  // biome-ignore lint/correctness/useExhaustiveDependencies: estas identidades delimitam a vida dos pedidos
  const ciclo = useMemo(
    () => ({
      vivo: { current: true },
      sinal: { current: new AbortController() },
      trava: { current: false },
      publicacao: { current: null as { id: string; dados: PublicacaoDeConjunto } | null },
    }),
    [host, controlador, espaco],
  )
  const { vivo, sinal, trava, publicacao } = ciclo
  const idBiblioteca = useId(),
    idPasta = useId(),
    idEtiquetas = useId()
  useEffect(() => {
    vivo.current = true
    sinal.current = new AbortController()
    return () => {
      vivo.current = false
      sinal.current.abort()
    }
  }, [vivo, sinal])
  useEffect(() => {
    setCatalogo((atual) =>
      conjunto && (!atual || conjunto.revisao > atual.revisao) ? conjunto : atual,
    )
  }, [conjunto])

  const fotografar = async (pendente: FotoPendente) => {
    const controle = sinal.current.signal
    const foto = await fotografarComposicao(
      documentoParaEditarConjunto(pendente.conteudo, 'retrato', pendente.conjunto.nome, espaco),
      {
        carregarModelo: (ref) => host.conteudoDoModelo({ ...ref, espacoId: espaco }),
        carregarTextura: (ref, abort) =>
          host.conteudoDaTextura({ ...ref, espacoId: espaco }, abort),
      },
      controle,
    )
    controle.throwIfAborted()
    await host.guardarMiniaturaDoConjunto(pendente.conjunto.id, pendente.revisao, foto, controle)
  }
  const retratar = async (pendente: FotoPendente) => {
    try {
      await fotografar(pendente)
      if (vivo.current) {
        setFotoPendente(null)
        setAtualizacao((n) => n + 1)
      }
    } catch (e) {
      if (vivo.current) {
        setFotoPendente(pendente)
        setErro(
          `O conjunto foi guardado, mas falta o retrato. ${e instanceof Error ? e.message : ''}`,
        )
      }
    }
  }
  const abrir = () => {
    try {
      const atual = controlador.getState(),
        ids = alvosDaTransferencia(atual),
        indice = indiceDaOrganizacao(atual.documento)
      const objetos = [...new Set(ids.flatMap((id) => indice.descendentes(id)))]
      const doc = conferirMedidasDoDocumento(
        atual.documento,
        objetos,
        (id) => palco.current?.volumeDoModelo(id) ?? null,
      ).documento
      const conteudo = capturarConteudoDeConjunto(doc, ids, espaco, palco.current?.fonteDeAlturas())
      if (!bibliotecas.length)
        throw new Error('Associe uma biblioteca a este mundo antes de guardar um conjunto')
      if (!bibliotecas.some((b) => b.id === biblioteca)) setBiblioteca(bibliotecas[0]!.id)
      setCaptura({ conteudo, operacaoId: crypto.randomUUID() })
      setErro(null)
      setMensagem(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui reunir esta escolha')
    }
  }
  const publicar = async () => {
    if (!catalogo || trava.current) return
    trava.current = true
    setOcupado(true)
    setErro(null)
    setMensagem(null)
    try {
      await controlador.terminar()
      const atual = controlador.getState()
      if (atual.salvamento !== 'guardado')
        throw new Error('Guarde o rascunho antes de atualizar as cópias')
      const anterior = publicacao.current
      const dados =
        anterior?.id === catalogo.id && anterior.dados.rascunho?.revisao === atual.revisao
          ? anterior.dados
          : {
              revisaoEsperada: catalogo.revisao,
              operacaoId: crypto.randomUUID(),
              conteudo: conteudoDoCenarioDeConjunto(
                conferirMedidasDoDocumento(
                  atual.documento,
                  atual.documento.instancias.map((o) => o.id),
                  (id) => palco.current?.volumeDoModelo(id) ?? null,
                ).documento,
                espaco,
              ),
              rascunho: { cenarioId: atual.documento.id, revisao: atual.revisao },
            }
      publicacao.current = { id: catalogo.id, dados }
      const resultado = await host.publicarConjunto(catalogo.id, dados)
      publicacao.current = null
      if (!vivo.current) return
      setCatalogo(resultado.conjunto)
      const revisao = dados.revisaoEsperada + 1
      setMensagem(
        resultado.conjunto.revisao === revisao
          ? `Versão ${revisao} publicada. ${resultado.cenarios.length} ${resultado.cenarios.length === 1 ? 'cenário atualizado' : 'cenários atualizados'}.`
          : `Publicação da versão ${revisao} confirmada. A biblioteca já está na versão ${resultado.conjunto.revisao}. Reabra o rascunho para ver a versão atual.`,
      )
      await retratar({ conjunto: resultado.conjunto, revisao, conteudo: dados.conteudo })
    } catch (e) {
      if (vivo.current) setErro(e instanceof Error ? e.message : 'Não consegui atualizar as cópias')
    } finally {
      trava.current = false
      if (vivo.current) setOcupado(false)
    }
  }
  const janela = captura ? (
    <DialogoDeNome
      titulo="Guardar escolha como conjunto"
      nomeFixo={Boolean(captura.nome)}
      inicial={captura.nome ?? 'Meu conjunto'}
      acao="Guardar conjunto"
      aoFechar={() => {
        if (!trava.current) setCaptura(null)
      }}
      aoConfirmar={async (nome) => {
        if (trava.current) return
        trava.current = true
        setOcupado(true)
        setErro(null)
        // Conserva a operação e seu corpo em uma repetição após resposta perdida.
        const dados = captura.nome
          ? captura
          : {
              ...captura,
              nome,
              biblioteca,
              pasta,
              etiquetas: etiquetas
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            }
        setCaptura(dados)
        try {
          if (!bibliotecas.some((b) => b.id === dados.biblioteca))
            throw new Error('Escolha uma biblioteca deste mundo')
          const criado = await host.criarConjunto(dados.biblioteca!, {
            nome: dados.nome!,
            pasta: dados.pasta,
            etiquetas: dados.etiquetas,
            conteudo: dados.conteudo,
            operacaoId: dados.operacaoId,
          })
          if (!vivo.current) return
          setCaptura(null)
          setAtualizacao((n) => n + 1)
          setMensagem(`Conjunto ${criado.nome} guardado na biblioteca.`)
          await retratar({ conjunto: criado, revisao: 1, conteudo: dados.conteudo })
        } finally {
          trava.current = false
          if (vivo.current) setOcupado(false)
        }
      }}
    >
      <label htmlFor={idBiblioteca} className="mcn-campo">
        <span>Biblioteca</span>
        <select
          id={idBiblioteca}
          value={captura.biblioteca ?? biblioteca}
          disabled={ocupado || Boolean(captura.nome)}
          onChange={(e) => setBiblioteca(e.target.value)}
        >
          {bibliotecas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={idPasta} className="mcn-campo">
        <span>Pasta</span>
        <input
          id={idPasta}
          value={captura.pasta ?? pasta}
          disabled={ocupado || Boolean(captura.nome)}
          maxLength={240}
          onChange={(e) => setPasta(e.target.value)}
        />
      </label>
      <label htmlFor={idEtiquetas} className="mcn-campo">
        <span>Etiquetas, separadas por vírgulas</span>
        <input
          id={idEtiquetas}
          value={captura.etiquetas?.join(', ') ?? etiquetas}
          disabled={ocupado || Boolean(captura.nome)}
          maxLength={700}
          onChange={(e) => setEtiquetas(e.target.value)}
        />
      </label>
      {captura.nome ? (
        <p className="text-sm text-mld-muted">
          Ao tentar novamente, conservaremos os dados enviados na primeira tentativa.
        </p>
      ) : null}
    </DialogoDeNome>
  ) : null
  return {
    catalogo,
    janela,
    abrir,
    publicar,
    ocupado,
    atualizacao,
    erro,
    mensagem,
    fotoPendente,
    repetirFoto: async () => {
      if (!fotoPendente || trava.current) return
      trava.current = true
      setOcupado(true)
      setErro(null)
      try {
        await retratar(fotoPendente)
      } finally {
        trava.current = false
        if (vivo.current) setOcupado(false)
      }
    },
  }
}
