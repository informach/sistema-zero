import { describe, expect, test } from 'bun:test'
import { attachAuthorAvatars, collectAuthorIds, redactAuthors } from '../src/lib/hub-redact'

const ME = 'user-me'
const OTHER = 'user-other'

describe('redactAuthors', () => {
  test('item único: mantém o authorId do PRÓPRIO viewer', () => {
    const out = redactAuthors({ id: 't1', authorId: ME, title: 'oi' }, ME)
    expect(out.authorId).toBe(ME)
  })

  test('item único: redige (null) o authorId de TERCEIRO, preservando o resto', () => {
    const out = redactAuthors({ id: 't1', authorId: OTHER, title: 'oi' }, ME)
    expect(out.authorId).toBeNull()
    expect(out.title).toBe('oi')
  })

  test('viewer null (sem sessão) → redige TUDO, inclusive o que seria próprio', () => {
    expect(redactAuthors({ authorId: ME }, null).authorId).toBeNull()
    expect(redactAuthors({ authorId: OTHER }, null).authorId).toBeNull()
  })

  test('página: redige cada item e preserva os metadados do cursor', () => {
    const out = redactAuthors(
      {
        items: [
          { id: 'a', authorId: ME },
          { id: 'b', authorId: OTHER },
        ],
        nextCursor: 'cur',
        hasMore: true,
      },
      ME,
    )
    expect(out.items[0]?.authorId).toBe(ME)
    expect(out.items[1]?.authorId).toBeNull()
    expect(out.nextCursor).toBe('cur')
    expect(out.hasMore).toBe(true)
  })

  test('envelope de erro (sem authorId/items) passa intacto', () => {
    const err = { error: { code: 'POSTING_NOT_ALLOWED' } }
    expect(redactAuthors(err, ME)).toEqual(err)
  })

  test('body null/undefined/primitivo → devolve como veio', () => {
    expect(redactAuthors(null, ME)).toBeNull()
    expect(redactAuthors(undefined, ME)).toBeUndefined()
    expect(redactAuthors('x', ME)).toBe('x')
  })

  test('NÃO muta o input ao redigir (cópia rasa, original intacto)', () => {
    const input = { authorId: OTHER }
    const out = redactAuthors(input, ME)
    expect(input.authorId).toBe(OTHER)
    expect(out).not.toBe(input)
  })

  test('item já do viewer volta por referência (sem cópia desnecessária)', () => {
    const input = { authorId: ME }
    expect(redactAuthors(input, ME)).toBe(input)
  })

  test('vitrine: autor terceiro privado perde authorId e authorDisplayName', () => {
    const out = redactAuthors(
      {
        id: 'p1',
        authorId: OTHER,
        isShowcase: true,
        authorPublic: false,
        authorDisplayName: 'Sofia',
        title: 'Meu Jogo',
      },
      ME,
    ) as {
      authorId: string | null
      authorProfileId?: string | null
      authorDisplayName?: string | null
      title: string
    }
    expect(out.authorId).toBeNull()
    expect(out.authorProfileId).toBeNull()
    expect(out.authorDisplayName).toBeNull()
    expect(out.title).toBe('Meu Jogo')
  })

  test('vitrine do Estúdio: o playId sobrevive à redação (alimenta o "Acessar")', () => {
    const out = redactAuthors(
      { id: 'p1', authorId: OTHER, isShowcase: true, playId: 'play-uuid' },
      ME,
    )
    expect(out.authorId).toBeNull()
    expect(out.playId).toBe('play-uuid')
  })

  test('playsCount e challengeKey (estruturais) sobrevivem à redação', () => {
    const out = redactAuthors(
      {
        id: 'p1',
        authorId: OTHER,
        isShowcase: true,
        playId: 'play-uuid',
        playsCount: 42,
        challengeKey: 'm:2026-07',
      },
      ME,
    )
    expect(out.authorId).toBeNull()
    expect(out.playsCount).toBe(42)
    expect(out.challengeKey).toBe('m:2026-07')
  })

  test('studioMeta (estrutural — selo de nível do remix) sobrevive à redação', () => {
    const out = redactAuthors(
      {
        id: 'p1',
        authorId: OTHER,
        isShowcase: true,
        playId: 'play-uuid',
        studioMeta: { pro: false, extensions: ['world-3d'] },
      },
      ME,
    )
    expect(out.authorId).toBeNull()
    expect(out.studioMeta).toEqual({ pro: false, extensions: ['world-3d'] })
  })

  test('autor PÚBLICO (opt-in dos pais): expõe authorProfileId (alvo do link) + nome', () => {
    const out = redactAuthors(
      { id: 't1', authorId: OTHER as string | null, authorPublic: true, authorDisplayName: 'Lia' },
      ME,
    ) as { authorId: string | null; authorProfileId?: string | null; authorDisplayName?: string }
    // authorId cru some, mas o id do perfil sai como alvo do link p/ /crianca/[id].
    expect(out.authorId).toBeNull()
    expect(out.authorProfileId).toBe(OTHER)
    expect(out.authorDisplayName).toBe('Lia')
  })

  test('autor NÃO público: sem authorProfileId e sem authorDisplayName', () => {
    const out = redactAuthors(
      { id: 't1', authorId: OTHER as string | null, authorPublic: false, authorDisplayName: 'Lia' },
      ME,
    ) as {
      authorId: string | null
      authorProfileId?: string | null
      authorDisplayName?: string | null
    }
    expect(out.authorId).toBeNull()
    expect(out.authorProfileId).toBeNull()
    expect(out.authorDisplayName).toBeNull()
  })

  test('autor público SENDO o próprio viewer → volta intacto (a UI mostra "Você", sem link)', () => {
    const input = { authorId: ME, authorPublic: true, authorDisplayName: 'Eu' }
    expect(redactAuthors(input, ME)).toBe(input)
  })

  // ── revealNames (Clube kids): 1º nome de TODOS, link ainda gated no opt-in ──
  test('revealNames: autor NÃO público mantém o 1º nome, mas SEM authorProfileId (link)', () => {
    const out = redactAuthors(
      { id: 't1', authorId: OTHER as string | null, authorPublic: false, authorDisplayName: 'Lia' },
      ME,
      true,
    ) as {
      authorId: string | null
      authorProfileId?: string | null
      authorDisplayName?: string | null
    }
    expect(out.authorId).toBeNull() // id cru segue redigido
    expect(out.authorDisplayName).toBe('Lia') // nome revelado (kids)
    expect(out.authorProfileId).toBeNull() // link ao perfil público SÓ com opt-in
  })

  test('revealNames: autor público mantém nome E o alvo do link (authorProfileId)', () => {
    const out = redactAuthors(
      { id: 't1', authorId: OTHER as string | null, authorPublic: true, authorDisplayName: 'Lia' },
      ME,
      true,
    ) as { authorId: string | null; authorProfileId?: string | null; authorDisplayName?: string }
    expect(out.authorProfileId).toBe(OTHER)
    expect(out.authorDisplayName).toBe('Lia')
  })
})

