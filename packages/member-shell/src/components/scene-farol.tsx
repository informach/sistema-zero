import type { ReactNode } from 'react'
import { Texto } from './scene-canvas'

/**
 * As frases do `aviso` do jogo do Farol, as MESMAS do projeto que a criança monta
 * (`docs/aulas-interativas/qa/desafio-farol-projeto.ts`). A cena mostra o que o jogo dela vai mostrar.
 */
export const AVISOS_DO_FAROL = {
  inicio: 'Encontre a chave e vá ao farol.',
  coleta: 'Você pegou a chave! Agora vá ao farol.',
  acendeu: 'Você acendeu o farol! Olhe o barco chegando.',
  faltaChave: 'A porta não abriu. Falta a chave.',
} as const

/**
 * A faixa do aviso, desenhada como o jogo a desenha: o sprite `fundoAviso` (8, 8, 464 × 28, no verde
 * escuro do Farol) e o texto `aviso` em branco, à esquerda.
 *
 * ⚠️ `data-sem-halo`: o halo claro que o console põe em todo texto do palco (`scene.css`) existe para
 * letra sobre ILUSTRAÇÃO. Sobre a faixa escura ele engordava e borrava o branco.
 */
export function AvisoDoFarol({ texto }: { texto: string }) {
  return (
    <g data-aviso-do-jogo="">
      <rect x="8" y="8" width="464" height="28" rx="6" fill="#143d35" />
      <Texto
        x="20"
        y="22"
        tamanho={16}
        fill="#ffffff"
        fontWeight="700"
        dominantBaseline="central"
        data-sem-halo=""
      >
        {texto}
      </Texto>
    </g>
  )
}

/** As famílias de bloco do Estúdio, nas cores do Caderno do Aluno (evento, Jogo 2D, Programação). */
type BlocoDaRegra = 'evento' | 'jogo' | 'programa'

export type PassoDaRegra = {
  id: string
  texto: ReactNode
  bloco: BlocoDaRegra
  /** Quantos encaixes para dentro: 1 é o corpo do evento, 2 são os ramos do Se. */
  nivel?: 1 | 2
  /**
   * `fora`: o bloco não faz parte da regra agora (a coleta sem memória). `escolhido`/`ignorado`: o
   * ramo que a tentativa seguiu e o que ela pulou. O estado sempre vem ESCRITO, nunca só na cor.
   */
  estado?: 'fora' | 'escolhido' | 'ignorado'
}

/**
 * A regra que a cena executa, montada como os blocos que a criança vai encaixar no Estúdio.
 *
 * ⭐ Mora na BANCADA, e não sob o palco: o palco é o jogo, e o aviso "Descoberta N de M" sobrepõe o
 * pé do mundo. Um painel embaixo do desenho ficava coberto justamente na hora de ler a resposta.
 */
export function RegraDoJogo({
  titulo,
  passos,
}: {
  titulo: string
  passos: readonly PassoDaRegra[]
}) {
  return (
    <figure className="sz-scene-regra">
      <figcaption className="sz-scene-regra-titulo">{titulo}</figcaption>
      <ol className="sz-scene-regra-passos">
        {passos.map((p) => (
          <li
            key={p.id}
            className="sz-scene-regra-passo"
            data-bloco={p.bloco}
            data-nivel={p.nivel}
            data-estado={p.estado}
          >
            {p.estado === 'escolhido' && (
              <span className="sz-scene-regra-marca">✓ escolhido: </span>
            )}
            <span>{p.texto}</span>
            {p.estado === 'fora' && <span className="sz-scene-regra-marca"> (desligado)</span>}
            {/* Esmaecida na tela; para o leitor, o mesmo estado em palavras. */}
            {p.estado === 'ignorado' && (
              <span className="sr-only"> (não foi usado nesta tentativa)</span>
            )}
          </li>
        ))}
      </ol>
    </figure>
  )
}

/** "então"/"senão" no formato da palavra do bloco Se. */
export function PalavraDoBloco({ children }: { children: ReactNode }) {
  return <span className="sz-scene-regra-palavra">{children}</span>
}
