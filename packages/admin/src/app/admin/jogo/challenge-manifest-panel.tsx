'use client'

import {
  type AplicacaoDoManifesto,
  AplicacaoDoManifestoSchema,
  type ConferenciaDoManifesto,
  ConferenciaDoManifestoSchema,
  DesafioDaEquipeSchema,
  DesafiosDaEquipeSchema,
  type IlhaId,
  type ItemDaConferencia,
  ilha,
  type ManifestoDeDesafios,
  ManifestoDeDesafiosSchema,
  type PublicoDoDesafio,
  type ResumoDoDesafio,
} from '@sistemazero/arquipelago-contracts'
import { Button } from '@sistemazero/ui/button'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useRef, useState } from 'react'
import {
  manifestCoverage,
  manifestFileName,
  manifestScopeLabel,
  mergeConferences,
  missingFromManifest,
  parseChallengeManifest,
  splitManifest,
} from '@/lib/challenge-manifest'
import { downloadJson } from '@/lib/download-json'
import { GameRequestError, gameRequest } from './game-request'

const card = 'space-y-4 rounded-xl border border-border bg-card p-5'
const ACAO: Record<ItemDaConferencia['acao'], string> = {
  criar: 'Novo',
  atualizar: 'Muda',
  igual: 'Igual',
  conflito: 'Não dá para gravar',
}
const TIPO: Record<ItemDaConferencia['tipo'], string> = {
  'quadro-das-cores': 'Quadro das Cores',
  'desafio-do-dia': 'Desafio do dia',
  'pedido-de-morador': 'Pedido de morador',
}

type Lot = { manifest: ManifestoDeDesafios; conference: ConferenciaDoManifesto }
type Preview = {
  manifest: ManifestoDeDesafios
  lots: Lot[]
  merged: ReturnType<typeof mergeConferences>
  missing: ResumoDoDesafio[]
}
type ApplyResult = {
  itens: AplicacaoDoManifesto['itens']
  archived: { titulo: string; ok: boolean; message?: string }[]
  stoppedAt: number | null
  error: string
  /** Os que a conferência disse que saem publicados (um "igual" publicado só por isso). */
  willPublish: string[]
}

const opts = { editHint: false }

/** Quantos desafios de um lote o aplicar ainda mexe (o resto é igual ou não dá para gravar). */
const hasWork = (c: ConferenciaDoManifesto) =>
  c.itens.some((i) => i.acao === 'criar' || i.acao === 'atualizar' || i.publica)

/**
 * O manifesto de desafios na seção Jogo: subir um arquivo (um desafio, a ilha ou o jogo inteiro),
 * conferir o que muda, aplicar em lotes e baixar o que está cadastrado. A equipe toda confere; só
 * a administração aplica e arquiva.
 */
