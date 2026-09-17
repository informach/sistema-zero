'use client'

import { useZappyFala } from '@sistemazero/member-shell/components/zappy-fala-context'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import {
  KidsMascot,
  type MascotExpression,
  tocandoDoZappy,
  ZAPPY_RIVE_COM_SOM,
  ZAPPY_RIVE_LIGADO,
} from './mascot'
import { useReducedMotion } from './room/use-reduced-motion'

/**
 * O runtime do Rive são ~676 KB comprimidos (81 KB de JS + 595 KB de WASM) — mais
 * de cinco vezes o lote INTEIRO de WebP do Zappy. Por isso ele entra por
 * `dynamic(ssr:false)`: fica num chunk próprio, some do SSR e só é baixado por quem
 * chega numa tela que anima. Enquanto não chega, quem aparece é o `<img>` de sempre.
 */
const MascotRiveCanvas = dynamic(
  () => import('./mascot-rive-canvas').then((m) => m.MascotRiveCanvas),
  { ssr: false },
)

/**
 * Puxa o runtime para o cache ANTES de a criança precisar dele. A celebração chega
 * logo depois de um clique, e baixar 676 KB nesse instante atrasaria justamente a
 * festa — então quem abre uma aula já paga o download em segundo plano, ocioso.
 * Best-effort e idempotente (o bundler dedupe o `import()`, o loader dedupe o WASM):
 * falhar aqui não custa nada, o componente cai no WebP.
 *
 * ⚠️ O `import()` sozinho adianta só os ~81 KB de JS; o WASM (595 KB, ou seja, sete
 * oitavos do peso) só é buscado quando o runtime inicializa. Por isso o
 * `aquecerRuntimeRive()` logo em seguida — sem ele o prefetch é quase decorativo.
 */
export function prefetchZappyRive(): void {
  if (!ZAPPY_RIVE_LIGADO || typeof window === 'undefined') return
  const puxa = () => {
    void import('./mascot-rive-canvas').then((m) => m.aquecerRuntimeRive()).catch(() => {})
  }
  // ⚠️ Checagem por VALOR, não `'requestIdleCallback' in window`: o `in` estreita o
  // tipo de `window` e, como o lib.dom declara a API como sempre presente, o `else`
  // vira `never` e o `setTimeout` não compila. O Safari só ganhou `requestIdleCallback`
  // no 17, então o galho de trás não é decorativo.
  const ocioso = window.requestIdleCallback
  if (typeof ocioso === 'function') ocioso(puxa, { timeout: 4000 })
  else window.setTimeout(puxa, 1500)
}

/**
 * O aparelho pediu para economizar dados (plano no limite, "Economia de dados" do
 * Android). São 676 KB para ver um vagalume se mexer — quem ligou essa chave não
 * está pedindo isso. Só o Chromium/Android implementa, então a ausência da API
 * significa "não sei", e "não sei" anima normalmente.
 */
function economiaDeDados(): boolean {
  const conexao = (navigator as { connection?: { saveData?: boolean } }).connection
  return conexao?.saveData === true
}

/**
 * O Zappy ANIMADO: mesma API do `KidsMascot` (`expression` + `className`), com o
 * WebP como chão firme embaixo. O estático continua existindo e continua sendo o
 * certo na maioria das telas — este aqui é para os momentos em que o mascote REAGE
 * (ver `ZAPPY_RIVE_COM_SOM` no `mascot.tsx`).
 *
 * ⚠️ Cinco caminhos levam de volta ao `<img>`, e nenhum deles avisa a criança: o
 * interruptor `ZAPPY_RIVE_LIGADO` (hoje `false` — ver o porquê lá), o SSR (o canvas
 * não existe no servidor), `prefers-reduced-motion`, a economia de dados do aparelho
 * e QUALQUER falha do Rive (WASM bloqueado, `.riv` 404, artboard renomeado). A pose
 * some da tela em zero desses casos — o Rive é um enfeite por cima, nunca o único
 * caminho.
 */
