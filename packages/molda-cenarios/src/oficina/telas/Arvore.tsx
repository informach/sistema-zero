import type {
  DocumentoDeCenario,
  EntidadeOrganizavel,
  indiceDaOrganizacao,
} from '@sistemazero/molda-cenarios-core/v2'
import { Box, ChevronDown, ChevronRight, Eye, EyeOff, Folder, Lock, LockOpen } from 'lucide-react'
import { type JSX, type KeyboardEvent, useId, useMemo, useRef, useState } from 'react'

const ALTURA = 48
const VISTA = 336
const ARRASTO = 'application/x-sz-cenario-nos'
const normalizar = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')

export function Arvore({
  documento,
  indice,
  busca,
  selecao,
  alvo,
  escolher,
  mover,
  alterar,
}: {
  documento: DocumentoDeCenario
  indice: ReturnType<typeof indiceDaOrganizacao>
  busca: string
  selecao: readonly string[]
  alvo: string | null
  escolher(id: string, somar: boolean): void
  mover(ids: readonly string[], grupo: string | null): boolean
  alterar(id: string, a: { bloqueado?: boolean; oculto?: boolean }): boolean
}): JSX.Element {
  const [recolhidas, setRecolhidas] = useState<ReadonlySet<string>>(() => new Set())
  const [topo, setTopo] = useState(0)
  const [foco, setFoco] = useState<string | null>(alvo)
  const [destino, setDestino] = useState<string | null | undefined>()
  const [arrastando, setArrastando] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  const prefixo = useId()
  const linhas = useMemo(() => {
    const texto = normalizar(busca.trim()),
      incluidos = new Set<string>()
    if (texto)
      for (const e of indice.entidades.values())
        if (normalizar(e.nome).includes(texto)) {
          incluidos.add(e.id)
          let grupo = e.grupo
          for (let n = 0; grupo && n < 64; n++) {
            incluidos.add(grupo)
            grupo = indice.grupos.get(grupo)?.grupo ?? null
          }
        }
    const resultado: {
      e: EntidadeOrganizavel
      profundidade: number
      posicao: number
      total: number
    }[] = []
    const visitar = (pai: string | null, profundidade: number) => {
      const filhos = (indice.filhos.get(pai) ?? [])
        .filter((e) => !texto || incluidos.has(e.id))
        .slice()
        .sort(
          (a, b) =>
            Number(indice.grupos.has(b.id)) - Number(indice.grupos.has(a.id)) ||
            a.nome.localeCompare(b.nome, 'pt-BR'),
        )
      for (let i = 0; i < filhos.length; i++) {
        const e = filhos[i]!
        resultado.push({ e, profundidade, posicao: i + 1, total: filhos.length })
        if (indice.grupos.has(e.id) && (texto || !recolhidas.has(e.id)))
          visitar(e.id, profundidade + 1)
      }
    }
    visitar(null, 0)
    return resultado
  }, [indice, busca, recolhidas])
  const escolhidos = useMemo(() => new Set(selecao), [selecao])
  const limiteTopo = Math.max(0, linhas.length * ALTURA - VISTA)
  const topoAtual = Math.min(topo, limiteTopo)
  const inicio = Math.max(0, Math.floor(topoAtual / ALTURA) - 3),
    fim = Math.min(linhas.length, inicio + 14)
  const focado = linhas.findIndex((l) => l.e.id === foco)
  const focoAtual = focado < 0 ? 0 : focado
  const levarFoco = (i: number) => {
    const n = Math.max(0, Math.min(linhas.length - 1, i)),
      linha = linhas[n]
    if (!linha) return
    setFoco(linha.e.id)
    if (caixa.current) {
      const atual = caixa.current.scrollTop
      if (n * ALTURA < atual) caixa.current.scrollTop = n * ALTURA
      else if ((n + 1) * ALTURA > atual + VISTA) caixa.current.scrollTop = (n + 1) * ALTURA - VISTA
      setTopo(caixa.current.scrollTop)
    }
  }
  const alternar = (id: string) =>
    setRecolhidas((antes) => {
      const novas = new Set(antes)
      if (novas.has(id)) novas.delete(id)
      else novas.add(id)
      return novas
    })
  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !linhas.length) return
    const linha = linhas[focoAtual]!
    if (e.key === 'ArrowDown') levarFoco(focoAtual + 1)
    else if (e.key === 'ArrowUp') levarFoco(focoAtual - 1)
    else if (e.key === 'Home') levarFoco(0)
    else if (e.key === 'End') levarFoco(linhas.length - 1)
    else if (e.key === 'ArrowRight') {
      if (!busca && indice.grupos.has(linha.e.id) && recolhidas.has(linha.e.id))
        alternar(linha.e.id)
      else levarFoco(focoAtual + 1)
    } else if (e.key === 'ArrowLeft') {
      if (!busca && indice.grupos.has(linha.e.id) && !recolhidas.has(linha.e.id))
        alternar(linha.e.id)
      else if (linha.e.grupo) levarFoco(linhas.findIndex((l) => l.e.id === linha.e.grupo))
    } else if (e.key === 'Enter' || e.key === ' ')
      escolher(linha.e.id, e.shiftKey || e.ctrlKey || e.metaKey)
    else return
    e.preventDefault()
    e.stopPropagation()
  }
  const soltar = (dados: string, grupo: string | null) => {
    setDestino(undefined)
    setArrastando(false)
    try {
      const valor: unknown = JSON.parse(dados)
      if (
        !valor ||
        typeof valor !== 'object' ||
        !('cenario' in valor) ||
        valor.cenario !== documento.id ||
        !('ids' in valor) ||
        !Array.isArray(valor.ids) ||
        !valor.ids.length ||
        valor.ids.length > 20_000 ||
        !valor.ids.every((id: unknown) => typeof id === 'string' && indice.entidades.has(id))
      )
        return
      mover(valor.ids, grupo)
    } catch {
      /* Um arrasto de outro aplicativo não é um comando da oficina. */
    }
  }
  return (
    <div className="mcn-arvore-wrap">
      {!linhas.length ? (
        <p className="px-4 text-sm text-mld-muted">
          {busca
            ? 'Nenhum objeto ou pasta encontrado.'
            : 'O cenário ainda não tem objetos ou pastas.'}
        </p>
      ) : null}
      <fieldset
        aria-label="Fora das pastas"
        className="mcn-arvore-raiz"
        data-destino={destino === null || undefined}
        data-arrastando={arrastando || undefined}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(ARRASTO)) {
            e.preventDefault()
            setDestino(null)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          soltar(e.dataTransfer.getData(ARRASTO), null)
        }}
      >
        {arrastando ? 'Soltar fora das pastas' : 'Fora das pastas'}
      </fieldset>
      <div
        ref={caixa}
        className="mcn-arvore mld-hierarchy"
        role="tree"
        aria-label="Árvore de objetos"
        aria-multiselectable
        tabIndex={0}
        aria-activedescendant={
          focoAtual >= inicio && focoAtual < fim && linhas.length
            ? `${prefixo}-${focoAtual}`
            : undefined
        }
        onKeyDown={teclado}
        onScroll={(e) => setTopo(e.currentTarget.scrollTop)}
        onFocus={(e) => {
          if (e.target === e.currentTarget) levarFoco(focoAtual)
        }}
      >
        <div role="presentation" style={{ height: linhas.length * ALTURA, position: 'relative' }}>
          {linhas.slice(inicio, fim).map(({ e, profundidade, posicao, total }, offset) => {
            const n = inicio + offset,
              pasta = indice.grupos.has(e.id),
              aberta = Boolean(busca) || !recolhidas.has(e.id)
            const flags = indice.flags.get(e.id)!,
              Icone = pasta ? Folder : Box
            const ativo = alvo === e.id || escolhidos.has(e.id)
            return (
              <div
                key={e.id}
                id={`${prefixo}-${n}`}
                role="treeitem"
                tabIndex={-1}
                aria-level={profundidade + 1}
                aria-posinset={posicao}
                aria-setsize={total}
                aria-selected={ativo}
                aria-expanded={pasta ? aberta : undefined}
                className="mcn-arvore-linha mld-hierarchy-row"
                data-destino={destino === e.id || undefined}
                style={{
                  transform: `translateY(${n * ALTURA}px)`,
                  paddingLeft: Math.min(4, profundidade) * 12,
                }}
                onDragOver={(evento) => {
                  if (pasta && !flags.bloqueado && evento.dataTransfer.types.includes(ARRASTO)) {
                    evento.preventDefault()
                    setDestino(e.id)
                  }
                }}
                onDrop={(evento) => {
                  if (pasta && evento.dataTransfer.types.includes(ARRASTO)) {
                    evento.preventDefault()
                    soltar(evento.dataTransfer.getData(ARRASTO), e.id)
                  }
                }}
              >
                {pasta ? (
                  <button
                    type="button"
                    className="mld-tree-action mcn-arvore-abrir"
                    tabIndex={n === focoAtual ? 0 : -1}
                    aria-label={`${aberta ? 'Recolher' : 'Abrir'} pasta ${e.nome}`}
                    aria-expanded={aberta}
                    disabled={Boolean(busca)}
                    onClick={() => {
                      setFoco(e.id)
                      alternar(e.id)
                    }}
                  >
                    {aberta ? (
                      <ChevronDown aria-hidden="true" />
                    ) : (
                      <ChevronRight aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  <span className="mcn-arvore-abrir" aria-hidden="true" />
                )}
                <button
                  type="button"
                  className="mld-piece mcn-arvore-nome"
                  tabIndex={-1}
                  aria-label={`Escolher ${pasta ? 'pasta' : 'objeto'} ${e.nome}`}
                  aria-pressed={ativo}
                  title={e.nome}
                  draggable={!flags.bloqueado}
                  onDragStart={(evento) => {
                    const ids = !pasta && escolhidos.has(e.id) ? [...selecao] : [e.id]
                    evento.dataTransfer.setData(
                      ARRASTO,
                      JSON.stringify({ cenario: documento.id, ids }),
                    )
                    evento.dataTransfer.effectAllowed = 'move'
                    setArrastando(true)
                  }}
                  onDragEnd={() => {
                    setDestino(undefined)
                    setArrastando(false)
                  }}
                  onClick={(evento) => {
                    caixa.current?.focus({ preventScroll: true })
                    levarFoco(n)
                    escolher(e.id, evento.shiftKey || evento.ctrlKey || evento.metaKey)
                  }}
                >
                  <Icone aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{e.nome}</span>
                </button>
                <button
                  type="button"
                  className="mld-tree-action"
                  tabIndex={n === focoAtual ? 0 : -1}
                  disabled={flags.bloqueado}
                  aria-label={`Ocultar ${e.nome}`}
                  aria-pressed={e.oculto}
                  title={
                    flags.ocultacaoHerdada
                      ? 'Oculto pela pasta ou camada'
                      : e.oculto
                        ? 'Mostrar'
                        : 'Ocultar'
                  }
                  onClick={() => alterar(e.id, { oculto: !e.oculto })}
                >
                  {flags.oculto ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className="mld-tree-action"
                  tabIndex={n === focoAtual ? 0 : -1}
                  disabled={flags.bloqueioHerdado}
                  aria-label={`Trancar ${e.nome}`}
                  aria-pressed={e.bloqueado}
                  title={
                    flags.bloqueioHerdado
                      ? 'Trancado pela pasta ou camada'
                      : e.bloqueado
                        ? 'Destrancar'
                        : 'Trancar'
                  }
                  onClick={() => alterar(e.id, { bloqueado: !e.bloqueado })}
                >
                  {flags.bloqueado ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
      {linhas.length ? (
        <p className="px-4 text-xs text-mld-muted">
          {linhas.length} {linhas.length === 1 ? 'item' : 'itens'}. Use as setas para percorrer a
          árvore.
        </p>
      ) : null}
    </div>
  )
}
