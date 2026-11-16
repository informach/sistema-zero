'use client'

import { Button, ToolButton } from '@sistemazero/molda/ui'
import type {
  ComandoDeCenario,
  ModeloDeCatalogo,
  ProjetoDeCenario,
} from '@sistemazero/molda-cenarios-core'
import { DocumentoDeCenarioSchema } from '@sistemazero/molda-cenarios-core'
import {
  Box,
  Camera,
  Copy,
  Eye,
  Group,
  Mountain,
  MousePointer2,
  Move3D,
  Play,
  Redo2,
  RotateCw,
  Scaling,
  Search,
  Spline,
  SunMoon,
  Trash2,
  Undo2,
  Waves,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { criarController } from './controller'
import { Paisagem } from './Paisagem'
import type { CenarioRuntimePort, CenariosHostAdapter, FerramentaDeCenario } from './portas'

function Miniatura({ modelo, host }: { modelo: ModeloDeCatalogo; host: CenariosHostAdapter }) {
  const [url, setUrl] = useState<string | null>(null)
  const [falha, setFalha] = useState(false)
  useEffect(() => {
    const a = new AbortController()
    let recurso: string | null = null
    host
      .miniatura(modelo, a.signal)
      .then((blob) => {
        if (a.signal.aborted || !blob) return
        recurso = URL.createObjectURL(blob)
        setUrl(recurso)
      })
      .catch(() => {
        if (!a.signal.aborted) setFalha(true)
      })
    return () => {
      a.abort()
      if (recurso) URL.revokeObjectURL(recurso)
    }
  }, [modelo, host])
  return url ? (
    <img src={url} alt="" loading="lazy" />
  ) : (
    <span title={falha ? 'Miniatura indisponível' : 'Preparando miniatura'}>
      <Box aria-hidden />
      {falha && <small>Sem miniatura</small>}
    </span>
  )
}
function CampoNumero({
  nome,
  valor,
  alterar,
}: {
  nome: string
  valor: number
  alterar: (valor: number) => void
}) {
  const [texto, setTexto] = useState(String(valor))
  useEffect(() => setTexto(String(Math.round(valor * 1000) / 1000)), [valor])
  return (
    <label className="mce-numero">
      <span>{nome}</span>
      <input
        type="number"
        step="0.1"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        onBlur={() => {
          const n = Number(texto)
          if (texto.trim() && Number.isFinite(n) && n !== valor) alterar(n)
          else setTexto(String(valor))
        }}
      />
    </label>
  )
}
const ferramentas: [FerramentaDeCenario, string, typeof MousePointer2][] = [
  ['selecionar', 'Selecionar', MousePointer2],
  ['mover', 'Mover', Move3D],
  ['girar', 'Girar', RotateCw],
  ['escala', 'Escala', Scaling],
  ['terreno', 'Terreno', Mountain],
  ['caminho', 'Caminhos', Spline],
  ['agua', 'Água e margens', Waves],
]

export function CenariosApp({
  host,
  projetoInicial,
}: {
  host: CenariosHostAdapter
  projetoInicial?: string
}) {
  const editor = useMemo(() => criarController(host), [host]),
    estado = useSyncExternalStore(editor.subscribe, editor.getState, editor.getState)
  const [projetos, setProjetos] = useState<ProjetoDeCenario[]>([]),
    [busca, setBusca] = useState(''),
    [aba, setAba] = useState<'biblioteca' | 'objetos'>('biblioteca'),
    [limite, setLimite] = useState(60),
    [origem, setOrigem] = useState(''),
    [medidas, setMedidas] = useState({
      chamadas: 0,
      triangulos: 0,
      geometrias: 0,
      texturas: 0,
      fps: 0,
    })
  const palco = useRef<HTMLDivElement>(null),
    runtime = useRef<CenarioRuntimePort | null>(null)
  const formulario = useRef<HTMLDialogElement>(null),
    arquivo = useRef<HTMLInputElement>(null)
  const [nomeDaCopia, setNomeDaCopia] = useState('')
  const [viewportPronto, setViewportPronto] = useState(false)
  const tentar = useCallback(
    (p: Promise<unknown>) => {
      void p.catch((e) => editor.erro(e instanceof Error ? e.message : String(e)))
    },
    [editor],
  )
  useEffect(() => {
    let ativo = true
    host
      .listar()
      .then((p) => {
        if (!ativo) return
        setProjetos(p)
        const id = projetoInicial ?? p[0]?.id
        if (id) tentar(editor.abrir(id))
      })
      .catch((e) => editor.erro(String(e)))
    return () => {
      ativo = false
    }
  }, [host, editor, projetoInicial, tentar])
  const projeto = estado.projeto,
    doc = projeto?.documento,
    projetoId = projeto?.projetoId
  useEffect(() => {
    if (!projetoId) return
    return host.ligarSessao?.(editor, () => runtime.current)
  }, [projetoId, host, editor])
  useEffect(() => {
    if (!projetoId) return
    let ativo = true,
      pendente = false
    const t = setInterval(() => {
      if (pendente || !ativo) return
      const s = editor.getState()
      if (s.ocupado || s.gesto || s.testando) return
      pendente = true
      host
        .abrir(projetoId)
        .then((p) => {
          if (ativo) editor.receber(p)
        })
        .catch((e) => {
          if (ativo)
            editor.erro(
              `Não foi possível sincronizar: ${e instanceof Error ? e.message : String(e)}`,
            )
        })
        .finally(() => {
          pendente = false
        })
    }, 2500)
    return () => {
      ativo = false
      clearInterval(t)
    }
  }, [projetoId, editor, host])
  useEffect(() => {
    const atual = editor.getState().projeto
    if (!palco.current || !projetoId || !atual) return
    let ativo = true,
      montado: CenarioRuntimePort | null = null
    setViewportPronto(false)
    host.runtime
      .montar(palco.current, {
        documento: atual.documento,
        revisao: atual.revisao,
        catalogo: estado.catalogo,
        urlDaArte: host.urlDaArte,
        estado: editor.getState().viewport,
        aoSelecionar: (ids) => editor.viewport({ selecionados: ids }),
        aoGesto: (ativo) => editor.gesto(ativo),
        aoEditar: (c) => editor.executar(c),
        aoMedir: (m) => {
          if (ativo) setMedidas(m)
        },
      })
      .then((r) => {
        montado = r
        if (!ativo) {
          r.desmontar()
          return
        }
        runtime.current = r
        const s = editor.getState()
        if (s.projeto)
          tentar(
            r.atualizar(s.projeto.documento, s.viewport, s.projeto.revisao).then(() => {
              if (ativo) setViewportPronto(true)
            }),
          )
      })
      .catch((e) => {
        if (ativo) editor.erro(String(e))
      })
    return () => {
      ativo = false
      runtime.current = null
      montado?.desmontar()
    }
  }, [projetoId, estado.catalogo, host, editor, tentar])
  useEffect(() => {
    if (projeto && runtime.current)
      tentar(runtime.current.atualizar(projeto.documento, estado.viewport, projeto.revisao))
  }, [projeto, estado.viewport, tentar])
  const selecionados =
      doc?.instancias.filter((o) => estado.viewport.selecionados.includes(o.id)) ?? [],
    objeto = selecionados.length === 1 ? selecionados[0] : null
  const editar = (c: ComandoDeCenario[]) => tentar(editor.executar(c))
  const filtrar = (v: string) =>
    v
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
  const modelos = estado.catalogo.filter(
    (m) =>
      (!origem || m.origem === origem) &&
      filtrar(`${m.nome} ${m.categoria}`).includes(filtrar(busca)),
  )
  const adicionar = (id: string, x?: number, y?: number) => {
    const p = palco.current?.getBoundingClientRect()
    if (runtime.current && p)
      tentar(runtime.current.colocar(id, x ?? p.x + p.width / 2, y ?? p.y + p.height / 2))
  }
  const transformar = (tipo: 'posicao' | 'rotacao', eixo: 'x' | 'y' | 'z', valor: number) => {
    if (!objeto) return
    const t = {
      ...objeto.transformacao,
      [tipo]: {
        ...objeto.transformacao[tipo],
        [eixo]: tipo === 'rotacao' ? (valor * Math.PI) / 180 : valor,
      },
    }
    const apoio =
      tipo === 'posicao' && eixo === 'y' && objeto.apoio.tipo !== 'absoluto'
        ? {
            ...objeto.apoio,
            deslocamento: objeto.apoio.deslocamento + valor - objeto.transformacao.posicao.y,
          }
        : objeto.apoio
    editar([
      { tipo: 'instancia.atualizar', id: objeto.id, alteracoes: { transformacao: t, apoio } },
    ])
  }
  const duplicar = async () => {
    const ids = new Map(selecionados.map((o) => [o.id, crypto.randomUUID()]))
    await editor.executar(
      selecionados.map((o) => ({
        tipo: 'instancia.criar',
        instancia: {
          ...o,
          id: ids.get(o.id)!,
          nome: `${o.nome.slice(0, 100)} (cópia)`,
          bloqueado: false,
          apoio:
            o.apoio.tipo === 'objeto'
              ? { ...o.apoio, objeto: ids.get(o.apoio.objeto) ?? o.apoio.objeto }
              : o.apoio,
        },
      })),
    )
    editor.viewport({ selecionados: [...ids.values()], ferramenta: 'mover' })
  }
  const agrupar = () => {
    const id = crypto.randomUUID()
    editar([
      {
        tipo: 'grupo.definir',
        grupo: { id, nome: 'Conjunto', grupo: null, bloqueado: false, oculto: false },
      },
      ...selecionados.map((o) => ({
        tipo: 'instancia.atualizar' as const,
        id: o.id,
        alteracoes: { grupo: id },
      })),
    ])
  }
  const testar = () => {
    if (runtime.current) tentar(editor.teste(!estado.testando, (a) => runtime.current!.testar(a)))
  }
  const bloqueado = estado.ocupado || estado.testando || estado.gesto || !doc
  const copiar = async (nome: string, documento = doc) => {
    if (!documento) return
    const nova = await host.criar(nome, documento, crypto.randomUUID())
    setProjetos(await host.listar())
    await editor.abrir(nova.projetoId)
  }
  const exportar = () => {
    if (!doc) return
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
      ),
      a = document.createElement('a')
    a.href = url
    a.download = `${doc.id}.molda-cenario.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section
      className="mce-app"
      data-molda-theme={host.tema}
      aria-label="Molda — editor de cenários"
      data-runtime-pronto={viewportPronto}
      data-revisao={projeto?.revisao}
      onKeyDown={(e) => {
        if (
          estado.testando ||
          estado.ocupado ||
          estado.gesto ||
          /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)
        )
          return
        const mod = e.ctrlKey || e.metaKey
        let acao: (() => void) | undefined
        if (mod && e.code === 'KeyZ')
          acao = () => tentar(editor.historico(e.shiftKey ? 'refazer' : 'desfazer'))
        else if (mod && e.code === 'KeyY') acao = () => tentar(editor.historico('refazer'))
        else if (mod && e.code === 'KeyD') acao = () => tentar(duplicar())
        else if (e.code === 'KeyF')
          acao = () => runtime.current?.enquadrar(estado.viewport.selecionados)
        else if (e.code === 'Escape') acao = () => editor.viewport({ selecionados: [] })
        else if (!mod && ['KeyQ', 'KeyW', 'KeyE', 'KeyR'].includes(e.code))
          acao = () =>
            editor.viewport({
              ferramenta: (
                { KeyQ: 'selecionar', KeyW: 'mover', KeyE: 'girar', KeyR: 'escala' } as const
              )[e.code as 'KeyQ'],
            })
        if (acao) {
          e.preventDefault()
          acao()
        }
      }}
    >
      <dialog ref={formulario} className="mce-dialogo">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!nomeDaCopia.trim()) return
            tentar(copiar(nomeDaCopia.trim()).then(() => formulario.current?.close()))
          }}
        >
          <h2>Nova cópia do cenário</h2>
          <label>
            Nome
            <input
              value={nomeDaCopia}
              onChange={(e) => setNomeDaCopia(e.target.value)}
              maxLength={120}
              required
            />
          </label>
          <div className="mce-acoes">
            <Button type="button" onClick={() => formulario.current?.close()}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Criar cópia
            </Button>
          </div>
        </form>
      </dialog>
      <input
        ref={arquivo}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          tentar(
            (async () => {
              if (f.size > 8 * 1024 * 1024) throw Error('Documento acima de 8 MiB')
              const d = DocumentoDeCenarioSchema.parse(JSON.parse(await f.text()))
              await copiar(`${d.nome.slice(0, 105)} (importado)`, d)
            })(),
          )
          e.target.value = ''
        }}
      />
      <header className="mce-topo">
        <div className="mce-marca">
          <Box aria-hidden />
          <strong>
            Molda <span>Cenários</span>
          </strong>
        </div>
        <select
          aria-label="Projeto"
          value={projeto?.projetoId ?? ''}
          disabled={estado.ocupado || estado.testando}
          onChange={(e) => tentar(editor.abrir(e.target.value))}
        >
          {!projeto && <option value="">Escolha um cenário</option>}
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <Button
          size="compact"
          disabled={bloqueado}
          onClick={() => {
            setNomeDaCopia(`${doc?.nome.slice(0, 105)} (cópia)`)
            formulario.current?.showModal()
          }}
        >
          Criar cópia
        </Button>
        <Button
          size="compact"
          disabled={estado.ocupado || estado.testando}
          onClick={() => arquivo.current?.click()}
        >
          Importar
        </Button>
        <Button size="compact" disabled={!doc} onClick={exportar}>
          Exportar
        </Button>
        <span className="mce-salvo" role="status">
          {estado.ocupado
            ? 'Processando…'
            : projeto
              ? `Revisão ${projeto.revisao} · salva na equipe`
              : 'Abrindo projetos…'}
        </span>
        <Button size="compact" disabled={bloqueado} onClick={() => tentar(editor.aplicar())}>
          Aplicar ao ensaio
        </Button>
        <Button
          variant="primary"
          disabled={!doc || estado.ocupado || !viewportPronto}
          onClick={testar}
        >
          <Play size={16} />
          {estado.testando ? 'Voltar à edição' : 'Testar'}
        </Button>
      </header>
      {estado.recuperacao && (
        <div className="mce-alerta" role="status">
          <span>
            Há uma edição local não confirmada, baseada na revisão {estado.recuperacao.base}.
          </span>
          <Button
            size="compact"
            disabled={bloqueado}
            onClick={() =>
              tentar(
                copiar(
                  `${estado.recuperacao!.documento.nome.slice(0, 95)} (recuperado)`,
                  estado.recuperacao!.documento,
                ),
              )
            }
          >
            Salvar recuperação como cópia
          </Button>
        </div>
      )}
      {estado.erro && (
        <div className="mce-alerta" role="alert">
          <span>{estado.erro}</span>
          <Button size="compact" onClick={() => editor.erro(null)}>
            Fechar
          </Button>
        </div>
      )}
      <div className="mce-corpo">
        <aside className="mce-biblioteca">
          <nav aria-label="Conteúdo">
            <Button
              size="compact"
              aria-pressed={aba === 'biblioteca'}
              onClick={() => setAba('biblioteca')}
            >
              Biblioteca
            </Button>
            <Button
              size="compact"
              aria-pressed={aba === 'objetos'}
              onClick={() => setAba('objetos')}
            >
              Objetos
            </Button>
          </nav>
          {aba === 'biblioteca' ? (
            <>
              <label className="mce-busca">
                <Search size={16} />
                <input
                  aria-label="Buscar modelos"
                  placeholder="Buscar no acervo"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value)
                    setLimite(60)
                  }}
                />
              </label>
              <select
                aria-label="Coleção"
                value={origem}
                onChange={(e) => {
                  setOrigem(e.target.value)
                  setLimite(60)
                }}
              >
                <option value="">Todas as coleções</option>
                {[...new Set(estado.catalogo.map((m) => m.origem))].sort().map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <div className="mce-modelos">
                {modelos.slice(0, limite).map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className="mce-modelo"
                    disabled={bloqueado}
                    draggable={!bloqueado}
                    onDragStart={(e) => e.dataTransfer.setData('application/x-molda-modelo', m.id)}
                    onClick={() => adicionar(m.id)}
                    title={`${m.nome} · ${m.dimensoes.map((n) => n.toFixed(1)).join(' × ')} m`}
                  >
                    <Miniatura modelo={m} host={host} />
                    <span>{m.nome}</span>
                  </button>
                ))}
              </div>
              {limite < modelos.length && (
                <Button size="compact" onClick={() => setLimite((l) => l + 60)}>
                  Mostrar mais modelos
                </Button>
              )}
            </>
          ) : (
            <div className="mce-arvore">
              {doc?.grupos.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  className="mce-grupo"
                  onClick={() =>
                    editor.viewport({
                      selecionados: doc.instancias.filter((p) => p.grupo === g.id).map((p) => p.id),
                    })
                  }
                >
                  <Group size={15} />
                  {g.nome}
                </button>
              ))}
              {doc &&
                [...doc.caminhos, ...doc.aguas].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    aria-pressed={estado.viewport.selecionados.includes(p.id)}
                    onClick={() => editor.viewport({ selecionados: [p.id] })}
                  >
                    <Spline size={14} />
                    {p.nome}
                  </button>
                ))}
              {doc?.instancias.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  aria-pressed={estado.viewport.selecionados.includes(o.id)}
                  onClick={(e) =>
                    editor.viewport({
                      selecionados:
                        e.ctrlKey || e.metaKey
                          ? estado.viewport.selecionados.includes(o.id)
                            ? estado.viewport.selecionados.filter((id) => id !== o.id)
                            : [...estado.viewport.selecionados, o.id]
                          : [o.id],
                    })
                  }
                >
                  {o.grupo && <span className="mce-recuo" />}
                  <Box size={14} />
                  <span>{o.nome}</span>
                  {o.bloqueado && '🔒'}
                </button>
              ))}
            </div>
          )}
        </aside>
        <main className="mce-centro">
          <div className="mce-ferramentas" role="toolbar" aria-label="Ferramentas de composição">
            {ferramentas.map(([id, nome, Icon]) => (
              <ToolButton
                key={id}
                icon={Icon}
                label={nome}
                active={estado.viewport.ferramenta === id}
                disabled={bloqueado}
                onClick={() => editor.viewport({ ferramenta: id })}
              />
            ))}
            <span className="mce-divisor" />
            <ToolButton
              icon={Undo2}
              label="Desfazer"
              disabled={bloqueado || !estado.podeDesfazer}
              onClick={() => tentar(editor.historico('desfazer'))}
            />
            <ToolButton
              icon={Redo2}
              label="Refazer"
              disabled={bloqueado || !estado.podeRefazer}
              onClick={() => tentar(editor.historico('refazer'))}
            />
            <ToolButton
              icon={Camera}
              label="Enquadrar seleção"
              onClick={() => runtime.current?.enquadrar(estado.viewport.selecionados)}
            />
            <ToolButton
              icon={SunMoon}
              label="Dia e noite"
              active={doc?.iluminacao.noite}
              disabled={bloqueado}
              onClick={() =>
                editar([{ tipo: 'iluminacao.definir', noite: !doc?.iluminacao.noite }])
              }
            />
          </div>
          <div
            ref={palco}
            className="mce-palco"
            role="application"
            aria-label="Área 3D de composição"
            onDragOver={(e) => {
              if (!bloqueado && e.dataTransfer.types.includes('application/x-molda-modelo'))
                e.preventDefault()
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (!bloqueado)
                adicionar(
                  e.dataTransfer.getData('application/x-molda-modelo'),
                  e.clientX,
                  e.clientY,
                )
            }}
          />
          <div className="mce-vistas">
            <Button
              size="compact"
              aria-pressed={estado.viewport.vista === 'superior'}
              onClick={() =>
                editor.viewport({
                  vista: estado.viewport.vista === 'superior' ? 'perspectiva' : 'superior',
                })
              }
            >
              {estado.viewport.vista === 'superior' ? 'Perspectiva' : 'Vista superior'}
            </Button>
            <Button
              size="compact"
              aria-pressed={estado.viewport.encaixe}
              onClick={() => editor.viewport({ encaixe: !estado.viewport.encaixe })}
            >
              Encaixe
            </Button>
            <Button
              size="compact"
              aria-pressed={estado.viewport.inspecao}
              onClick={() => editor.viewport({ inspecao: !estado.viewport.inspecao })}
            >
              <Eye size={14} />
              Inspecionar
            </Button>
          </div>
        </main>
        <aside className="mce-propriedades">
          <h2>Propriedades</h2>
          {doc && (
            <Paisagem
              doc={doc}
              viewport={estado.viewport}
              catalogo={estado.catalogo}
              editar={editar}
              selecionar={(id) => editor.viewport({ selecionados: [id] })}
              bloqueado={bloqueado}
            />
          )}
          {objeto ? (
            <>
              <label>
                Nome
                <input
                  key={objeto.id}
                  defaultValue={objeto.nome}
                  disabled={bloqueado}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== objeto.nome)
                      editar([
                        {
                          tipo: 'instancia.atualizar',
                          id: objeto.id,
                          alteracoes: { nome: e.target.value.trim() },
                        },
                      ])
                  }}
                />
              </label>
              <label>
                Apoio
                <select
                  value={objeto.apoio.tipo}
                  disabled={bloqueado || objeto.bloqueado}
                  onChange={(e) =>
                    editar([
                      {
                        tipo: 'instancia.atualizar',
                        id: objeto.id,
                        alteracoes: {
                          apoio:
                            e.target.value === 'absoluto'
                              ? { tipo: 'absoluto' }
                              : { tipo: 'terreno', deslocamento: 0, inclinar: false },
                        },
                      },
                    ])
                  }
                >
                  <option value="terreno">Assentar no terreno</option>
                  <option value="absoluto">Altura absoluta</option>
                  {objeto.apoio.tipo === 'objeto' && (
                    <option value="objeto">Apoiado em outro objeto</option>
                  )}
                </select>
              </label>
              <label>
                Colisão
                <select
                  disabled={bloqueado || objeto.bloqueado}
                  value={objeto.fisica}
                  onChange={(e) =>
                    editar([
                      {
                        tipo: 'instancia.atualizar',
                        id: objeto.id,
                        alteracoes: { fisica: e.target.value as typeof objeto.fisica },
                      },
                    ])
                  }
                >
                  {['nenhuma', 'caixa', 'tronco', 'ponte', 'escada', 'malha', 'solo'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              {objeto.sinal && (
                <fieldset disabled={bloqueado || objeto.bloqueado}>
                  <legend>Placa de madeira</legend>
                  <input
                    aria-label="Texto da placa"
                    maxLength={24}
                    defaultValue={objeto.sinal.texto}
                    key={`${objeto.id}:texto`}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== objeto.sinal!.texto)
                        editar([
                          {
                            tipo: 'instancia.atualizar',
                            id: objeto.id,
                            alteracoes: {
                              sinal: { ...objeto.sinal!, texto: e.target.value.trim() },
                            },
                          },
                        ])
                    }}
                  />
                  <select
                    aria-label="Destino da placa"
                    value={objeto.sinal.destino}
                    onChange={(e) => {
                      const marco = doc!.marcos.find((m) => m.id === e.target.value)!
                      editar([
                        {
                          tipo: 'instancia.atualizar',
                          id: objeto.id,
                          alteracoes: {
                            sinal: { ...objeto.sinal!, destino: marco.id, via: marco.posicao },
                            transformacao: {
                              ...objeto.transformacao,
                              rotacao: {
                                x: 0,
                                y: Math.atan2(
                                  objeto.transformacao.posicao.z - marco.posicao.z,
                                  marco.posicao.x - objeto.transformacao.posicao.x,
                                ),
                                z: 0,
                              },
                            },
                          },
                        },
                      ])
                    }}
                  >
                    {doc?.marcos.map((m) => (
                      <option key={m.id}>{m.id}</option>
                    ))}
                  </select>
                </fieldset>
              )}
              <fieldset disabled={bloqueado || objeto.bloqueado}>
                <legend>Posição · metros</legend>
                <div className="mce-vetor">
                  {(['x', 'y', 'z'] as const).map((e) => (
                    <CampoNumero
                      key={e}
                      nome={e.toUpperCase()}
                      valor={objeto.transformacao.posicao[e]}
                      alterar={(v) => transformar('posicao', e, v)}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={bloqueado || objeto.bloqueado}>
                <legend>Rotação · graus</legend>
                <div className="mce-vetor">
                  {(['x', 'y', 'z'] as const).map((e) => (
                    <CampoNumero
                      key={e}
                      nome={e.toUpperCase()}
                      valor={(objeto.transformacao.rotacao[e] * 180) / Math.PI}
                      alterar={(v) => transformar('rotacao', e, v)}
                    />
                  ))}
                </div>
                <CampoNumero
                  nome="Escala"
                  valor={objeto.transformacao.escala}
                  alterar={(v) =>
                    editar([
                      {
                        tipo: 'instancia.atualizar',
                        id: objeto.id,
                        alteracoes: { transformacao: { ...objeto.transformacao, escala: v } },
                      },
                    ])
                  }
                />
              </fieldset>
              <label>
                <input
                  type="checkbox"
                  checked={objeto.bloqueado}
                  disabled={bloqueado}
                  onChange={(e) =>
                    editar([
                      {
                        tipo: 'instancia.atualizar',
                        id: objeto.id,
                        alteracoes: { bloqueado: e.target.checked },
                      },
                    ])
                  }
                />
                Bloquear objeto
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={objeto.oculto}
                  disabled={bloqueado}
                  onChange={(e) =>
                    editar([
                      {
                        tipo: 'instancia.atualizar',
                        id: objeto.id,
                        alteracoes: { oculto: e.target.checked },
                      },
                    ])
                  }
                />
                Ocultar na edição
              </label>
            </>
          ) : (
            <p className="mce-ajuda">
              {selecionados.length
                ? `${selecionados.length} objetos selecionados`
                : 'Selecione um elemento no cenário ou na lista de objetos.'}
            </p>
          )}
          <div className="mce-acoes">
            <Button
              size="compact"
              disabled={bloqueado || !selecionados.length}
              onClick={() => tentar(duplicar())}
            >
              <Copy size={15} />
              Duplicar
            </Button>
            <Button
              size="compact"
              disabled={bloqueado || !selecionados.some((o) => o.grupo)}
              onClick={() =>
                editar(
                  selecionados.map((o) => ({
                    tipo: 'instancia.atualizar',
                    id: o.id,
                    alteracoes: { grupo: null },
                  })),
                )
              }
            >
              Desagrupar
            </Button>
            <Button
              size="compact"
              disabled={bloqueado || selecionados.length < 2}
              onClick={agrupar}
            >
              <Group size={15} />
              Agrupar
            </Button>
            <Button
              size="compact"
              variant="danger"
              disabled={bloqueado || !selecionados.length}
              onClick={() =>
                editar(selecionados.map((o) => ({ tipo: 'instancia.remover', id: o.id })))
              }
            >
              <Trash2 size={15} />
              Excluir
            </Button>
          </div>
          {estado.viewport.ferramenta === 'terreno' && (
            <fieldset>
              <legend>Pincel de terreno</legend>
              <select
                aria-label="Tipo de pincel"
                value={estado.viewport.pincel.tipo}
                onChange={(e) =>
                  editor.viewport({
                    pincel: {
                      ...estado.viewport.pincel,
                      tipo: e.target.value as 'elevar' | 'aplainar' | 'suavizar',
                    },
                  })
                }
              >
                <option value="elevar">Elevar / rebaixar</option>
                <option value="aplainar">Aplainar</option>
                <option value="suavizar">Suavizar</option>
              </select>
              {(['raio', 'valor', 'intensidade'] as const).map((k) => (
                <CampoNumero
                  key={k}
                  nome={k === 'raio' ? 'Raio (m)' : k === 'valor' ? 'Altura (m)' : 'Intensidade'}
                  valor={estado.viewport.pincel[k]}
                  alterar={(v) =>
                    editor.viewport({ pincel: { ...estado.viewport.pincel, [k]: v } })
                  }
                />
              ))}
            </fieldset>
          )}
          <p className="mce-ajuda">
            Arraste uma peça da biblioteca para colocá-la no terreno. Use os manipuladores para
            compor o cenário e teste com o personagem.
          </p>
        </aside>
      </div>
      <footer className="mce-rodape">
        <span>{doc?.instancias.length ?? 0} objetos · escala em metros</span>
        <span>
          {medidas.fps.toFixed(0)} FPS · {medidas.triangulos.toLocaleString('pt-BR')} triângulos ·{' '}
          {medidas.chamadas} desenhos
        </span>
      </footer>
    </section>
  )
}
