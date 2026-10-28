import {
  CATALOGO_DE_OBJETOS,
  type FerramentaDaPlataforma,
  GELADEIRA_GUARDA,
  OBJETOS_DA_CASA,
  type ObjetoDaCasa,
  ProjetoAzulSchema,
} from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import {
  capacidade,
  ehAlimento,
  guardados,
  guardarNaGeladeira,
  moldaAberto,
  oQueOPintaPinta,
  recadoDaFerramentaFechada,
  tirarDaGeladeira,
} from '../sistemas/construcao/projeto-azul'
import { ITENS } from '../sistemas/itens'

function objetoDoPainel(painel: string | null): ObjetoDaCasa | null {
  if (!painel?.startsWith('objeto:')) return null
  const id = painel.slice('objeto:'.length)
  return (OBJETOS_DA_CASA as readonly string[]).includes(id) ? (id as ObjetoDaCasa) : null
}

/** A geladeira: guardar alimentos da mochila e tirar de volta (4 no holograma, 12 completa). */
function Geladeira() {
  const { loja } = useJogo()
  const projeto = useEstado((s) => s.salvamento.projetos.geladeira)
  const inventario = useEstado((s) => s.salvamento.inventario)
  if (!projeto) return null
  const cabe = capacidade(projeto)
  const tem = guardados(projeto)
  const naMochila = Object.entries(inventario).filter(([id, q]) => q > 0 && ehAlimento(id))
  const dentro = Object.entries(projeto.guardado ?? {}).filter(([, q]) => q > 0)
  const mudar = (fn: typeof guardarNaGeladeira, item: string) =>
    loja.getState().mudar((s) => {
      const p = s.projetos.geladeira
      const r = p && fn(p, s.inventario, item)
      return r
        ? { ...s, projetos: { ...s.projetos, geladeira: r.projeto }, inventario: r.inventario }
        : s
    })
  return (
    <section className="arq-objeto-geladeira" aria-label="O que está na geladeira">
      <p className="arq-quadro-sub">{`Guardados: ${tem} de ${cabe}.`}</p>
      <h3 className="arq-menu-titulo">Na geladeira</h3>
      {dentro.length === 0 ? (
        <p className="arq-caderno-explica">Ainda vazia.</p>
      ) : (
        <ul className="arq-objeto-itens">
          {dentro.map(([id, q]) => (
            <li key={id}>
              <button
                type="button"
                className="arq-botao leve"
                disabled={(inventario[id] ?? 0) >= 999}
                title={
                  (inventario[id] ?? 0) >= 999
                    ? 'A mochila já tem o limite deste alimento.'
                    : undefined
                }
                onClick={() => mudar(tirarDaGeladeira, id)}
              >
                {`${ITENS[id]?.emoji ?? ''} ${ITENS[id]?.nome ?? id} × ${q}: tirar`}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="arq-menu-titulo">Na mochila</h3>
      {naMochila.length === 0 ? (
        <p className="arq-caderno-explica">Nenhum alimento na mochila.</p>
      ) : (
        <ul className="arq-objeto-itens">
          {naMochila.map(([id, q]) => (
            <li key={id}>
              <button
                type="button"
                className="arq-botao leve"
                disabled={tem >= cabe}
                onClick={() => mudar(guardarNaGeladeira, id)}
              >
                {`${ITENS[id]?.emoji ?? ''} ${ITENS[id]?.nome ?? id} × ${q}: guardar`}
              </button>
            </li>
          ))}
        </ul>
      )}
      {tem >= cabe ? (
        <p className="arq-aviso atencao">
          {projeto.aparencia
            ? 'A geladeira está cheia.'
            : `A geladeira está cheia. Com aparência ela guarda ${GELADEIRA_GUARDA.completa}.`}
        </p>
      ) : null}
    </section>
  )
}

/**
 * O painel de um objeto com função (projeto azul): o que ele faz, de onde veio, a geladeira por
 * dentro e o caminho para a aparência (o Pinta e o Molda abrem com o molde do objeto). A galeria e
 * as criações guardadas entram com os cartões deles.
 */
export function PainelDoObjeto() {
  const { loja, plataforma } = useJogo()
  const painel = useEstado((s) => s.painelAberto)
  const id = objetoDoPainel(painel)
  const projeto = useEstado((s) => (id ? s.salvamento.projetos[id] : undefined))
  const jornada = useEstado((s) => s.jornada)
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'atencao'; texto: string } | null>(null)
  const fechar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (id) fechar.current?.focus()
    else setAviso(null)
  }, [id])
  if (!id || !projeto) return null
  const { molde, origem } = CATALOGO_DE_OBJETOS[id]

  async function fazerAparencia(ferramenta: FerramentaDaPlataforma) {
    if (!id || loja.getState().ferramentaAberta) return
    setAviso(null)
    loja.getState().definirFerramentaAberta(true)
    try {
      const r = await plataforma.abrirFerramenta({ ferramenta, proposito: 'objeto', molde })
      if (r.situacao === 'pronto') {
        const origemDaAparencia = ferramenta === 'molda' ? 'molda' : 'pinta'
        const atual = loja.getState().salvamento.projetos[id]
        const novo = atual && {
          ...atual,
          aparencia: { origem: origemDaAparencia, id: r.criacaoId },
        }
        // Um id fora do contrato faria o serviço recusar o salvamento: ele não entra.
        if (!novo || !ProjetoAzulSchema.safeParse(novo).success) {
          setAviso({ tom: 'atencao', texto: 'Não deu para guardar a aparência. Tente de novo.' })
          return
        }
        loja.getState().mudar((s) => ({ ...s, projetos: { ...s.projetos, [id]: novo } }))
        setAviso({ tom: 'ok', texto: 'A aparência ficou guardada na sua conta.' })
      } else if (r.situacao === 'indisponivel')
        setAviso({
          tom: 'atencao',
          texto: recadoDaFerramentaFechada(ferramenta === 'molda' ? 'molda' : 'pinta', r.motivo),
        })
    } catch (erro) {
      plataforma.relatarErro(erro, 'aparencia-do-objeto')
      setAviso({ tom: 'atencao', texto: 'Não consegui abrir a ferramenta agora. Tente de novo.' })
    } finally {
      loja.getState().definirFerramentaAberta(false)
    }
  }

  const pinta = oQueOPintaPinta(molde.faces)
  const temFaces = pinta !== null
  const molda = moldaAberto(jornada)
  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-objeto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-objeto-titulo"
      >
        <h2 id="arq-objeto-titulo">{molde.nome}</h2>
        <p className="arq-objeto-selo">
          {projeto.aparencia ? 'Completo' : 'Projeto azul: a função já está pronta'}
        </p>
        {molde.funcao ? <p className="arq-quadro-sub">{molde.funcao}</p> : null}
        {origem ? <p className="arq-caderno-explica">{origem}</p> : null}
        {id === 'geladeira' ? <Geladeira /> : null}
        <h3 className="arq-menu-titulo">Fazer a aparência</h3>
        <p className="arq-caderno-explica">
          {`O molde tem o tamanho dele: ${molde.area.largura} por ${molde.area.fundo} na grade, com a frente marcada.`}
        </p>
        <div className="arq-objeto-aparencia">
          <button
            type="button"
            className="arq-ferramenta"
            disabled={ferramentaAberta || !temFaces}
            onClick={() => void fazerAparencia('pinta')}
          >
            <span className="arq-ferramenta-icone" aria-hidden="true">
              🎨
            </span>
            <b>Pintar no Pinta</b>
            <small>{pinta ?? 'O molde do Pinta chega com o modelo'}</small>
          </button>
          <button
            type="button"
            className="arq-ferramenta"
            disabled={ferramentaAberta || !molda}
            onClick={() => void fazerAparencia('molda')}
          >
            <span className="arq-ferramenta-icone" aria-hidden="true">
              {molda ? '🧊' : '🔒'}
            </span>
            <b>Modelar no Molda</b>
            <small>
              {molda ? 'A forma inteira dentro do molde' : 'Abre no posto Explorador(a) de Mundos'}
            </small>
          </button>
        </div>
        <p className="arq-caderno-explica">Feito por você não custa moeda.</p>
        {aviso ? (
          <p role="status" className={`arq-aviso ${aviso.tom}`}>
            {aviso.texto}
          </p>
        ) : null}
        <div className="arq-menu-acoes">
          <button
            ref={fechar}
            type="button"
            className="arq-botao leve"
            disabled={ferramentaAberta}
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    </div>
  )
}
