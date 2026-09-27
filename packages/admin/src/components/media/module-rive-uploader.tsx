'use client'

import { Button } from '@sistemazero/ui/button'
import { Loader2, Sparkles, TriangleAlert, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiUpload } from '@/lib/api'

/** Espelha o `MAX_MODULE_RIVE_BYTES` do servidor — aqui só para avisar antes de subir. */
const MAX_RIVE_BYTES = 5 * 1024 * 1024

/**
 * O runtime do Rive são ~676 KB. Fica num chunk próprio e fora do SSR: quem nunca
 * abre um módulo Kids não paga por ele.
 */
const ModuleRivePreview = dynamic(
  () => import('./module-rive-preview').then((m) => m.ModuleRivePreview),
  { ssr: false },
)

/**
 * Upload da animação Rive (.riv) da trilha, com prévia rodando.
 *
 * ⚠️ A prévia NÃO é enfeite. Nenhum teste automatizado consegue provar que um
 * `.riv` anima (o happy-dom não tem WebGL, e o guarda de bytes só vê nomes —
 * `community-kids/CLAUDE.md`). Ver a animação rodando aqui, antes de salvar, é a
 * única verificação real de que o arquivo não vai chegar CONGELADO na tela da
 * criança. Por isso ela carrega o arquivo pelo mesmo caminho que o app da criança.
 */
export function ModuleRiveUploader({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string
  onChange: (value: string) => void
  onUploadingChange: (uploading: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  // ⚠️⚠️ Os bytes andam JUNTO da URL que os produziu, num objeto só. Soltos, o
  // `buffer` da animação ANTERIOR sobreviveria ao instante entre trocar o arquivo
  // e o novo fetch responder — e, com a `key={value}` lá embaixo, a prévia
  // remontaria com a identidade nova e a ANIMAÇÃO VELHA. Quem trocasse o arquivo
  // veria algo se mexendo e concluiria que o novo está bom. Numa prévia cuja
  // única razão de existir é VERIFICAR, isso é o pior defeito possível.
  const [carga, setCarga] = useState<{ src: string; bytes: ArrayBuffer } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const bytes = carga?.src === value ? carga.bytes : null

  // Reabrindo um módulo já salvo não há arquivo local: os bytes vêm pela
  // rota-proxy do painel (`connect-src 'self'`), nunca do CDN direto.
  useEffect(() => {
    setErro(null)
    if (!value) return
    let vivo = true
    fetch(`/api/media/module-rive/preview?src=${encodeURIComponent(value)}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((baixados) => {
        if (vivo) setCarga({ src: value, bytes: baixados })
      })
      .catch(() => {
        if (vivo) setErro('Não foi possível carregar a prévia desta animação.')
      })
    return () => {
      vivo = false
    }
  }, [value])

  const falhou = useCallback((motivo: string) => setErro(motivo), [])

  async function upload(file: File) {
    // ⚠️ Sem checar `file.type`: não há MIME registrado para `.riv`, então o
    // navegador manda `application/octet-stream` ou string vazia.
    if (!file.name.toLowerCase().endsWith('.riv')) {
      toast.error('Escolha um arquivo .riv exportado do Rive.')
      return
    }
    if (file.size === 0 || file.size > MAX_RIVE_BYTES) {
      toast.error('A animação deve ter até 5 MB.')
      return
    }
    setUploading(true)
    onUploadingChange(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const { url } = await apiUpload<{ url: string }>('/api/media/module-rive', form)
      onChange(url)
      toast.success('Animação enviada. Salve o módulo para usá-la na trilha.')
    } catch (error) {
      toast.error((error as ApiError).message ?? 'Falha ao enviar a animação.')
    } finally {
      setUploading(false)
      onUploadingChange(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        id="mrive-file"
        type="file"
        accept=".riv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload(file)
        }}
      />
      {value ? (
        <div className="relative flex min-h-36 items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
          {erro ? (
            <p className="flex items-center gap-2 text-center text-destructive text-xs">
              <TriangleAlert className="size-4 shrink-0" />
              {erro}
            </p>
          ) : bytes ? (
            <div className="size-40">
              {/* ⚠️ A `key` é obrigatória: o `useRive` lê os parâmetros UMA vez na
                  montagem, então trocar o arquivo sem ela manteria a prévia antiga
                  rodando — e falharia sem erro nenhum. */}
              <ModuleRivePreview key={value} buffer={bytes} onFalhou={falhou} />
            </div>
          ) : (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-2 top-2 size-7 bg-background/80"
            title="Remover animação"
            disabled={uploading}
            onClick={() => onChange('')}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {uploading ? 'Enviando animação…' : value ? 'Trocar animação' : 'Enviar animação Rive'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Arquivo .riv de até 5 MB, exportado do Rive. A animação roda em laço na trilha — confira na
        prévia acima antes de salvar.
      </p>
    </div>
  )
}
