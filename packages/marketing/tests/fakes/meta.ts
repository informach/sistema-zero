import type {
  IgContainerStatus,
  MetaApi,
  MetaApiError,
} from '../../src/infrastructure/gateways/meta/meta-api.port'

/**
 * MetaApi roteirizável: `statusScript` por container (consumido em ordem, o
 * último status repete) + contadores de chamadas p/ os testes de idempotência.
 */
export class FakeMetaApi implements MetaApi {
  createCalls: Array<{ igUserId: string; params: Record<string, string> }> = []
  publishCalls: string[] = []
  fbPhotoCalls: Array<{ pageId: string; imageUrl: string; caption: string }> = []
  fbVideoCalls: Array<{ pageId: string; fileUrl: string; description: string }> = []
  /** Roteiro de status por containerId; sem roteiro → FINISHED direto. */
  statusScript = new Map<string, IgContainerStatus[]>()
  failCreateWith: MetaApiError | null = null
  failPublishWith: MetaApiError | null = null
  failFbWith: MetaApiError | null = null
  permalink: string | null = 'https://www.instagram.com/p/ABC123/'
  private seq = 0

  async createIgContainer(input: {
    accessToken: string
    igUserId: string
    params: Record<string, string>
  }): Promise<string> {
    if (this.failCreateWith) throw this.failCreateWith
    this.createCalls.push({ igUserId: input.igUserId, params: input.params })
    return `container-${++this.seq}`
  }

  async getIgContainerStatus(input: {
    accessToken: string
    containerId: string
  }): Promise<IgContainerStatus> {
    const script = this.statusScript.get(input.containerId)
    if (!script || script.length === 0) return 'FINISHED'
    const status = script.length > 1 ? script.shift() : script[0]
    return status ?? 'FINISHED'
  }

  async publishIgContainer(input: {
    accessToken: string
    igUserId: string
    creationId: string
  }): Promise<string> {
    if (this.failPublishWith) throw this.failPublishWith
    this.publishCalls.push(input.creationId)
    return `media-${input.creationId}`
  }

  async getIgMediaPermalink(): Promise<string | null> {
    return this.permalink
  }

  async createFbPhotoPost(input: {
    accessToken: string
    pageId: string
    imageUrl: string
    caption: string
  }): Promise<string> {
    if (this.failFbWith) throw this.failFbWith
    this.fbPhotoCalls.push({
      pageId: input.pageId,
      imageUrl: input.imageUrl,
      caption: input.caption,
    })
    return `${input.pageId}_post${++this.seq}`
  }

  async createFbVideoPost(input: {
    accessToken: string
    pageId: string
    fileUrl: string
    description: string
  }): Promise<string> {
    if (this.failFbWith) throw this.failFbWith
    this.fbVideoCalls.push({
      pageId: input.pageId,
      fileUrl: input.fileUrl,
      description: input.description,
    })
    return `video-${++this.seq}`
  }
}
