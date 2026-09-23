'use client'

import {
  chaveDeVoz,
  isZappySpeechText,
  normalizarRoteiroDoZappy,
  roteiroDoZappy,
  type SceneVozes,
  textoFalado,
  type ZappySpeechOverride,
} from '@sistemazero/core/learning/scene'
import { Button } from '@sistemazero/ui/button'
import { Textarea } from '@sistemazero/ui/textarea'
import { RotateCcw, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiSend } from '@/lib/api'

export interface ZappySpeechRow {
  id: string
  label: string
  visibleText: string
  override?: ZappySpeechOverride
}

/**
 * Autoria separada da fala do Zappy. A grafia editorial nunca é alterada aqui: a segunda coluna
 * existe apenas para resolver pronúncia, pausas e palavras estrangeiras depois de ouvir a voz.
 */
export function ZappySpeechEditor({
  rows,
  onChange,
  onPreviewVoice,
}: {
  rows: readonly ZappySpeechRow[]
  onChange: (id: string, override: ZappySpeechOverride | undefined) => void
  /** A fala aprovada na prévia também precisa viajar no bloco publicado. */
  onPreviewVoice?: (
    id: string,
    override: ZappySpeechOverride | undefined,
    vozes: SceneVozes,
  ) => void
}) {
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({})
  const [gerando, setGerando] = useState<string | null>(null)
  /** Mantém a prévia viva e evita duas falas sobrepostas no painel. */
  const previa = useRef<HTMLAudioElement | null>(null)
  /** Um rascunho de pronúncia nunca pode atravessar uma mudança no texto da criança. */
  const origens = useRef<Record<string, string>>({})
  useEffect(() => {
    const mudou = rows
      .filter(
        (row) =>
          origens.current[row.id] && origens.current[row.id] !== textoFalado(row.visibleText),
      )
      .map((row) => row.id)
    origens.current = Object.fromEntries(rows.map((row) => [row.id, textoFalado(row.visibleText)]))
    if (!mudou.length) return
    setRascunhos((atual) => {
      const proximo = { ...atual }
      for (const id of mudou) delete proximo[id]
      return proximo
    })
    for (const id of mudou) onChange(id, undefined)
  }, [onChange, rows])
  if (!rows.length) return null

  function roteiroPadrao(row: ZappySpeechRow) {
    return roteiroDoZappy(row.visibleText)
  }

  function valorDoRascunho(row: ZappySpeechRow) {
    return rascunhos[row.id] ?? roteiroDoZappy(row.visibleText, row.override)
  }

  function salvar(
    row: ZappySpeechRow,
  ): { roteiro: string; override: ZappySpeechOverride | undefined } | null {
    const roteiro = valorDoRascunho(row)
    if (!isZappySpeechText(roteiro)) {
      toast.error('Escreva um roteiro válido. Só pausas como <break time="0.5s" /> são aceitas.')
      return null
    }
    const normalizado = normalizarRoteiroDoZappy(roteiro)
    const origem = textoFalado(row.visibleText)
    const override =
      normalizado === roteiroPadrao(row)
        ? undefined
        : { sourceText: origem, speechText: normalizado }
    onChange(row.id, override)
    setRascunhos((atual) => ({ ...atual, [row.id]: normalizado }))
    return { roteiro: normalizado, override }
  }

  async function gerarEOuvir(row: ZappySpeechRow) {
    const salvo = salvar(row)
    if (!salvo) return
    setGerando(row.id)
    try {
      const resultado = await apiSend<{ vozes: Record<string, string> }>(
        '/api/media/voz-zappy',
        'POST',
        {
          falas: [{ visibleText: textoFalado(row.visibleText), speechText: salvo.roteiro }],
        },
      )
      const url = resultado.vozes[chaveDeVoz(salvo.roteiro)]
      if (!url) throw new Error('A voz não ficou pronta. Tente gerar novamente.')
      // A rota, o cache e o player usam este mesmo roteiro. Descartar a URL aqui fazia a prévia
      // prometer uma pronúncia aprovada, mas publicava o bloco sem o MP3 correspondente.
      onPreviewVoice?.(row.id, salvo.override, resultado.vozes)
      previa.current?.pause()
      const audio = new Audio(url)
      previa.current = audio
      audio.onended = () => {
        if (previa.current === audio) previa.current = null
      }
      await audio.play()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu para gerar a prévia agora.')
    } finally {
      setGerando(null)
    }
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold">Como o Zappy fala</legend>
      <p className="text-sm text-muted-foreground">
        A criança continua lendo o texto da esquerda. Ajuste a fala só quando precisar acertar uma
        pronúncia ou dar uma pausa. Ao gerar e ouvir, esta fala já fica pronta para publicar; o
        botão da aula continua útil para gerar as outras falas que faltarem.
      </p>
      {rows.map((row) => {
        const roteiro = valorDoRascunho(row)
        const invalido = !isZappySpeechText(roteiro)
        const personalizado = !invalido && normalizarRoteiroDoZappy(roteiro) !== roteiroPadrao(row)
        return (
          <div key={row.id} className="space-y-3 rounded-lg bg-muted/40 p-3">
            <p className="text-sm font-medium">{row.label}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">A criança lê</p>
                <p className="whitespace-pre-line rounded-md border border-border bg-background p-3 text-sm">
                  {row.visibleText}
                </p>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Como o Zappy fala
                </span>
                <Textarea
                  value={roteiro}
                  rows={3}
                  aria-label={`Como o Zappy fala: ${row.label}`}
                  aria-invalid={invalido || undefined}
                  onChange={(event) =>
                    setRascunhos((atual) => ({ ...atual, [row.id]: event.target.value }))
                  }
                  onBlur={() => salvar(row)}
                />
              </label>
            </div>
            {invalido ? (
              <p className="text-sm text-destructive">
                Use texto normal e, se precisar, uma pausa como &lt;break time="0.5s" /&gt;.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {personalizado
                  ? 'Roteiro ajustado para a voz.'
                  : 'Usando o perfil de pronúncia padrão.'}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={invalido || gerando === row.id}
                onClick={() => void gerarEOuvir(row)}
              >
                <Volume2 size={16} aria-hidden />
                {gerando === row.id ? 'Gerando...' : 'Gerar e ouvir'}
              </Button>
              {personalizado ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const padrao = roteiroPadrao(row)
                    setRascunhos((atual) => ({ ...atual, [row.id]: padrao }))
                    onChange(row.id, undefined)
                  }}
                >
                  <RotateCcw size={16} aria-hidden />
                  Restaurar padrão
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </fieldset>
  )
}
