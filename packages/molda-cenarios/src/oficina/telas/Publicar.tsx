import { Button } from '@sistemazero/molda/ui'
import {
  type PerfilDePublicacao,
  PerfilDePublicacaoSchema,
  type PublicacaoParaOJogo,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { ArrowRight, Loader2 } from 'lucide-react'
import { type JSX, useEffect, useRef, useState } from 'react'
import type { CenariosHost } from '../portas'
import type { useExportacao } from '../useExportacao'
import VersoesDaIlha from './VersoesDaIlha'

const ILHAS: Record<PerfilDePublicacao['ilha'], string> = {
  'sua-ilha': 'Faísca',
  bosque: 'Bosque dos Bichos',
  'vila-doce': 'Vila Doce',
  recife: 'Recife Coral',
  pico: 'Pico Gelado',
  'vale-dos-dinos': 'Vale dos Dinos',
  nuvens: 'Ilha das Nuvens',
}
const ETAPAS = {
  manifesto: 'Preparando a publicação',
  recursos: 'Enviando os recursos do cenário',
  conferencia: 'Conferindo e publicando',
}
type Consulta =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; atual: PublicacaoParaOJogo | null }
  | { tipo: 'erro'; mensagem: string }

export default function Publicar({
  host,
  tarefa,
  autorizado,
  aoFechar,
  aoReabrir,
  reabrindo,
}: {
  host: CenariosHost
  tarefa: ReturnType<typeof useExportacao>
  autorizado: boolean
  aoFechar(): void
  aoReabrir(): void
  reabrindo: boolean
}): JSX.Element {
  const e = tarefa.estado,
    preparo = 'preparo' in e ? e.preparo : undefined
  const [ilha, setIlha] = useState<PerfilDePublicacao['ilha']>('sua-ilha')
  const [consulta, setConsulta] = useState<Consulta>({ tipo: 'carregando' })
  const [aceite, setAceite] = useState(false),
    [volta, setVolta] = useState(0),
    [voltando, setVoltando] = useState(false)
  const operacao = useRef<{ chave: string; id: string } | null>(null)
  const cenarioId = preparo?.fonte.cenario,
    revisao = preparo?.fonte.revisao,
    digest = preparo?.digest
  const porta = host.publicacoes
  // biome-ignore lint/correctness/useExhaustiveDependencies: volta solicita nova leitura mesmo sem mudar a fonte
  useEffect(() => {
    if (!porta || !cenarioId || revisao === undefined || !digest || !autorizado) return
    const controle = new AbortController()
    setConsulta({ tipo: 'carregando' })
    setAceite(false)
    void porta.obter({ tipo: 'arquipelago-v2', ilha }, controle.signal).then(
      (atual) => {
        if (!controle.signal.aborted) setConsulta({ tipo: 'pronto', atual })
      },
      (erro) => {
        if (!controle.signal.aborted)
          setConsulta({
            tipo: 'erro',
            mensagem: erro instanceof Error ? erro.message : 'Não consegui conferir este destino.',
          })
      },
    )
    return () => controle.abort()
  }, [porta, cenarioId, revisao, digest, ilha, volta, autorizado])
  const atualizar = () => {
    tarefa.cancelar()
    operacao.current = null
    setAceite(false)
    setVolta((v) => v + 1)
  }
  const publicar = () => {
    if (
      !preparo ||
      consulta.tipo !== 'pronto' ||
      !aceite ||
      !autorizado ||
      tarefa.pendente ||
      voltando
    )
      return
    const versaoEsperada = consulta.atual?.versao ?? 0
    const chave = JSON.stringify([
      preparo.fonte.cenario,
      preparo.fonte.revisao,
      preparo.digest,
      ilha,
      versaoEsperada,
    ])
    if (operacao.current?.chave !== chave) operacao.current = { chave, id: crypto.randomUUID() }
    void tarefa.publicar({
      perfil: { tipo: 'arquipelago-v2', ilha },
      versaoEsperada,
      operacaoId: operacao.current.id,
    })
  }
  const mudou = e.tipo === 'erro' && e.destinoMudou
  const divergente = e.tipo === 'erro' && e.revisaoAtual !== undefined
  const atual = consulta.tipo === 'pronto' ? (consulta.atual?.versao ?? 0) : null
  const habilitado = Boolean(
    preparo &&
      autorizado &&
      aceite &&
      consulta.tipo === 'pronto' &&
      !tarefa.pendente &&
      !voltando &&
      !mudou &&
      !divergente,
  )
  const pendente = e.tipo === 'gerando' || e.tipo === 'publicando'
  return (
    <section className="mcn-publicar" aria-label="Publicar no Arquipélago">
      {e.tipo === 'publicado' ? (
        <>
          <div role="status" className="mcn-publicar-recibo">
            <h3 className="font-bold">
              Versão {e.resultado.publicacao.versao}{' '}
              {e.resultado.repetido ? 'já publicada' : 'publicada'}
            </h3>
            <p>
              {ILHAS[e.resultado.publicacao.perfil.ilha]} · revisão{' '}
              {e.resultado.publicacao.fonte.revisao} de {e.preparo.documento.nome}
            </p>
          </div>
          <div className="mcn-exportar-acoes">
            <Button variant="primary" onClick={aoFechar}>
              Voltar à oficina
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            <strong>{preparo?.documento.nome ?? 'Cenário'}</strong>
            {revisao === undefined ? '' : ` · revisão ${revisao} guardada`}
          </p>
          {!autorizado ? (
            <p role="status" className="text-mld-muted text-sm">
              A publicação usa cenários guardados no espaço da equipe.
            </p>
          ) : null}
          <label className="mcn-campo">
            <span>Ilha do Arquipélago</span>
            <select
              value={ilha}
              disabled={voltando}
              onChange={(ev) => {
                const destino = PerfilDePublicacaoSchema.safeParse({
                  tipo: 'arquipelago-v2',
                  ilha: ev.target.value,
                })
                if (!destino.success) return
                tarefa.cancelar()
                setAceite(false)
                setIlha(destino.data.ilha)
              }}
            >
              {Object.entries(ILHAS).map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          {porta && autorizado ? (
            <VersoesDaIlha
              key={ilha}
              porta={porta}
              ilha={ilha}
              nomeDaIlha={ILHAS[ilha]}
              cenarioAberto={cenarioId}
              recarga={volta}
              bloqueado={tarefa.pendente}
              aoMudar={() => {
                operacao.current = null
                setAceite(false)
                setVolta((v) => v + 1)
              }}
              aoOcupar={setVoltando}
            />
          ) : null}
          {consulta.tipo === 'carregando' && autorizado && preparo ? (
            <p role="status" className="text-mld-muted text-sm">
              Conferindo a versão publicada…
            </p>
          ) : null}
          {consulta.tipo === 'erro' ? (
            <p role="alert" className="text-mld-danger text-sm">
              {consulta.mensagem}
            </p>
          ) : null}
          {atual !== null && preparo ? (
            <section className="mcn-publicar-resumo" aria-label="Publicação que será feita">
              <div className="mcn-publicar-sequencia">
                <strong>Revisão {preparo.fonte.revisao}</strong>
                <ArrowRight aria-hidden="true" className="size-4" />
                <span>{ILHAS[ilha]}</span>
                <ArrowRight aria-hidden="true" className="size-4" />
                <strong>Versão {atual + 1}</strong>
              </div>
              <p className="text-mld-muted text-sm">
                {atual
                  ? `A versão ${atual} será substituída por esta revisão.`
                  : 'Esta será a primeira publicação nesta ilha.'}
              </p>
              <label className="mcn-opcao">
                <input
                  type="checkbox"
                  checked={aceite}
                  disabled={tarefa.pendente || voltando || !autorizado}
                  onChange={(ev) => setAceite(ev.target.checked)}
                />
                <span>
                  Confirmo a publicação da revisão {preparo.fonte.revisao} em {ILHAS[ilha]}.
                </span>
              </label>
            </section>
          ) : null}
          {pendente ? (
            <div role="status" aria-live="polite" className="mcn-exportar-andamento">
              <span className="flex items-center gap-2 font-semibold">
                <Loader2
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
                {e.tipo === 'publicando' ? ETAPAS[e.progresso.etapa] : 'Preparando o cenário'}
              </span>
              {e.tipo === 'gerando' && e.progresso.nome ? (
                <span className="text-mld-muted text-sm">{e.progresso.nome}</span>
              ) : null}
              <progress
                max={Math.max(1, e.progresso.total)}
                value={e.progresso.feitos}
                aria-label="Progresso da publicação"
              />
            </div>
          ) : null}
          {e.tipo === 'erro' ? (
            <p role="alert" className="font-semibold text-mld-danger text-sm">
              {e.mensagem}
            </p>
          ) : null}
          <div className="mcn-exportar-acoes">
            <Button variant="ghost" onClick={aoFechar}>
              Fechar
            </Button>
            {!pendente && autorizado ? (
              <Button variant="outline" disabled={voltando} onClick={atualizar}>
                Atualizar destino
              </Button>
            ) : null}
            {pendente ? (
              <Button variant="outline" onClick={tarefa.cancelar}>
                Interromper publicação
              </Button>
            ) : divergente ? (
              <Button variant="primary" disabled={reabrindo || tarefa.pendente} onClick={aoReabrir}>
                Abrir revisão atual
              </Button>
            ) : mudou ? (
              <Button variant="primary" onClick={atualizar}>
                Conferir destino de novo
              </Button>
            ) : (
              <Button variant="primary" disabled={!habilitado} onClick={publicar}>
                {e.tipo === 'erro' ? 'Tentar publicação de novo' : 'Publicar esta versão'}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
