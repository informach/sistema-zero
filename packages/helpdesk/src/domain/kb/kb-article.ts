/** Artigo da base de conhecimento (markdown). Só os PUBLICADOS entram no prompt da IA. */
export interface KbArticle {
  id: string
  version: number
  title: string
  content: string
  published: boolean
  createdBy: string
  createdByName: string | null
  createdAt: Date
  updatedAt: Date
}
