'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import Image from '@tiptap/extension-image'
import { EditorContent, type Editor as TiptapEditor, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Quote,
  SquareCode,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Markdown } from 'tiptap-markdown'
import { type ApiError, apiUpload } from '@/lib/api'
import { cn } from '@/lib/cn'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE = 'image/png,image/jpeg,image/webp'

/** O tiptap-markdown (tipado p/ TipTap v2) não aumenta o `Storage` do v3 — cast estreito. */
function getMarkdown(editor: TiptapEditor): string {
  const storage = editor.storage as unknown as { markdown: { getMarkdown(): string } }
  return storage.markdown.getMarkdown()
}

/**
 * Editor rich-text do bloco `rich_text`. ENTRADA E SAÍDA SÃO MARKDOWN
 * (`tiptap-markdown`) — o renderer do community consome markdown, NUNCA HTML.
 * Carregado via `dynamic({ ssr: false })` no wrapper (TipTap é pesado e não
 * renderiza no servidor — `immediatelyRender: false` evita mismatch de SSR).
 */
export default function RichTextEditorImpl({
  content,
  onChange,
  compact = false,
}: {
  content: string
  onChange: (markdown: string) => void
  /** Altura mínima menor (campos densos como opções/explicação do quiz). */
  compact?: boolean
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      // Imagem como bloco (não-inline) — o tiptap-markdown serializa o node p/
      // `![alt](src)`, que o renderer do aluno (member-shell/lib/markdown) desenha.
      Image.configure({ allowBase64: false }),
      Markdown.configure({ html: false }),
    ],
    content,
    immediatelyRender: false,
    // v3 não re-renderiza por transação por padrão — preciso p/ estado ativo da toolbar.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: e }) => onChange(getMarkdown(e)),
    editorProps: {
      attributes: {
        class: cn(
          'rich-text-content px-3 py-2 text-sm focus:outline-none',
          compact ? 'min-h-20' : 'min-h-40',
        ),
      },
    },
  })

  // Sincroniza conteúdo EXTERNO (trocar de bloco no mesmo dialog). Em digitação
  // normal `content` === getMarkdown() (o pai guarda a saída do serializer) → no-op.
  useEffect(() => {
    if (!editor) return
    if (content !== getMarkdown(editor)) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  if (!editor) return null

  return (
    <div className="rounded-lg border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  // Modal da plataforma p/ a URL do link (substitui o window.prompt nativo).
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')

  // Upload de imagem → R2 (sharp→WebP, mesma rota/contrato do ImageUploader,
  // `scope=block`) → insere o node Image, que serializa p/ `![](url)` no markdown.
  async function uploadImage(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Imagem excede o limite de 5 MB.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('scope', 'block')
      const { url } = await apiUpload<{ url: string }>('/api/media/images', form)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha no upload da imagem.')
    } finally {
      setUploading(false)
    }
  }

  function setLink() {
    const previous = editor.getAttributes('link').href as string | undefined
    setLinkValue(previous ?? '')
    setLinkOpen(true)
  }
  function applyLink() {
    const url = linkValue.trim()
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setLinkOpen(false)
  }

  const items: {
    label: string
    icon: React.ReactNode
    active: boolean
    onClick: () => void
  }[] = [
    {
      label: 'Negrito',
      icon: <Bold className="size-4" />,
      active: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Itálico',
      icon: <Italic className="size-4" />,
      active: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Título 1',
      icon: <Heading1 className="size-4" />,
      active: editor.isActive('heading', { level: 1 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'Título 2',
      icon: <Heading2 className="size-4" />,
      active: editor.isActive('heading', { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Título 3',
      icon: <Heading3 className="size-4" />,
      active: editor.isActive('heading', { level: 3 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'Lista',
      icon: <List className="size-4" />,
      active: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Lista numerada',
      icon: <ListOrdered className="size-4" />,
      active: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Citação',
      icon: <Quote className="size-4" />,
      active: editor.isActive('blockquote'),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Código inline',
      icon: <Code className="size-4" />,
      active: editor.isActive('code'),
      onClick: () => editor.chain().focus().toggleCode().run(),
    },
    {
      label: 'Bloco de código',
      icon: <SquareCode className="size-4" />,
      active: editor.isActive('codeBlock'),
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: 'Link',
      icon: <LinkIcon className="size-4" />,
      active: editor.isActive('link'),
      onClick: setLink,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1">
      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          variant="ghost"
          size="icon"
          title={item.label}
          aria-label={item.label}
          aria-pressed={item.active}
          className={cn('size-7', item.active && 'bg-muted text-foreground')}
          onClick={item.onClick}
        >
          {item.icon}
        </Button>
      ))}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void uploadImage(file)
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Imagem"
        aria-label="Imagem"
        disabled={uploading}
        className="size-7"
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
      </Button>

      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Inserir link"
        footer={
          <>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={applyLink}>
              {linkValue.trim() === '' ? 'Remover link' : 'Aplicar'}
            </Button>
          </>
        }
      >
        <Field label="URL do link" hint="Deixe em branco para remover o link.">
          <Input
            type="url"
            value={linkValue}
            placeholder="https://…"
            autoFocus
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink()
              }
            }}
          />
        </Field>
      </Dialog>
    </div>
  )
}
