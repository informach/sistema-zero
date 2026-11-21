import {
  alteracoesDoGesto,
  alteracoesDoGestoDaMontagem,
  alterarElemento,
  alturaDoChao,
  COLISOES,
  type Colisao,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type EntidadeTransformavel,
  entidadesTransformaveis,
  type FonteDeAlturas,
  type InstanciaDeCenario,
  indiceDaOrganizacao,
  LIMITES_CENARIO_V2,
  type MontagemDeConjunto,
  posicaoDaMontagem,
  type Transformacao,
} from '@sistemazero/molda-cenarios-core/v2'
import { Eye, EyeOff, Lock, LockOpen } from 'lucide-react'
import { type JSX, useEffect, useId, useMemo, useState } from 'react'
import { transformacaoNoMundo } from '../acoes'
import { COPY } from '../copy'
import { useFerramentas } from '../faixas'

const GRAUS = 180 / Math.PI

function arredondar(n: number, casas = 2): number {
  const f = 10 ** casas
  return Math.round(n * f) / f
}

/** Campo de número que só grava ao sair ou no Enter, para não criar um passo por tecla. */
export function CampoNumero({
  rotulo,
  valor,
  aoMudar,
  passo = 0.5,
  min,
  max,
  sufixo,
  desligado,
}: {
  rotulo: string
  valor: number
  aoMudar(valor: number): void
  passo?: number
  min?: number
  max?: number
  sufixo?: string
  desligado?: boolean
}): JSX.Element {
  const id = useId()
  const [texto, setTexto] = useState(String(valor))
  useEffect(() => setTexto(String(valor)), [valor])
  const gravar = () => {
    const limpo = texto.trim().replace(',', '.')
    const numero = Number(limpo)
    // Campo vazio (ou só "-") volta ao valor de antes: Number('') é 0 e mudaria o objeto.
    if (!limpo || limpo === '-' || !Number.isFinite(numero)) {
      setTexto(String(valor))
      return
    }
    const preso = Math.min(
      max ?? Number.POSITIVE_INFINITY,
      Math.max(min ?? Number.NEGATIVE_INFINITY, numero),
    )
    setTexto(String(preso))
    if (preso !== valor) aoMudar(preso)
  }
  return (
    <label htmlFor={id} className="mcn-numero">
      <span>{rotulo}</span>
      <span className="mcn-numero-caixa">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={passo}
          min={min}
          max={max}
          value={texto}
          disabled={desligado}
          onChange={(evento) => setTexto(evento.target.value)}
          onBlur={gravar}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              gravar()
            }
          }}
        />
        {sufixo ? <small aria-hidden="true">{sufixo}</small> : null}
      </span>
    </label>
  )
}

function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  desligado = false,
}: {
  rotulo: string
  valor: string
  aoMudar(valor: string): void
  desligado?: boolean
}): JSX.Element {
  const id = useId()
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  const gravar = () => {
    const limpo = texto.trim()
    if (!limpo) setTexto(valor)
    else if (limpo !== valor) aoMudar(limpo)
  }
  return (
    <label htmlFor={id} className="mcn-campo">
      <span>{rotulo}</span>
      <input
        id={id}
        value={texto}
        disabled={desligado}
        maxLength={120}
        autoComplete="off"
        onChange={(evento) => setTexto(evento.target.value)}
        onBlur={gravar}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
            gravar()
          }
        }}
      />
    </label>
  )
}

