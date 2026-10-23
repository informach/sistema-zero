import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { VerifiedPostService } from '../../src/application/publications/verified-post.service'
import {
  facebookPostIdentity,
  instagramShortcode,
  youtubeVideoId,
} from '../../src/domain/publication/post-url'
import type { Network } from '../../src/domain/publication/publication'
import type { SocialAccount } from '../../src/domain/social-account/social-account'
import { MetaExternalResolver } from '../../src/infrastructure/gateways/meta/meta-external-resolver'
import { YoutubeExternalResolver } from '../../src/infrastructure/gateways/youtube/youtube-external-resolver'
import { InMemorySocialAccountRepository } from '../fakes/in-memory'
import { FakeMetaApi } from '../fakes/meta'

function account(network: Network): SocialAccount {
  return {
    id: randomUUID(),
    version: 0,
    network,
    externalId: 'channel-owned',
    displayName: 'Conta de revisão',
    username: null,
    accessTokenEnc: null,
    refreshTokenEnc: null,
    tokenExpiresAt: null,
    refreshExpiresAt: null,
    scopes: [],
    status: 'connected',
    metadata: {},
    connectedBy: randomUUID(),
    lastRefreshAt: null,
    lastRefreshError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
test('links de posts verificam host, caminho e identidade sem confundir tracking ou página', () => {
  expect(youtubeVideoId('https://www.youtube.com/watch?v=abcdefghijk&t=20')).toBe('abcdefghijk')
  expect(youtubeVideoId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk')
  expect(youtubeVideoId('https://youtube.com.evil.test/watch?v=abcdefghijk')).toBeNull()
  expect(youtubeVideoId('https://example.test/shorts/abcdefghijk')).toBeNull()
  expect(instagramShortcode('https://evil.test/instagram.com/p/Real/')).toBeNull()
  expect(instagramShortcode('https://www.instagram.com/p/CaseSensitive/?igsh=tracking')).toBe(
    'CaseSensitive',
  )
  expect(facebookPostIdentity('https://www.facebook.com/photo?fbid=111&id=555')).toBe('post:111')
  expect(facebookPostIdentity('https://www.facebook.com/photo?fbid=222&id=555')).toBe('post:222')
  expect(facebookPostIdentity('https://www.facebook.com/photo?id=555')).toBeNull()
  expect(facebookPostIdentity('https://www.facebook.com/555_333')).toBe('post:333')
  expect(facebookPostIdentity('https://www.facebook.com/555')).toBeNull()
})
test('Facebook seleciona a foto correta em páginas sucessivas, sem usar id da página', async () => {
  const api = new FakeMetaApi(),
    owner = account('facebook')
  api.fbPostList = [111, 222, 333].map((id) => ({
    id: `555_${id}`,
    permalinkUrl: `https://www.facebook.com/photo?fbid=${id}&id=555`,
  }))
  const resolver = new MetaExternalResolver(api, 'facebook')
  expect(
    (
      await resolver.resolve({
        url: 'https://www.facebook.com/photo?fbid=333&id=555',
        account: owner,
        accessToken: 'test',
      })
    )?.externalPostId,
  ).toBe('555_333')
  expect(
    await resolver.resolve({
      url: 'https://www.facebook.com/photo?id=555',
      account: owner,
      accessToken: 'test',
    }),
  ).toBeNull()
  expect(api.fbPhotoCalls).toHaveLength(0)
})
test('YouTube verificado rejeita canal alheio e vídeo privado; verificação exige conta explícita', async () => {
  const accounts = new InMemorySocialAccountRepository(),
    owner = account('youtube')
  await accounts.create(owner)
  let video = { channelId: 'another-channel', privacyStatus: 'public' },
    calls = 0
  const resolver = new YoutubeExternalResolver({
    async getPublishedVideo() {
      calls++
      return video
    },
  })
  const service = new VerifiedPostService(
    accounts,
    {
      async getFreshAccessToken() {
        return 'test'
      },
    },
    new Map([['youtube', resolver]]),
  )
  const url = 'https://youtu.be/abcdefghijk'
  await expect(service.verify('youtube', randomUUID(), url)).rejects.toThrow('conta conectada')
  expect(calls).toBe(0)
  await expect(service.verify('youtube', owner.id, url)).rejects.toThrow('não foi encontrada')
  video = { channelId: owner.externalId, privacyStatus: 'private' }
  await expect(service.verify('youtube', owner.id, url)).rejects.toThrow('não foi encontrada')
  video = { ...video, privacyStatus: 'public' }
  expect(await service.verify('youtube', owner.id, url)).toEqual({
    socialAccountId: owner.id,
    accountVersion: 0,
    externalPostId: 'abcdefghijk',
    externalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  })
  const parseOnly = new VerifiedPostService(
    accounts,
    {
      async getFreshAccessToken() {
        return 'test'
      },
    },
    new Map([['youtube', new YoutubeExternalResolver()]]),
  )
  await expect(parseOnly.verify('youtube', owner.id, url)).rejects.toThrow('não está disponível')
})
