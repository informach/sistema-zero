import { descricaoDoTrabalhoLumi } from '@sistemazero/arquipelago-contracts'
import { type ReactNode, useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import {
  albumDoSalvamento,
  type ContaDaSecao,
  faltamNaSecao,
  type LumiDoAlbum,
  type ObjetoDoAlbum,
  type PercursoDoAlbum,
  tituloDaSecao,
} from '../sistemas/album'
import { type LembrancaDasIlhas, NOME_DO_GRUPO } from '../sistemas/colecoes-das-ilhas'
import { Bicho, Receita } from './diario'
import { MINIATURA_DO_OBJETO } from './miniaturas'
import { MINIATURA_DA_PRAIA } from './miniaturas-da-praia'
import { MINIATURA_DAS_ILHAS } from './miniaturas-das-ilhas'

/** O que cada coleção das ilhas pede, dito no topo da seção. */
const EXPLICA_DO_GRUPO = {
  notas: 'O festival perdeu quatro notas na neve do Pico Gelado.',
  cristais: 'A caverna de cristal guarda quatro pedras que brilham.',
  estrelas: 'À noite, quatro estrelas caem na Ilha das Nuvens.',
} as const

import { MINIATURA_DO_LUMI } from './miniaturas-dos-lumis'

/** O valor de `painelAberto` do álbum. */
export const PAINEL_DO_ALBUM = 'album'

function Secao({
  id,
  nome,
  conta,
  explica,
  grade = false,
  children,
}: {
  id: string
  nome: string
  conta: ContaDaSecao
  explica: string
  /** Em colunas no computador (as listas compridas: aparências e Lumis). */
  grade?: boolean
  children: ReactNode
}) {
  return (
    <section className="arq-caderno-secao" aria-labelledby={`arq-album-${id}`}>
      <h3 id={`arq-album-${id}`} className="arq-menu-titulo">
        {tituloDaSecao(nome, conta)}
      </h3>
      <p className="arq-caderno-explica">
        <b className={conta.faltam === 0 ? 'arq-album-completa' : undefined}>
          {faltamNaSecao(conta)}
        </b>{' '}
        {explica}
      </p>
      <ul className={`arq-quadro-lista arq-diario-bichos${grade ? ' arq-album-grade' : ''}`}>
        {children}
      </ul>
    </section>
  )
}

function Percurso({ p }: { p: PercursoDoAlbum }) {
  return (
    <li className={`arq-diario-bicho arq-album-percurso${p.melhorTempo ? '' : ' escondido'}`}>
      <div className="arq-quadro-corpo">
        <b>{p.nome}</b>
        <span className="arq-quadro-estado">{p.ilha}</span>
        <ul className="arq-album-estrelas">
          {p.estrelas.map((e) => (
            <li key={e.texto} className={e.ganhou ? 'ganhou' : ''}>
              <span aria-hidden="true">{e.ganhou ? '★' : '☆'}</span> {e.texto}
              <span className="arq-sr">{e.ganhou ? ': estrela ganha' : ': estrela que falta'}</span>
            </li>
          ))}
        </ul>
        <span className="arq-caderno-efeito">
          {p.melhorTempo ? `Melhor tempo: ${p.melhorTempo}` : 'Ainda não correu.'}
        </span>
      </div>
    </li>
  )
}

function Objeto({ o }: { o: ObjetoDoAlbum }) {
  const tem = o.estado === 'com-aparencia'
  return (
    <li className={`arq-diario-bicho arq-album-item${tem ? '' : ' escondido'}`}>
      <img
        className={`arq-album-miniatura${o.estado === 'ainda-nao-chegou' ? ' silhueta' : ''}`}
        src={MINIATURA_DO_OBJETO[o.objeto]}
        alt=""
        draggable={false}
      />
      <div className="arq-quadro-corpo">
        <b>{o.nome}</b>
        {o.estado === 'com-aparencia' ? (
          <span className="arq-caderno-efeito">{`Guardadas: ${o.aparencias.join(', ')}.`}</span>
        ) : (
          <>
            <span className="arq-quadro-estado">
              {o.estado === 'sem-aparencia' ? 'Ainda sem aparência' : 'Ainda não chegou'}
            </span>
            <span className="arq-caderno-efeito">{o.dica}</span>
          </>
        )}
      </div>
    </li>
  )
}

function Lumi({ l }: { l: LumiDoAlbum }) {
  const especie = l.raro ? 'Espécie rara' : 'Espécie comum'
  if (l.estado === 'nao-encontrado')
    return (
      <li className="arq-diario-bicho arq-album-item escondido">
        <img className="arq-album-lumi foto silhueta" src={MINIATURA_DO_LUMI[l.id]} alt="" />
        <div className="arq-quadro-corpo">
          <b>Ainda não encontrado</b>
          <span className="arq-quadro-estado">{l.ilha}</span>
          <span className="arq-caderno-efeito">{especie}</span>
        </div>
      </li>
    )
  return (
    <li className="arq-diario-bicho arq-album-item">
      <img
        className={`arq-album-lumi foto${l.raro ? ' raro' : ''}`}
        style={{ ['--cor' as string]: l.cor }}
        src={MINIATURA_DO_LUMI[l.id]}
        alt=""
      />
      <div className="arq-quadro-corpo">
        <b>{l.nome}</b>
        <span className="arq-quadro-estado">{l.ilha}</span>
        <span className="arq-caderno-efeito">{`${especie}. Presos: ${l.quantos}.`}</span>
        <span className="arq-caderno-efeito">{descricaoDoTrabalhoLumi(l.id)}</span>
      </div>
    </li>
  )
}

/**
 * O álbum de coleções (fase2-09): bichos, receitas, estrelas dos percursos, aparências guardadas e
 * Lumis presos, cada seção com quantos tem e quantos faltam. Só lê o salvamento; nada aqui muda o
 * jogo, e o que falta nunca se perde.
 */
export function Album() {
  const { loja } = useJogo()
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_ALBUM)
  const salvamento = useEstado((s) => s.salvamento)
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (aberto) fechar.current?.focus({ preventScroll: true })
  }, [aberto])

  if (!aberto) return null
  const a = albumDoSalvamento(salvamento)

  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-caderno arq-diario arq-album"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-album-titulo"
      >
        <h2 id="arq-album-titulo">Álbum de coleções</h2>
        <p className="arq-caderno-explica">
          O que falta não se perde: continua esperando por você nas ilhas.
        </p>
        {(['conchas', 'peixes'] as const).map((grupo) => (
          <Secao
            key={grupo}
            id={grupo}
            nome={grupo === 'conchas' ? 'Conchas e estrela-do-mar' : 'Peixes da praia'}
            conta={a[grupo].conta}
            explica={
              grupo === 'conchas'
                ? 'Explore a areia. A estrela-do-mar fica onde vive.'
                : 'Pesque no píer. Depois do registro, os peixes voltam ao mar.'
            }
          >
            {a[grupo].itens.map((p) => (
              <li key={p.id} className={`arq-diario-bicho${p.encontrado ? '' : ' escondido'}`}>
                <img
                  className={`arq-album-miniatura${p.encontrado ? '' : ' silhueta'}`}
                  src={MINIATURA_DA_PRAIA[p.id]}
                  alt=""
                  draggable={false}
                />
                <div className="arq-quadro-corpo">
                  <b>{p.nome}</b>
                  <span className="arq-quadro-estado">
                    {p.encontrado ? 'Descoberta registrada.' : p.dica}
                  </span>
                </div>
              </li>
            ))}
          </Secao>
        ))}
        {(['notas', 'cristais', 'estrelas'] as const).map((grupo) => (
          <Secao
            key={grupo}
            id={grupo}
            nome={NOME_DO_GRUPO[grupo]}
            conta={a[grupo].conta}
            explica={EXPLICA_DO_GRUPO[grupo]}
          >
            {a[grupo].itens.map((p) => (
              <li key={p.id} className={`arq-diario-bicho${p.encontrado ? '' : ' escondido'}`}>
                <img
                  className={`arq-album-miniatura${p.encontrado ? '' : ' silhueta'}`}
                  src={MINIATURA_DAS_ILHAS[p.id as LembrancaDasIlhas]}
                  alt=""
                  draggable={false}
                />
                <div className="arq-quadro-corpo">
                  <b>{p.nome}</b>
                  <span className="arq-quadro-estado">
                    {p.encontrado ? 'Descoberta registrada.' : p.dica}
                  </span>
                </div>
              </li>
            ))}
          </Secao>
        ))}
        <Secao
          id="recife"
          nome="Achados do Recife"
          conta={a.recife.conta}
          explica="Os achados do mergulho ficam guardados aqui."
        >
          {a.recife.itens.map((item) => (
            <li key={item.id} className="arq-quadro-corpo">
              <b>{item.nome}</b>
              <span>{item.achado ? 'Encontrado.' : item.dica}</span>
            </li>
          ))}
        </Secao>
        <Secao
          id="segredos"
          nome="Segredos das ilhas"
          conta={a.segredos.conta}
          explica="Baús da Íris no alto do vento, nas ilhas antes do Pico Gelado."
        >
          {a.segredos.itens.map((g) => (
            <li key={g.id} className="arq-quadro-corpo">
              <b>{g.ilha}</b>
              <span>{g.texto}</span>
            </li>
          ))}
        </Secao>
        <Secao
          id="bichos"
          nome="Bichos do Bosque"
          conta={a.bichos.conta}
          explica="Cada bicho que você acha no esconde-esconde entra aqui."
        >
          {a.bichos.itens.map((b) => (
            <Bicho key={b.bicho} b={b} />
          ))}
        </Secao>
        <Secao
          id="receitas"
          nome="Receitas"
          conta={a.receitas.conta}
          explica="Novas receitas chegam com amizades, coleções e festas. Cada pista mostra onde aprender."
        >
          {a.receitas.itens.map((r) => (
            <Receita key={r.id} r={r} />
          ))}
        </Secao>
        <Secao
          id="percursos"
          nome="Estrelas dos percursos"
          conta={a.percursos.conta}
          explica="Cada percurso tem três estrelas, e cada estrela ganha fica para sempre."
        >
          {a.percursos.itens.map((p) => (
            <Percurso key={p.id} p={p} />
          ))}
        </Secao>
        <Secao
          id="aparencias"
          nome="Aparências guardadas"
          conta={a.aparencias.conta}
          grade
          explica={`Os objetos da casa com aparência. Você guarda ${
            a.aparencias.guardadas === 1 ? '1 aparência' : `${a.aparencias.guardadas} aparências`
          }.`}
        >
          {a.aparencias.itens.map((o) => (
            <Objeto key={o.objeto} o={o} />
          ))}
        </Secao>
        <Secao
          id="lumis"
          nome="Lumis presos"
          conta={a.lumis.conta}
          grade
          explica="À noite, a lanterna prende um borrão de névoa e ele vira um Lumi. Cada ilha tem uma espécie comum e uma rara."
        >
          {a.lumis.itens.map((l) => (
            <Lumi key={l.id} l={l} />
          ))}
        </Secao>
        <div className="arq-menu-acoes">
          <button
            ref={fechar}
            type="button"
            className="arq-botao leve"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    </div>
  )
}
