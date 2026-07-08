import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL as string, { max: 1 })
const token = process.env.INTERNAL_API_TOKEN as string
const staff = '11111111-1111-4111-8111-111111111111'
const headers = {
  'x-internal-token': token,
  'x-auth-user-id': staff,
  'x-auth-user-name': 'QA',
  'x-auth-user-role': 'staff',
  'x-auth-user-status': 'active',
  'content-type': 'application/json',
}
const jpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
)

const [content] = await sql`
  insert into marketing.contents (id, version, title, content_type, stage, created_by, created_at, updated_at)
  values (gen_random_uuid(), 0, 'QA F3 — carrossel', 'carousel', 'approved', ${staff}, now(), now())
  returning id
`
console.log('content', content.id)

for (let i = 1; i <= 3; i++) {
  const presign = await fetch('http://localhost:3011/marketing/media/presign', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filename: `arte-${i}.jpg`,
      contentType: 'image/jpeg',
      sizeBytes: jpeg.byteLength,
      contentId: content.id,
      kind: 'final',
    }),
  })
  const { assetId, uploadUrl } = (await presign.json()) as { assetId: string; uploadUrl: string }
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'image/jpeg', 'content-length': String(jpeg.byteLength) },
    body: jpeg,
  })
  const confirm = await fetch(`http://localhost:3011/marketing/media/${assetId}/confirm`, {
    method: 'POST',
    headers,
  })
  console.log(`asset ${i}: put=${put.status} confirm=${confirm.status}`)
}

const pubRes = await fetch(`http://localhost:3011/marketing/contents/${content.id}/publications`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ formats: ['ig_carousel'], caption: 'Carrossel de QA' }),
})
const pubs = (await pubRes.json()) as Array<{ id: string }>
console.log('pub', pubRes.status, pubs[0]?.id)
console.log(`URL: http://localhost:3012/conteudos/${content.id}/publicacoes/${pubs[0]?.id}`)
await sql.end()
