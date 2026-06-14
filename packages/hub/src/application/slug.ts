/** Slug a partir de um título livre (sem acento, minúsculo, kebab). */
function slugify(text: string): string {
  return (
    text
      .normalize('NFKD')
      // remove diacríticos combinantes (ã → a)
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'topico'
  )
}

/** Slug ÚNICO por construção: `<slug-do-título>-<8 do uuid>` (sem corrida de colisão). */
export function threadSlug(title: string, id: string): string {
  return `${slugify(title)}-${id.slice(0, 8)}`
}
