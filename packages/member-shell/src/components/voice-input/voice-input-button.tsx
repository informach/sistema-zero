'use client'

import { Button } from '@sistemazero/ui/button'
import { Loader2, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import {
  useVoiceRecorder,
  VOICE_MAX_SECONDS,
  type VoiceProblem,
} from '../../lib/voice/use-voice-recorder'
import { ZappyOuvirButton } from '../zappy-ouvir-button'

/**
 * "Falar" (14/10/2026): a criança fala em vez de escrever a mensagem para a equipe. O texto
 * transcrito entra na caixa (somado ao que já havia), ela confere, ouve se quiser e envia como
 * qualquer mensagem escrita. Nós não guardamos a gravação.
 *
 * Só aparece onde o app passa a capacidade (no Kids, com a fala ligada pelos pais) e num
 * navegador que grava. Quem usa este botão marca a mensagem como falada (`onSpoken`), e é por
 * isso que a equipe vê o chip "falado" no Admin.
 *
 * ⚠️ O formulário precisa ouvir `onBusyChange` e segurar o "Enviar" enquanto a fala ainda vira
 * texto: enviando no meio, o recado saía sem a fala (o diálogo fechava e abortava a transcrição)
 * ou o texto que chegava depois era apagado pela limpeza do envio.
 */

const MENSAGENS: Record<VoiceProblem, string> = {
  blocked: 'O microfone está bloqueado. Peça para um adulto liberar o microfone deste site.',
  'no-mic': 'Não encontrei um microfone neste aparelho.',
  busy: 'O microfone está ocupado em outro programa. Feche o outro programa e tente de novo.',
  short: 'Foi muito rapidinho. Aperte Falar e conte com calma.',
  silence: 'Não ouvi nada. Chegue mais perto do microfone e fale de novo.',
  empty: 'Não consegui entender. Fale de novo, com calma, perto do microfone.',
  'too-long': 'A gravação ficou longa demais. Tente falar em menos de um minuto.',
  'rate-limited': 'Foram muitas gravações seguidas. Espere um pouquinho ou escreva.',
  disabled: 'A fala foi desligada neste perfil. Você pode escrever.',
  viewer: 'O perfil mudou. Abra esta página de novo para continuar.',
  interrupted: 'A gravação parou antes do fim. Aperte Falar para gravar de novo.',
  unavailable: 'Não consegui transformar em texto agora. Tente de novo ou escreva.',
}

function relogio(segundos: number): string {
  const s = Math.max(0, Math.min(VOICE_MAX_SECONDS, segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Soma a fala ao texto da caixa, cortando no teto do campo. O teto é contado em unidades
 * UTF-16, como o `maxLength` do textarea e o `.max()` do servidor contam (um emoji vale 2), e o
 * corte nunca parte um emoji ao meio. `adicionou` diz se alguma coisa da fala entrou.
 */
export function juntarFala(atual: string, falado: string, maxLength: number) {
  const base = atual.replace(/\s+$/, '')
  const junto = base ? `${base} ${falado}` : falado
  if (junto.length <= maxLength) return { texto: junto, cortado: false, adicionou: true }
  let texto = ''
  for (const letra of junto) {
    if (texto.length + letra.length > maxLength) break
    texto += letra
  }
  texto = texto.replace(/\s+$/, '')
  return { texto, cortado: true, adicionou: texto.length > base.length }
}

export function VoiceInputButton({
  viewerId,
  context,
  value,
  maxLength,
  onChange,
  onSpoken,
  onBusyChange,
  textareaId,
  disabled = false,
  className,
  preserveOverflow = false,
  transcriptMaxChars,
}: {
  viewerId: string | null
  /** Onde a criança está (título da fase · parte); ajuda a acertar o vocabulário. */
  context?: string
  /** O texto atual da caixa: a fala entra somada a ele. */
  value: string
  /** O teto do campo: texto inserido por código não respeita o `maxLength` do textarea. */
  maxLength: number
  onChange: (next: string) => void
  /** O texto da caixa agora tem fala transcrita (o formulário marca a mensagem como falada). */
  onSpoken: () => void
  /** Gravando ou transcrevendo: o formulário segura o "Enviar" enquanto for `true`. */
  onBusyChange?: (busy: boolean) => void
  /** Para onde o foco vai depois de inserir o texto. */
  textareaId?: string
  disabled?: boolean
  className?: string
  /** O Pensa preserva a ideia inteira e pede para dividir antes de enviar. */
  preserveOverflow?: boolean
  /**
   * Teto do texto que UMA fala pode trazer do servidor. Sem ele, 1000 (recados, ajuda da fase,
   * tutor). O Pensa passa `PENSA_SPOKEN_TEXT_MAX_CHARS` (4000), e é o único que pode.
   */
  transcriptMaxChars?: number
}) {
  const [ultimoFalado, setUltimoFalado] = useState('')
  const [cortado, setCortado] = useState(false)
  const [cheio, setCheio] = useState(false)
  const valueRef = useRef(value)
  valueRef.current = value
  const voz = useVoiceRecorder({
    viewerId,
    context,
    maxChars: transcriptMaxChars,
    onText: (falado) => {
      const resultado = juntarFala(
        valueRef.current,
        falado,
        preserveOverflow ? Number.MAX_SAFE_INTEGER : maxLength,
      )
      setCheio(!resultado.adicionou)
      if (!resultado.adicionou) {
        setUltimoFalado('')
        return
      }
      onChange(resultado.texto)
      onSpoken()
      setUltimoFalado(falado)
      setCortado(resultado.cortado)
      if (textareaId) {
        const caixa = document.getElementById(textareaId)
        if (caixa instanceof HTMLTextAreaElement) {
          caixa.focus()
          caixa.setSelectionRange(caixa.value.length, caixa.value.length)
        }
      }
    },
  })

  const ocupadoAgora = voz.state !== 'idle'
  const busyRef = useRef(onBusyChange)
  busyRef.current = onBusyChange
  useEffect(() => {
    busyRef.current?.(ocupadoAgora)
  }, [ocupadoAgora])
  // Saindo da tela ocupado (o diálogo fechou), o formulário não pode ficar travado.
  useEffect(() => () => busyRef.current?.(false), [])

  // A caixa foi esvaziada (o envio limpa): o "confira" e o "Ouvir" eram da mensagem que saiu.
  useEffect(() => {
    if (value.trim()) return
    setUltimoFalado('')
    setCortado(false)
    setCheio(false)
  }, [value])

  if (!voz.supported) return null

  const gravando = voz.state === 'recording'
  const abrindo = voz.state === 'starting'
  const ocupado = abrindo || voz.state === 'transcribing'
  const restam = VOICE_MAX_SECONDS - voz.seconds
  const bloqueado = disabled || ocupado

  // A região viva fala só quando o estado MUDA: a contagem segundo a segundo falaria por cima da
  // gravação (e a voz do leitor de tela entraria na transcrição).
  let aviso = ''
  if (abrindo) aviso = 'Abrindo o microfone…'
  else if (gravando) aviso = restam <= 10 ? 'Pode falar. Faltam poucos segundos.' : 'Pode falar.'
  else if (voz.state === 'transcribing') aviso = 'Escrevendo o que você falou…'
  else if (voz.problem) aviso = MENSAGENS[voz.problem]
  else if (cheio) aviso = 'A caixa já está cheia. Apague um pedaço do texto para falar mais.'
  else if (ultimoFalado)
    aviso = cortado
      ? 'O texto ficou grande e o fim foi cortado. Confira antes de enviar.'
      : 'Confira se ficou certo. Se não ficou, fale de novo ou arrume o texto.'

  return (
    <div className={cn('flex flex-col gap-2', className)} data-sz-voice-input>
      <div className="flex flex-wrap items-center gap-2">
        {/* O MESMO botão vira "Parar": o foco não se perde ao trocar de estado. Ocupado ele fica
            `aria-disabled` e não `disabled`, que tiraria o foco de quem acabou de apertar. */}
        <Button
          type="button"
          variant="outline"
          className={cn(
            'min-h-11 gap-2 rounded-full',
            bloqueado && !gravando && 'cursor-not-allowed opacity-50',
          )}
          aria-label={gravando ? 'Parar de gravar' : 'Falar em vez de escrever'}
          aria-disabled={!gravando && bloqueado ? true : undefined}
          onClick={() => {
            if (gravando) voz.stop()
            else if (!bloqueado) voz.start()
          }}
        >
          {gravando ? (
            <Square className="size-4 fill-current" aria-hidden />
          ) : ocupado ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Mic className="size-4" aria-hidden />
          )}
          {gravando ? 'Parar' : 'Falar'}
        </Button>
        {abrindo ? (
          // O pedido de permissão pode ficar escondido (o aviso do navegador): sempre há saída.
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 rounded-full"
            onClick={voz.cancel}
          >
            Cancelar
          </Button>
        ) : null}
        {gravando ? (
          <span className="flex items-center gap-2 text-sm tabular-nums">
            <span
              className="size-2.5 rounded-full bg-destructive motion-safe:animate-pulse"
              aria-hidden
            />
            <span aria-hidden>
              {relogio(voz.seconds)} de {relogio(VOICE_MAX_SECONDS)}
            </span>
            {/* O medidor diz que o microfone está ouvindo. */}
            <span
              className="relative h-2 w-16 overflow-hidden rounded-full bg-muted"
              aria-hidden
              data-sz-voice-meter
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-75"
                style={{ width: `${Math.round(voz.level * 100)}%` }}
              />
            </span>
          </span>
        ) : null}
        {ultimoFalado && voz.state === 'idle' && !voz.problem ? (
          <ZappyOuvirButton textos={[ultimoFalado]} rotulo="Ouvir o que eu falei" />
        ) : null}
      </div>
      {/* Sempre montada: região viva que nasce junto do texto não é anunciada. */}
      <p
        role="status"
        aria-live="polite"
        className={cn('text-sm', voz.problem ? 'text-destructive' : 'text-muted-foreground')}
      >
        {aviso}
      </p>
    </div>
  )
}
