/**
 * A pele adulta do jogo, por cima do `ESTILOS` do Kids e só dentro de `.arq-raiz.arq-adulto`. Usa
 * os tokens do "Estúdio à noite" da comunidade adulta (`community/src/app/globals.css`): a raiz
 * do jogo mora dentro da página do community e herda as variáveis. Os valores depois da vírgula
 * são os mesmos literais de lá, para o playground (sem a página) ficar igual.
 *
 * O conceito de lá: a NOITE para esperar e comemorar (telas, falas, pílulas, resultado) e a
 * BANCADA clara para ler e fazer (menu e painéis); o amarelo com degrau é a ação; letra
 * Atkinson, títulos em Bricolage e nunca menos de 15 px de texto.
 */
import { ESTILOS } from '../interface/estilos'

/** A menor letra do community (`CLAUDE.md` de lá: "Menor letra permitida: 15 px"). */
export const MENOR_LETRA_ADULTA = 15

/** As partes de uma lista de seletores, sem quebrar as vírgulas de dentro de `:is()`. */
function partes(lista: string): string[] {
  const saida = ['']
  let fundo = 0
  for (const ch of lista) {
    if (ch === '(') fundo++
    if (ch === ')') fundo--
    if (ch === ',' && fundo === 0) saida.push('')
    else saida[saida.length - 1] += ch
  }
  return saida.map((p) => p.trim()).filter(Boolean)
}

/**
 * O piso da letra: cada regra do Kids com letra menor que 15 px ganha 15 px dentro de
 * `.arq-adulto`. É gerado do próprio `ESTILOS`, então regra nova do Kids já nasce coberta. Uma
 * regra de dentro de `@media` vira piso em todo tamanho (piso nunca diminui a letra).
 */
export function pisoDaLetra(css: string): string {
  const regras: string[] = []
  for (const [, seletor = '', corpo = ''] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const tamanho =
      /(?:^|;)\s*font-size:\s*(\d+(?:\.\d+)?)px/.exec(corpo) ??
      /(?:^|;)\s*font:[^;]*?(\d+(?:\.\d+)?)px/.exec(corpo)
    if (!tamanho || Number(tamanho[1]) >= MENOR_LETRA_ADULTA) continue
    const lista = partes(seletor).filter((p) => p.startsWith('.arq-'))
    if (lista.length === 0) continue
    regras.push(
      `${lista.map((p) => `.arq-adulto ${p}`).join(',')}{font-size:${MENOR_LETRA_ADULTA}px}`,
    )
  }
  return regras.join('\n')
}

