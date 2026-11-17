'use client'

// O CSS da oficina (`oficina-regras.css`) entra pelo `@import` em `app/globals.css` de cada app,
// DENTRO do pipeline Tailwind, logo depois do `molda.css` (a oficina é um modo do Molda).
import type { CenariosHost, RotaDosCenarios } from '@sistemazero/molda-cenarios/oficina'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { criarFonteDeMoldes, criarFonteDeTexturas } from '../../lib/cenarios-moldes'
import { createCreationsCloud } from '../../lib/creations-cloud'
import { sessionFetch } from '../../lib/session-fetch'
import { EMBEDDED_APP_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { useFocusMode } from './focus-mode'

// O pacote é só de navegador (WebGL, three): entra por `import()` num efeito, como o Molda.
type Modulo = typeof import('@sistemazero/molda-cenarios/oficina')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const id = (valor: string | null) => (valor && UUID.test(valor) ? valor.toLowerCase() : null)

/** Onde a oficina abre, lido do endereço: `?mundo=…&cenario=…`, `?biblioteca=…`, `?aba=bibliotecas`. */
export function rotaDoEndereco(consulta: URLSearchParams): RotaDosCenarios {
  const mundoId = id(consulta.get('mundo'))
  const cenarioId = id(consulta.get('cenario'))
  const bibliotecaId =
    consulta.get('biblioteca') === 'molda' ? 'molda' : id(consulta.get('biblioteca'))
  if (mundoId && cenarioId) return { tela: 'oficina', mundoId, cenarioId }
  if (bibliotecaId)
    return { tela: 'biblioteca', bibliotecaId, ...(mundoId ? { voltarAoMundo: mundoId } : {}) }
  if (mundoId) return { tela: 'mundo', mundoId }
  return { tela: 'inicio', aba: consulta.get('aba') === 'bibliotecas' ? 'bibliotecas' : 'mundos' }
}

/** O endereço de uma tela da oficina: recarregar a página volta para o mesmo lugar. */
export function enderecoDaRota(rota: RotaDosCenarios, espacoId: string): string {
  const consulta = new URLSearchParams({ espaco: espacoId })
  if (rota.tela === 'oficina') {
    consulta.set('mundo', rota.mundoId)
    consulta.set('cenario', rota.cenarioId)
  } else if (rota.tela === 'mundo') consulta.set('mundo', rota.mundoId)
  else if (rota.tela === 'biblioteca') {
    consulta.set('biblioteca', rota.bibliotecaId)
    if (rota.voltarAoMundo) consulta.set('mundo', rota.voltarAoMundo)
  } else if (rota.aba === 'bibliotecas') consulta.set('aba', 'bibliotecas')
  return `?${consulta}`
}

/**
 * Molda Cenários (a oficina de cenários 3D) dentro da comunidade, Kids e adulta. O pacote traz
 * as telas e o editor; este host entrega o cliente que fala com `/api/cenarios` (com a prova de
 * que a página ainda é da mesma pessoa), guarda a tela aberta no endereço e recolhe o menu
 * quando o editor abre.
 */
export function CenariosClient({ viewerId }: { viewerId: string | null }) {
  const [mod, setMod] = useState<Modulo | null>(null)
  const [falhou, setFalhou] = useState(false)
  const { setWorkspaceActive } = useFocusMode()
  const consulta = useSearchParams()
  // Lidos uma vez: depois quem manda é a navegação de dentro da oficina.
  const [inicio] = useState(() => ({
    rota: rotaDoEndereco(new URLSearchParams(consulta.toString())),
    espaco: id(consulta.get('espaco')),
  }))

  const carregar = useCallback(() => {
    setFalhou(false)
    import('@sistemazero/molda-cenarios/oficina').then(setMod, () => setFalhou(true))
  }, [])
  useEffect(carregar, [carregar])
  // Ao sair da página, o menu volta ao que era.
  useEffect(() => () => setWorkspaceActive(false), [setWorkspaceActive])

  const [conexao, setConexao] = useState<{ perfil: string | null; host: CenariosHost } | null>(null)
  useEffect(() => {
    if (!mod) return
    const novo = mod.criarHostHttp({
      buscar: (endereco, opcoes) => sessionFetch(endereco, opcoes),
      ...(viewerId ? { pessoaId: viewerId } : {}),
    })
    const cloud = viewerId
      ? createCreationsCloud({ tool: 'molda', viewerId, maxFormatVersion: 2 })
      : null
    if (viewerId && cloud) {
      novo.molda = criarFonteDeMoldes({ perfilId: viewerId, cloud, host: novo })
      novo.texturasMolda = criarFonteDeTexturas({ perfilId: viewerId, cloud, host: novo })
    }
    setConexao({ perfil: viewerId, host: novo })
    return () => cloud?.dispose({ abort: true })
  }, [mod, viewerId])
  const host = conexao?.perfil === viewerId ? conexao.host : null

  const aoNavegar = useCallback(
    (rota: RotaDosCenarios, espacoId: string) => {
      setWorkspaceActive(rota.tela === 'oficina')
      const endereco = enderecoDaRota(rota, espacoId)
      if (window.location.search !== endereco)
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${endereco}`,
        )
    },
    [setWorkspaceActive],
  )

  return (
    <div className={EMBEDDED_APP_FRAME}>
      {falhou ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">Não consegui carregar os cenários.</p>
            <button
              type="button"
              onClick={carregar}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : mod === null || host === null ? (
        <EmbeddedAppLoadingBody label="Carregando os cenários…" />
      ) : (
        // O wrapper dá ao `height: 100%` da oficina uma altura definida.
        <div className="flex min-h-0 flex-1 flex-col">
          <mod.CenariosOficina
            key={viewerId}
            host={host}
            rotaInicial={inicio.rota}
            {...(inicio.espaco ? { espacoInicial: inicio.espaco } : {})}
            aoNavegar={aoNavegar}
            // A oficina é um modo do Molda: a seta das telas de lista volta para ele.
            cabecalho={
              <Link
                href="/molda"
                className="sz-tool-back"
                aria-label="Voltar ao Molda"
                title="Voltar ao Molda"
              >
                <ArrowLeft aria-hidden="true" />
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}
