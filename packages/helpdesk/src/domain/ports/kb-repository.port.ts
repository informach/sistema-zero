import type { KnowledgeEvidence, KnowledgeSearchInput } from '@sistemazero/helpdesk-contracts'
import type { KbArticle, KbChunk, KbRevision } from '../kb/kb-article'

export interface KnowledgeSearchPort {
  search(input: KnowledgeSearchInput, at: Date): Promise<KnowledgeEvidence[]>
}

export interface KbRepository extends KnowledgeSearchPort {
  create(article: KbArticle, revision: KbRevision): Promise<void>
  byId(id: string): Promise<KbArticle | null>
  saveDraft(article: KbArticle, revision: KbRevision, expectedVersion: number): Promise<boolean>
  publish(
    id: string,
    revisionId: string,
    expectedVersion: number,
    actorId: string,
    at: Date,
  ): Promise<KbArticle | null>
  withdraw(
    id: string,
    expectedVersion: number,
    archived: boolean,
    actorId: string,
    at: Date,
  ): Promise<KbArticle | null>
  list(filter: { limit: number; offset: number }): Promise<{ items: KbArticle[]; total: number }>
  revisions(articleId: string): Promise<KbRevision[]>
  claimIndex(at: Date, leaseMs: number): Promise<KbRevision | null>
  finishIndex(revisionId: string, leaseToken: string, chunks: KbChunk[], at: Date): Promise<boolean>
  failIndex(revisionId: string, leaseToken: string, at: Date): Promise<boolean>
  retryIndex(articleId: string, revisionId: string, at: Date): Promise<boolean>
}