export function ChallengeManifestPanel({
  publico,
  island,
  canWrite,
  disabled,
  onApplied,
}: {
  publico: PublicoDoDesafio
  island: IlhaId | ''
  canWrite: boolean
  disabled: boolean
  /** Depois de aplicar: os slugs gravados, para a lista e o editor relerem. */
  onApplied: (slugs: string[]) => void
}) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [archiveMissing, setArchiveMissing] = useState(false)
  const [result, setResult] = useState<ApplyResult | null>(null)
  const [progress, setProgress] = useState('')
  const [working, setWorking] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  function reset(next: string) {
    controller.current?.abort()
    setText(next)
    setPreview(null)
    setResult(null)
    setErrors([])
    setArchiveMissing(false)
  }

  async function work(action: (signal: AbortSignal) => Promise<void>) {
    if (working) return
    controller.current?.abort()
    const c = new AbortController()
    controller.current = c
    setWorking(true)
    setErrors([])
    try {
      await action(c.signal)
    } catch (e) {
      if (!c.signal.aborted)
        setErrors([e instanceof Error ? e.message : 'Não foi possível concluir agora.'])
    } finally {
      if (!c.signal.aborted) {
        setWorking(false)
        setProgress('')
      }
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    reset(await file.text())
  }

  async function listFor(
    publicoDoArquivo: PublicoDoDesafio,
    ilhaDoArquivo: IlhaId | null,
    signal: AbortSignal,
  ) {
    const query = new URLSearchParams({
      publico: publicoDoArquivo,
      ...(ilhaDoArquivo ? { ilha: ilhaDoArquivo } : {}),
    })
    const raw = await gameRequest(`desafios?${query}`, 'GET', undefined, signal, opts)
    return DesafiosDaEquipeSchema.parse(raw).desafios
  }

  function conferir() {
    const parsed = parseChallengeManifest(text)
    if (!parsed.ok) {
      setPreview(null)
      setErrors(parsed.errors)
      return
    }
    setResult(null)
    void work(async (signal) => {
      const manifest = parsed.manifest
      const pieces = splitManifest(manifest)
      const lots: Lot[] = []
      for (const [i, piece] of pieces.entries()) {
        setProgress(
          pieces.length > 1
            ? `Conferindo a parte ${i + 1} de ${pieces.length}…`
            : 'Conferindo o arquivo…',
        )
        const raw = await gameRequest(
          'manifestos/conferir',
          'POST',
          { manifesto: piece },
          AbortSignal.any([signal, AbortSignal.timeout(175_000)]),
          opts,
        )
        lots.push({ manifest: piece, conference: ConferenciaDoManifestoSchema.parse(raw) })
      }
      const coverage = manifestCoverage(manifest)
      let missing: ResumoDoDesafio[] = []
      if (coverage) {
        const rows = await Promise.all(
          coverage.publicos.map((p) => listFor(p, coverage.ilha, signal)),
        )
        missing = missingFromManifest(manifest, rows.flat())
      }
      setArchiveMissing(false)
      setPreview({
        manifest,
        lots,
        merged: mergeConferences(lots.map((l) => l.conference)),
        missing,
      })
    })
  }

  function aplicar() {
    if (!preview || !canWrite) return
    const { contagem } = preview.merged
    const toArchive = archiveMissing ? preview.missing : []
    const parts = [
      contagem.criar ? `criar ${contagem.criar}` : '',
      contagem.atualizar ? `mudar ${contagem.atualizar}` : '',
      contagem.publica ? `publicar ${contagem.publica}` : '',
      toArchive.length ? `arquivar ${toArchive.length}` : '',
    ].filter(Boolean)
    if (!window.confirm(`Aplicar o manifesto: ${parts.join(', ')}. Continuar?`)) return
    void work(async (signal) => {
      const itens: AplicacaoDoManifesto['itens'] = []
      const pending = preview.lots.filter((l) => hasWork(l.conference))
      let stoppedAt: number | null = null
      let error = ''
      for (const [i, lot] of pending.entries()) {
        setProgress(
          pending.length > 1
            ? `Aplicando a parte ${i + 1} de ${pending.length}…`
            : 'Aplicando o arquivo…',
        )
        try {
          const raw = await gameRequest(
            'manifestos/aplicar',
            'POST',
            { manifesto: lot.manifest, impressao: lot.conference.impressao },
            AbortSignal.any([signal, AbortSignal.timeout(175_000)]),
            opts,
          )
          itens.push(...AplicacaoDoManifestoSchema.parse(raw).itens)
        } catch (e) {
          if (signal.aborted) throw e
          stoppedAt = i
          error =
            e instanceof GameRequestError && e.code === 'MANIFESTO_DESATUALIZADO'
              ? 'Algum desafio do arquivo mudou depois da conferência. Confira de novo: o que já foi aplicado aparece como igual.'
              : e instanceof Error
                ? e.message
                : 'Não foi possível aplicar.'
          break
        }
      }
      const archived: ApplyResult['archived'] = []
      if (stoppedAt === null)
        for (const row of toArchive) {
          setProgress(`Arquivando "${row.titulo}"…`)
          try {
            await gameRequest(
              `desafios/${row.id}/arquivar`,
              'POST',
              { revisaoBase: row.revisao },
              signal,
              opts,
            ).then((raw) => DesafioDaEquipeSchema.parse(raw))
            archived.push({ titulo: row.titulo, ok: true })
          } catch (e) {
            if (signal.aborted) throw e
            archived.push({
              titulo: row.titulo,
              ok: false,
              message:
                e instanceof GameRequestError && e.status === 409
                  ? 'Mudou depois da conferência. Confira de novo.'
                  : e instanceof Error
                    ? e.message
                    : 'Não arquivou.',
            })
          }
        }
      setPreview(null)
      const willPublish = preview.merged.itens.filter((i) => i.publica).map((i) => i.slug)
      setResult({ itens, archived, stoppedAt, error, willPublish })
      onApplied(itens.filter((i) => i.acao !== 'conflito').map((i) => i.slug))
    })
  }

  function exportar(scope: 'ilha' | 'jogo') {
    void work(async (signal) => {
      const query = new URLSearchParams({
        publico,
        ...(scope === 'ilha' && island ? { ilha: island } : {}),
      })
      const raw = await gameRequest(`manifestos/exportar?${query}`, 'GET', undefined, signal, opts)
      const manifest = ManifestoDeDesafiosSchema.parse(raw)
      downloadJson(manifestFileName(manifest), manifest)
    })
  }

  const busy = working || disabled
  const merged = preview?.merged
  const hasChanges =
    !!merged &&
    (merged.contagem.criar + merged.contagem.atualizar + merged.contagem.publica > 0 ||
      (archiveMissing && (preview?.missing.length ?? 0) > 0))

  return (
    <section className={card} aria-label="Manifesto de desafios">
      <div>
        <h2 className="text-lg font-semibold">Manifesto de desafios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Suba um arquivo com um desafio, uma ilha ou o jogo inteiro. O Admin confere e mostra o que
          muda; nada é gravado até aplicar. Subir de novo atualiza o que já existe pelo
          identificador e acrescenta o que é novo.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="sr-only">Arquivo do manifesto</span>
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(e) => {
              void readFile(e.target.files?.[0])
              e.target.value = ''
            }}
            className="text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5"
          />
        </label>
        {fileName && text && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>
      <details>
        <summary className="cursor-pointer text-sm">Ou cole o conteúdo do arquivo</summary>
        <Textarea
          className="mt-2 font-mono text-xs"
          rows={8}
          value={text}
          disabled={busy}
          aria-label="Conteúdo do manifesto"
          onChange={(e) => {
            setFileName('')
            reset(e.target.value)
          }}
        />
      </details>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !text.trim()} onClick={conferir}>
          Conferir
        </Button>
        <Button
          variant="outline"
          disabled={busy || !island}
          title={island ? undefined : 'Escolha uma ilha na lista acima'}
          onClick={() => exportar('ilha')}
        >
          {island ? `Baixar ${ilha(island).nome}` : 'Baixar a ilha'}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => exportar('jogo')}>
          Baixar o jogo inteiro ({publico === 'kids' ? 'Kids' : 'Adultos'})
        </Button>
      </div>
      {progress && <p role="status">{progress}</p>}
      {errors.length > 0 && (
        <ul
          role="alert"
          className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {preview && merged && (
        <div className="space-y-3">
          <h3 className="font-medium">{manifestScopeLabel(preview.manifest)}</h3>
          <p className="text-sm" role="status">
            Novos: {merged.contagem.criar} · Mudam: {merged.contagem.atualizar} · Iguais:{' '}
            {merged.contagem.igual} · Não dá para gravar: {merged.contagem.conflito} · Com problema:{' '}
            {merged.contagem.comProblema} · Saem publicados: {merged.contagem.publica}
          </p>
          <ul className="divide-y divide-border">
            {merged.itens.map((item) => (
              <PreviewRow key={item.slug} item={item} />
            ))}
          </ul>
          {preview.missing.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <p>
                {preview.missing.length === 1
                  ? 'Este desafio do cadastro não está no arquivo. Ele fica como está:'
                  : `Estes ${preview.missing.length} desafios do cadastro não estão no arquivo. Eles ficam como estão:`}
              </p>
              <ul className="list-inside list-disc text-muted-foreground">
                {preview.missing.map((r) => (
                  <li key={r.id}>
                    {r.titulo} ({r.slug}) · {ilha(r.ilha).nome}
                  </li>
                ))}
              </ul>
              {canWrite && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={archiveMissing}
                    disabled={busy}
                    onChange={(e) => setArchiveMissing(e.target.checked)}
                  />
                  Arquivar também os que não estão no arquivo (as conquistas ficam guardadas)
                </label>
              )}
            </div>
          )}
          {canWrite ? (
            <Button disabled={busy || !hasChanges} onClick={aplicar}>
              Aplicar
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Só a administração aplica o manifesto. A conferência fica aqui para revisar.
            </p>
          )}
          {!hasChanges && (
            <p className="text-sm text-muted-foreground">
              Nada a gravar: o cadastro já está assim.
            </p>
          )}
        </div>
      )}
      {result && <ApplyResultView result={result} />}
    </section>
  )
}

