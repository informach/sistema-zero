import { mock } from 'bun:test'
mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key'
const { buildStudioZappyPrompt, deterministicZappyReply, invalidStudioZappyAnswerReason } = await import('../packages/member-shell/src/server/zappy-ai')
const { resolveStudioTier } = await import('../packages/member-shell/src/lib/studio-tier')
const prompt = buildStudioZappyPrompt({
  question: 'Como faço o personagem andar?',
  context: { projectId: 'audit-pro', kind: 'pro', mode: 'code', blocks: [], installedExtensions: [], selectedBlockId: null, lastError: null, code: [{ path: 'src/main.ts', content: "import * as THREE from 'three'" }] },
  tier: resolveStudioTier('god', 'staff'),
})
const forbidden = ['selecionar o bloco', 'apontando o bloco', 'Cite no texto somente blocos', 'RECEITAS INTERNAS DE MECÂNICAS']
const answer = (text: string) => ({ text, scope: 'answer', blockReferences: [], lessonReferences: [], helpReferences: [], suggestions: [] }) as any
console.log(JSON.stringify({
  proRulePresent: prompt.system.includes('MODO PRO'),
  contradictoryRules: forbidden.filter(x => prompt.system.includes(x)),
  proBlockSuggestionRejected: invalidStudioZappyAnswerReason(answer('Arraste o bloco para a área Ao iniciar.'), 'code'),
  normalTerminalSuggestionRejected: invalidStudioZappyAnswerReason(answer('Abra o terminal e execute npm install three.'), 'blocks'),
  normalTextualProgrammingSuggestionRejected: invalidStudioZappyAnswerReason(answer('Escreva JavaScript no arquivo main.js para mover o personagem.'), 'blocks'),
  proInstallCommandRejected: invalidStudioZappyAnswerReason(answer('npm install three'), 'code'),
  fixedReply: deterministicZappyReply('Qual a previsão do tempo?')?.text,
}, null, 2))
