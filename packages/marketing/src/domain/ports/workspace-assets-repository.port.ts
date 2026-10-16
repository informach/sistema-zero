import type {
  AssetLibraryPage,
  AssetManifest,
  UploadStart,
  UploadView,
} from '@sistemazero/marketing-contracts'
export interface UploadRecord {
  manifest: AssetManifest
  storageKey: string
  uploadId: string | null
  state: UploadView['state']
  error: string | null
}
export interface VerificationJob {
  id: string
  token: string
  storageKey: string
  manifest: AssetManifest
  attempt: number
}
export interface WorkspaceAssetsRepository {
  list(actorId: string, projectId: string, after?: string): Promise<AssetLibraryPage>
  allocate(actorId: string, input: UploadStart, hash: string): Promise<UploadRecord>
  get(actorId: string, projectId: string, assetId: string, write: boolean): Promise<UploadRecord>
  attach(
    actorId: string,
    projectId: string,
    assetId: string,
    uploadId: string,
  ): Promise<UploadRecord>
  verify(actorId: string, projectId: string, assetId: string): Promise<UploadRecord>
  retry(actorId: string, projectId: string, assetId: string): Promise<UploadRecord>
  claimVerification(): Promise<VerificationJob | null>
  renewVerification(job: VerificationJob): Promise<boolean>
  finishVerification(
    job: VerificationJob,
    result: { valid: boolean; error: string | null; retryable: boolean },
  ): Promise<void>
}
