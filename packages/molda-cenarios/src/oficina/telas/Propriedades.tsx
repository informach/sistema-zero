import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  type Propriedades as Dados,
  type LinhaDePropriedade,
  linhasDasPropriedades,
  propriedadesDasLinhas,
} from '../propriedades-formulario'

type Linha = LinhaDePropriedade & { id: string }
/** Pares tipados, guardados juntos. A chave React vem do formulário, não do texto que está sendo editado. */
export function Propriedades({
  valor = {},
  aoGuardar,
  desligado = false,
  rotuloAcao = 'Guardar propriedades',
}: {
  valor?: Dados
  aoGuardar(valor: Dados): boolean
  desligado?: boolean
  rotuloAcao?: string
}) {
  const prefixo = useId(),
    contador = useRef(0),
    serializado = JSON.stringify(valor),
    criarLinha = (l: LinhaDePropriedade): Linha => ({
      ...l,
      id: `${prefixo}/${contador.current++}`,
    }),
    [linhas, setLinhas] = useState<Linha[]>(() => linhasDasPropriedades(valor).map(criarLinha)),
    [base, setBase] = useState(serializado),
    [erro, setErro] = useState<string | null>(null),
    [mensagem, setMensagem] = useState<string | null>(null)
  const dados = useMemo(() => {
      try {
        return { valor: propriedadesDasLinhas(linhas), erro: null }
      } catch (erro) {
        return {
          valor: null,
          erro: erro instanceof Error ? erro.message : 'Confira as propriedades.',
        }
      }
    }, [linhas]),
    sujo = dados.valor === null || JSON.stringify(dados.valor) !== base,
    conflito = serializado !== base && sujo
  // Dados atualizados sem rascunho local são sincronizados; uma edição local nunca é sobrescrita.
  useEffect(() => {
    if (serializado === base || sujo) return
    const dados = JSON.parse(serializado) as Dados
    setLinhas(
      linhasDasPropriedades(dados).map((l) => ({ ...l, id: `${prefixo}/${contador.current++}` })),
    )
    setBase(serializado)
  }, [serializado, base, sujo, prefixo])
  const mudar = (id: string, alteracoes: Partial<LinhaDePropriedade>) => {
    setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, ...alteracoes } : l)))
    setErro(null)
    setMensagem(null)
  }
  const guardar = () => {
    if (conflito || desligado) return
    if (!dados.valor) {
      setErro(dados.erro)
      return
    }
    try {
      if (!aoGuardar(dados.valor))
        throw Error('Não consegui aplicar as propriedades. Confira o estado da oficina.')
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : 'Não consegui aplicar as propriedades.')
      return
    }
    setBase(JSON.stringify(dados.valor))
    setErro(null)
    setMensagem('Propriedades aplicadas.')
  }
  return (
    <details className="mcn-grupo">
      <summary>Propriedades · {linhas.length}</summary>
      <p className="text-sm text-mld-muted">
        Acrescente dados que o jogo poderá usar, como nome, quantidade ou disponibilidade.
      </p>
      {erro ? (
        <p role="alert" className="mcn-recusa">
          {erro}
        </p>
      ) : null}
      {mensagem ? (
        <p role="status" className="text-sm text-mld-muted">
          {mensagem}
        </p>
      ) : null}
      {conflito ? (
        <div role="alert" className="mcn-recusa">
          <p>As propriedades foram atualizadas em outra edição. Recarregue antes de guardar.</p>
          <button
            type="button"
            className="sz-tool-btn"
            onClick={() => {
              setLinhas(linhasDasPropriedades(valor).map(criarLinha))
              setBase(serializado)
              setErro(null)
              setMensagem(null)
            }}
          >
            Recarregar propriedades
          </button>
        </div>
      ) : null}
      <fieldset disabled={desligado} className="mcn-campos border-0 p-0">
        <legend className="sr-only">Editar propriedades</legend>
        {linhas.map((l, i) => (
          <fieldset key={l.id} className="mcn-grupo min-w-0">
            <legend>Propriedade {i + 1}</legend>
            <label className="mcn-campo">
              Nome da propriedade
              <input
                type="text"
                maxLength={80}
                value={l.chave}
                onChange={(e) => mudar(l.id, { chave: e.target.value })}
              />
            </label>
            <label className="mcn-campo">
              Tipo
              <select
                value={l.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as LinhaDePropriedade['tipo']
                  mudar(l.id, {
                    tipo,
                    valor:
                      tipo === 'texto'
                        ? String(l.valor)
                        : tipo === 'numero'
                          ? typeof l.valor === 'number'
                            ? l.valor
                            : 0
                          : typeof l.valor === 'boolean'
                            ? l.valor
                            : false,
                  })
                }}
              >
                <option value="texto">Texto</option>
                <option value="numero">Número</option>
                <option value="booleano">Sim ou não</option>
              </select>
            </label>
            {l.tipo === 'booleano' ? (
              <label className="mcn-opcao">
                <input
                  type="checkbox"
                  checked={l.valor === true}
                  onChange={(e) => mudar(l.id, { valor: e.target.checked })}
                />
                Sim
              </label>
            ) : l.tipo === 'numero' ? (
              <label className="mcn-campo">
                Valor
                <input
                  type="number"
                  step="any"
                  value={String(l.valor)}
                  onChange={(e) => mudar(l.id, { valor: e.target.value })}
                />
              </label>
            ) : (
              <label className="mcn-campo">
                Valor
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={String(l.valor)}
                  onChange={(e) => mudar(l.id, { valor: e.target.value })}
                />
              </label>
            )}
            <button
              type="button"
              className="sz-tool-btn"
              aria-label={`Remover propriedade ${l.chave || i + 1}`}
              onClick={() => {
                setLinhas((ls) => ls.filter((p) => p.id !== l.id))
                setErro(null)
                setMensagem(null)
              }}
            >
              <Trash2 aria-hidden="true" />
              Remover
            </button>
          </fieldset>
        ))}
        <div className="mcn-caminho-acoes">
          <button
            type="button"
            className="sz-tool-btn"
            disabled={linhas.length >= 64}
            onClick={() => {
              const linha = criarLinha({ chave: '', tipo: 'texto', valor: '' })
              setLinhas((ls) => [...ls, linha])
              setMensagem(null)
              setErro(null)
            }}
          >
            <Plus aria-hidden="true" />
            Adicionar propriedade
          </button>
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--primary"
            disabled={conflito}
            onClick={guardar}
          >
            {rotuloAcao}
          </button>
        </div>
      </fieldset>
    </details>
  )
}
