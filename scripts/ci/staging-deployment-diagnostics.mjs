// Read-only diagnostics. Fixed staging IDs; never requests variables or issues a mutation.
const token = process.env.RAILWAY_API_TOKEN
if (!token) throw new Error('Railway authentication is required')
async function query(query, variables = {}) {
  const response = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Railway HTTP ${response.status}`)
  const result = await response.json()
  if (result.errors?.length) throw new Error(JSON.stringify(result.errors))
  return result.data
}
function summary(deployment) {
  const meta = deployment.meta ?? {}
  return {
    id: deployment.id,
    status: deployment.status,
    commitHash: meta.commitHash,
    branch: meta.branch,
    reason: meta.reason,
    removedReason: meta.removedReason,
    metadataKeys: Object.keys(meta).sort(),
  }
}
const original = await query('query($id:String!){deployment(id:$id){id status meta}}', {
  id: '94054ae4-f80b-46a6-9348-14e16be257ab',
})
console.log('Interrupted deployment:', JSON.stringify(summary(original.deployment)))
const current = await query(
  'query($sid:String!,$eid:String!){serviceInstance(serviceId:$sid,environmentId:$eid){activeDeployments{id status meta}}}',
  {
    sid: 'aa282801-ffba-477c-af6d-394b2f4f9af9',
    eid: 'f634cff6-aafb-4804-8b69-172fad4e946e',
  },
)
console.log(
  'Current staging Members:',
  JSON.stringify(current.serviceInstance.activeDeployments.map(summary)),
)
const schema = await query(
  '{__type(name:"Query"){fields{name args{name type{kind name ofType{kind name ofType{kind name}}}} type{kind name ofType{kind name ofType{kind name}}}}}}',
)
console.log(
  'Read-only log query types:',
  JSON.stringify(
    schema.__type.fields.filter((field) => ['buildLogs', 'deploymentLogs'].includes(field.name)),
  ),
)
