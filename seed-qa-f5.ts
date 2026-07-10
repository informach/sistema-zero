import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL as string, { max: 1 })
const staff = '11111111-1111-4111-8111-111111111111'
const [content] = await sql`
  insert into marketing.contents (id, version, title, content_type, stage, brief, script, created_by, created_at, updated_at)
  values (gen_random_uuid(), 0, 'QA F5 — legenda com IA', 'reels', 'approved',
          'Ângulo: quem adia a conversa difícil no trabalho.', 'Gancho. Tese. CTA.', ${staff}, now(), now())
  returning id
`
const [pub] = await sql`
  insert into marketing.publications
    (id, version, content_id, network, format, caption, tags, publish_mode, status, attempts,
     provider_session, created_at, updated_at)
  values (gen_random_uuid(), 0, ${content.id}, 'instagram', 'ig_feed',
          'Compre já — de verdade!', '{}', 'manual', 'draft', 0, '{}', now(), now())
  returning id
`
console.log(`URL: http://localhost:3012/conteudos/${content.id}/publicacoes/${pub.id}`)
console.log(`CONTENT: http://localhost:3012/conteudos/${content.id}`)
await sql.end()
