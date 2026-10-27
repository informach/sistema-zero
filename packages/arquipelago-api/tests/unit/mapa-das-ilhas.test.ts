import { describe, expect, mock, test } from 'bun:test'
import {
  ILHAS,
  type JornadaDosMembros,
  POSTOS_DA_JORNADA,
} from '@sistemazero/arquipelago-contracts'
import { JOURNEY_LEVEL_SLUGS } from '@sistemazero/core/journey'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { MembrosIndisponiveisError } from '../../src/domain/membros.port'
import { MembrosHttp } from '../../src/infrastructure/members/membros-http'

const jornada: JornadaDosMembros = {
  kids: { versao: 3, postos: [...JOURNEY_LEVEL_SLUGS] },
  adulto: {
    versao: 1,
    configurada: true,
    etapas: Array.from({ length: 7 }, (_, i) => ({ id: `e${i}`, titulo: `Etapa ${i}` })),
  },
}
const logger = () => ({ info: mock(), warn: mock() })

describe('mapa ilha → posto contra o core', () => {
  test('os postos do contrato são os da Jornada do Criador, na mesma ordem', () => {
    expect([...POSTOS_DA_JORNADA]).toEqual([...JOURNEY_LEVEL_SLUGS])
    expect(ILHAS.map((i) => i.posto)).toEqual([...JOURNEY_LEVEL_SLUGS])
  })
})

describe('conferência no serviço', () => {
  test('sem Members configurado fica desligada e não chama nada', async () => {
    const c = new ConferenciaDoMapa(null, logger())
    expect((await c.conferir()).situacao).toBe('desligada')
  })

  test('jornada igual ao mapa: ok', async () => {
    const log = logger()
    const c = new ConferenciaDoMapa({ lerJornada: async () => jornada }, log)
    expect(c.situacao().situacao).toBe('pendente')
    expect((await c.conferir()).situacao).toBe('ok')
    expect(log.warn).toHaveBeenCalledTimes(0)
  })

  test('jornada diferente: com problemas e aviso no log', async () => {
    const log = logger()
    const c = new ConferenciaDoMapa(
      { lerJornada: async () => ({ ...jornada, kids: { versao: 3, postos: ['noob'] } }) },
      log,
    )
    const r = await c.conferir()
    expect(r.situacao).toBe('com-problemas')
    expect(log.warn.mock.calls[0]?.[0]).toBe('arquipelago.mapa_das_ilhas_invalido')
  })

  test('Members fora: indisponível, sem derrubar nada', async () => {
    const c = new ConferenciaDoMapa(
      {
        lerJornada: async () => {
          throw new MembrosIndisponiveisError('rede')
        },
      },
      logger(),
    )
    expect((await c.conferir()).situacao).toBe('indisponivel')
  })
})

describe('adaptador HTTP do Members', () => {
  const resposta = (corpo: unknown, status = 200) =>
    mock(async () => new Response(JSON.stringify(corpo), { status }))

  test('manda o token de leitura e valida o formato', async () => {
    const f = resposta(jornada)
    const m = new MembrosHttp({
      url: 'http://members:3000',
      token: 't'.repeat(32),
      fetch: f as never,
    })
    expect(await m.lerJornada()).toEqual(jornada)
    const [url, init] = f.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(url)).toBe('http://members:3000/members/internal/arquipelago/jornada')
    expect((init.headers as Record<string, string>)['x-arquipelago-token']).toBe('t'.repeat(32))
  })

  test('status de erro, formato errado e rede caem em MembrosIndisponiveisError', async () => {
    const criar = (f: unknown) =>
      new MembrosHttp({ url: 'http://m', token: 't'.repeat(32), fetch: f as never })
    await expect(criar(resposta({}, 401)).lerJornada()).rejects.toMatchObject({
      motivo: 'status',
      status: 401,
    })
    await expect(criar(resposta({ kids: 1 })).lerJornada()).rejects.toMatchObject({
      motivo: 'formato',
    })
    await expect(
      criar(
        mock(async () => {
          throw new TypeError('fetch failed')
        }),
      ).lerJornada(),
    ).rejects.toMatchObject({ motivo: 'rede' })
  })
})
