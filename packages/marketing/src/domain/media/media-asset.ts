export type AssetKind = 'raw' | 'final' | 'cover' | 'other'

export type AssetStatus =
  | 'pending_upload'
  | 'importing'
  | 'ready'
  | 'archiving'
  | 'archived'
  | 'failed'

export interface MediaAsset {
  id: string
  version: number
  contentId: string | null
  kind: AssetKind
  r2Key: string | null
  driveFileId: string | null
  filename: string
  contentType: string
  sizeBytes: number
  status: AssetStatus
  transferAttempts: number
  transferNextAt: Date | null
  transferError: string | null
  archivedAt: Date | null
  r2DeletedAt: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