export const ESTILOS_ADULTOS = `
.arq-adulto{--arq-noite:var(--noite,#0b0e1a);--arq-noite-2:var(--noite-2,#10142a);--arq-palco:var(--palco,#121733);--arq-carta:var(--carta,#1a2040);--arq-linha:var(--linha-escura,#2c3563);--arq-claro:var(--texto-claro,#f2f4fa);--arq-claro-2:var(--texto-claro-2,#c9d1e6);--arq-legenda:var(--legenda-clara,#a3aecb);--arq-cta:var(--cta,#ffc02e);--arq-degrau:var(--cta-degrau,#c98a00);--arq-dourado:var(--dourado,#ffd45c);--arq-menta:var(--menta,#7ce3a6);--arq-tinta:#1b2033;--arq-apagado:#4b5370;--arq-titulo:var(--font-display,"Bricolage Grotesque",system-ui,sans-serif);background:var(--arq-noite);font:16px/1.5 var(--font-sans,"Atkinson Hyperlegible Next","Atkinson Hyperlegible",system-ui,sans-serif)}
.arq-adulto :is(h1,h2,h3){font-family:var(--arq-titulo);letter-spacing:-.01em}
.arq-adulto .arq-botao{font-family:inherit;font-weight:700;font-size:15px;line-height:1.2;border-radius:12px;background:var(--arq-cta);color:var(--arq-noite);box-shadow:0 4px 0 var(--arq-degrau)}
.arq-adulto .arq-botao:hover:not(:disabled){background:var(--arq-dourado)}
.arq-adulto .arq-botao.leve{background:#fff;color:var(--arq-tinta);box-shadow:inset 0 0 0 2px var(--arq-tinta)}
.arq-adulto .arq-botao.leve:hover:not(:disabled){background:#eef0f6}
.arq-adulto .arq-botao[aria-pressed=true]{background:var(--arq-cta);color:var(--arq-noite);outline:3px solid var(--arq-noite);outline-offset:-3px}
.arq-adulto :is(.arq-botao,.arq-ferramenta,button,select,a):focus-visible{outline:3px solid var(--arq-cta);outline-offset:2px;box-shadow:0 0 0 6px var(--arq-noite)}
@media (prefers-reduced-motion:no-preference){.arq-adulto .arq-botao:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 var(--arq-degrau)}.arq-adulto .arq-botao.leve:active:not(:disabled){box-shadow:inset 0 0 0 2px var(--arq-tinta)}}
.arq-adulto .arq-tela{background-color:var(--arq-palco);background-image:radial-gradient(rgb(242 244 250/.09) 1px,transparent 1px);background-size:18px 18px;color:var(--arq-claro)}
.arq-adulto .arq-tela h1{font-size:32px}
.arq-adulto .arq-tela p{color:var(--arq-claro-2);font-size:17px}
.arq-adulto .arq-tela .arq-zappy{display:none}
.arq-adulto .arq-tela .arq-botao.leve{background:transparent;color:var(--arq-claro);box-shadow:inset 0 0 0 2px var(--arq-claro-2)}
.arq-adulto .arq-pilula{background:var(--arq-noite-2);color:var(--arq-claro);box-shadow:inset 0 0 0 1px var(--arq-linha);font-size:15px;font-weight:700}
.arq-adulto .arq-cartao{background:#fff;color:var(--arq-tinta);border-radius:14px;box-shadow:0 0 0 1px rgb(11 14 26/.08),0 8px 24px rgb(11 14 26/.28)}
.arq-adulto .arq-necessidades.arq-cartao,.arq-adulto .arq-soneca-cartao.arq-cartao{background:var(--arq-noite-2);color:var(--arq-claro);box-shadow:inset 0 0 0 1px var(--arq-linha)}
.arq-adulto .arq-nec{font-size:15px}
.arq-adulto .arq-dica{background:var(--arq-carta);color:var(--arq-claro);box-shadow:inset 0 0 0 1px var(--arq-linha);border-radius:14px;font-weight:600}
.arq-adulto .arq-acao{background:var(--arq-noite-2);box-shadow:inset 0 0 0 1px var(--arq-linha);font-weight:700}
.arq-adulto .arq-tecla{background:var(--arq-cta);color:var(--arq-noite);font-size:15px}
.arq-adulto .arq-sobre{background:rgb(11 14 26/.66)}
.arq-adulto .arq-menu h2{font-size:24px}
.arq-adulto .arq-menu ul{color:var(--arq-apagado)}
.arq-adulto .arq-menu-titulo{font-size:17px}
.arq-adulto .arq-ferramenta{border-color:#d9dce6;box-shadow:0 3px 0 #d9dce6;color:var(--arq-tinta)}
.arq-adulto .arq-ferramenta:hover:not(:disabled){border-color:var(--arq-cta)}
.arq-adulto small,.arq-adulto .arq-sobre :is(small,dt,legend,.arq-aviso,.arq-caderno-explica,.arq-quadro-sub){font-size:15px}
.arq-adulto .arq-sobre :is(small,.arq-caderno-explica,.arq-quadro-sub){color:var(--arq-apagado)}
.arq-adulto .arq-aviso.ok{background:#e2f7ea;color:#14532d}
.arq-adulto .arq-aviso.atencao{background:#fff4cc;color:#5c4100}
.arq-adulto .arq-resultado.arq-cartao{background:var(--arq-carta);color:var(--arq-claro);box-shadow:inset 0 0 0 1px var(--arq-linha),0 8px 24px rgb(11 14 26/.4)}
.arq-adulto .arq-resultado :is(small,dt){color:var(--arq-claro-2)}
.arq-adulto .arq-resultado .arq-estrelas .ganhou span{color:var(--arq-dourado)}
.arq-adulto .arq-resultado .arq-tempos div{background:var(--arq-palco)}
.arq-adulto .arq-resultado .arq-recorde{background:var(--arq-menta);color:var(--arq-noite);font-size:15px}
.arq-adulto .arq-resultado .arq-botao.leve{background:transparent;color:var(--arq-claro);box-shadow:inset 0 0 0 2px var(--arq-claro-2)}
.arq-adulto .arq-vidro,.arq-adulto .arq-cantinho .arq-modos{background:var(--arq-noite-2);border-color:var(--arq-linha);color:var(--arq-claro)}
.arq-adulto .arq-quem-marco{background:var(--arq-menta)}
.arq-adulto .arq-pausa{background:#fff;color:var(--arq-tinta);border-color:#d9dce6}
.arq-adulto .arq-pausa-nav{background:#f4f5f9;border-color:#e3e6ef}
.arq-adulto .arq-pausa-titulo{color:var(--arq-tinta)}
.arq-adulto .arq-pausa-lugar{color:var(--arq-tinta)}
.arq-adulto .arq-pausa-lugar .arq-icone,.arq-adulto .arq-pausa-sair{color:var(--arq-apagado)}
.arq-adulto .arq-pausa-lugar:hover:not(:disabled):not([aria-current]){background:#e9ecf4}
.arq-adulto .arq-cantinho .arq-modos .arq-botao.leve{background:transparent;color:var(--arq-claro);box-shadow:none}
.arq-adulto .arq-cantinho .arq-modos .arq-botao.leve[aria-pressed=true]{background:var(--arq-cta);color:var(--arq-noite);outline:0}
.arq-adulto .arq-pausa-lugar[aria-current=page],.arq-adulto .arq-pausa-lugar[aria-current=page] .arq-icone{background:var(--arq-cta);color:var(--arq-noite)}
.arq-adulto .arq-pausa-heroi{background:var(--arq-noite-2);color:var(--arq-claro);border-color:var(--arq-linha)}
.arq-adulto .arq-pausa .arq-pausa-heroi small{color:var(--arq-claro-2)}
.arq-adulto .arq-pausa-cartao .arq-pausa-rotulo{color:var(--arq-apagado)}
.arq-adulto .arq-pausa-diario .arq-pausa-rotulo{color:#7a5a12}
.arq-adulto .arq-pausa-cartao,.arq-adulto .arq-pausa .arq-ferramenta{background:#fff;border-color:#d9dce6;color:var(--arq-tinta)}
.arq-adulto .arq-pausa .arq-ferramenta{box-shadow:0 3px 0 #d9dce6}
.arq-adulto .arq-pausa-diario{background:#fff8e7}
.arq-adulto .arq-pausa :is(.arq-menu-titulo,.arq-pausa-controles,.arq-pausa-cartao dt,.arq-ferramenta small),.arq-adulto .arq-mapa-pequeno small{color:var(--arq-apagado)}
.arq-adulto .arq-pausa .arq-marcar{color:var(--arq-tinta)}
.arq-adulto .arq-pausa .arq-conforto{background:#f4f5f9;border-color:#e3e6ef}
.arq-adulto .arq-pausa-mapa{background:#f8f9fc;border-color:#e3e6ef}
${pisoDaLetra(ESTILOS)}
`