function PreviewRow({ item }: { item: ItemDaConferencia }) {
  const problems = item.analise?.problemas ?? []
  return (
    <li className="space-y-1 py-2 text-sm">
      <p>
        <strong>{item.titulo}</strong> <span className="text-muted-foreground">({item.slug})</span>
      </p>
      <p className="text-muted-foreground">
        {ilha(item.ilha).nome} · {TIPO[item.tipo]}
        {item.quadro ? ` ${item.quadro}/6` : ''} · {ACAO[item.acao]}
        {item.publica ? ' · sai publicado' : ''}
      </p>
      {item.conflito && <p className="text-destructive">{item.conflito.mensagem}</p>}
      {problems.length > 0 && (
        <ul className="list-inside list-disc text-destructive">
          {problems.map((p) => (
            <li key={`${p.codigo}:${p.objetivoId ?? ''}:${p.mensagem}`}>{p.mensagem}</li>
          ))}
          <li className="list-none text-muted-foreground">
            Com problema, grava e fica em rascunho.
          </li>
        </ul>
      )}
    </li>
  )
}

function ApplyResultView({ result }: { result: ApplyResult }) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm" role="status">
      <h3 className="font-medium">
        {result.stoppedAt === null ? 'Manifesto aplicado' : 'O manifesto parou no meio'}
      </h3>
      {result.error && <p className="text-destructive">{result.error}</p>}
      <ul className="divide-y divide-border">
        {result.itens.map((i) => (
          <li key={i.slug} className="py-1.5">
            <strong>{i.slug}</strong>:{' '}
            {i.acao === 'conflito'
              ? `não gravou. ${i.problemas.map((p) => p.mensagem).join(' ')}`
              : i.publicado && (i.acao !== 'igual' || result.willPublish.includes(i.slug))
                ? i.acao === 'igual'
                  ? 'publicado.'
                  : `${i.acao === 'criar' ? 'criado' : 'atualizado'} e publicado.`
                : i.problemas.length > 0
                  ? `gravado em rascunho. ${i.problemas.map((p) => p.mensagem).join(' ')}`
                  : i.acao === 'igual'
                    ? 'sem mudança.'
                    : `${i.acao === 'criar' ? 'criado' : 'atualizado'} em rascunho.`}
          </li>
        ))}
        {result.archived.map((a) => (
          <li key={a.titulo} className="py-1.5">
            <strong>{a.titulo}</strong>: {a.ok ? 'arquivado.' : `não arquivou. ${a.message}`}
          </li>
        ))}
      </ul>
    </div>
  )
}
