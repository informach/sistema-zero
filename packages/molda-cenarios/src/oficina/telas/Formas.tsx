import type { FormaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { type JSX, useState } from 'react'
import { novoIdAleatorio } from '../acoes'
import { Dialogo } from '../pecas'
import { CampoNumero } from './Painel'

const NOMES = { caixa: 'Caixa', rampa: 'Rampa', escada: 'Escada', cilindro: 'Cilindro' } as const

export function Formas({
  aoCriar,
  aoFechar,
}: {
  aoCriar(forma: FormaDeCenario): boolean
  aoFechar(): void
}): JSX.Element {
  const [tipo, setTipo] = useState<keyof typeof NOMES>('caixa')
  const [largura, setLargura] = useState(2),
    [altura, setAltura] = useState(1),
    [comprimento, setComprimento] = useState(2)
  const [raio, setRaio] = useState(1),
    [degraus, setDegraus] = useState(6),
    [lados, setLados] = useState(24)
  const [erro, setErro] = useState<string | null>(null)
  return (
    <Dialogo titulo="Blocos de rascunho" aoFechar={aoFechar}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          try {
            const base = { id: `forma/${novoIdAleatorio()}`, nome: NOMES[tipo], altura }
            const forma: FormaDeCenario =
              tipo === 'cilindro'
                ? { ...base, tipo, raio, lados }
                : tipo === 'escada'
                  ? { ...base, tipo, largura, comprimento, degraus }
                  : { ...base, tipo, largura, comprimento }
            if (aoCriar(forma)) aoFechar()
          } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não consegui colocar o bloco')
          }
        }}
      >
        <label className="mcn-campo">
          <span>Forma</span>
          <select
            aria-label="Forma"
            value={tipo}
            onChange={(e) => {
              const valor = e.target.value
              if (
                valor === 'caixa' ||
                valor === 'rampa' ||
                valor === 'escada' ||
                valor === 'cilindro'
              )
                setTipo(valor)
            }}
          >
            {(['caixa', 'rampa', 'escada', 'cilindro'] as const).map((valor) => (
              <option key={valor} value={valor}>
                {NOMES[valor]}
              </option>
            ))}
          </select>
        </label>
        <CampoNumero
          rotulo="Altura do bloco"
          sufixo="m"
          valor={altura}
          min={0.1}
          max={128}
          passo={0.1}
          aoMudar={setAltura}
        />
        {tipo === 'cilindro' ? (
          <>
            <CampoNumero
              rotulo="Raio"
              sufixo="m"
              valor={raio}
              min={0.1}
              max={128}
              passo={0.1}
              aoMudar={setRaio}
            />
            <CampoNumero
              rotulo="Lados"
              valor={lados}
              min={3}
              max={64}
              passo={1}
              aoMudar={(n) => setLados(Math.round(n))}
            />
          </>
        ) : (
          <>
            <CampoNumero
              rotulo="Largura do bloco"
              sufixo="m"
              valor={largura}
              min={0.1}
              max={128}
              passo={0.1}
              aoMudar={setLargura}
            />
            <CampoNumero
              rotulo="Comprimento do bloco"
              sufixo="m"
              valor={comprimento}
              min={0.1}
              max={128}
              passo={0.1}
              aoMudar={setComprimento}
            />
          </>
        )}
        {tipo === 'escada' ? (
          <CampoNumero
            rotulo="Degraus"
            valor={degraus}
            min={1}
            max={64}
            passo={1}
            aoMudar={(n) => setDegraus(Math.round(n))}
          />
        ) : null}
        <p className="text-sm text-mld-muted">
          Blocos para estudar espaços e testar percursos. A rampa e a escada sobem na direção Z.
        </p>
        {erro ? (
          <p role="alert" className="text-mld-danger">
            {erro}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="sz-tool-pill sz-tool-pill--primary">
            Colocar bloco
          </button>
          <button type="button" className="sz-tool-pill sz-tool-pill--quiet" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
