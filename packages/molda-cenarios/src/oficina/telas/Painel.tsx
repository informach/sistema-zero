import {
  alteracoesDoGesto,
  COLISOES,
  type Colisao,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type InstanciaDeCenario,
  type Transformacao,
} from '@sistemazero/molda-cenarios-core/v2'
import { Eye, EyeOff, Lock, LockOpen } from 'lucide-react'
import { type JSX, useEffect, useId, useState } from 'react'
import { transformacaoNoMundo } from '../acoes'
import { COPY } from '../copy'

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
    const numero = Number(texto.replace(',', '.'))
    if (!Number.isFinite(numero)) {
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
}: {
  rotulo: string
  valor: string
  aoMudar(valor: string): void
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
}: {
  documento: DocumentoDeCenario
  objeto: InstanciaDeCenario
  executar(comandos: ComandoDeCenario[]): void
}): JSX.Element {
  const [proporcao, setProporcao] = useState(true)
  const mundo = transformacaoNoMundo(documento, objeto)
  const atualizar = (alteracoes: Partial<Omit<InstanciaDeCenario, 'id'>>) =>
    executar([{ tipo: 'instancia.atualizar', id: objeto.id, alteracoes }])
  const transformar = (nova: Transformacao) => atualizar(alteracoesDoGesto(documento, objeto, nova))
  const trancado = objeto.bloqueado
  const escala = mundo.escala

  return (
    <div className="mcn-painel-corpo">
      <CampoTexto
        rotulo={COPY.painel.nome}
        valor={objeto.nome}
        aoMudar={(nome) => atualizar({ nome })}
      />

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
              transformar({
                ...mundo,
                escala: { x: escala.x * k, y: fator, z: escala.z * k },
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
        <label className="mcn-marcar">
          <input
            type="checkbox"
            checked={proporcao}
            onChange={(evento) => setProporcao(evento.target.checked)}
          />
          {COPY.painel.proporcao}
        </label>
      </fieldset>

      <div className="mcn-linha">
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          aria-pressed={objeto.bloqueado}
          onClick={() => atualizar({ bloqueado: !objeto.bloqueado })}
        >
          {objeto.bloqueado ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
          {objeto.bloqueado ? COPY.painel.destrancar : COPY.painel.trancar}
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
}: {
  documento: DocumentoDeCenario
  selecao: readonly string[]
  executar(comandos: ComandoDeCenario[]): void
}): JSX.Element {
  const escolhidos = selecao
    .map((id) => documento.instancias.find((o) => o.id === id))
    .filter((o): o is InstanciaDeCenario => Boolean(o))
  const unico = escolhidos.length === 1 ? escolhidos[0] : undefined
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
        <PainelDoObjeto key={unico.id} documento={documento} objeto={unico} executar={executar} />
      ) : escolhidos.length > 1 ? (
        <div className="mcn-painel-corpo">
          <div className="mcn-linha">
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              onClick={() => {
                const trancar = escolhidos.some((o) => !o.bloqueado)
                executar(
                  escolhidos.map((o) => ({
                    tipo: 'instancia.atualizar' as const,
                    id: o.id,
                    alteracoes: { bloqueado: trancar },
                  })),
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
