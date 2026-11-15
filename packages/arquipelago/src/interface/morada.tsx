import {
  CATALOGO_DE_OBJETOS,
  type ObjetoDaCasa,
  type Semente,
} from '@sistemazero/arquipelago-contracts'
import {
  MORADA_CATALOG,
  type MoradaHouse,
  type MoradaInstance,
  moradaFileUrl,
} from '@sistemazero/avatar-quarto/morada/catalog'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { casaMoradaStore, PAINEL_DA_MORADA, useCasaMorada } from '../estado/morada'
import { CenaMorada } from '../mundo/morada'
import { climaEfetivo, regarComSede } from '../sistemas/clima'
import { gestoDePlantar, pedirGesto } from '../sistemas/gestos'
import { estagio, falaDeQuandoColhe, geladeiraEm, plantar, regar } from '../sistemas/horta'
import { ITENS, remover } from '../sistemas/itens'
import { PAINEL_DA_FOTO } from '../sistemas/modo-foto'
import {
  isPlantingPiece,
  MORADA_FUNCTION,
  moradaComfort,
  moradaFunction,
  moradaPieceAllowed,
  plantingId,
  snapMorada,
} from '../sistemas/morada'
import { moradaRestModes } from '../sistemas/morada-descanso'
import { colherNaIlha } from '../sistemas/primeiro-pedido'

/** A casa nativa cobre a cena antiga, com seu próprio avatar e física. Os painéis continuam sendo os do jogo. */
const FERRAMENTAS = [
  ['parede', 'Parede', '🧱'],
  ['porta', 'Porta', '🚪'],
  ['janela', 'Janela', '🪟'],
  ['piso', 'Piso', '🟫'],
  ['cerca', 'Cerca', '🪵'],
  ['caminho', 'Caminho', '🪨'],
  ['objeto', 'Objetos', '📦'],
  ['movel', 'Móveis', '🛋️'],
  ['canteiro', 'Canteiro', '🌱'],
  ['terreno', 'Terreno', '⛰️'],
  ['escada', 'Escada', '🪜'],
  ['apagar', 'Apagar', '🧽'],
  ['olhar', 'Olhar', '✋'],
] as const
function belongsToTool(piece: (typeof MORADA_CATALOG.pieces)[string], tool: string) {
  const name = `${piece.id} ${piece.category}`
  switch (tool) {
    case 'parede':
      return /parede|pilar|coluna|viga|telhado/.test(name)
    case 'porta':
      return /porta|portao|arco/.test(name)
    case 'janela':
      return /janela/.test(name)
    case 'piso':
      return /piso|laje|fundacao|chaos/.test(name)
    case 'cerca':
      return /cerca|grade|guarda_corpo|mureta/.test(name)
    case 'caminho':
      return /caminho|calcada|pavimento|piso/.test(name)
    case 'objeto':
      return Object.values(MORADA_FUNCTION).includes(piece.id)
    case 'canteiro':
      return isPlantingPiece(piece)
    case 'terreno':
      return /terreno|lote|pedra|rocha|grama/.test(name)
    case 'escada':
      return /escada|rampa/.test(name)
    case 'apagar':
    case 'olhar':
      return false
    default:
      return true
  }
}

