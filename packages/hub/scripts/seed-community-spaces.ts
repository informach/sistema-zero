/**
 * Seed IDEMPOTENTE dos servidores da comunidade kids: **Clube dos Criadores**
 * (fórum) e **Mural dos Criadores** (vitrine). O app community-kids aponta para
 * estes SLUGS FIXOS (`clube-dos-criadores`/`mural-dos-criadores`) — sem os servidores,
 * clicar no menu dá 404 `SPACE_NOT_FOUND`. Este script garante que existem (com os
 * slugs certos + 1 canal cada), sem duplicar se já existirem.
 *
 * Uso: `DATABASE_URL=... bun run db:seed-community` (dentro do Railway via `railway ssh`,
 * pois o Postgres é privado).
 *
 * **Modelo de acesso (06/2026): cada servidor é um PRODUTO INDEPENDENTE** (`community_gated`,
 * NÃO mais por curso). Cada um nasce com a SUA própria chave de comunidade (= o slug) +
 * `teaserWhenLocked` (aparece BLOQUEADO no menu sem acesso); os canais herdam (`accessConfig:
 * null`) — quem tem o produto daquele servidor vê todos os canais dele. **Clube e Mural são
 * SEPARADOS** (produtos distintos): o **Clube** (`clube-dos-criadores`) é o fórum vendável; o
 * **Mural** (`mural-dos-criadores`) é a vitrine, independente, dada de bônus no desafio do
 * primeiro jogo. A chave de cada servidor casa com o slug do produto de COMUNIDADE no
 * catálogo (quem compra o produto ganha a chave → o hub libera o servidor). O ACESSO é
 * decidido SÓ aqui (o "Quem vê"); o community-kids só mostra a tela de bloqueio quando o
 * hub devolve o servidor como teaser.
 *
 * Para um smoke test sem matrícula, rode com `SEED_PUBLIC=true` (deixa os dois públicos —
 * TROCAR para community_gated no admin antes de valer "só quem comprou"). Re-rodar é seguro.
 */
import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type { AccessConfig } from '../src/domain/access/access-config'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { channels, spaces } from '../src/infrastructure/persistence/drizzle/schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL ausente — rode dentro do Railway (railway ssh) ou exporte a env.')
  process.exit(1)
}

const SEED_PUBLIC = process.env.SEED_PUBLIC === 'true' || process.env.SEED_PUBLIC === '1'

interface SpaceSeed {
  slug: string
  name: string
  description: string
  /**
   * Chave de comunidade do PRODUTO que libera ESTE servidor (independente dos outros).
   * Convenção: = o slug. Casa com o slug do produto de comunidade no catálogo.
   */
  communityRef: string
  channel: { slug: string; name: string; postingPolicy: 'members' | 'staff_only' }
}

const SEEDS: SpaceSeed[] = [
  {
    slug: 'clube-dos-criadores',
    name: 'Clube dos Criadores',
    description: 'Converse com os colegas e mostre o que você criou! 🎉',
    communityRef: 'clube-dos-criadores',
    channel: { slug: 'geral', name: 'Geral', postingPolicy: 'members' },
  },
  {
    slug: 'mural-dos-criadores',
    name: 'Mural dos Criadores',
    description: 'A vitrine dos projetos! Curta e comente o que os colegas criaram. 🎨',
    // Produto SEPARADO do Clube (bônus do desafio do 1º jogo) → chave própria.
    communityRef: 'mural-dos-criadores',
    // Canal staff_only: a criança não posta — os projetos são auto-publicados.
    channel: { slug: 'parede', name: 'Parede', postingPolicy: 'staff_only' },
  },
]

/** Acesso de um servidor: o SEU produto de comunidade libera (ou público no smoke test). */
function accessFor(communityRef: string): AccessConfig {
  return SEED_PUBLIC
    ? { visibility: 'public', courses: [], communities: [], roles: [] }
    : { visibility: 'community_gated', courses: [], communities: [communityRef], roles: [] }
}

async function main(): Promise<void> {
  const conn = createDbConnection(DATABASE_URL as string, { max: 2 })
  try {
    for (const s of SEEDS) {
      const now = new Date()
      const access = accessFor(s.communityRef)
      // Servidor — idempotente por slug (índice único spaces_slug_uq).
      const existing = await conn.db.select().from(spaces).where(eq(spaces.slug, s.slug)).limit(1)
      let spaceId: string
      if (existing[0]) {
        spaceId = existing[0].id
        // RECONCILIA o acesso ao modelo atual (community_gated pelo SEU produto): apaga o
        // resíduo do modelo ANTIGO (course_gated por curso homônimo). Idempotente — só escreve
        // se mudou. Esses 2 slugs são infra dona do seed, então sobrescrever é seguro.
        const current = JSON.stringify(existing[0].accessConfig ?? null)
        if (current !== JSON.stringify(access)) {
          await conn.db
            .update(spaces)
            .set({ accessConfig: access, version: sql`${spaces.version} + 1`, updatedAt: now })
            .where(eq(spaces.id, spaceId))
          console.log(`~ servidor "${s.slug}" — acesso reconciliado p/ ${access.visibility}`)
        } else {
          console.log(`= servidor "${s.slug}" já existe e está no modelo certo (${spaceId})`)
        }
      } else {
        const [row] = await conn.db
          .insert(spaces)
          .values({
            id: randomUUID(),
            version: 0,
            slug: s.slug,
            name: s.name,
            description: s.description,
            iconUrl: null,
            audience: 'kids',
            accessConfig: access,
            requiresApproval: true,
            teaserWhenLocked: true,
            sortOrder: 0,
            status: 'active',
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: spaces.id })
        spaceId = (row as { id: string }).id
        console.log(`+ servidor "${s.slug}" criado (${spaceId})`)
      }

      // Canal — idempotente por (spaceId, slug). Herda o acesso do servidor.
      const ch = await conn.db
        .select({ id: channels.id })
        .from(channels)
        .where(and(eq(channels.spaceId, spaceId), eq(channels.slug, s.channel.slug)))
        .limit(1)
      if (ch[0]) {
        console.log(`  = canal "${s.channel.slug}" já existe`)
      } else {
        await conn.db.insert(channels).values({
          id: randomUUID(),
          version: 0,
          spaceId,
          slug: s.channel.slug,
          name: s.channel.name,
          topic: null,
          accessConfig: null, // herda do servidor (community_gated pelo produto daquele servidor)
          postingPolicy: s.channel.postingPolicy,
          requiresApproval: null, // herda do servidor
          sortOrder: 0,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
        console.log(`  + canal "${s.channel.slug}" (${s.channel.postingPolicy}) criado`)
      }
    }
    console.log(
      `✓ Seed da comunidade concluído (acesso: ${SEED_PUBLIC ? 'PÚBLICO' : 'community_gated — chave própria por servidor'}).`,
    )
  } finally {
    await conn.close()
  }
}

main().catch((err) => {
  console.error('✗ Falha no seed:', err)
  process.exit(1)
})