function PainelDoObjeto({
  documento,
  objeto,
  executar,
  fonte,
}: {
  documento: DocumentoDeCenario
  objeto: InstanciaDeCenario
  executar(comandos: ComandoDeCenario[]): void
  fonte?: FonteDeAlturas
}): JSX.Element {
  const { pode } = useFerramentas()
  const [escolhaDaProporcao, setProporcao] = useState(true)
  // Tamanho por eixo é do intermediário: no básico o tamanho é sempre proporcional.
  const proporcao = escolhaDaProporcao || !pode('objetos.precisao')
  const mundo = transformacaoNoMundo(documento, objeto, fonte)
  const atualizar = (alteracoes: Partial<Omit<InstanciaDeCenario, 'id'>>) =>
    executar([{ tipo: 'instancia.atualizar', id: objeto.id, alteracoes }])
  const transformar = (nova: Transformacao) =>
    atualizar(alteracoesDoGesto(documento, objeto, nova, fonte))
  const flags = useMemo(
    () => indiceDaOrganizacao(documento).flags.get(objeto.id),
    [documento, objeto.id],
  )
  const trancado = Boolean(flags?.bloqueado)
  const escala = mundo.escala

  return (
    <div className="mcn-painel-corpo">
      <CampoTexto
        rotulo={COPY.painel.nome}
        valor={objeto.nome}
        aoMudar={(nome) => atualizar({ nome })}
        desligado={trancado}
      />
      {flags?.bloqueioHerdado ? (
        <p className="text-sm text-mld-muted">Este objeto está trancado na pasta ou camada.</p>
      ) : null}

      <fieldset className="mcn-grupo" disabled={trancado}>
        <legend>{COPY.painel.lugar}</legend>
        <div className="mcn-linha">
          <CampoNumero
            rotulo="X"
            valor={arredondar(mundo.posicao.x)}
            sufixo={COPY.painel.metros}
            aoMudar={(x) => transformar({ ...mundo, posicao: { ...mundo.posicao, x } })}
          />
          <CampoNumero
            rotulo="Z"
            valor={arredondar(mundo.posicao.z)}
            sufixo={COPY.painel.metros}
            aoMudar={(z) => transformar({ ...mundo, posicao: { ...mundo.posicao, z } })}
          />
        </div>
        <CampoNumero
          rotulo={COPY.painel.altura}
          valor={arredondar(mundo.posicao.y)}
          sufixo={COPY.painel.metros}
          passo={0.25}
          aoMudar={(y) => transformar({ ...mundo, posicao: { ...mundo.posicao, y } })}
        />
      </fieldset>

      <fieldset className="mcn-grupo" disabled={trancado}>
        <legend>{COPY.painel.giro}</legend>
        <CampoNumero
          rotulo={COPY.painel.giro}
          valor={arredondar(mundo.rotacao.y * GRAUS, 1)}
          passo={15}
          sufixo={COPY.painel.graus}
          aoMudar={(graus) =>
            transformar({ ...mundo, rotacao: { ...mundo.rotacao, y: graus / GRAUS } })
          }
        />
        {objeto.apoio.tipo === 'terreno' && documento.base.tipo === 'terreno' ? (
          <label className="mcn-marcar">
            <input
              type="checkbox"
              checked={objeto.apoio.inclinar}
              onChange={(evento) =>
                objeto.apoio.tipo === 'terreno' &&
                atualizar({ apoio: { ...objeto.apoio, inclinar: evento.target.checked } })
              }
            />
            Inclinar com a encosta
          </label>
        ) : null}
      </fieldset>

      <fieldset className="mcn-grupo" disabled={trancado}>
        <legend>{COPY.painel.tamanho}</legend>
        {proporcao ? (
          <CampoNumero
            rotulo={COPY.painel.tamanho}
            valor={arredondar(escala.y)}
            passo={0.1}
            min={0.01}
            max={100}
            sufixo="×"
            aoMudar={(fator) => {
              const k = fator / escala.y
              // Objeto do mesmo tamanho nos três eixos continua exato (sem o resto da divisão).
              const uniforme =
                Math.abs(escala.x - escala.y) <= 1e-6 * escala.y &&
                Math.abs(escala.z - escala.y) <= 1e-6 * escala.y
              transformar({
                ...mundo,
                escala: uniforme
                  ? { x: fator, y: fator, z: fator }
                  : { x: escala.x * k, y: fator, z: escala.z * k },
              })
            }}
          />
        ) : (
          <div className="mcn-linha">
            {(['x', 'y', 'z'] as const).map((eixo) => (
              <CampoNumero
                key={eixo}
                rotulo={eixo.toUpperCase()}
                valor={arredondar(escala[eixo])}
                passo={0.1}
                min={0.01}
                max={100}
                aoMudar={(valor) => transformar({ ...mundo, escala: { ...escala, [eixo]: valor } })}
              />
            ))}
          </div>
        )}
        {pode('objetos.precisao') ? (
          <label className="mcn-marcar">
            <input
              type="checkbox"
              checked={proporcao}
              onChange={(evento) => setProporcao(evento.target.checked)}
            />
            {COPY.painel.proporcao}
          </label>
        ) : null}
      </fieldset>

      <div className="mcn-linha">
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          aria-pressed={trancado}
          disabled={flags?.bloqueioHerdado}
          onClick={() => atualizar({ bloqueado: !objeto.bloqueado })}
        >
          {trancado ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
          {flags?.bloqueioHerdado
            ? 'Trancado'
            : objeto.bloqueado
              ? COPY.painel.destrancar
              : COPY.painel.trancar}
        </button>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          aria-pressed={objeto.oculto}
          disabled={trancado}
          onClick={() => atualizar({ oculto: !objeto.oculto })}
        >
          {objeto.oculto ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {objeto.oculto ? COPY.painel.mostrar : COPY.painel.esconder}
        </button>
      </div>

      <details className="mld-disclosure">
        <summary>{COPY.painel.mais}</summary>
        <fieldset className="mcn-grupo mt-3" disabled={trancado}>
          {pode('objetos.colisao') ? (
            <>
              <legend>{COPY.painel.colisao}</legend>
              <select
                className="sz-tool-select w-full"
                value={objeto.colisao}
                aria-label={COPY.painel.colisao}
                onChange={(evento) => atualizar({ colisao: evento.target.value as Colisao })}
              >
                {COLISOES.map((colisao) => (
                  <option key={colisao} value={colisao}>
                    {COPY.painel.colisoes[colisao]}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <div className="mcn-linha">
            <CampoNumero
              rotulo="Giro X"
              valor={arredondar(mundo.rotacao.x * GRAUS, 1)}
              passo={15}
              sufixo={COPY.painel.graus}
              aoMudar={(graus) =>
                transformar({ ...mundo, rotacao: { ...mundo.rotacao, x: graus / GRAUS } })
              }
            />
            <CampoNumero
              rotulo="Giro Z"
              valor={arredondar(mundo.rotacao.z * GRAUS, 1)}
              passo={15}
              sufixo={COPY.painel.graus}
              aoMudar={(graus) =>
                transformar({ ...mundo, rotacao: { ...mundo.rotacao, z: graus / GRAUS } })
              }
            />
          </div>
        </fieldset>
      </details>
    </div>
  )
}

function PainelDaMontagem({
  documento,
  montagem,
  executar,
  aoEditar,
  fonte,
}: {
  documento: DocumentoDeCenario
  montagem: MontagemDeConjunto
  executar(comandos: ComandoDeCenario[]): void
  aoEditar?(): void
  fonte?: FonteDeAlturas
}): JSX.Element {
  const flags = indiceDaOrganizacao(documento).flags.get(montagem.id),
    trancado = Boolean(flags?.bloqueado)
  const definicao = documento.definicoesConjuntos?.find((d) => d.id === montagem.definicao),
    t = { ...montagem.transformacao, posicao: posicaoDaMontagem(documento, montagem, fonte) }
  const atualizar = (alteracoes: Partial<Omit<MontagemDeConjunto, 'id'>>) =>
    executar([
      {
        tipo: 'montagem.atualizar',
        id: montagem.id,
        alteracoes: {
          ...(alteracoes.transformacao
            ? alteracoesDoGestoDaMontagem(documento, montagem, alteracoes.transformacao, fonte)
            : {}),
          ...alteracoes,
        },
      },
    ])
  return (
    <div className="mcn-painel-corpo">
      <p className="text-sm text-mld-muted">
        {definicao?.nome ?? montagem.nome} · versão {definicao?.revisao}
      </p>
      <label className="mcn-marcar">
        <input
          type="checkbox"
          checked={montagem.apoio?.tipo === 'terreno'}
          disabled={trancado}
          onChange={(e) =>
            atualizar({
              transformacao: t,
              apoio: e.target.checked
                ? {
                    tipo: 'terreno',
                    deslocamento:
                      t.posicao.y - alturaDoChao(documento.base, t.posicao.x, t.posicao.z, fonte),
                  }
                : { tipo: 'absoluto' },
            })
          }
        />
        Acompanhar terreno
      </label>
      <CampoTexto
        rotulo={COPY.painel.nome}
        valor={montagem.nome}
        aoMudar={(nome) => atualizar({ nome })}
        desligado={trancado}
      />
      {flags?.bloqueioHerdado ? (
        <p className="text-sm text-mld-muted">Este conjunto está trancado na pasta ou camada.</p>
      ) : null}
      <fieldset className="mcn-grupo" disabled={trancado}>
        <legend>{COPY.painel.lugar}</legend>
        <div className="mcn-linha">
          {(['x', 'y', 'z'] as const).map((e) => (
            <CampoNumero
              key={e}
              rotulo={e.toUpperCase()}
              valor={arredondar(t.posicao[e])}
              sufixo={COPY.painel.metros}
              aoMudar={(n) =>
                atualizar({ transformacao: { ...t, posicao: { ...t.posicao, [e]: n } } })
              }
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="mcn-grupo" disabled={trancado}>
        <legend>{COPY.painel.giro}</legend>
        <div className="mcn-linha">
          {(['x', 'y', 'z'] as const).map((e) => (
            <CampoNumero
              key={e}
              rotulo={e.toUpperCase()}
              valor={arredondar(t.rotacao[e] * GRAUS)}
              passo={15}
              sufixo="°"
              aoMudar={(n) =>
                atualizar({ transformacao: { ...t, rotacao: { ...t.rotacao, [e]: n / GRAUS } } })
              }
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="mcn-grupo" disabled={trancado}>
        <legend>{COPY.painel.tamanho}</legend>
        <CampoNumero
          rotulo="Tamanho do conjunto"
          valor={arredondar(t.escala.x, 3)}
          passo={0.1}
          min={0.01}
          max={100}
          sufixo="×"
          aoMudar={(n) => atualizar({ transformacao: { ...t, escala: { x: n, y: n, z: n } } })}
        />
        <p className="text-sm text-mld-muted">As peças mantêm suas proporções.</p>
      </fieldset>
      <div className="mcn-linha">
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={Boolean(flags?.bloqueioHerdado)}
          onClick={() => atualizar({ bloqueado: !montagem.bloqueado })}
        >
          {montagem.bloqueado ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
          {montagem.bloqueado ? COPY.painel.destrancar : COPY.painel.trancar}
        </button>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={trancado || Boolean(flags?.ocultacaoHerdada)}
          onClick={() => atualizar({ oculto: !montagem.oculto })}
        >
          {montagem.oculto ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
          {montagem.oculto ? COPY.painel.mostrar : COPY.painel.esconder}
        </button>
      </div>
      {aoEditar ? (
        <button type="button" className="sz-tool-pill sz-tool-pill--outline" onClick={aoEditar}>
          Editar conjunto
        </button>
      ) : null}
      <button
        type="button"
        className="sz-tool-pill sz-tool-pill--outline"
        disabled={trancado}
        onClick={() =>
          executar([{ tipo: 'montagem.desvincular', id: montagem.id, posicao: t.posicao }])
        }
      >
        Separar peças
      </button>
      <p className="text-sm text-mld-muted">
        Separar transforma esta cópia em peças independentes. Você pode desfazer.
      </p>
    </div>
  )
}

/** O deslizante da hora só grava quando a pessoa solta: arrastar não vira dezenas de passos. */
function HoraDoDia({ hora, aoMudar }: { hora: number; aoMudar(hora: number): void }): JSX.Element {
  const [valor, setValor] = useState(hora)
  useEffect(() => setValor(hora), [hora])
  const gravar = () => {
    if (valor !== hora) aoMudar(valor)
  }
  return (
    <fieldset className="mcn-grupo">
      <legend>{COPY.painel.hora}</legend>
      <input
        type="range"
        min={0}
        max={24}
        step={0.5}
        value={valor}
        aria-label={COPY.painel.hora}
        className="mcn-deslizante"
        onChange={(evento) => setValor(Number(evento.target.value))}
        onPointerUp={gravar}
        onKeyUp={gravar}
        onBlur={gravar}
      />
      <output className="font-bold text-mld-muted text-sm">
        {`${String(Math.floor(valor)).padStart(2, '0')}:${valor % 1 ? '30' : '00'}`}
      </output>
    </fieldset>
  )
}

function PainelDoCenario({
  documento,
  executar,
}: {
  documento: DocumentoDeCenario
  executar(comandos: ComandoDeCenario[]): void
}): JSX.Element {
  const base = documento.base
  return (
    <div className="mcn-painel-corpo">
      <CampoTexto
        rotulo={COPY.painel.nome}
        valor={documento.nome}
        aoMudar={(nome) => executar([{ tipo: 'cenario.renomear', nome }])}
      />
      {base.tipo === 'plano' ? (
        <fieldset className="mcn-grupo">
          <legend>{COPY.painel.chao}</legend>
          <div className="mcn-linha">
            <CampoNumero
              rotulo={COPY.painel.largura}
              valor={base.largura}
              passo={16}
              min={8}
              max={8192}
              sufixo={COPY.painel.metros}
              aoMudar={(largura) =>
                executar([{ tipo: 'base.definir', base: { ...base, largura } }])
              }
            />
            <CampoNumero
              rotulo={COPY.painel.comprimento}
              valor={base.comprimento}
              passo={16}
              min={8}
              max={8192}
              sufixo={COPY.painel.metros}
              aoMudar={(comprimento) =>
                executar([{ tipo: 'base.definir', base: { ...base, comprimento } }])
              }
            />
          </div>
        </fieldset>
      ) : null}
      <HoraDoDia
        hora={documento.iluminacao.hora}
        aoMudar={(hora) => executar([{ tipo: 'iluminacao.definir', iluminacao: { hora } }])}
      />
    </div>
  )
}

/** O painel da direita: os detalhes do que está escolhido, ou do cenário quando nada está. */
export function Painel({
  documento,
  selecao,
  executar,
  fonte,
  aoEditarConjunto,
}: {
  documento: DocumentoDeCenario
  selecao: readonly string[]
  executar(comandos: ComandoDeCenario[]): void
  fonte?: FonteDeAlturas
  aoEditarConjunto?(conjuntoId: string): void
}): JSX.Element {
  const porId = new Map(entidadesTransformaveis(documento).map((o) => [o.id, o]))
  const escolhidos = selecao
    .map((id) => porId.get(id))
    .filter((o): o is EntidadeTransformavel => Boolean(o))
  const unico = escolhidos.length === 1 ? escolhidos[0] : undefined
  const indice = useMemo(() => indiceDaOrganizacao(documento), [documento])
  return (
    <>
      <h2 className="mld-kicker px-4 pt-4">
        {unico
          ? COPY.painel.titulo
          : escolhidos.length > 1
            ? COPY.painel.varios(escolhidos.length)
            : COPY.painel.cenario}
      </h2>
      {unico ? (
        'definicao' in unico ? (
          <PainelDaMontagem
            documento={documento}
            montagem={unico}
            fonte={fonte}
            executar={executar}
            aoEditar={
              aoEditarConjunto
                ? () =>
                    aoEditarConjunto(
                      documento.definicoesConjuntos!.find((d) => d.id === unico.definicao)!
                        .conjunto,
                    )
                : undefined
            }
          />
        ) : (
          <PainelDoObjeto
            key={unico.id}
            documento={documento}
            objeto={unico}
            executar={executar}
            fonte={fonte}
          />
        )
      ) : escolhidos.length > 1 ? (
        <div className="mcn-painel-corpo">
          <div className="mcn-linha">
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={
                escolhidos.length > LIMITES_CENARIO_V2.comandos ||
                escolhidos.some((o) => indice.flags.get(o.id)?.bloqueioHerdado)
              }
              onClick={() => {
                const trancar = escolhidos.some((o) => !o.bloqueado)
                executar(
                  escolhidos.flatMap((o) =>
                    alterarElemento(documento, o.id, { bloqueado: trancar }),
                  ),
                )
              }}
            >
              <Lock aria-hidden="true" />
              {escolhidos.some((o) => !o.bloqueado) ? COPY.painel.trancar : COPY.painel.destrancar}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="px-4 pt-1 text-mld-muted text-sm">{COPY.painel.nadaDica}</p>
          <PainelDoCenario documento={documento} executar={executar} />
        </>
      )}
    </>
  )
}
