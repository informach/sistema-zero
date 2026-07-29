'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Textarea } from '@sistemazero/ui/textarea'
import { BookMarked, ChevronDown, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * Modelos de resposta do professor (snippets reutilizáveis nos Recados/Entregas) —
 * v1 em `localStorage` (mesmo padrão do clipboard de config do Estúdio): por
 * NAVEGADOR/dispositivo, sem backend. Com 2-3 operadores é suficiente; se um dia
 * precisar compartilhar entre professores, migra pro members. Corpo é markdown
 * (o editor rico das respostas aceita a string direto).
 */
export interface ReplyTemplate {
  id: string
  title: string
  body: string
}

const KEY = 'sz:admin:reply-templates'
const MAX_TEMPLATES = 20

function readTemplates(): ReplyTemplate[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (t): t is ReplyTemplate =>
          Boolean(t) &&
          typeof (t as ReplyTemplate).id === 'string' &&
          typeof (t as ReplyTemplate).title === 'string' &&
          typeof (t as ReplyTemplate).body === 'string',
      )
      .slice(0, MAX_TEMPLATES)
  } catch {
    return []
  }
}

function writeTemplates(templates: ReplyTemplate[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(templates.slice(0, MAX_TEMPLATES)))
  } catch {
    // localStorage cheio/indisponível — os modelos só não persistem.
  }
}

/**
 * Dropdown "Modelos" ao lado do editor de resposta: escolher INSERE o corpo no
 * campo (substitui se vazio, anexa com linha em branco se já há texto) +
 * "Gerenciar modelos" (criar/apagar, com "salvar a resposta atual como modelo").
 */
export function ReplyTemplatesMenu({
  value,
  onChange,
}: {
  /** Conteúdo atual do campo de resposta (p/ anexar e p/ "salvar como modelo"). */
  value: string
  onChange: (next: string) => void
}) {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [managing, setManaging] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setTemplates(readTemplates())
  }, [])

  // Fecha o menu num clique fora / Esc (padrão leve — não é um Dialog).
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const insert = (t: ReplyTemplate) => {
    onChange(value.trim() ? `${value}\n\n${t.body}` : t.body)
    setMenuOpen(false)
  }

  const save = (next: ReplyTemplate[]) => {
    setTemplates(next)
    writeTemplates(next)
  }

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <BookMarked className="size-4" /> Modelos <ChevronDown className="size-3.5" />
      </Button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-30 mb-1 w-64 rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {templates.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum modelo salvo ainda.</p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                role="menuitem"
                onClick={() => insert(t)}
                className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                title={t.body}
              >
                {t.title}
              </button>
            ))
          )}
          <div className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                setManaging(true)
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
            >
              Gerenciar modelos…
            </button>
          </div>
        </div>
      ) : null}
      {managing ? (
        <ManageTemplatesDialog
          templates={templates}
          currentReply={value}
          onSave={save}
          onClose={() => setManaging(false)}
        />
      ) : null}
    </div>
  )
}

function ManageTemplatesDialog({
  templates,
  currentReply,
  onSave,
  onClose,
}: {
  templates: ReplyTemplate[]
  currentReply: string
  onSave: (next: ReplyTemplate[]) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const add = () => {
    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    if (!cleanTitle || !cleanBody) {
      toast.error('Preencha o nome e o texto do modelo.')
      return
    }
    if (templates.length >= MAX_TEMPLATES) {
      toast.error(`Máximo de ${MAX_TEMPLATES} modelos — apague um antes.`)
      return
    }
    onSave([...templates, { id: crypto.randomUUID(), title: cleanTitle, body: cleanBody }])
    setTitle('')
    setBody('')
    toast.success('Modelo salvo neste navegador.')
  }

  return (
    <Dialog open onClose={onClose} title="Modelos de resposta" className="max-w-lg">
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Modelos ficam neste navegador (não sincronizam entre professores/dispositivos).
        </p>

        {templates.length > 0 ? (
          <ul className="space-y-1">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.body}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Apagar o modelo ${t.title}`}
                  onClick={() => onSave(templates.filter((x) => x.id !== t.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-2 rounded-lg border border-border p-3">
          <Field label="Nome do modelo" htmlFor="tpl-title">
            <Input
              id="tpl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Pedir para revisar o laço"
              maxLength={80}
            />
          </Field>
          <Field label="Texto (markdown)" htmlFor="tpl-body">
            <Textarea
              id="tpl-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="O texto que será inserido na resposta…"
            />
          </Field>
          <div className="flex items-center justify-between gap-2">
            {currentReply.trim() ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBody(currentReply)}
              >
                Usar a resposta atual como texto
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" size="sm" onClick={add}>
              Salvar modelo
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
