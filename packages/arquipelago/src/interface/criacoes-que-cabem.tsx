import {
  type CriacaoQueCabe,
  CriacaoQueCabeSchema,
  type MoldeDeObjeto,
  type ObjetoDaCasa,
} from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'

type Lista =
  | { situacao: 'fechada' }
  | { situacao: 'lendo' }
  | { situacao: 'pronta'; criacoes: CriacaoQueCabe[] }
  | { situacao: 'falhou' }

export const FALAS_DAS_CRIACOES = {
  lendo: 'Procurando as suas criações que cabem neste molde.',
  nenhuma: 'Nenhuma criação sua cabe neste molde ainda. Faça uma no Pinta ou no Molda.',
  falhou: 'As suas criações não abriram agora. Tente de novo daqui a pouco.',
} as const

/**
 * "Usar uma criação minha que cabe neste molde" (§6.28, A30): a plataforma lista as criações da
 * conta que o jogo aceitaria neste objeto (a régua é a mesma do jogo) e a escolhida vira a
 * aparência em uso, como a feita agora. As que já estão em "Suas aparências" não se repetem.
 */
export function CriacoesQueCabem({
  objeto,
  molde,
  ferramentas,
  usar,
}: {
  objeto: ObjetoDaCasa
  molde: MoldeDeObjeto
  /** As ferramentas que o posto já abriu (o Pinta só quando o molde tem faces). */
  ferramentas: readonly ('pinta' | 'molda')[]
  usar(criacao: CriacaoQueCabe): void
}) {
  const { plataforma } = useJogo()
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  const guardadas = useEstado((s) => s.salvamento.projetos[objeto]?.aparencias)
  const [lista, setLista] = useState<Lista>({ situacao: 'fechada' })
  const pedido = useRef<AbortController | null>(null)
  useEffect(() => () => pedido.current?.abort(), [])
  if (!plataforma.listarCriacoesQueCabem || ferramentas.length === 0) return null
  const listar = plataforma.listarCriacoesQueCabem.bind(plataforma)

  async function abrir() {
    pedido.current?.abort()
    const controle = new AbortController()
    pedido.current = controle
    setLista({ situacao: 'lendo' })
    try {
      const lidas = await listar(molde, controle.signal)
      if (controle.signal.aborted) return
      const criacoes = (Array.isArray(lidas) ? lidas : []).flatMap((c) => {
        const lida = CriacaoQueCabeSchema.safeParse(c)
        return lida.success && ferramentas.includes(lida.data.ferramenta) ? [lida.data] : []
      })
      setLista({ situacao: 'pronta', criacoes })
    } catch (erro) {
      if (controle.signal.aborted) return
      plataforma.relatarErro(erro, 'criacoes-que-cabem')
      setLista({ situacao: 'falhou' })
    }
  }

  const novas =
    lista.situacao === 'pronta'
      ? lista.criacoes.filter(
          (c) => !guardadas?.some((a) => a.origem === c.ferramenta && a.id === c.id),
        )
      : []
  return (
    <section className="arq-objeto-suas" aria-label="Usar uma criação minha">
      <h3 className="arq-menu-titulo">Usar uma criação minha</h3>
      {lista.situacao === 'fechada' ? (
        <button
          type="button"
          className="arq-botao leve"
          disabled={ferramentaAberta}
          onClick={() => void abrir()}
        >
          Ver as que cabem neste molde
        </button>
      ) : lista.situacao === 'lendo' ? (
        <p role="status" className="arq-caderno-explica">
          {FALAS_DAS_CRIACOES.lendo}
        </p>
      ) : lista.situacao === 'falhou' ? (
        <>
          <p role="status" className="arq-caderno-explica">
            {FALAS_DAS_CRIACOES.falhou}
          </p>
          <button type="button" className="arq-botao leve" onClick={() => void abrir()}>
            Tentar de novo
          </button>
        </>
      ) : novas.length === 0 ? (
        <p role="status" className="arq-caderno-explica">
          {FALAS_DAS_CRIACOES.nenhuma}
        </p>
      ) : (
        <ul className="arq-objeto-itens">
          {novas.map((c) => (
            <li key={`${c.ferramenta}:${c.id}`}>
              <button
                type="button"
                className="arq-obra-escolha"
                disabled={ferramentaAberta}
                onClick={() => usar(c)}
              >
                {c.miniatura ? (
                  <img src={c.miniatura} alt="" draggable={false} />
                ) : (
                  <span className="arq-ferramenta-icone" aria-hidden="true">
                    {c.ferramenta === 'molda' ? '🧊' : '🎨'}
                  </span>
                )}
                <b>{c.nome}</b>
                <small>{c.ferramenta === 'molda' ? 'Do Molda' : 'Do Pinta'}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