export function KidsMascotAnimated({
  expression,
  className,
  stillClassName,
  sound,
}: {
  expression: MascotExpression
  /** Tamanho e posição. Vale para o canvas E para o WebP. */
  className?: string
  /**
   * Animação CSS que só o WebP usa (`kid-wiggle`, `kid-float`, `animate-pulse`).
   * Fica de fora do canvas de propósito: o Rive já mexe o vagalume, e as duas
   * juntas dão um sacolejo em cima de outro.
   */
  stillClassName?: string
  /** Sobrescreve a régua evento × estado. Raro — prefira ajustar o mapa. */
  sound?: boolean
}) {
  const semMovimento = useReducedMotion()
  /**
   * ⭐ Quem tem botão "Ouvir" na tela rege a BOCA daqui (o balão do bloco `dialogue` e a faixa da
   * instrução da cena proveem o contexto no member-shell). Sem provider — que é a maioria das
   * telas — `tocando` é `undefined` e nada muda: o mascote anima como sempre animou.
   */
  const fala = useZappyFala()
  const tocando = tocandoDoZappy(expression, fala)
  /** O que REMONTA o canvas: trocar de arquivo (pose) ou trocar de regime (livre × regido). */
  const montagem = `${expression}:${tocando === undefined ? 'livre' : 'voz'}`
  const [anima, setAnima] = useState(false)
  // ⚠️⚠️ O estado da CARGA anda junto com a MONTAGEM, num objeto só. O `useRive` lê
  // os parâmetros UMA vez (as dependências dele são o canvas, um booleano de "tem
  // params" e a instância — nunca o `src` nem o `autoplay`), então trocar de expressão
  // não troca o arquivo e trocar de regime não troca o autoplay: por isso a `key` no
  // canvas lá embaixo. E, remontando, o "já desenhou" da montagem anterior precisa cair
  // junto, senão o WebP não aparece durante a carga da nova — e um `.riv` que falhou
  // condenaria todas as seguintes.
  const [carga, setCarga] = useState({ montagem, pronto: false, falhou: false })

  // ⚠️ A decisão de animar NASCE `false` e só muda num efeito, mesmo quando o
  // `useReducedMotion` já saberia responder na primeira renderização. O servidor
  // sempre manda o WebP; se o cliente montasse o canvas já no primeiro passe, a
  // criança com `prefers-reduced-motion` ligado hidrataria uma árvore diferente da
  // que veio pronta. Custa um quadro e compra zero divergência.
  useEffect(() => {
    setAnima(ZAPPY_RIVE_LIGADO && !semMovimento && !economiaDeDados())
  }, [semMovimento])

  // Ajuste de estado durante o render (padrão do React para prop que muda): zera na
  // mesma passada, sem o quadro extra que um efeito custaria.
  if (carga.montagem !== montagem) setCarga({ montagem, pronto: false, falhou: false })

  if (!anima || carga.falhou) {
    return <KidsMascot expression={expression} className={cn(className, stillClassName)} />
  }

  return (
    // `aria-hidden` no wrapper, e não só no `<img>`/`<canvas>`: o `RiveComponent`
    // insere uma `<div>` própria entre os dois, e o mascote é decorativo inteiro —
    // quem dá o significado é o texto ao lado.
    <span aria-hidden="true" className={cn('relative inline-grid shrink-0', className)}>
      {/* Sai de cena só quando o Rive avisa que desenhou: sem isso a troca abre um
          buraco do tamanho do mascote no meio da celebração. */}
      {carga.pronto ? null : (
        <KidsMascot
          expression={expression}
          className={cn('absolute inset-0 size-full', stillClassName)}
        />
      )}
      {/* ⚠️⚠️ A `key` carrega a EXPRESSÃO e o REGIME: o `useRive` lê os parâmetros uma vez (as
          deps dele não têm `src` nem `autoplay`), então um canvas montado solto que depois passe
          a ser regido pela voz seguiria rodando sozinho, sem erro nenhum. Na cena isso acontece
          de verdade — o `temVoz` do navegador só liga depois do `voiceschanged`. */}
      <MascotRiveCanvas
        key={montagem}
        expression={expression}
        className="size-full"
        silencioso={!(sound ?? ZAPPY_RIVE_COM_SOM[expression])}
        tocando={tocando}
        onPronto={() => setCarga({ montagem, pronto: true, falhou: false })}
        onFalhou={() => setCarga({ montagem, pronto: false, falhou: true })}
      />
    </span>
  )
}
