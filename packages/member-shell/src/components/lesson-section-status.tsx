'use client'

import type { SectionPendingItem, SectionPendingKind } from '@sistemazero/core/learning'
import {
  Award,
  Backpack,
  BookOpenText,
  type Check,
  Clapperboard,
  Code2,
  Flag,
  FlaskConical,
  Hammer,
  ListChecks,
  Lock,
  Palette,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { ADULT_LESSON_COPY, type LessonCopy } from '../lib/lesson-copy'
import { useLessonCopy } from './lesson-copy-context'

/**
 * "O que falta para seguir": a faixa do rodapé da aula (30/09/2026).
 *
 * ⭐⭐ Relato dela: as mensagens do que a criança ainda precisa fazer eram `<p>` soltos no fim do
 * conteúdo, sem ícone, sem cartão, sem estado. Decisão dela: a faixa mora no RODAPÉ FIXO, numa linha
 * acima dos botões (é a resposta a "por que o botão está travado?"), e vira verde quando a parte
 * termina. Uma linha só: o primeiro item com ícone, e um "+N" que abre os demais.
 *
 * ⚠️ Os itens vêm TIPADOS do members (`pendingItems`, com o `kind` da razão do requisito): é o
 * `kind` que escolhe o ícone e a cor. As strings `pending` continuam existindo por compatibilidade
 * (ajuda ao professor, recados), mas a faixa não as lê.
 *
 * ⚠️⚠️ Mensagem de AUTORIA ("Configure os critérios de conclusão desta seção.") é para o professor,
 * não para a criança: fora do ensaio do admin ela vira "Esta parte ainda está sendo preparada".
 *
 * Só ganchos e utilitárias sóbrias aqui (invariante 8 do CLAUDE.md): o kids veste pelos ganchos
 * `sz-lesson-status`, `sz-lesson-status-item`, `sz-lesson-status-icone`, `sz-lesson-status-lista`,
 * `sz-lesson-status-mais`, `data-state` e `data-kind`; o adulto fica com a linha sóbria.
 */

const ICONE: Record<SectionPendingKind, typeof Check> = {
  // A seção como um todo (o motivo do "Concluir aula" quando uma seção não fechou).
  SECTION_GATE_INCOMPLETE: Flag,
  VIDEO_GATE_NOT_WATCHED: Clapperboard,
  LEARNING_GATE_INCOMPLETE: FlaskConical,
  QUIZ_GATE_NOT_PASSED: ListChecks,
  STUDIO_GATE_NOT_SUBMITTED: Code2,
  STUDIO_GATE_NOT_PASSED: Code2,
  PINTA_GATE_NOT_SUBMITTED: Palette,
  MATERIAL_GATE_NOT_ACCESSED: Backpack,
  CERTIFICATE_GATE_NOT_ISSUED: Award,
  LESSON_COMING_SOON: Hammer,
  'platform-action': Sparkles,
  'project-check': Target,
  authoring: Wrench,
  locked: Lock,
  lesson: Flag,
  other: Flag,
}

/** O material do livro 3D é um requisito de material; o ícone do livro fica para quando o texto o cita. */
function iconeDe(item: SectionPendingItem) {
  if (item.kind === 'MATERIAL_GATE_NOT_ACCESSED' && /livro/i.test(item.text)) return BookOpenText
  return ICONE[item.kind] ?? Flag
}

/**
 * O texto que a CRIANÇA lê: a mensagem de autoria só sai inteira no ensaio (`preview`), e o resto
 * passa pelo vocabulário do app (`LessonCopy.itemPendente`: no Kids, "Envie o seu projeto" no
 * lugar do "para o professor" que o members manda).
 */
export function textoDoItem(
  item: SectionPendingItem,
  preview: boolean,
  copy: LessonCopy = ADULT_LESSON_COPY,
) {
  return item.kind === 'authoring' && !preview ? copy.secoes.preparando : copy.itemPendente(item)
}
/**
 * "Para seguir:" só antecede uma AÇÃO da criança. A razão da aula toda (`lesson`), a aula em
 * preparo e a mensagem de autoria são estados, não pedidos (review do lote 2, M4).
 */
const SEM_PREFIXO: ReadonlySet<SectionPendingKind> = new Set([
  'lesson',
  'LESSON_COMING_SOON',
  'authoring',
])
const prefixoDe = (item: SectionPendingItem) =>
  SEM_PREFIXO.has(item.kind) ? undefined : 'Para seguir:'

function Item({
  item,
  prefixo,
  preview,
}: {
  item: SectionPendingItem
  prefixo?: string
  preview: boolean
}) {
  const Icone = iconeDe(item)
  const texto = textoDoItem(item, preview, useLessonCopy())
  return (
    <span className="sz-lesson-status-item inline-flex items-center gap-2" data-kind={item.kind}>
      <span className="sz-lesson-status-icone inline-grid shrink-0 place-items-center" aria-hidden>
        <Icone size={16} />
      </span>
      <span>
        {prefixo ? <b className="font-semibold">{prefixo} </b> : null}
        {texto}
      </span>
    </span>
  )
}

export function LessonSectionStatus({
  items,
  completed,
  fallback,
  preview = false,
  className,
  ultima = false,
}: {
  /** O que falta na seção ATUAL, tipado pelo members. */
  items: readonly SectionPendingItem[]
  /** A seção atual já está concluída. */
  completed: boolean
  /**
   * O que o player diz quando não há itens da seção (aula legada, conta de equipe): a razão de o
   * "Concluir aula" estar travado, em TEXTO. `null` = nada a dizer.
   */
  fallback?: ReactNode
  /** No ensaio do admin as mensagens de autoria saem inteiras, para o professor. */
  preview?: boolean
  /** Só posição (o rodapé fixo centra a faixa na mesma coluna dos botões). */
  className?: string
  /** A última seção: "Pode seguir!" não faz sentido ao lado de "Concluir aula". */
  ultima?: boolean
}) {
  const copy = useLessonCopy()
  const raiz = `sz-lesson-status text-sm${className ? ` ${className}` : ''}`
  if (completed)
    return (
      <div className={raiz} data-state="pronto" role="status">
        <Item
          item={{
            kind: 'lesson',
            text: ultima ? copy.secoes.prontaUltima : copy.secoes.pronta,
          }}
          preview={preview}
        />
      </div>
    )
  const lista: SectionPendingItem[] = items.length
    ? [...items]
    : fallback
      ? [{ kind: 'lesson', text: typeof fallback === 'string' ? fallback : '' }]
      : []
  // ⚠️ Repetidos DEPOIS da troca: dois `authoring` com textos diferentes viravam duas vezes "Esta
  // parte ainda está sendo preparada" e um "+1" que abria a mesma frase (full review de 30/09, B1).
  const vistos = new Set<string>()
  const unicos = lista.filter((item) => {
    const texto = textoDoItem(item, preview, copy)
    if (vistos.has(texto)) return false
    vistos.add(texto)
    return true
  })
  if (!unicos.length) return null
  const [primeiro, ...resto] = unicos as [SectionPendingItem, ...SectionPendingItem[]]
  // Um `fallback` que não é texto (um `<p>` do player) entra como está, sem ícone.
  if (primeiro.kind === 'lesson' && !primeiro.text && fallback)
    return (
      <div className={raiz} data-state="pendente" role="status">
        {fallback}
      </div>
    )
  return (
    <div className={raiz} data-state="pendente" role="status">
      {resto.length === 0 ? (
        <Item item={primeiro} prefixo={prefixoDe(primeiro)} preview={preview} />
      ) : (
        /* ⚠️ `<details>` nativo: teclado e leitor de graça, e a linha continua sendo UMA linha
           até a criança tocar no "+N". */
        <details className="sz-lesson-status-lista">
          <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Item item={primeiro} prefixo={prefixoDe(primeiro)} preview={preview} />
            <span className="sz-lesson-status-mais shrink-0">
              +{resto.length}
              <span className="sr-only"> itens</span>
            </span>
          </summary>
          <ul className="grid gap-1">
            {resto.map((item) => (
              <li key={`${item.kind}:${item.text}`}>
                <Item item={item} preview={preview} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
