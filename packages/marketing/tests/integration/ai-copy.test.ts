import { describe, expect, it } from 'bun:test'
import type { ContentDetailView } from '../../src/application/mappers/views'
import { AiCopyError } from '../../src/infrastructure/gateways/ai/ai-copy.port'
import { buildTestApp, request, type TestApp } from '../helpers'
import { createContent } from './contents.test'

async function newContent(t: TestApp): Promise<ContentDetailView> {
  const content = await createContent(t.app)
  // Dá roteiro/briefing p/ o modo generate ter material.
  await request(t.app, 'PATCH', `/marketing/contents/${content.id}`, {
    body: {
      brief: 'Ângulo: quem adia a conversa difícil.',
      script: 'Gancho forte. Desenvolvimento com tese. Chamada para ação.',
      version: content.version,
    },
  })
  return content
}

describe('GET /marketing/ai/status', () => {
  it('reflete se a IA está configurada', async () => {
    const t = buildTestApp()
    t.aiCopyClient.configured = true
    const res = await request(t.app, 'GET', '/marketing/ai/status')
    expect(res.status).toBe(200)
    expect((await res.json()) as { configured: boolean }).toEqual({ configured: true })

    t.aiCopyClient.configured = false
    const off = await request(t.app, 'GET', '/marketing/ai/status')
    expect((await off.json()) as { configured: boolean }).toEqual({ configured: false })
  })
})

describe('POST /marketing/ai/caption', () => {
  it('generate: lê o conteúdo, normaliza hashtags e respeita o teto do IG (30)', async () => {
    const t = buildTestApp()
    const content = await newContent(t)
    t.aiCopyClient.next = {
      caption: 'Você adia a conversa que trava sua carreira há meses.',
      hashtags: ['#carreira', 'produtividade', ''], // "#" e vazio são limpos
      notes: ['Foquei na dor, sem citar o produto.'],
    }
    const res = await request(t.app, 'POST', '/marketing/ai/caption', {
      body: { contentId: content.id, format: 'ig_feed', mode: 'generate' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { caption: string; hashtags: string[]; notes: string[] }
    expect(body.caption).toContain('conversa que trava')
    expect(body.hashtags).toEqual(['carreira', 'produtividade'])
    expect(body.notes).toHaveLength(1)
    // O prompt levou o material do conteúdo (roteiro).
    expect(t.aiCopyClient.calls[0]?.user).toContain('Chamada para ação')
  })

  it('improve manda a legenda atual + os achados do linter mecânico no prompt', async () => {
    const t = buildTestApp()
    t.aiCopyClient.next = { caption: 'Legenda limpa.', hashtags: [], notes: ['Tirei o travessão.'] }
    const res = await request(t.app, 'POST', '/marketing/ai/caption', {
      body: { format: 'tt_video', mode: 'improve', caption: 'Compre agora — de verdade!' },
    })
    expect(res.status).toBe(200)
    const prompt = t.aiCopyClient.calls[0]?.user ?? ''
    expect(prompt).toContain('Compre agora')
    // O linter já apontou travessão (1) e exclamação (2) — vão como dica.
    expect(prompt).toContain('Travessão')
    expect(prompt).toContain('Exclamação')
  })

  it('generate sem conteúdo → 400; improve sem legenda → 400', async () => {
    const t = buildTestApp()
    const semConteudo = await request(t.app, 'POST', '/marketing/ai/caption', {
      body: { format: 'ig_feed', mode: 'generate' },
    })
    expect(semConteudo.status).toBe(400)
    const semLegenda = await request(t.app, 'POST', '/marketing/ai/caption', {
      body: { format: 'ig_feed', mode: 'improve', caption: '   ' },
    })
    expect(semLegenda.status).toBe(400)
  })

  it('sem chave → 503 AI_NOT_CONFIGURED; upstream falho → 502 AI_UNAVAILABLE', async () => {
    const t = buildTestApp()
    t.aiCopyClient.configured = false
    const off = await request(t.app, 'POST', '/marketing/ai/caption', {
      body: { format: 'ig_feed', mode: 'improve', caption: 'Oi' },
    })
    expect(off.status).toBe(503)
    expect(((await off.json()) as { error: { code: string } }).error.code).toBe('AI_NOT_CONFIGURED')

    t.aiCopyClient.configured = true
    t.aiCopyClient.failWith = new AiCopyError('down', 'unavailable')
    const down = await request(t.app, 'POST', '/marketing/ai/caption', {
      body: { format: 'ig_feed', mode: 'improve', caption: 'Oi' },
    })
    expect(down.status).toBe(502)
    expect(((await down.json()) as { error: { code: string } }).error.code).toBe('AI_UNAVAILABLE')
  })
})

describe('POST /marketing/ai/script', () => {
  it('generate lê título+briefing; improve reescreve o roteiro dado', async () => {
    const t = buildTestApp()
    const content = await newContent(t)
    t.aiCopyClient.next = { script: 'Roteiro afiado.', notes: ['Comecei com gancho.'] }
    const gen = await request(t.app, 'POST', '/marketing/ai/script', {
      body: { contentId: content.id, mode: 'generate' },
    })
    expect(gen.status).toBe(200)
    expect(((await gen.json()) as { script: string }).script).toBe('Roteiro afiado.')
    expect(t.aiCopyClient.calls[0]?.user).toContain('Briefing')

    t.aiCopyClient.next = { script: 'Melhor ainda.', notes: [] }
    const imp = await request(t.app, 'POST', '/marketing/ai/script', {
      body: { mode: 'improve', script: 'roteiro cru', instruction: 'foca no gancho' },
    })
    expect(imp.status).toBe(200)
    expect(t.aiCopyClient.calls[1]?.user).toContain('roteiro cru')
    expect(t.aiCopyClient.calls[1]?.system).toContain('foca no gancho')
  })
})
