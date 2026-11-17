import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import type {
  ComandoDoTeste,
  ConfiguracaoDoTeste,
  EntradaDoTeste,
  EstadoDoTeste,
  ModoDoTeste,
} from '@sistemazero/molda-cenarios-motor'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Footprints,
  Pause,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react'
import { type JSX, useEffect, useState } from 'react'
import { Dialogo } from '../pecas'

const MODOS = [
  ['terceira', 'Terceira pessoa'],
  ['primeira', 'Primeira pessoa'],
  ['voo', 'Voo livre'],
] as const
export function PrepararTeste({
  documento,
  ocupado,
  erro,
  iniciar,
  fechar,
}: {
  documento: DocumentoDeCenario
  ocupado: boolean
  erro: string | null
  iniciar(config: ConfiguracaoDoTeste): void
  fechar(): void
}): JSX.Element {
  const [modo, setModo] = useState<ModoDoTeste>('terceira'),
    [modeloId, setModeloId] = useState(''),
    [altura, setAltura] = useState(1.16),
    [nativa, setNativa] = useState(true),
    [giro, setGiro] = useState(0)
  const modelo = documento.modelos.find((m) => m.id === modeloId)
  return (
    <Dialogo titulo="Testar o cenário" aoFechar={fechar}>
      <p>Entre no lugar que está no centro da vista. O teste não muda sua montagem.</p>
      <fieldset disabled={ocupado} className="mcn-teste-preparar">
        <label>
          Como explorar
          <select value={modo} onChange={(e) => setModo(e.target.value as ModoDoTeste)}>
            {MODOS.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Personagem
          <select
            value={modeloId}
            onChange={(e) => {
              setModeloId(e.target.value)
              setNativa(true)
            }}
          >
            <option value="">Boneco de referência</option>
            {documento.modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome ?? m.id}
              </option>
            ))}
          </select>
        </label>
        {modelo ? (
          <label className="mcn-opcao">
            <input type="checkbox" checked={nativa} onChange={(e) => setNativa(e.target.checked)} />
            Manter tamanho nativo do modelo
          </label>
        ) : null}
        {!modelo || !nativa ? (
          <label>
            Altura em metros
            <input
              type="number"
              min={0.3}
              max={10}
              step={0.01}
              value={altura}
              onChange={(e) => setAltura(e.target.valueAsNumber)}
            />
          </label>
        ) : (
          <p>
            O corpo e a câmera vão acompanhar a altura real do GLB. Os clipes disponíveis poderão
            ser escolhidos no teste.
          </p>
        )}
        {modelo ? (
          <label>
            Frente do modelo
            <select value={giro} onChange={(e) => setGiro(Number(e.target.value))}>
              {[0, 90, 180, 270].map((g) => (
                <option key={g} value={g}>
                  {g}°
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className="sz-tool-btn sz-tool-btn--primary"
          disabled={
            (!modelo || !nativa) && (!Number.isFinite(altura) || altura < 0.3 || altura > 10)
          }
          onClick={() =>
            iniciar({
              modo,
              ...(modelo ? { modelo, giroDoModelo: (giro * Math.PI) / 180 } : {}),
              ...(!modelo || !nativa ? { altura } : {}),
            })
          }
        >
          <Play aria-hidden="true" />
          {ocupado ? 'Preparando…' : 'Entrar no cenário'}
        </button>
      </fieldset>
      {erro ? <p role="alert">{erro}</p> : null}
      <button type="button" className="sz-tool-pill" onClick={fechar}>
        {ocupado ? 'Cancelar preparação' : 'Continuar editando'}
      </button>
    </Dialogo>
  )
}

function Pressionar({
  nome,
  children,
  aoApertar,
  aoSoltar,
}: {
  nome: string
  children: JSX.Element
  aoApertar(): void
  aoSoltar(): void
}) {
  return (
    <button
      type="button"
      className="sz-tool-icon-btn mcn-teste-pressionar"
      aria-label={nome}
      title={nome}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        aoApertar()
      }}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      onLostPointerCapture={aoSoltar}
      onKeyDown={(e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault()
          aoApertar()
        }
      }}
      onKeyUp={(e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault()
          aoSoltar()
        }
      }}
    >
      {children}
    </button>
  )
}

