import type {
  KnowledgeAudience,
  KnowledgeIndexState,
  KnowledgeProduct,
} from '@sistemazero/helpdesk-contracts'

export interface KbArticle {
  id: string
  version: number
  title: string
  content: string
  draftRevisionId: string | null
  publishedRevisionId: string | null
  audience: KnowledgeAudience
  product: KnowledgeProduct
  ownerName: string
  origin: string
  validUntil: Date | null
  archived: boolean
  createdBy: string
  createdByName: string | null
  createdAt: Date
  updatedAt: Date
}

export interface KbRevision {
  id: string
  articleId: string
  number: number
  title: string
  content: string
  audience: KnowledgeAudience
  product: KnowledgeProduct
  ownerName: string
  origin: string
  validUntil: Date | null
  contentHash: string
  indexVersion: number
  indexState: KnowledgeIndexState
  indexAttempts: number
  indexNextAt: Date
  indexLeaseToken: string | null
  indexLeaseExpiresAt: Date | null
  indexError: string | null
  createdBy: string
  createdByName: string | null
  createdAt: Date
}

export interface KbChunk {
  id: string
  revisionId: string
  position: number
  section: string
  text: string
}
