export type IdeaStatus = 'inbox' | 'accepted' | 'discarded'

export interface Idea {
  id: string
  title: string
  notes: string | null
  source: string | null
  status: IdeaStatus
  potential: number | null
  complexity: string | null
  createdBy: string
  createdByName: string | null
  promotedContentId: string | null
  createdAt: Date
  updatedAt: Date
}
