'use client'
import '@sistemazero/studio/styles.css'
import { StudioProjectPlayer } from '@sistemazero/studio/player'
import { prepareProjectForHost } from '@sistemazero/studio/project-validation'
import { Button } from '@sistemazero/ui/button'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { sessionFetch } from '../../lib/session-fetch'
import { aceiteDaMedida, type MedidaRecebida, placaEmulada } from '../../lib/world-measurement'
import { MEDIDA_MUNDOS_ARQUIVO } from './world-measurement-file.generated'

/**
 * A página de medida dos mundos grandes (plano "Mundos de 2 km", lote 8, 23/11/2026), só da
 * equipe. Roda o mundo de 2 km NESTE aparelho (o notebook simples é o que manda no aceite), com o
 * herói andando sozinho pela rota das regiões, e mostra os números contra o aceite do plano. O
 * resultado vai para a rota `/api/studio/world-measurement` (R2 privado do ambiente; sem ele, o log
 * do servidor) e pode ser baixado em JSON.
 *
 * O projeto mora no R2 do ambiente e chega pela rota dos exemplos grandes (só a equipe), conferido
 * pelo tamanho e pelo hash. O percurso e a conta são os da prova local
 * (`studio/src/medida/mundoGrande.ts`): o programa do jogo avisa a página por `postMessage`.
 */
type Projeto = NonNullable<Awaited<ReturnType<typeof prepareProjectForHost>>>
type Gravacao = 'gravando' | 'r2' | 'registro' | 'falhou'
type Fase =
  | { nome: 'inicio' }
  | { nome: 'baixando'; recebidos: number }
  | { nome: 'rodando'; projeto: Projeto; comecou: number }
  | {
      nome: 'pronto'
      medida: MedidaRecebida
      gravacao: Gravacao
      corpo: Record<string, unknown>
    }
  | { nome: 'erro'; mensagem: string }

/** Carga + 5 s de aquecimento + 3 s de folga + 90 s de percurso, com sobra para o notebook. */
const PRAZO_DA_MEDIDA_MS = 6 * 60_000
const MIB = 1024 * 1024

const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')

async function baixarProjeto(
  base: string,
  sinal: AbortSignal,
  aoReceber: (bytes: number) => void,
): Promise<Projeto> {
  const resposta = await sessionFetch(
    `${base.replace(/\/+$/, '')}/${MEDIDA_MUNDOS_ARQUIVO.caminho}`,
    { signal: sinal },
  )
  if (!resposta.ok || !resposta.body)
    throw new Error('Não consegui baixar o mundo de 2 km. Ele já foi enviado para este ambiente?')
  const leitor = resposta.body.getReader()
  const pedacos: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    pedacos.push(value)
    total += value.byteLength
    aoReceber(total)
  }
  const bytes = new Uint8Array(total)
  let pos = 0
  for (const p of pedacos) {
    bytes.set(p, pos)
    pos += p.byteLength
  }
  if (
    total !== MEDIDA_MUNDOS_ARQUIVO.bytes ||
    hex(await crypto.subtle.digest('SHA-256', bytes)) !== MEDIDA_MUNDOS_ARQUIVO.sha256
  )
    throw new Error('O arquivo do mundo chegou diferente. Tente de novo.')
  const projeto = await prepareProjectForHost(JSON.parse(new TextDecoder().decode(bytes)))
  if (!projeto) throw new Error('O arquivo do mundo não abriu como projeto do Estúdio.')
  return projeto
}

const Relogio = memo(function Relogio({ comecou }: { comecou: number }) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const s = Math.max(0, Math.round((agora - comecou) / 1000))
  return (
    <span className="tabular-nums">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  )
})

