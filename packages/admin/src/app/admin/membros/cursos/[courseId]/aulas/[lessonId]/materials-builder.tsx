'use client'

import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { FileUploader, type UploadedFile } from '@/components/media/file-uploader'
import { ImageUploader } from '@/components/media/image-uploader'
import {
  MATERIALS_MAX_ITEMS,
  type MaterialItem,
  type MaterialItemKind,
  type MaterialsBlock,
} from '@/lib/types'

export interface MaterialsValue {
  title: string
  items: MaterialItem[]
}

export const EMPTY_MATERIALS: MaterialsValue = { title: '', items: [] }

const ITEM_LABELS: Record<MaterialItemKind, string> = {
  file: 'Arquivo para baixar',
  image: 'Imagem',
  text: 'Recado',
  link: 'Link',
  video: 'Vídeo',
}

/**
 * Primeiro erro da lista de materiais, ou `null`. Espelha o que o members exige — é aqui que a
 * autora descobre o problema, e não na hora de publicar.
 */
export function validateMaterials(v: MaterialsValue): string | null {
  if (v.items.length === 0) return 'Adicione ao menos um material.'
  if (v.items.length > MATERIALS_MAX_ITEMS)
    return `Os materiais aceitam até ${MATERIALS_MAX_ITEMS} itens.`
  for (const item of v.items) {
    if (item.kind === 'file' && !item.attachmentId) return 'Envie o arquivo de cada item.'
    if (item.kind === 'image' && !item.url.trim()) return 'Envie a imagem de cada item.'
    if (item.kind === 'text' && !item.markdown.trim()) return 'Escreva o recado.'
    if (item.kind === 'link' && !item.label.trim()) return 'Dê um nome a cada link.'
    if ((item.kind === 'link' || item.kind === 'video') && !/^https:\/\//i.test(item.url.trim()))
      return 'Os endereços de link e de vídeo precisam começar com https://.'
  }
  return null
}

export function materialsFromContent(content: MaterialsBlock): MaterialsValue {
  return { title: content.title ?? '', items: content.items }
}

function novoItem(kind: MaterialItemKind): MaterialItem {
  const id = crypto.randomUUID()
  switch (kind) {
    case 'file':
      return { id, kind, attachmentId: '' }
    case 'image':
      return { id, kind, url: '' }
    case 'text':
      return { id, kind, markdown: '' }
    case 'link':
      return { id, kind, url: '', label: '' }
    case 'video':
      return { id, kind, url: '' }
  }
}

/**
 * **A lista de materiais complementares.**
 *
 * ⚠️⚠️ O item de ARQUIVO não guarda a URL: ele guarda o id de um anexo da aula. Por isso o
 * `onUploadFile` — quem sobe o arquivo é este formulário, mas quem cria a linha de anexo é o
 * editor, que é o dono do documento. É o mesmo movimento que o bloco de e-book já faz, e é o que
 * mantém a entrega privada (R2 privado, marca d'água por aluno) sem uma linha nova de segurança.
 *
 * ⚠️ Sem esse vaivém a autora teria de subir o arquivo numa aba e voltar aqui para escolhê-lo —
 * exatamente o passo a mais que os "materiais de apoio" tinham e que este bloco existe para tirar.
 */
export function MaterialsBuilder({
  value,
  onChange,
  onUploadFile,
  attachmentLabel,
}: {
  value: MaterialsValue
  onChange: (next: MaterialsValue) => void
  /** Sobe o arquivo, cria/atualiza o anexo da aula e devolve o id dele. */
  onUploadFile: (file: UploadedFile) => string
  /** Rótulo atual do anexo, para a autora ver qual arquivo está no item. */
  attachmentLabel: (attachmentId: string) => string | null
}) {
  const setItems = (items: MaterialItem[]) => onChange({ ...value, items })
  const patch = (id: string, change: Partial<MaterialItem>) =>
    setItems(value.items.map((i) => (i.id === id ? ({ ...i, ...change } as MaterialItem) : i)))
  const move = (index: number, direction: -1 | 1) => {
    const next = [...value.items]
    const [item] = next.splice(index, 1)
    if (item) next.splice(index + direction, 0, item)
    setItems(next)
  }

  return (
    <div className="space-y-4">
      <Field label="Nome deste bloco (opcional)">
        <Input
          value={value.title}
          maxLength={120}
          placeholder="Arquivos do Pinta"
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </Field>

      <ul className="space-y-3">
        {value.items.map((item, index) => (
          <li key={item.id} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {index + 1}. {ITEM_LABELS[item.kind]}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Mover material para cima"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Mover material para baixo"
                  disabled={index === value.items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  aria-label="Remover material"
                  onClick={() => setItems(value.items.filter((i) => i.id !== item.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {item.kind === 'file' ? (
              <>
                {item.attachmentId ? (
                  <p className="text-sm text-muted-foreground">
                    Arquivo atual: {attachmentLabel(item.attachmentId) ?? 'enviado'}
                  </p>
                ) : null}
                <FileUploader
                  label={
                    item.attachmentId
                      ? 'Clique para trocar o arquivo (até 200 MB)'
                      : 'Clique para enviar o arquivo (até 200 MB)'
                  }
                  onUploaded={(file) => patch(item.id, { attachmentId: onUploadFile(file) })}
                />
                <Field label="Nome que a criança vê (opcional)">
                  <Input
                    value={item.label ?? ''}
                    maxLength={200}
                    placeholder={attachmentLabel(item.attachmentId) ?? 'o nome do arquivo'}
                    onChange={(e) => patch(item.id, { label: e.target.value })}
                  />
                </Field>
                <Field label="Recadinho (opcional)">
                  <Input
                    value={item.note ?? ''}
                    maxLength={280}
                    onChange={(e) => patch(item.id, { note: e.target.value })}
                  />
                </Field>
              </>
            ) : null}

            {item.kind === 'image' ? (
              <>
                <ImageUploader
                  value={item.url}
                  scope="block"
                  allowManualUrl={false}
                  onChange={(url) => patch(item.id, { url })}
                />
                <Field label="Descrição para quem não enxerga">
                  <Input
                    value={item.alt ?? ''}
                    maxLength={500}
                    onChange={(e) => patch(item.id, { alt: e.target.value })}
                  />
                </Field>
                <Field label="Legenda (opcional)">
                  <Input
                    value={item.caption ?? ''}
                    maxLength={500}
                    onChange={(e) => patch(item.id, { caption: e.target.value })}
                  />
                </Field>
              </>
            ) : null}

            {item.kind === 'text' ? (
              <Field label="Recado">
                <Textarea
                  rows={3}
                  value={item.markdown}
                  maxLength={2000}
                  onChange={(e) => patch(item.id, { markdown: e.target.value })}
                />
              </Field>
            ) : null}

            {item.kind === 'link' ? (
              <>
                <Field label="Nome do link">
                  <Input
                    value={item.label}
                    maxLength={200}
                    onChange={(e) => patch(item.id, { label: e.target.value })}
                  />
                </Field>
                <Field label="Endereço (https://…)">
                  <Input
                    value={item.url}
                    maxLength={2000}
                    onChange={(e) => patch(item.id, { url: e.target.value })}
                  />
                </Field>
                <Field label="Recadinho (opcional)">
                  <Input
                    value={item.note ?? ''}
                    maxLength={280}
                    onChange={(e) => patch(item.id, { note: e.target.value })}
                  />
                </Field>
              </>
            ) : null}

            {item.kind === 'video' ? (
              <>
                <Field
                  label="Endereço do vídeo (https://…)"
                  hint="Vimeo e YouTube abrem dentro da aula. Qualquer outro endereço vira um link que abre em outra aba."
                >
                  <Input
                    value={item.url}
                    maxLength={2000}
                    onChange={(e) => patch(item.id, { url: e.target.value })}
                  />
                </Field>
                <Field label="Nome do vídeo (opcional)">
                  <Input
                    value={item.label ?? ''}
                    maxLength={200}
                    onChange={(e) => patch(item.id, { label: e.target.value })}
                  />
                </Field>
              </>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Tipo do material a acrescentar"
          value=""
          disabled={value.items.length >= MATERIALS_MAX_ITEMS}
          onChange={(e) => {
            const kind = e.target.value as MaterialItemKind
            if (kind) setItems([...value.items, novoItem(kind)])
          }}
        >
          <option value="">Acrescentar material…</option>
          {(Object.keys(ITEM_LABELS) as MaterialItemKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {ITEM_LABELS[kind]}
            </option>
          ))}
        </Select>
        <span className="text-xs text-muted-foreground">
          {value.items.length} de {MATERIALS_MAX_ITEMS}
        </span>
      </div>
    </div>
  )
}
