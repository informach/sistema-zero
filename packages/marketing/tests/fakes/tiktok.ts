import type {
  TikTokApi,
  TikTokApiError,
  TikTokPublishStatus,
} from '../../src/infrastructure/gateways/tiktok/tiktok-api.port'

interface StatusScript {
  status: TikTokPublishStatus
  failReason?: string
  postIds?: string[]
  uploadedBytes?: number
}

/**
 * TikTokApi roteirizável: `statusScript` por publishId (consumido em ordem, o
 * último repete) + contadores p/ os testes de idempotência/retomada. Sem
 * roteiro, o status default é PUBLISH_COMPLETE com post `post-<publishId>`.
 */
export class FakeTikTokApi implements TikTokApi {
  creatorInfo: { privacyLevelOptions: string[]; maxVideoPostDurationSec: number | null } = {
    privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
    maxVideoPostDurationSec: 600,
  }
  creatorInfoCalls = 0
  initCalls: Array<{
    title: string
    privacyLevel: string
    videoSize: number
    chunkSize: number
    totalChunkCount: number
  }> = []
  uploadCalls: Array<{ start: number; byteLength: number; uploadUrl: string }> = []
  statusCalls: string[] = []
  statusScript = new Map<string, StatusScript[]>()
  failInitWith: TikTokApiError | null = null
  failUploadWith: TikTokApiError | null = null
  private seq = 0

  async queryCreatorInfo(): Promise<{
    privacyLevelOptions: string[]
    maxVideoPostDurationSec: number | null
  }> {
    this.creatorInfoCalls += 1
    return structuredClone(this.creatorInfo)
  }

  async initVideoPost(input: {
    accessToken: string
    title: string
    privacyLevel: string
    videoSize: number
    chunkSize: number
    totalChunkCount: number
  }): Promise<{ publishId: string; uploadUrl: string }> {
    if (this.failInitWith) throw this.failInitWith
    this.initCalls.push({
      title: input.title,
      privacyLevel: input.privacyLevel,
      videoSize: input.videoSize,
      chunkSize: input.chunkSize,
      totalChunkCount: input.totalChunkCount,
    })
    const publishId = `publish-${++this.seq}`
    return { publishId, uploadUrl: `https://upload.tiktok.example/${publishId}` }
  }

  async uploadChunk(input: {
    uploadUrl: string
    chunk: Uint8Array
    start: number
    totalBytes: number
    contentType: string
  }): Promise<{ complete: boolean }> {
    if (this.failUploadWith) throw this.failUploadWith
    this.uploadCalls.push({
      start: input.start,
      byteLength: input.chunk.byteLength,
      uploadUrl: input.uploadUrl,
    })
    const complete = input.start + input.chunk.byteLength >= input.totalBytes
    return { complete }
  }

  async fetchPublishStatus(input: { accessToken: string; publishId: string }): Promise<{
    status: TikTokPublishStatus
    failReason: string | null
    postIds: string[]
    uploadedBytes: number | null
  }> {
    this.statusCalls.push(input.publishId)
    const script = this.statusScript.get(input.publishId)
    const entry =
      script && script.length > 0
        ? script.length > 1
          ? (script.shift() as StatusScript)
          : (script[0] as StatusScript)
        : { status: 'PUBLISH_COMPLETE' as const, postIds: [`post-${input.publishId}`] }
    return {
      status: entry.status,
      failReason: entry.failReason ?? null,
      postIds: entry.postIds ?? [],
      uploadedBytes: entry.uploadedBytes ?? null,
    }
  }
}
