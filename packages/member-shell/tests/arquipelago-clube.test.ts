import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para testar os handlers.
mock.module('server-only', () => ({}))

const { createArquipelagoClubeRoutes, CANAL_DAS_FOTOS, canalDasFotos } = await import(
  '../src/routes/arquipelago-clube'
)
const { UnsupportedImageError } = await import('../src/server/image-optimizer')

const CANAL = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  spaceId: 'ssssssss',
  slug: CANAL_DAS_FOTOS,
  name: 'Fotos do Arquipélago',
  topic: null,
  postingPolicy: 'members' as const,
  requiresApproval: true,
  hasUnread: false,
}

type Cenario = {
  audience?: 'kids' | 'adult'
  permissao?: { status: number; body: unknown }
  canais?: { status: number; body: unknown }
  topico?: 'pending' | 'visible'
  otimizarFalha?: boolean
  suporte?: boolean
}

function montar(c: Cenario = {}) {
  const chamadas: string[] = []
  const guardados: string[] = []
  const routes = createArquipelagoClubeRoutes({
    audience: c.audience ?? 'kids',
    gateway: {
      gatewayFetch: (async (caminho: string) => {
        chamadas.push(`gateway ${caminho}`)
        return c.permissao ?? { status: 200, body: { versao: 1, fotosNoClube: true } }
      }) as never,
    },
    hub: {
      listChannels: (async (slug: string) => {
        chamadas.push(`canais ${slug}`)
        return c.canais ?? { status: 200, body: { items: [CANAL] } }
      }) as never,
      registerAttachment: (async (corpo: { storageRef: string; kind: string }) => {
        chamadas.push(`anexo ${corpo.kind}`)
        expect(corpo.storageRef.startsWith('r2ugc:hub/u1/')).toBe(true)
        return { status: 201, body: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } }
      }) as never,
      createThread: (async (canal: string, corpo: { attachmentIds: string[] }) => {
        chamadas.push(`topico ${canal} ${corpo.attachmentIds.join(',')}`)
        return { status: 201, body: { status: c.topico ?? 'pending' } }
      }) as never,
    },
    media: { requireUploadSession: (async () => ({ id: 'u1' })) as never },
    session: {
      getSession: (async () =>
        c.suporte ? { id: 'u1', act: { mode: 'read' } } : { id: 'u1' }) as never,
    },
    storage: {
      put: async ({ key }) => {
        guardados.push(key)
      },
    },
    otimizar: (async () => {
      if (c.otimizarFalha) throw new UnsupportedImageError('imagem ruim')
      return {
        buffer: Buffer.from('webp'),
        contentType: 'image/webp',
        extension: 'webp',
        width: 10,
        height: 10,
        sizeBytes: 4,
      }
    }) as never,
  })
  return { routes, chamadas, guardados }
}

function foto(tipo = 'image/png', bytes = 8) {
  const form = new FormData()
  const nome = `arquipelago.${tipo.slice('image/'.length)}`
  form.append('file', new File([new Uint8Array(bytes)], nome, { type: tipo }))
  const req = new Request('http://local/api/arquipelago/clube/foto', { method: 'POST', body: form })
  // O Next recebe o tamanho do navegador; aqui o corpo já está montado.
  return new Request(req, { headers: { 'content-length': '512' } })
}

const situacao = async (r: Response) => ((await r.json()) as { situacao: string }).situacao

describe('fotos no Clube (N08b)', () => {
  test('o canal só serve aberto a membros e com aprovação prévia', () => {
    expect(canalDasFotos([CANAL])).toEqual(CANAL)
    expect(canalDasFotos([{ ...CANAL, requiresApproval: false }])).toBeNull()
    expect(canalDasFotos([{ ...CANAL, postingPolicy: 'staff_only' }])).toBeNull()
    expect(canalDasFotos([{ ...CANAL, slug: 'geral' }])).toBeNull()
  })

  test('situação: ligado só com a permissão e o canal; cada falta tem o seu nome', async () => {
    const casos: Array<[Cenario, string]> = [
      [{}, 'ligado'],
      [{ permissao: { status: 200, body: { versao: 1, fotosNoClube: false } } }, 'desligado'],
      [{ canais: { status: 403, body: null } }, 'sem-clube'],
      [{ canais: { status: 200, body: { items: [] } } }, 'sem-clube'],
      [{ permissao: { status: 503, body: null } }, 'fora-do-ar'],
      [{ permissao: { status: 200, body: { fotosNoClube: true } } }, 'fora-do-ar'],
      [{ audience: 'adult' }, 'sem-clube'],
    ]
    for (const [cenario, esperado] of casos) {
      const r = await montar(cenario).routes.arquipelagoClube.GET()
      expect(r.headers.get('cache-control')).toBe('private, no-store')
      expect(await situacao(r), JSON.stringify(cenario)).toBe(esperado)
    }
  })

  test('mandar: reencoda, guarda no UGC, registra o anexo e abre o tópico na moderação', async () => {
    const { routes, chamadas, guardados } = montar()
    const r = await routes.arquipelagoFotoNoClube.POST(foto())
    expect(r.status).toBe(201)
    expect(await situacao(r)).toBe('em-moderacao')
    expect(guardados).toHaveLength(1)
    expect(guardados[0]).toMatch(/^hub\/u1\/[0-9a-f-]+\.webp$/)
    expect(chamadas).toEqual([
      'gateway /arquipelago/clube',
      'canais clube-dos-criadores',
      'anexo image',
      `topico ${CANAL.id} aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    ])
    const equipe = await montar({ topico: 'visible' }).routes.arquipelagoFotoNoClube.POST(foto())
    expect(await situacao(equipe)).toBe('publicada')
  })

  test('sem permissão, sem canal, suporte ou arquivo estranho: nada sobe', async () => {
    const casos: Array<[Cenario, Request, number, string]> = [
      [
        { permissao: { status: 200, body: { versao: 1, fotosNoClube: false } } },
        foto(),
        403,
        'desligado',
      ],
      [{ canais: { status: 200, body: { items: [] } } }, foto(), 404, 'sem-clube'],
      [{ suporte: true }, foto(), 403, 'falhou'],
      [{}, foto('image/gif'), 400, 'falhou'],
      [{ otimizarFalha: true }, foto(), 400, 'falhou'],
    ]
    for (const [cenario, req, status, esperado] of casos) {
      const { routes, guardados, chamadas } = montar(cenario)
      const r = await routes.arquipelagoFotoNoClube.POST(req)
      expect(r.status, JSON.stringify(cenario)).toBe(status)
      expect(await situacao(r)).toBe(esperado)
      expect(guardados).toHaveLength(0)
      expect(chamadas.some((c) => c.startsWith('anexo') || c.startsWith('topico'))).toBe(false)
    }
  })
})
