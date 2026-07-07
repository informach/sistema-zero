import type { ContentType } from '../publication/publication'
import type { ContentStage } from './stage'

export interface Content {
  id: string
  version: number
  title: string
  contentType: ContentType
  stage: ContentStage
  brief: string | null
  script: string | null
  ownerUserId: string | null
  ownerName: string | null
  dueDate: Date | null
  ideaId: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface StageEvent {
  id: string
  contentId: string
  fromStage: ContentStage
  toStage: ContentStage
  actorUserId: string
  actorName: string | null
  createdAt: Date
}

export type ChecklistOrigin = 'template' | 'manual'

export interface ChecklistItem {
  id: string
  contentId: string
  label: string
  done: boolean
  doneBy: string | null
  doneByName: string | null
  doneAt: Date | null
  position: number
  origin: ChecklistOrigin
  createdAt: Date
}

export interface ContentComment {
  id: string
  contentId: string
  authorUserId: string
  authorName: string | null
  body: string
  createdAt: Date
}
