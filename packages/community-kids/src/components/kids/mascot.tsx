import { cn } from '@/lib/cn'

export type MascotExpression = 'happy' | 'celebrating' | 'thinking' | 'sleeping' | 'speaking'

/** Um sprite do Zappy por expressão (snapshots 3D, WebP com fundo transparente). */
/** Exportado para o teste de conformidade dos assets (ver tests/mascot-assets). */
export const ZAPPY_SRC: Record<MascotExpression, string> = {
  happy: '/zappy/happy.webp',
  celebrating: '/zappy/celebrating.webp',
  thinking: '/zappy/thinking.webp',
  sleeping: '/zappy/sleeping.webp',
  // Acenando: pose do balão de diálogo, no mesmo canvas 300x300 das outras.
  speaking: '/zappy/speaking.webp',
}

/**
 * Interruptor geral do Zappy animado. Ligado desde 15/09/2026, com o 2º lote de
 * arquivos: fundo do artboard transparente e a `Timeline 1` animando nas cinco poses
 * (conferido no navegador, quadro a quadro). Fica como interruptor porque é o freio
 * de mão se algum reexport quebrar tudo de uma vez — desligar devolve o WebP, que
 * nunca saiu de baixo.
 */
export const ZAPPY_RIVE_LIGADO = true

/**
 * A MESMA pose, em Rive (animada, com som) — consumida só pelo `KidsMascotAnimated`.
 * Exportado para o conformance de assets (`tests/mascot-assets`), que trava o par
 * `.webp`/`.riv`: quem anima precisa ter para onde cair quando o Rive não sobe.
 *
 * ⚠️ `happy` é o `base.riv` do lote, o único SEM áudio embutido — e por isso o mais
 * leve (9 KB comprimido, contra 44-98 KB dos outros, que carregam MP3). Os nomes de
 * arquivo aqui são NOSSOS (a pasta de origem chamava `base`/`celebring`/`saudacao`);
 * o que manda é a expressão, não o nome que veio do editor.
 */
export const ZAPPY_RIVE_SRC: Record<MascotExpression, string> = {
  happy: '/zappy/happy.riv',
  celebrating: '/zappy/celebrating.riv',
  thinking: '/zappy/thinking.riv',
  sleeping: '/zappy/sleeping.riv',
  speaking: '/zappy/speaking.riv',
}

/**
 * ⚠️⚠️ TOCAMOS A TIMELINE, NÃO A STATE MACHINE — e isso não é estilo, é onde a
 * animação está. Os `.riv` do lote trazem a `State Machine 1` com ZERO inputs e um
 * estado que não entra na timeline: montar por ela deixa o Zappy PARADO, com o
 * runtime rodando a 60 fps e desenhando sempre o mesmo quadro (medido: 242 quadros
 * seguidos idênticos). Pela `Timeline 1` as cinco poses animam — `happy`,
 * `celebrating` e `thinking` em laço; `sleeping` e `speaking` tocam uma vez e
 * assentam, que é o certo para elas.
 *
 * ⚠️ O parâmetro `animations` do runtime está marcado como deprecated em favor de
 * `stateMachine`. Sair do deprecated depende do editor, não daqui: é a `State
 * Machine 1` ganhar um estado que toque a `Timeline 1`. Enquanto não ganhar, trocar
 * para `stateMachine` volta a congelar o mascote.
 *
 * ⚠️ Os nomes são os GENÉRICOS de fábrica e o runtime casa por string: um reexport
 * que os renomeie derruba o mascote no fallback WebP **sem erro nenhum**.
 * `tests/mascot-assets` lê os bytes do arquivo e falha se algum sumir — é a única
 * forma de essa quebra dar as caras.
 */
export const ZAPPY_RIVE_ARTBOARD = 'Artboard 1'
export const ZAPPY_RIVE_TIMELINE = 'Timeline 1'

/**
 * ⚠️⚠️ TODAS as poses entram MUDAS, e não é a régua editorial — é medição.
 *
 * Os `.riv` têm o áudio EMBUTIDO (dá para ler o nome do asset nos bytes: "Firefly
 * Celebration UI Chime", "Sleepy Firefly UI Cue"…) e mesmo assim nenhum caminho faz
 * o som sair: medi o sinal que chega à saída pendurando um analisador em tudo que
 * conecta ao `destination`, pela timeline e pela state machine, e deu pico ZERO. O
 * runtime cria o AudioContext (ele sabe que há áudio ali) mas **nunca conecta nada**
 * — falta o evento de áudio na timeline que dispare o asset.
 *
 * ⚠️ Consequência prática: **quem toca o som das celebrações continua sendo o
 * `KidsConfetti`** (`/sounds/celebracao.mp3`). Eu cheguei a tirar o som dele
 * apostando que viria do `.riv`; com o Rive mudo, aquilo deixaria as quatro
 * celebrações em SILÊNCIO. Voltou a ser o que já estava em produção.
 *
 * Quando o `.riv` ganhar o evento de áudio: vire `celebrating` para `true` AQUI e
 * ponha `sound={false}` no `<KidsConfetti>` das quatro celebrações NA MESMA PASSADA,
 * senão tocam os dois. A régua que vale nessa hora é a de sempre: som quando o Zappy
 * REAGE, silêncio quando ele só está presente — `speaking`/`thinking`/`sleeping`
 * repetem a cada seção de aula e a cada cadeado, e viram tortura com chime.
 *
 * ⚠️ Os ~164 KB de MP3 embutidos em `thinking`/`sleeping`/`speaking` seguem
 * atravessando a rede sem tocar. Reexportar essas três sem áudio continua sendo a
 * maior economia disponível no lote.
 */
export const ZAPPY_RIVE_COM_SOM: Record<MascotExpression, boolean> = {
  happy: false,
  celebrating: false,
  thinking: false,
  sleeping: false,
  speaking: false,
}

interface KidsMascotProps {
  expression?: MascotExpression
  className?: string
}

/**
 * Mascote oficial do Sistema Zero Kids: o vagalume **Zappy**. Um `<img>` por
 * expressão (WebP transparente 1:1 em `public/zappy/`), server-safe — a
 * className controla o tamanho (`size-12` por padrão) e herda as animações
 * de movimento da marca (`kid-float`/`kid-wiggle`/`animate-pulse`). Drop-in da
 * estrela-faísca anterior: mesma API `expression`/`className`.
 * Decorativo por definição: o texto ao lado dá o significado (aria-hidden).
 */
export function KidsMascot({ expression = 'happy', className }: KidsMascotProps) {
  return (
    <img
      src={ZAPPY_SRC[expression]}
      alt=""
      width={48}
      height={48}
      aria-hidden="true"
      draggable={false}
      className={cn('size-12 shrink-0 select-none object-contain', className)}
    />
  )
}
