'use client'

import { Button } from '@sistemazero/ui/button'
import { EditorContent, type Editor as TiptapEditor, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react'
import { useEffect } from 'react'
import { Markdown } from 'tiptap-markdown'
import { cn } from '../lib/cn'

/** O tiptap-markdown (tipado p/ TipTap v2) não aumenta o `Storage` do v3 — cast estreito. */
function getMarkdown(editor: TiptapEditor): string {
  const storage = editor.storage as unknown as { markdown: { getMarkdown(): string } }
  return storage.markdown.getMarkdown()
}

/**
 * Editor rico (Notion-like) COMPARTILHADO pelos apps de aluno (community +
 * community-kids). ENTRADA E SAÍDA SÃO MARKDOWN (`tiptap-markdown`) — o renderer
 * (`lib/markdown.renderMarkdown`) consome markdown, NUNCA HTML, então o corpo é
 * sempre seguro. Colar Markdown pronto já converte (`transformPastedText`). Carregado
 * via `dynamic({ ssr:false })` no wrapper (TipTap é pesado e não renderiza no servidor).
 */
export default function RichEditorImpl({
  value,
  onChange,
  compact = false,
}: {
  value: string
  onChange: (markdown: string) => void
  /** Altura mínima menor (campo de comentário). */
  compact?: boolean
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false },
      }),
      // `transformPastedText` = colar Markdown pronto vira nós formatados.
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: e }) => onChange(getMarkdown(e)),
    editorProps: {
      attributes: {
        class: cn(
          'lesson-prose px-3 py-2 text-sm focus:outline-none',
          compact ? 'min-h-16' : 'min-h-28',
        ),
      },
    },
  })

  // Sincroniza conteúdo EXTERNO (reset após enviar → o pai zera `value`). Em
  // digitação normal `value` === getMarkdown() (o pai guarda a saída) → no-op.
  useEffect(() => {
    if (!editor) return
    if (value !== getMarkdown(editor)) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  return (
    <div className="rounded-xl border-2 border-border bg-background focus-within:border-primary">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  function setLink() {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL do link (https://…)', previous ?? '')
    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const items: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }[] = [
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
      label: 'Título',
      icon: <Heading2 className="size-4" />,
      active: editor.isActive('heading', { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Subtítulo',
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
      label: 'Código',
      icon: <Code className="size-4" />,
      active: editor.isActive('code'),
      onClick: () => editor.chain().focus().toggleCode().run(),
    },
    {
      label: 'Link',
      icon: <LinkIcon className="size-4" />,
      active: editor.isActive('link'),
      onClick: setLink,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-border border-b p-1">
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
    </div>
  )
}