describe('collectAuthorIds', () => {
  test('coleta os authorId CRUS distintos de uma página (ignora null/ausente)', () => {
    const ids = collectAuthorIds({
      items: [{ authorId: ME }, { authorId: OTHER }, { authorId: OTHER }, { authorId: null }, {}],
    })
    expect([...ids].sort()).toEqual([ME, OTHER].sort())
  })

  test('item único / envelope de erro / primitivo → não explode', () => {
    expect([...collectAuthorIds({ authorId: OTHER })]).toEqual([OTHER])
    expect([...collectAuthorIds({ error: { code: 'X' } })]).toEqual([])
    expect([...collectAuthorIds(null)]).toEqual([])
  })
})

describe('attachAuthorAvatars', () => {
  const AVATARS = {
    [ME]: { photoUrl: 'https://r2/me.webp', level: 'god' },
    [OTHER]: { photoUrl: null, level: 'noob' },
  }

  test('anexa avatar+nível pelo authorId CRU; sobrevive à redação posterior', () => {
    const enriched = attachAuthorAvatars({ id: 't', authorId: OTHER }, AVATARS) as {
      authorAvatarUrl?: string | null
      authorLevel?: string | null
    }
    expect(enriched.authorLevel).toBe('noob')
    // Depois de redigir, o avatar/nível continuam (são estruturais, `...item`).
    const redacted = redactAuthors(enriched, ME, true) as {
      authorId: string | null
      authorLevel?: string | null
    }
    expect(redacted.authorId).toBeNull()
    expect(redacted.authorLevel).toBe('noob')
  })

  test('página: enriquece cada item; autor fora do mapa fica intacto', () => {
    const out = attachAuthorAvatars(
      { items: [{ authorId: ME }, { authorId: 'desconhecido' }] },
      AVATARS,
    ) as { items: { authorAvatarUrl?: string | null; authorLevel?: string | null }[] }
    expect(out.items[0]?.authorLevel).toBe('god')
    expect(out.items[1]?.authorLevel).toBeUndefined()
  })
})