export function CasaMorada() {
  const { loja, plataforma } = useJogo()
  const store = casaMoradaStore(loja, plataforma)
  const state = useCasaMorada(store, (s) => s)
  const [selection, setSelection] = useState<string | null>(null)
  const [pieceId, setPieceId] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [roomId, setRoomId] = useState<string>('')
  const [height, setHeight] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [pendingBehavior, setPendingBehavior] = useState<string | undefined>()
  const [tool, setTool] = useState('movel')
  const [active, setActive] = useState<MoradaInstance | null>(null)
  const visit = useEstado((s) => s.visita)
  const readonly = useEstado((s) => s.acesso.somenteLeitura || s.visita !== null)
  const panel = useEstado((s) => s.painelAberto)
  const projects = useEstado((s) => s.salvamento.projetos)
  // biome-ignore lint/correctness/useExhaustiveDependencies: projetos são o documento externo observado pelo sincronizador.
  useEffect(() => {
    if (state.open && state.house) store.getState().syncFunctions()
  }, [state.open, state.house, projects, store])
  const selected = state.house?.instances.find((i) => i.id === selection)
  const onClose = useCallback(() => {
    setActive(null)
    void store.getState().close()
  }, [store])
  useEffect(() => {
    if (!state.open) return
    if (panel === null) loja.getState().abrirPainel(PAINEL_DA_MORADA)
  }, [state.open, panel, loja])
  useEffect(() => {
    if (!state.open) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (loja.getState().ferramentaAberta) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (loja.getState().menuAberto) loja.getState().abrirMenu(false)
      else if (loja.getState().painelAberto !== PAINEL_DA_MORADA)
        loja.getState().abrirPainel(PAINEL_DA_MORADA)
      else onClose()
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [state.open, loja, onClose])
  const canonicalRoomId = state.house?.roomId
  useEffect(() => {
    if (canonicalRoomId) setRoomId(canonicalRoomId)
  }, [canonicalRoomId])
  const catalog = useMemo(
    () =>
      Object.values(MORADA_CATALOG.pieces).filter(
        (p) => p.kind !== 'pet' && moradaPieceAllowed(p.id, state.owned),
      ),
    [state.owned],
  )
  const categories = useMemo(() => [...new Set(catalog.map((p) => p.category))].sort(), [catalog])
  const results = useMemo(
    () =>
      catalog
        .filter(
          (p) =>
            belongsToTool(p, tool) &&
            (!category || p.category === category) &&
            (!query ||
              p.label.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),
        )
        .slice(0, 100),
    [catalog, category, query, tool],
  )
  if (!state.open) return null
  const house = state.house
  function change(next: MoradaHouse) {
    store.getState().edit(next)
  }
  function updateSelected(values: Partial<MoradaInstance>) {
    if (!house || !selected) return
    change({
      ...house,
      instances: house.instances.map((i) => (i.id === selected.id ? { ...i, ...values } : i)),
    })
  }
  function place(x: number, z: number) {
    if (!house || !pieceId || !state.editing) return
    const room = house.rooms.find((r) => r.id === roomId)
    const instance: MoradaInstance = {
      id: crypto.randomUUID().replaceAll('-', '').slice(0, 18),
      pieceId,
      position: [
        snapMorada(x - (room?.origin[0] ?? 0)),
        height,
        snapMorada(z - (room?.origin[2] ?? 0)),
      ],
      rotation,
      ...(room ? { roomId: room.id } : {}),
      ...(pendingBehavior ? { behavior: pendingBehavior } : {}),
    }
    if (store.getState().edit({ ...house, instances: [...house.instances, instance] })) {
      setSelection(instance.id)
      setPieceId('')
      setPendingBehavior(undefined)
    }
  }
  function remove(instance: MoradaInstance) {
    if (!house) return
    const ids = new Set([instance.id])
    let changed = true
    while (changed) {
      changed = false
      for (const i of house.instances) {
        if (i.parentId && ids.has(i.parentId) && !ids.has(i.id)) {
          ids.add(i.id)
          changed = true
        }
      }
    }
    if (
      store.getState().edit({
        ...house,
        instances: house.instances.filter((i) => !ids.has(i.id)),
      })
    )
      setSelection(null)
  }
  function select(instance: MoradaInstance) {
    if (panel !== PAINEL_DA_MORADA) return
    if (state.editing) {
      if (tool === 'apagar') {
        remove(instance)
        return
      }
      setSelection(instance.id)
      setPieceId('')
      return
    }
    setActive(instance)
    const id = moradaFunction(instance)
    if (id && !readonly) loja.getState().abrirPainel(`objeto:${id}`)
  }
  const hidden = panel !== PAINEL_DA_MORADA
  const photographing = panel === PAINEL_DA_FOTO
  return (
    <section
      className="arq-morada"
      aria-label={visit ? `Casa de ${visit.nome}` : 'Sua casa'}
      aria-hidden={hidden && !photographing}
    >
      {!photographing && state.error ? (
        <p role="alert" className="arq-obra arq-obra-recuperacao">
          {state.error}
          <button
            type="button"
            className="arq-botao"
            onClick={() => void store.getState().load()}
            disabled={state.dirty}
          >
            Tentar novamente
          </button>
        </p>
      ) : null}
      {!photographing && state.recovery ? (
        <p className="arq-obra arq-obra-recuperacao">
          Há uma versão deste aparelho para recuperar.
          <button
            type="button"
            className="arq-botao"
            onClick={() => store.getState().recover()}
            disabled={readonly}
          >
            Recuperar
          </button>
        </p>
      ) : null}
      {house ? (
        <div className="arq-morada-layout">
          <div className="arq-morada-scene">
            <CenaMorada house={house} editing={state.editing} onSelect={select} onPlace={place} />
            {!photographing && !state.editing && active && !moradaFunction(active) ? (
              <div className="arq-obra arq-morada-acoes">
                <strong>{MORADA_CATALOG.pieces[active.pieceId]?.label}</strong>
                {MORADA_CATALOG.pieces[active.pieceId] &&
                isPlantingPiece(MORADA_CATALOG.pieces[active.pieceId]!) ? (
                  <PlotAction instance={active} readonly={readonly} />
                ) : (
                  <SeatActions instance={active} readonly={readonly} />
                )}
                <button
                  type="button"
                  className="arq-botao"
                  onClick={() => {
                    setActive(null)
                    loja.setState({ descanso: null })
                  }}
                >
                  Pronto
                </button>
              </div>
            ) : null}
          </div>
          {state.editing ? (
            <section
              className="arq-obra arq-obra-morada"
              aria-label="Ferramentas de construir"
              hidden={hidden}
            >
              <div className="arq-obra-dica-linha">
                <p className="arq-obra-dica" aria-live="polite">
                  {tool === 'apagar'
                    ? 'Toque na peça que quer retirar.'
                    : pieceId
                      ? 'Toque no chão para colocar a peça. A grade mede meio metro.'
                      : 'Escolha uma ferramenta e uma peça. Toque na casa para ajustar.'}
                </p>
                <small>
                  {state.status === 'saving'
                    ? 'Guardando…'
                    : state.dirty
                      ? 'Mudanças no aparelho'
                      : 'Casa guardada'}
                </small>
              </div>
              <fieldset className="arq-obra-ferramentas">
                <legend className="arq-sr">Ferramentas</legend>
                {FERRAMENTAS.map(([id, nome, emoji]) => (
                  <button
                    type="button"
                    key={id}
                    className="arq-ferramenta"
                    data-ferramenta={id}
                    aria-pressed={tool === id}
                    onClick={() => {
                      setTool(id)
                      setPieceId('')
                      setCategory('')
                      setSelection(null)
                    }}
                  >
                    <span aria-hidden="true">{emoji}</span>
                    <b>{nome}</b>
                  </button>
                ))}
              </fieldset>
              <div className="arq-obra-escolhas">
                <label>
                  Procurar{' '}
                  <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
                </label>
                <label>
                  Categoria{' '}
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Todas</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <details>
                <summary>Área, cômodos e altura</summary>
                <div className="arq-obra-ajustes">
                  <label>
                    Área
                    <select
                      value={roomId}
                      onChange={(e) => {
                        setRoomId(e.target.value)
                        setHeight(0)
                      }}
                    >
                      <option value="">Quintal</option>
                      {house.rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.label} · {room.origin[1]} m
                        </option>
                      ))}
                    </select>
                  </label>
                  <RoomEditor house={house} change={change} selectedRoom={roomId} />
                  <label>
                    Altura em metros
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                    />
                  </label>
                </div>
              </details>
              <details>
                <summary>Projetos conquistados</summary>
                {Object.entries(MORADA_FUNCTION)
                  .filter(
                    ([id]) =>
                      projects[id as ObjetoDaCasa] &&
                      !house.instances.some((i) => i.behavior === `objeto:${id}`),
                  )
                  .map(([id, piece]) => (
                    <button
                      type="button"
                      className="arq-botao"
                      key={id}
                      onClick={() => {
                        setPieceId(piece)
                        setPendingBehavior(`objeto:${id}`)
                        setSelection(null)
                      }}
                    >
                      {CATALOGO_DE_OBJETOS[id as ObjetoDaCasa].molde.nome}
                    </button>
                  ))}
              </details>
              <div className="arq-obra-escolhas rolar">
                {results.map((piece) => (
                  <button
                    type="button"
                    className="arq-obra-escolha"
                    key={piece.id}
                    aria-pressed={piece.id === pieceId}
                    aria-label={piece.label}
                    title={piece.label}
                    onClick={() => {
                      setPieceId(piece.id)
                      setPendingBehavior(undefined)
                      setSelection(null)
                    }}
                  >
                    <img src={moradaFileUrl(piece.thumb)} alt="" loading="lazy" />
                    <b>{piece.label}</b>
                  </button>
                ))}
              </div>
              <div className="arq-obra-acoes">
                <button
                  type="button"
                  className="arq-botao"
                  onClick={() => setRotation((v) => (v + Math.PI / 2) % (Math.PI * 2))}
                >
                  Girar próxima peça
                </button>
                <button
                  type="button"
                  className="arq-botao"
                  onClick={() => store.getState().undo()}
                  disabled={!state.before.length}
                >
                  Desfazer
                </button>
                <button
                  type="button"
                  className="arq-botao"
                  disabled={!pieceId}
                  onClick={() => {
                    const room = house.rooms.find((r) => r.id === roomId)
                    place(room?.origin[0] ?? 0, room?.origin[2] ?? 0)
                  }}
                >
                  Colocar no centro
                </button>
                <button
                  type="button"
                  className="arq-botao arq-obra-pronto"
                  onClick={async () => {
                    if (await store.getState().save()) store.getState().setEditing(false)
                  }}
                >
                  Pronto
                </button>
              </div>
              <details open={!!selected}>
                <summary>Ajustar uma peça</summary>
                <label>
                  Peças da casa
                  <select
                    value={selection ?? ''}
                    onChange={(e) => {
                      setSelection(e.target.value || null)
                      setPieceId('')
                    }}
                  >
                    <option value="">Escolha uma peça</option>
                    {house.instances.map((i) => (
                      <option key={i.id} value={i.id}>
                        {MORADA_CATALOG.pieces[i.pieceId]?.label} · {i.id}
                      </option>
                    ))}
                  </select>
                </label>
                {selected ? (
                  <fieldset>
                    <legend>{MORADA_CATALOG.pieces[selected.pieceId]?.label}</legend>
                    <div className="arq-morada-position">
                      {([0, 1, 2] as const).map((axis) => (
                        <label key={axis}>
                          {['X', 'Altura', 'Z'][axis]}
                          <input
                            type="number"
                            step={0.5}
                            value={selected.position[axis]}
                            onChange={(e) => {
                              const position: [number, number, number] = [...selected.position]
                              position[axis] = snapMorada(Number(e.target.value))
                              updateSelected({ position })
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="arq-botao"
                      onClick={() =>
                        updateSelected({
                          rotation: (selected.rotation + Math.PI / 2) % (Math.PI * 2),
                        })
                      }
                    >
                      Girar
                    </button>
                    <button
                      type="button"
                      className="arq-botao"
                      onClick={() => {
                        remove(selected)
                      }}
                    >
                      Retirar
                    </button>
                    <label>
                      Função
                      <select
                        value={selected.behavior ?? ''}
                        onChange={(e) => {
                          const { behavior: _, ...rest } = selected
                          change({
                            ...house,
                            instances: house.instances.map((i) =>
                              i.id === selected.id
                                ? e.target.value
                                  ? { ...rest, behavior: e.target.value }
                                  : rest
                                : i,
                            ),
                          })
                        }}
                      >
                        <option value="">Decoração</option>
                        {Object.entries(MORADA_FUNCTION)
                          .filter(([id]) => projects[id as ObjetoDaCasa])
                          .map(([id]) => (
                            <option key={id} value={`objeto:${id}`}>
                              {CATALOGO_DE_OBJETOS[id as ObjetoDaCasa].molde.nome}
                            </option>
                          ))}
                      </select>
                    </label>
                    <SlotEditor house={house} selected={selected} update={updateSelected} />
                    <MaterialEditor instance={selected} update={updateSelected} />
                  </fieldset>
                ) : null}
              </details>
              {roomId ? (
                <details>
                  <summary>Aconchego</summary>
                  <p>
                    {(() => {
                      const c = moradaComfort(house, roomId)
                      return `${c.total} pontos de aconchego · ${c.area} m² · ${c.variety} tipos · ${c.plants} plantas · ${c.lights} luzes`
                    })()}
                  </p>
                </details>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : (
        <p role="status">
          {state.status === 'loading' ? 'Abrindo a casa…' : 'A casa está indisponível.'}
        </p>
      )}
    </section>
  )
}

function RoomEditor({
  house,
  change,
  selectedRoom,
}: {
  house: MoradaHouse
  change(house: MoradaHouse): void
  selectedRoom: string
}) {
  const room = house.rooms.find((r) => r.id === selectedRoom)
  return (
    <details>
      <summary>Cômodos e andares</summary>
      <button
        type="button"
        className="arq-botao"
        onClick={() =>
          change({
            ...house,
            rooms: [
              ...house.rooms,
              {
                id: crypto.randomUUID(),
                label: `Cômodo ${house.rooms.length + 1}`,
                origin: [0, 0, 0],
                size: [4, 4],
              },
            ],
          })
        }
      >
        Novo cômodo
      </button>
      {room ? (
        <>
          {([0, 1, 2] as const).map((axis) => (
            <label key={axis}>
              {['Posição X', 'Andar, altura em metros', 'Posição Z'][axis]}
              <input
                type="number"
                step={axis === 1 ? 3.2 : 0.5}
                value={room.origin[axis]}
                onChange={(e) => {
                  const origin: [number, number, number] = [...room.origin]
                  origin[axis] = Number(e.target.value)
                  change({
                    ...house,
                    rooms: house.rooms.map((r) => (r.id === room.id ? { ...r, origin } : r)),
                  })
                }}
              />
            </label>
          ))}
          {([0, 1] as const).map((axis) => (
            <label key={axis}>
              {['Largura', 'Profundidade'][axis]}
              <input
                type="number"
                min={1}
                step={0.5}
                value={room.size[axis]}
                onChange={(e) => {
                  const size: [number, number] = [...room.size]
                  size[axis] = Number(e.target.value)
                  change({
                    ...house,
                    rooms: house.rooms.map((r) => (r.id === room.id ? { ...r, size } : r)),
                  })
                }}
              />
            </label>
          ))}
        </>
      ) : null}
    </details>
  )
}

function SlotEditor({
  house,
  selected,
  update,
}: {
  house: MoradaHouse
  selected: MoradaInstance
  update(values: Partial<MoradaInstance>): void
}) {
  const options = house.instances
    .filter((i) => i.id !== selected.id && i.roomId === selected.roomId)
    .flatMap((i) =>
      (MORADA_CATALOG.pieces[i.pieceId]?.slots ?? []).map((s) => ({
        value: `${i.id}|${s.id}`,
        label: `${MORADA_CATALOG.pieces[i.pieceId]?.label} · ${s.id}`,
      })),
    )
  return (
    <label>
      Apoiar num encaixe
      <select
        value={selected.parentId ? `${selected.parentId}|${selected.slotId}` : ''}
        onChange={(e) => {
          if (!e.target.value) {
            update({ parentId: undefined, slotId: undefined, position: [0, 0, 0] })
            return
          }
          const [parentId, slotId] = e.target.value.split('|')
          if (parentId && slotId) update({ parentId, slotId, position: [0, 0, 0] })
        }}
      >
        <option value="">Sem encaixe</option>
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function MaterialEditor({
  instance,
  update,
}: {
  instance: MoradaInstance
  update(values: Partial<MoradaInstance>): void
}) {
  const piece = MORADA_CATALOG.pieces[instance.pieceId]
  return (
    <details>
      <summary>Cores e texturas</summary>
      {piece?.materials.map((material) => (
        <div key={material.name}>
          <label>
            {material.name}
            <input
              type="color"
              value={instance.materials?.[material.name]?.color ?? '#ffffff'}
              onChange={(e) =>
                update({
                  materials: {
                    ...instance.materials,
                    [material.name]: {
                      ...instance.materials?.[material.name],
                      color: e.target.value,
                    },
                  },
                })
              }
            />
          </label>
          <select
            aria-label={`Textura de ${material.name}`}
            value={instance.materials?.[material.name]?.texture ?? ''}
            onChange={(e) => {
              const prior = instance.materials?.[material.name]
              update({
                materials: {
                  ...instance.materials,
                  [material.name]: {
                    ...(prior?.color ? { color: prior.color } : {}),
                    ...(e.target.value ? { texture: e.target.value } : {}),
                  },
                },
              })
            }}
          >
            <option value="">Textura da peça</option>
            {Object.values(MORADA_CATALOG.textures).map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </details>
  )
}

function SeatActions({ instance, readonly }: { instance: MoradaInstance; readonly: boolean }) {
  const { loja, plataforma } = useJogo()
  const casa = casaMoradaStore(loja, plataforma)
  const resting = useEstado((s) => s.descanso)
  const piece = MORADA_CATALOG.pieces[instance.pieceId]
  const modes = piece ? moradaRestModes(piece) : []
  const seat = modes.includes('sentar')
  const bed = modes.includes('deitar')
  if (readonly) return <p>Aqui você só olha.</p>
  return (
    <>
      {resting ? (
        <>
          <p>
            {resting === 'deitar'
              ? 'Descansando. A energia volta mais depressa.'
              : 'Descansando. A energia volta devagar.'}
          </p>
          <button type="button" className="arq-botao" onClick={() => casa.getState().stopRest()}>
            Levantar
          </button>
        </>
      ) : null}
      {seat ? (
        <button
          type="button"
          className="arq-botao"
          onClick={() => casa.getState().rest(instance.id, 'sentar')}
        >
          Descansar sentado
        </button>
      ) : null}
      {bed ? (
        <button
          type="button"
          className="arq-botao"
          onClick={() => casa.getState().rest(instance.id, 'deitar')}
        >
          Deitar e recuperar energia
        </button>
      ) : null}
    </>
  )
}

function PlotAction({ instance, readonly }: { instance: MoradaInstance; readonly: boolean }) {
  const { loja, movimento } = useJogo()
  const garden = useEstado((s) => s.salvamento.horta)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const index = garden.findIndex((c) => c.id === plantingId(instance.id))
  const plot = garden[index]
  if (!plot) return <p>Guarde a casa para preparar este canteiro.</p>
  const phase = estagio(plot, now, geladeiraEm(loja.getState().salvamento))
  function act() {
    const antes = loja.getState().salvamento.horta[index]
    loja.getState().mudar((save) => {
      const c = save.horta[index]
      if (!c) return save
      const now = new Date()
      const phase = estagio(c, now.getTime(), geladeiraEm(save))
      const horta = [...save.horta]
      if (phase === 'vazio') {
        const seed = (['alface', 'tomate', 'milho'] as Semente[]).find(
          (s) => (save.inventario[`semente-${s}`] ?? 0) > 0,
        )
        const inv = seed && remover(save.inventario, `semente-${seed}`)
        const next = seed && plantar(c, seed, now)
        if (next && inv) {
          horta[index] = next
          return { ...save, horta, inventario: inv }
        }
      }
      if (phase === 'semente') {
        const next = regar(c, now)
        if (next) {
          horta[index] = next
          return { ...save, horta }
        }
      }
      if (phase === 'maduro') {
        const r = colherNaIlha(save, index, now, loja.getState().jornada)
        if (r.ok) return r.salvamento
        loja.getState().dizer('A mochila está cheia. A colheita continua no canteiro.')
      }
      const next = regarComSede(
        c,
        now,
        climaEfetivo(loja.getState(), now.getTime()),
        geladeiraEm(save),
      )
      if (next) {
        horta[index] = next
        return { ...save, horta }
      }
      return save
    })
    // O gesto do que mudou no canteiro: plantou (na terra baixa ou na alta), regou com o regador,
    // ou colheu (pega do chão).
    const depois = loja.getState().salvamento.horta[index]
    if (!antes || !depois || antes === depois) return
    if (!antes.semente && depois.semente) {
      const terra = MORADA_CATALOG.pieces[instance.pieceId]?.max.y ?? 0
      pedirGesto(movimento, gestoDePlantar(terra))
    } else if (antes.semente && !depois.semente) pedirGesto(movimento, 'PegarDoChao')
    else if (depois.regadoEm !== antes.regadoEm) pedirGesto(movimento, 'Regar', 'mao_regador')
  }
  return (
    <>
      <p>{plot.semente ? ITENS[plot.semente]?.nome : 'Canteiro vazio'}</p>
      <p>{falaDeQuandoColhe(plot, now, geladeiraEm(loja.getState().salvamento))}</p>
      <button type="button" className="arq-botao" disabled={readonly} onClick={act}>
        {phase === 'vazio' ? 'Plantar' : phase === 'maduro' ? 'Colher' : 'Regar'}
      </button>
    </>
  )
}
