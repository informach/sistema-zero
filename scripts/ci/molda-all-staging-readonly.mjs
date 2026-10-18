const token = process.env.RAILWAY_API_TOKEN
if (!token) throw new Error('Railway authentication required')
const services = {
  'api-gateway': '2b7748bc-d3e3-4aff-bd94-3f514b53c44f',
  auth: '8c57d71d-3a8e-48f1-9627-63f1528b9a48',
  catalog: '0e59f903-6bd8-4c3e-8792-34ea7479c13c',
  payments: '1d2455ac-05cd-436b-a39d-3f07392713f3',
  members: 'aa282801-ffba-477c-af6d-394b2f4f9af9',
  messaging: '93fb9f5c-3d08-43da-a3cb-4c0207bd2ee0',
  funnel: 'a617f2d2-6a58-46a2-8669-2eaf192712f0',
  admin: 'e00eca0b-5323-4424-9b58-fdb073cfce82',
  community: '9df1b493-4cea-4b36-bec8-7299f054c17d',
  'community-kids': 'fc8a1b29-ac14-4dc9-a7b3-03d497b8bf4f',
  hub: '00b27b18-0587-460b-ba90-b6b24c423e45',
  fiscal: '2ea11afd-bdfd-4736-b400-c3db13fd8a0e',
  marketing: '7b8a87e6-a92f-4a5c-adc1-c4d2fe23b737',
  'marketing-app': '95f3752d-95f7-45ab-a52a-19aa126d77ab',
  referrals: '1ad1c5ce-977c-4d7d-95a4-b8b08f2dc258',
}
for (const [name, key] of [
  ['helpdesk', 'HELPDESK_SERVICE_ID'],
  ['helpdesk-app', 'HELPDESK_APP_SERVICE_ID'],
  ['live-recorder', 'LIVE_RECORDER_SERVICE_ID'],
]) {
  if (process.env[key]) services[name] = process.env[key]
}
for (const [service, sid] of Object.entries(services)) {
  const response = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'query($sid:String!,$eid:String!){serviceInstance(serviceId:$sid,environmentId:$eid){activeDeployments{id status meta}}}',
      variables: { sid, eid: 'f634cff6-aafb-4804-8b69-172fad4e946e' },
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Railway HTTP ${response.status}`)
  const data = await response.json()
  if (data.errors?.length) throw new Error(JSON.stringify(data.errors))
  console.log('STAGING_STATUS', JSON.stringify({
    service,
    deployments: data.data.serviceInstance.activeDeployments.map(({ id, status, meta }) => ({
      id, status, commitHash: meta?.commitHash,
    })),
  }))
}
