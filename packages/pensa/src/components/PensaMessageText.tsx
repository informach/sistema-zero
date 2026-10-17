import type { ReactNode } from 'react'

/** Render only plain text and links to the product's internal help/course routes. */
export function PensaMessageText({ text }: { text: string }) {
  const content: ReactNode[] = []
  const link = /\[([^\]\n]{1,200})\]\((\/(?!\/)[^\s)]{1,1500})\)/g
  let offset = 0
  for (const match of text.matchAll(link)) {
    const [whole, label, href] = match
    if (
      match.index === undefined ||
      !label ||
      !href ||
      !/^\/(cursos|ajuda|estudio|pinta|molda)(\/|\?|$)/.test(href)
    )
      continue
    content.push(
      text.slice(offset, match.index),
      <a key={`${match.index}:${href}`} href={href}>
        {label}
      </a>,
    )
    offset = match.index + whole.length
  }
  content.push(text.slice(offset))
  return <p>{content}</p>
}