const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
export function ControlesTeste({
  estado,
  comandar,
  entrada,
  fechar,
}: {
  estado: EstadoDoTeste
  comandar(c: ComandoDoTeste): void
  entrada(e: Partial<EntradaDoTeste>): void
  fechar(): void
}) {
  const [correr, setCorrer] = useState(false),
    [verClipes, setVerClipes] = useState(false),
    [clipes, setClipes] = useState<NonNullable<ConfiguracaoDoTeste['clipes']>>({})
  useEffect(() => {
    if (estado.pausado) setCorrer(false)
  }, [estado.pausado])
  const p = estado.percurso
  return (
    <section className="mcn-teste-controles" aria-label="Exploração do cenário">
      <div className="mcn-teste-barra mld-float">
        <label>
          Vista
          <select
            aria-label="Modo de exploração"
            value={estado.modo}
            onChange={(e) => comandar({ modo: e.target.value as ModoDoTeste })}
          >
            {MODOS.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <span>Altura: {numero(estado.altura)} m</span>
        <button
          type="button"
          className="sz-tool-pill"
          disabled={estado.caiu}
          onClick={() => comandar({ pausado: !estado.pausado })}
        >
          {estado.pausado ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          {estado.pausado ? 'Continuar' : 'Pausar'}
        </button>
        <button
          type="button"
          className="sz-tool-icon-btn"
          aria-label="Retornar ao início do teste"
          title="Retornar ao início do teste"
          onClick={() => comandar({ retomarInicio: true })}
        >
          <RotateCcw aria-hidden="true" />
        </button>
        <button type="button" className="sz-tool-pill" onClick={fechar}>
          <X aria-hidden="true" />
          Editar
        </button>
      </div>
      <div className="mcn-teste-medida mld-float">
        <div className="flex flex-wrap items-center gap-2">
          <Footprints aria-hidden="true" />
          <strong>Percurso</strong>
          <span>
            {p.estado === 'medindo'
              ? 'Medindo'
              : p.estado === 'concluido'
                ? 'Concluído'
                : 'Pronto para medir'}
          </span>
        </div>
        <dl>
          <div>
            <dt>Direta</dt>
            <dd>{numero(p.direta)} m</dd>
          </div>
          <div>
            <dt>Caminhada</dt>
            <dd>{numero(p.caminhada)} m</dd>
          </div>
          <div>
            <dt>Tempo ativo</dt>
            <dd>{numero(p.segundos)} s</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="sz-tool-pill"
            disabled={estado.modo === 'voo' || estado.pausado || estado.caiu}
            onClick={() => comandar({ percurso: p.estado === 'medindo' ? 'finalizar' : 'iniciar' })}
          >
            {p.estado === 'medindo' ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
            {p.estado === 'medindo' ? 'Finalizar' : 'Medir caminhada'}
          </button>
          <button
            type="button"
            className="sz-tool-pill"
            onClick={() => comandar({ percurso: 'zerar' })}
          >
            Zerar
          </button>
        </div>
        <small>Pausas, voo, salto, queda e retorno ao início não entram na caminhada.</small>
      </div>
      {estado.pausado || estado.caiu ? (
        <div className="mcn-teste-pausa mld-float" role="status">
          <strong>{estado.caiu ? 'Você saiu da área do cenário' : 'Teste pausado'}</strong>
          <p>
            {estado.caiu
              ? 'Retorne ao início para continuar.'
              : 'Continue quando quiser. Sua montagem está preservada.'}
          </p>
        </div>
      ) : null}
      <details className="mcn-teste-ajuda mld-float">
        <summary>Como explorar</summary>
        <p>
          WASD ou setas para andar; Shift para correr; Espaço para pular. Arraste a vista para
          olhar. No voo, E sobe e Q desce. Esc pausa.
        </p>
        <p>No toque, use os botões e arraste a vista com a outra mão.</p>
        {estado.clipes.length ? (
          <>
            <button type="button" className="sz-tool-pill" onClick={() => setVerClipes(!verClipes)}>
              Animações do personagem
            </button>
            {verClipes ? (
              <div className="mcn-teste-clipes">
                {(
                  [
                    ['parado', 'Parado'],
                    ['andando', 'Andando'],
                    ['correndo', 'Correndo'],
                    ['saltando', 'No ar'],
                  ] as const
                ).map(([id, nome]) => (
                  <label key={id}>
                    {nome}
                    <select
                      value={clipes[id] ?? ''}
                      onChange={(e) => {
                        const proxima = { ...clipes, [id]: e.target.value }
                        setClipes(proxima)
                        comandar({ clipes: proxima })
                      }}
                    >
                      <option value="">Sem clipe</option>
                      {estado.clipes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p>Este personagem não tem clipes no arquivo.</p>
        )}
      </details>
      <fieldset className="mcn-teste-toque" aria-label="Controles de movimento">
        <div className="mcn-teste-direcoes">
          <Pressionar
            nome="Andar para frente"
            aoApertar={() => entrada({ frente: 1 })}
            aoSoltar={() => entrada({ frente: 0 })}
          >
            <ArrowUp />
          </Pressionar>
          <div className="flex gap-1">
            <Pressionar
              nome="Andar para esquerda"
              aoApertar={() => entrada({ lado: -1 })}
              aoSoltar={() => entrada({ lado: 0 })}
            >
              <ArrowLeft />
            </Pressionar>
            <Pressionar
              nome="Andar para trás"
              aoApertar={() => entrada({ frente: -1 })}
              aoSoltar={() => entrada({ frente: 0 })}
            >
              <ArrowDown />
            </Pressionar>
            <Pressionar
              nome="Andar para direita"
              aoApertar={() => entrada({ lado: 1 })}
              aoSoltar={() => entrada({ lado: 0 })}
            >
              <ArrowRight />
            </Pressionar>
          </div>
        </div>
        <div className="flex items-end gap-1">
          <button
            type="button"
            className="sz-tool-pill"
            aria-pressed={correr}
            onClick={() => {
              setCorrer(!correr)
              entrada({ correr: !correr })
            }}
          >
            Correr
          </button>
          {estado.modo === 'voo' ? (
            <>
              <Pressionar
                nome="Subir no voo"
                aoApertar={() => entrada({ vertical: 1 })}
                aoSoltar={() => entrada({ vertical: 0 })}
              >
                <ArrowUp />
              </Pressionar>
              <Pressionar
                nome="Descer no voo"
                aoApertar={() => entrada({ vertical: -1 })}
                aoSoltar={() => entrada({ vertical: 0 })}
              >
                <ArrowDown />
              </Pressionar>
            </>
          ) : (
            <Pressionar
              nome="Pular"
              aoApertar={() => entrada({ saltar: true })}
              aoSoltar={() => entrada({ saltar: false })}
            >
              <ArrowUp />
            </Pressionar>
          )}
        </div>
      </fieldset>
    </section>
  )
}
