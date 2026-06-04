'use client'

import { EditorContent, type Editor as TiptapEditor, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  SquareCode,
} from 'lucide-react'
import { useEffect } from 'react'
import { Markdown } from 'tiptap-markdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

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
}: {
  content: string
  onChange: (markdown: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      Markdown.configure({ html: false }),
    ],
    content,
    immediatelyRender: false,
    // v3 não re-renderiza por transação por padrão — preciso p/ estado ativo da toolbar.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: e }) => onChange(getMarkdown(e)),
    editorProps: {
      attributes: {
        class: 'rich-text-content min-h-40 px-3 py-2 text-sm focus:outline-none',
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
    </div>
  )
}