export function WorldMeasurementClient({ filesBase }: { filesBase: string }) {
  const [fase, setFase] = useState<Fase>({ nome: 'inicio' })
  const [aparelho, setAparelho] = useState('')
  const iframe = useRef<HTMLIFrameElement>(null)
  const guardado = useRef<Projeto | null>(null)
  const baixarMs = useRef<number | null>(null)
  const controle = useRef<AbortController | null>(null)

  useEffect(() => () => controle.current?.abort(), [])

  const gravar = useCallback(async (corpo: Record<string, unknown>) => {
    try {
      const r = await sessionFetch('/api/studio/world-measurement', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const dados = (await r.json().catch(() => null)) as { guardado?: string } | null
      const onde: Gravacao =
        r.ok && dados?.guardado === 'r2' ? 'r2' : r.ok && dados?.guardado ? 'registro' : 'falhou'
      setFase((f) => (f.nome === 'pronto' ? { ...f, gravacao: onde } : f))
    } catch {
      setFase((f) => (f.nome === 'pronto' ? { ...f, gravacao: 'falhou' } : f))
    }
  }, [])

  const comecar = useCallback(async () => {
    controle.current?.abort()
    const c = new AbortController()
    controle.current = c
    try {
      let projeto = guardado.current
      if (!projeto) {
        const inicio = performance.now()
        setFase({ nome: 'baixando', recebidos: 0 })
        projeto = await baixarProjeto(filesBase, c.signal, (recebidos) =>
          setFase({ nome: 'baixando', recebidos }),
        )
        baixarMs.current = Math.round(performance.now() - inicio)
        guardado.current = projeto
      }
      if (!c.signal.aborted) setFase({ nome: 'rodando', projeto, comecou: Date.now() })
    } catch (erro) {
      if (!c.signal.aborted)
        setFase({
          nome: 'erro',
          mensagem: erro instanceof Error ? erro.message : 'Algo deu errado ao preparar a medida.',
        })
    }
  }, [filesBase])

  const rodando = fase.nome === 'rodando' ? fase : null
  useEffect(() => {
    if (!rodando) return
    const prazo = window.setTimeout(
      () =>
        setFase({
          nome: 'erro',
          mensagem: 'A medida não terminou a tempo. O mundo carregou? Tente de novo.',
        }),
      PRAZO_DA_MEDIDA_MS,
    )
    const aoReceber = (evento: MessageEvent) => {
      if (!iframe.current || evento.source !== iframe.current.contentWindow) return
      const dados = evento.data as { type?: unknown; medida?: unknown; erro?: unknown } | null
      if (dados?.type !== 'sz-medida-mundo') return
      if (typeof dados.erro === 'string' || !dados.medida) {
        setFase({ nome: 'erro', mensagem: `A medida falhou dentro do jogo: ${String(dados.erro)}` })
        return
      }
      const medida = dados.medida as MedidaRecebida
      const corpo = {
        motor: 'js',
        arquivo: MEDIDA_MUNDOS_ARQUIVO.sha256,
        aparelho: aparelho.trim() || null,
        tela: {
          largura: window.innerWidth,
          altura: window.innerHeight,
          dpr: window.devicePixelRatio,
        },
        tempos: { baixarMs: baixarMs.current, ateResultadoMs: Date.now() - rodando.comecou },
        medida,
      }
      setFase({ nome: 'pronto', medida, gravacao: 'gravando', corpo })
      void gravar(corpo)
    }
    window.addEventListener('message', aoReceber)
    return () => {
      window.clearTimeout(prazo)
      window.removeEventListener('message', aoReceber)
    }
  }, [rodando, aparelho, gravar])

  const baixarJson = useCallback((corpo: Record<string, unknown>) => {
    const blob = new Blob(
      [JSON.stringify({ ...corpo, baixadoEm: new Date().toISOString() }, null, 2)],
      {
        type: 'application/json',
      },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `medida-mundo-2km-${new Date().toISOString().slice(0, 16).replace(':', '')}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, [])

  if (rodando)
    return (
      <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
        <div className="flex items-center gap-3 px-4 py-2 text-sm" role="status">
          <span className="font-semibold">Medindo o mundo de 2 km</span>
          <span className="text-white/70">Não mexa no computador até o resultado aparecer.</span>
          <span className="ms-auto">
            <Relogio comecou={rodando.comecou} />
          </span>
          <Button
            variant="outline"
            className="h-9 text-foreground"
            onClick={() => setFase({ nome: 'inicio' })}
          >
            Parar
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">
          <StudioProjectPlayer
            ref={iframe}
            project={rodando.projeto}
            title="Mundo de 2 km em medida"
            className="absolute inset-0 h-full w-full border-0"
            onError={() =>
              setFase({ nome: 'erro', mensagem: 'O jogo parou com um erro antes de terminar.' })
            }
          />
        </div>
      </div>
    )

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-2">
          <a href="/estudio" className="text-sm underline underline-offset-4">
            Voltar ao Estúdio
          </a>
          <h1 className="font-bold text-2xl">Medida dos mundos grandes</h1>
          <p className="text-muted-foreground">
            Só a equipe vê esta página. Ela roda o mundo de 2 km deste computador com o herói
            andando sozinho pelas regiões por 90 segundos, e compara os números com o aceite do
            plano. O resultado fica guardado no servidor, com o nome da placa de vídeo.
          </p>
        </header>

        {fase.nome === 'pronto' ? (
          <Resultado
            fase={fase}
            onAgain={() => setFase({ nome: 'inicio' })}
            onDownload={() => baixarJson(fase.corpo)}
          />
        ) : (
          <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
            <h2 className="font-semibold text-lg">Antes de começar</h2>
            <ul className="list-disc space-y-1 ps-5 text-sm">
              <li>Ligue o notebook na tomada e feche as outras abas e programas.</li>
              <li>
                Deixe a janela do navegador grande (de preferência maximizada). A medida usa a tela
                inteira.
              </li>
              <li>
                O mundo tem {Math.round(MEDIDA_MUNDOS_ARQUIVO.bytes / MIB)} MB: na primeira vez ele
                é baixado. Depois a medida leva uns 2 minutos.
              </li>
            </ul>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Qual computador é este? (opcional)</span>
              <input
                className="h-11 rounded-lg border bg-background px-3"
                value={aparelho}
                maxLength={80}
                placeholder="Ex.: notebook da Helena"
                onChange={(e) => setAparelho(e.target.value)}
              />
            </label>
            {fase.nome === 'erro' ? (
              <p className="text-destructive text-sm" role="alert">
                {fase.mensagem}
              </p>
            ) : null}
            {fase.nome === 'baixando' ? (
              <p className="text-sm" role="status">
                Baixando o mundo: {Math.round((fase.recebidos / MEDIDA_MUNDOS_ARQUIVO.bytes) * 100)}
                %
              </p>
            ) : (
              <div>
                <Button className="h-11 px-6" onClick={() => void comecar()}>
                  {fase.nome === 'erro' ? 'Tentar de novo' : 'Começar a medida'}
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Resultado({
  fase,
  onAgain,
  onDownload,
}: {
  fase: Extract<Fase, { nome: 'pronto' }>
  onAgain: () => void
  onDownload: () => void
}) {
  const itens = aceiteDaMedida(fase.medida)
  const fora = itens.filter((i) => i.ok === false).length
  const onde: Record<Gravacao, string> = {
    gravando: 'Guardando o resultado no servidor…',
    r2: 'Resultado guardado no servidor.',
    registro: 'Resultado guardado no registro do servidor.',
    falhou: 'Não consegui guardar o resultado. Baixe o arquivo e mande para a equipe.',
  }
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <h2 className="font-semibold text-lg">
        {fora === 0
          ? 'Passou no aceite'
          : `Ficou fora do aceite em ${fora} ${fora === 1 ? 'item' : 'itens'}`}
      </h2>
      <p className="text-sm">
        <span className="font-medium">Placa de vídeo:</span> {fase.medida.gpu}
      </p>
      {placaEmulada(fase.medida.gpu) ? (
        <p className="text-destructive text-sm" role="alert">
          O navegador está sem aceleração de vídeo (placa emulada). Ligue a aceleração por hardware
          nas configurações do navegador e meça de novo: este número não vale para o aceite.
        </p>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pe-3 font-medium">Número</th>
            <th className="py-2 pe-3 font-medium">Medido</th>
            <th className="py-2 pe-3 font-medium">Aceite</th>
            <th className="py-2 font-medium">Situação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.nome} className="border-b last:border-b-0">
              <td className="py-2 pe-3">{i.nome}</td>
              <td className="py-2 pe-3 tabular-nums">{i.valor}</td>
              <td className="py-2 pe-3 text-muted-foreground">{i.meta}</td>
              <td className="py-2">{i.ok === null ? 'sem dado' : i.ok ? 'dentro' : 'fora'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted-foreground text-sm">
        {fase.medida.regioesVisitadas.length} regiões visitadas,{' '}
        {Math.round(fase.medida.rota.metros * fase.medida.rota.voltas)} m andados,{' '}
        {fase.medida.quadros} quadros.
      </p>
      <p className="text-sm" role="status">
        {onde[fase.gravacao]}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button className="h-11 px-6" onClick={onAgain}>
          Medir de novo
        </Button>
        <Button variant="outline" className="h-11 px-6" onClick={onDownload}>
          Baixar o resultado
        </Button>
      </div>
    </section>
  )
}
