import type { ZappyFalaInfo } from '@sistemazero/member-shell/components/zappy-fala-context'
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
  // ⭐ A BOCA (17/09/2026): arquivo NOVO, com `SMLipSync`/`Viseme` e sem o MP3 inerte dos outros
  // — e é o único regido pelo botão "Ouvir" (ver `tocandoDoZappy`). ⚠️ O nome mudou de propósito:
  // `/zappy/*` tem `Cache-Control` de um dia, e sobrescrever o `speaking.riv` serviria o arquivo
  // VELHO com o código novo pelas 24h seguintes — a animação certa "não funcionaria" sem culpado.
  speaking: '/zappy/fala.riv',
}

/**
 * ⚠️⚠️ TOCAMOS A TIMELINE, NÃO A STATE MACHINE — e isso não é estilo, é onde a
 * animação está. Os `.riv` do lote trazem a `State Machine 1` com ZERO inputs e um
 * estado que não entra na timeline: montar por ela deixa o Zappy PARADO, com o
 * runtime rodando a 60 fps e desenhando sempre o mesmo quadro (medido: 242 quadros
 * seguidos idênticos). Pela `Timeline 1` as cinco poses animam — `happy`,
 * `celebrating`, `thinking` e a nova `fala` em laço; `sleeping` toca uma vez e assenta, que é o
 * certo para ela.
 *
 * ⚠️ O parâmetro `animations` do runtime está marcado como deprecated em favor de
 * `stateMachine`. Sair do deprecated depende do editor, não daqui: é a `State
 * Machine 1` ganhar um estado que toque a `Timeline 1`. Enquanto não ganhar, trocar
 * para `stateMachine` volta a congelar o mascote.
 *
 * ⚠️ O `fala.riv` (17/09/2026) NÃO mudou isso, e foi MEDIDO antes de escrever código:
 * a `State Machine 1` dele — que agora tem duas camadas, `Layer 1` e `Mouth` — deu 1
 * quadro distinto em 240 (`ultimaMudanca` -1, congelada como as antigas), e a
 * `Timeline 1`, 240 em 240. A diferença dele para as outras poses é o LAÇO: ele
 * repete sozinho (6 eventos `Loop` em 12s, zero `Stop`), então quem o rege só precisa
 * ligar e desligar — não há fim de animação para remendar.
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
 * ⚠️ Os MP3 embutidos em `thinking` e `sleeping` seguem atravessando a rede sem tocar
 * (~131 KB). Reexportar as duas sem áudio continua sendo a maior economia do lote — a
 * terceira já saiu: o `fala.riv` veio SEM áudio nenhum nos bytes, e por isso pesa
 * 42 KB contra os 54 KB do `speaking.riv` que ele substituiu.
 */
export const ZAPPY_RIVE_COM_SOM: Record<MascotExpression, boolean> = {
  happy: false,
  celebrating: false,
  thinking: false,
  sleeping: false,
  speaking: false,
}

/**
 * A pose cuja animação é a BOCA — a única que o botão "Ouvir" rege.
 *
 * ⚠️⚠️ A régua é a POSE, não o balão. A autora escolhe a cara do Zappy em cada bloco de diálogo
 * (`DIALOGUE_POSES`: falando, feliz, pensativo, comemorando), e `happy`/`thinking`/`celebrating`
 * animam em laço por desenho — pará-las até alguém apertar "Ouvir" tiraria movimento que ninguém
 * pediu para tirar. Quem a voz rege é a boca; o resto do mascote segue como sempre.
 */
export const ZAPPY_POSE_DA_FALA: MascotExpression = 'speaking'

/**
 * O canvas deve estar tocando AGORA? `undefined` = não é regido por ninguém, toca como sempre
 * (autoplay). Booleano = a voz manda: parado no primeiro quadro (boca fechada) até o áudio sair.
 *
 * ⚠️ `podeFalar` falso é o balão SEM botão "Ouvir" (a instrução de cena sem dicionário, a pista,
 * o retorno da resposta): sem áudio para acompanhar, deixar o Zappy congelado seria só tirar
 * movimento da tela. Ele continua animando como antes de tudo isto.
 */
export function tocandoDoZappy(
  expression: MascotExpression,
  fala: ZappyFalaInfo | null,
): boolean | undefined {
  if (!fala?.podeFalar || expression !== ZAPPY_POSE_DA_FALA) return undefined
  return fala.falando
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
