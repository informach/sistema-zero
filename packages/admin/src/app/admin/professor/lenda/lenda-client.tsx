'use client'

import {
  type EstadoDaRevisaoHumana,
  FilaDeRevisaoSchema,
  type ItemDaFilaDeRevisao,
  LIMITE_DO_RETORNO,
  RevisaoAbertaSchema,
} from '@sistemazero/arquipelago-contracts'
import type { EditableStudioProject, StudioHandle } from '@sistemazero/studio'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Textarea } from '@sistemazero/ui/textarea'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { GameRequestError, gameRequest } from '@/app/admin/jogo/game-request'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { formatDate } from '@/lib/format'

// Lazy: o Estúdio só carrega quando um projeto abre (o mesmo cuidado da fila de Projetos).
const StudioEmbed = dynamic(
  () => import('@/components/studio/studio-embed').then((m) => m.StudioEmbed),
  { ssr: false },
)

const ESTADOS: Record<EstadoDaRevisaoHumana, string> = {
  aguardando: 'Aguardando',
  conferido: 'Conferido',
  'nova-tentativa': 'Nova tentativa',
}

/**
 * Projetos da Lenda (lacunas, 01/11/2026). A Jornada pede "uma revisão humana por projeto final,
 * com retorno acionável e nova tentativa". Aprovado pelos critérios do Farol, o jogo autoral entra
 * aqui; a professora joga a cópia aprovada e responde. Um envio novo antes da resposta trava a
 * resposta antiga (o serviço do jogo devolve 409 e a fila recarrega).
 */
export function LendaClient() {
  const [estado, setEstado] = useState<EstadoDaRevisaoHumana | ''>('aguardando')
  const [fila, setFila] = useState<ItemDaFilaDeRevisao[] | null>(null)
  const [erro, setErro] = useState(false)
  const [aberta, setAberta] = useState<{
    revisao: ItemDaFilaDeRevisao
    projeto: EditableStudioProject
  } | null>(null)

  const carregar = useCallback(
    async (signal?: AbortSignal) => {
      setErro(false)
      try {
        const lido = FilaDeRevisaoSchema.parse(
          await gameRequest(
            `revisoes${estado ? `?estado=${estado}` : ''}`,
            'GET',
            undefined,
            signal,
          ),
        )
        setFila(lido.revisoes)
      } catch (e) {
        if (signal?.aborted) return
        setErro(true)
        if (!(e instanceof GameRequestError)) console.error(e)
      }
    },
    [estado],
  )
  useEffect(() => {
    const controle = new AbortController()
    setFila(null)
    void carregar(controle.signal)
    return () => controle.abort()
  }, [carregar])

  async function abrir(item: ItemDaFilaDeRevisao) {
    try {
      const lido = RevisaoAbertaSchema.parse(
        await gameRequest(`revisoes/${item.jogadorId}/${item.desafioId}`, 'GET'),
      )
      setAberta({ revisao: lido.revisao, projeto: lido.projeto as EditableStudioProject })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível abrir o projeto.')
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Projetos da Lenda"
        description="O jogo autoral do Farol, aprovado pelos critérios, espera uma revisão humana com retorno."
        community={false}
        action={
          <Select
            aria-label="Situação"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoDaRevisaoHumana | '')}
          >
            <option value="aguardando">Aguardando</option>
            <option value="nova-tentativa">Nova tentativa</option>
            <option value="conferido">Conferidos</option>
            <option value="">Todos</option>
          </Select>
        }
      />
      {aberta ? (
        <Revisar
          aberta={aberta}
          onFechar={() => setAberta(null)}
          onRespondido={() => {
            setAberta(null)
            void carregar()
          }}
        />
      ) : erro ? (
        <LoadError what="os projetos" onRetry={() => void carregar()} />
      ) : !fila ? (
        <Skeleton className="h-40 w-full" />
      ) : fila.length === 0 ? (
        <EmptyState
          title="Nenhum projeto nesta situação"
          description="Quando alguém tiver o jogo autoral aprovado no Farol, ele aparece aqui."
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {fila.map((item) => (
            <li key={`${item.jogadorId}:${item.desafioId}`} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.titulo}</p>
                <p className="text-muted-foreground text-sm">
                  {item.publico === 'kids' ? 'Kids' : 'Adulto'} · envio {item.envio} ·{' '}
                  {formatDate(item.enviadoEm)}
                </p>
              </div>
              <Badge variant={item.estado === 'aguardando' ? 'warning' : 'muted'}>
                {ESTADOS[item.estado]}
              </Badge>
              <Button size="sm" onClick={() => void abrir(item)}>
                Abrir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Revisar({
  aberta,
  onFechar,
  onRespondido,
}: {
  aberta: { revisao: ItemDaFilaDeRevisao; projeto: EditableStudioProject }
  onFechar(): void
  onRespondido(): void
}) {
  const { revisao, projeto } = aberta
  const [estado, setEstado] = useState<'conferido' | 'nova-tentativa'>('conferido')
  const [retorno, setRetorno] = useState('')
  const [enviando, setEnviando] = useState(false)
  const studio = useRef<StudioHandle | null>(null)

  async function responder() {
    setEnviando(true)
    try {
      await gameRequest(
        `revisoes/${revisao.jogadorId}/${revisao.desafioId}`,
        'POST',
        { envio: revisao.envio, estado, retorno: retorno.trim() },
        undefined,
        { editHint: false },
      )
      toast.success('Retorno enviado.')
      onRespondido()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível enviar o retorno.')
      if (e instanceof GameRequestError && e.status === 409) onRespondido()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onFechar}>
          Voltar à fila
        </Button>
        <p className="font-medium">
          {revisao.titulo} · envio {revisao.envio}
        </p>
        <Badge variant="muted">{ESTADOS[revisao.estado]}</Badge>
      </div>
      <StudioEmbed
        key={`${revisao.jogadorId}:${revisao.desafioId}:${revisao.envio}`}
        initialProject={projeto}
        handleRef={studio}
        className="h-[32rem]"
        features={{
          terminal: false,
          ai: false,
          professional: false,
          export: false,
          extensions: false,
        }}
      />
      {revisao.retorno ? (
        <p className="text-muted-foreground text-sm">Retorno anterior: {revisao.retorno}</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[14rem_1fr]">
        <Field label="Resposta" htmlFor="lenda-estado">
          <Select
            id="lenda-estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'conferido' | 'nova-tentativa')}
          >
            <option value="conferido">Conferido</option>
            <option value="nova-tentativa">Pedir nova tentativa</option>
          </Select>
        </Field>
        <Field
          label="Retorno para quem fez o jogo"
          htmlFor="lenda-retorno"
          hint="Diga o que está bom e uma coisa concreta para melhorar."
        >
          <Textarea
            id="lenda-retorno"
            value={retorno}
            maxLength={LIMITE_DO_RETORNO}
            rows={4}
            onChange={(e) => setRetorno(e.target.value)}
          />
        </Field>
      </div>
      <Button disabled={enviando || !retorno.trim()} onClick={() => void responder()}>
        Enviar retorno
      </Button>
    </div>
  )
}
