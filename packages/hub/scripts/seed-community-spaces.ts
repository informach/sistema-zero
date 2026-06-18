/**
 * Seed IDEMPOTENTE dos servidores da comunidade kids: **Clube dos Criadores**
 * (fórum) e **Mural dos Criadores** (vitrine). O app community-kids aponta para
 * estes SLUGS FIXOS (`clube-dos-criadores`/`mural-dos-criadores`) — sem os servidores,
 * clicar no menu dá 404 `SPACE_NOT_FOUND`. Este script garante que existem (com os
 * slugs certos + 1 canal cada), sem duplicar se já existirem.
 *
 * Uso: `DATABASE_URL=... bun run db:seed-community` (dentro do Railway via `railway ssh`,
 * pois o Postgres é privado). Os servidores nascem `course_gated` (só quem comprou o
 * curso de mesmo slug vê o conteúdo) + `teaserWhenLocked` (aparecem BLOQUEADOS no menu
 * sem acesso). Para um smoke test rápido sem matrícula, rode com `SEED_PUBLIC=true`
 * (deixa os dois públicos — TROCAR para course_gated no admin antes de valer "só quem
 * comprou"). Re-rodar é seguro (não recria o que já existe).
 */
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
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
  /** courseRef que libera o acesso (convenção: = slug do servidor). */
  courseRef: string
  channel: { slug: string; name: string; postingPolicy: 'members' | 'staff_only' }
}

const SEEDS: SpaceSeed[] = [
  {
    slug: 'clube-dos-criadores',
    name: 'Clube dos Criadores',
    description: 'Converse com os colegas e mostre o que você criou! 🎉',
    courseRef: 'clube-dos-criadores',
    channel: { slug: 'geral', name: 'Geral', postingPolicy: 'members' },
  },
  {
    slug: 'mural-dos-criadores',
    name: 'Mural dos Criadores',
    description: 'A vitrine dos projetos! Curta e comente o que os colegas criaram. 🎨',
    courseRef: 'mural-dos-criadores',
    // Canal staff_only: a criança não posta — os projetos são auto-publicados.
    channel: { slug: 'parede', name: 'Parede', postingPolicy: 'staff_only' },
  },
]

function accessFor(courseRef: string): AccessConfig {
  return SEED_PUBLIC
    ? { visibility: 'public', courses: [], roles: [] }
    : { visibility: 'course_gated', courses: [courseRef], roles: [] }
}

async function main(): Promise<void> {
  const conn = createDbConnection(DATABASE_URL as string, { max: 2 })
  try {
    for (const s of SEEDS) {
      const now = new Date()
      // Servidor — idempotente por slug (índice único spaces_slug_uq).
      const existing = await conn.db.select().from(spaces).where(eq(spaces.slug, s.slug)).limit(1)
      let spaceId: string
      if (existing[0]) {
        spaceId = existing[0].id
        console.log(`= servidor "${s.slug}" já existe (${spaceId})`)
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
            accessConfig: accessFor(s.courseRef),
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

      // Canal — idempotente por (spaceId, slug).
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
          accessConfig: null, // herda do servidor
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
      `✓ Seed da comunidade concluído (acesso: ${SEED_PUBLIC ? 'PÚBLICO' : 'course_gated'}).`,
    )
  } finally {
    await conn.close()
  }
}

main().catch((err) => {
  console.error('✗ Falha no seed:', err)
  process.exit(1)
})
