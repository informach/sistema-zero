/**
 * Páginas "Conheça a plataforma" dos Passo a passo do projeto (14/11/2026).
 *
 * Na Aula 1 dos cursos de entrada (Cadê Todo Mundo? e A Chave do Farol), a criança vê pela
 * primeira vez cada tipo de parte: o jogo pronto, o passo a passo, a experiência e o Estúdio. Estas
 * páginas mostram o print real de cada tela com marcas numeradas por cima e a legenda do que é
 * cada coisa. Ficam dentro do próprio passo a passo, junto da parte em que a tela aparece.
 *
 * - Os prints e a posição de cada marca vêm de `telas/<curso>/` (ver `capturar-telas.py`).
 * - O texto que a criança lê mora em `conteudo.json`, conferido por
 *   `qa/guia-da-plataforma.test.ts` (vocabulário e nomes dos botões).
 * - Os dois geradores (`cade-todo-mundo/gerar-caderno.ts` e `desafio-farol/gerar-caderno.ts`)
 *   chamam `guiaSecao` e somam `GUIA_CSS` ao CSS do caderno.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type CursoDoGuia = 'cade-todo-mundo' | 'desafio-primeiro-jogo'

type Marca = { x: number; y: number; w: number; h: number; ancora: string; nome: string }
type Captura = { arquivo: string; largura: number; altura: number; marcas: Record<string, Marca> }
type Tela = {
  formato: 'larga' | 'lado'
  largura?: number
  legenda: string
  marcas: Record<string, string>
}
type Pagina = {
  id: string
  parte: number
  titulo: string
  texto: string
  telas: string[]
  nota?: string
}
export type ConteudoDoGuia = { paginas: Pagina[]; telas: Record<string, Tela> }

const AQUI = import.meta.dir
export const CONTEUDO_DO_GUIA = JSON.parse(
  readFileSync(resolve(AQUI, 'conteudo.json'), 'utf8'),
) as ConteudoDoGuia

export function capturasDoCurso(curso: CursoDoGuia): Record<string, Captura> {
  return JSON.parse(readFileSync(resolve(AQUI, 'telas', curso, 'marcas.json'), 'utf8'))
}

/** As páginas do guia, na ordem em que entram no caderno. */
export const GUIA_IDS = CONTEUDO_DO_GUIA.paginas.map((p) => p.id)

/** Marcas da tela que existem no print deste curso, na ordem da legenda. */
export function marcasDaTela(curso: CursoDoGuia, tela: string): [string, string, Marca][] {
  const conteudo = CONTEUDO_DO_GUIA.telas[tela]
  const captura = capturasDoCurso(curso)[tela]
  if (!conteudo || !captura) throw new Error(`Tela do guia sem conteúdo ou sem print: ${tela}`)
  const sobra = Object.keys(captura.marcas).filter((id) => !(id in conteudo.marcas))
  if (sobra.length) throw new Error(`${curso}/${tela}: marcas sem legenda: ${sobra.join(', ')}`)
  return Object.entries(conteudo.marcas).flatMap(([id, texto]) => {
    const marca = captura.marcas[id]
    return marca ? [[id, texto, marca] as [string, string, Marca]] : []
  })
}

/** Ponto do número da marca: na borda da caixa, do lado que a captura escolheu. */
function pontoDaAncora({ x, y, w, h, ancora }: Marca): { left: number; top: number } {
  const meioX = x + w / 2
  const meioY = y + h / 2
  const pontos: Record<string, { left: number; top: number }> = {
    tl: { left: x, top: y },
    tr: { left: x + w, top: y },
    bl: { left: x, top: y + h },
    br: { left: x + w, top: y + h },
    t: { left: meioX, top: y },
    b: { left: meioX, top: y + h },
    l: { left: x, top: meioY },
    r: { left: x + w, top: meioY },
  }
  const ponto = pontos[ancora]
  if (!ponto) throw new Error(`Âncora desconhecida: ${ancora}`)
  // O número nunca sai da imagem.
  return {
    left: Math.min(Math.max(ponto.left, 2.2), 97.8),
    top: Math.min(Math.max(ponto.top, 2.2), 97.8),
  }
}

function figura(curso: CursoDoGuia, tela: string): string {
  const conteudo = CONTEUDO_DO_GUIA.telas[tela]
  const captura = capturasDoCurso(curso)[tela]
  if (!conteudo || !captura) throw new Error(`Tela do guia sem conteúdo ou sem print: ${tela}`)
  const imagem = readFileSync(resolve(AQUI, 'telas', curso, captura.arquivo)).toString('base64')
  const marcas = marcasDaTela(curso, tela)
  const caixas = marcas
    .map(([id, , m], i) => {
      // Área grande (um cartão inteiro) ganha contorno tracejado, para não cobrir a tela.
      const grande = m.w * m.h > 600 ? ' guia-alvo--grande' : ''
      const { left, top } = pontoDaAncora(m)
      return `<span class="guia-alvo${grande}" data-marca="${id}" style="left:${m.x}%;top:${m.y}%;width:${m.w}%;height:${m.h}%"></span><span class="guia-num guia-num--${m.ancora}" style="left:${left}%;top:${top}%">${i + 1}</span>`
    })
    .join('')
  const legenda = marcas
    .map(
      ([id, texto], i) =>
        `<li data-marca="${id}"><span class="guia-num-legenda">${i + 1}</span><p>${texto}</p></li>`,
    )
    .join('')
  const proporcao = (captura.altura / captura.largura).toFixed(4)
  const quadro = `<figure class="guia-figura"><div class="guia-print" style="aspect-ratio:${captura.largura}/${captura.altura}" data-proporcao="${proporcao}"><img src="data:image/jpeg;base64,${imagem}" alt="${conteudo.legenda}">${caixas}</div><figcaption>${conteudo.legenda}</figcaption></figure>`
  const lista = `<ol class="guia-legenda guia-legenda--${conteudo.formato}">${legenda}</ol>`
  if (conteudo.formato === 'lado')
    return `<div class="guia-lado" style="grid-template-columns:${conteudo.largura ?? 90}mm minmax(0,1fr)">${quadro}${lista}</div>`
  return `${quadro}${lista}`
}

/**
 * A folha inteira de uma página do guia. `kicker` recebe o número da parte e devolve o rótulo do
 * caderno ("Aula 1 · Parte 1" no Cadê, "Dia 1 · Parte 1" no Farol); `rodape` é o HTML do rodapé.
 */
export function guiaSecao(
  id: string,
  {
    curso,
    kicker,
    rodape,
  }: { curso: CursoDoGuia; kicker: (parte: number) => string; rodape: string },
): string {
  const pagina = CONTEUDO_DO_GUIA.paginas.find((p) => p.id === id)
  if (!pagina) throw new Error(`Página do guia desconhecida: ${id}`)
  const telas = pagina.telas.map((tela) => figura(curso, tela)).join('')
  const nota = pagina.nota ? `<div class="note guia-nota">${pagina.nota}</div>` : ''
  return `<section class="page lesson-one guia" data-id="${id}"><div class="inner"><div class="guia-topo"><span class="guia-selo">Conheça a plataforma</span><div class="kicker">${kicker(pagina.parte)}</div><h2>${pagina.titulo}</h2><p>${pagina.texto}</p></div><div class="content guia-conteudo">${telas}${nota}</div></div>${rodape}</section>`
}

/** Estilo das páginas do guia. Usa as cores e as fontes do caderno de referência. */
export const GUIA_CSS = `
.guia .inner { display: flex; flex-direction: column; }
.guia-topo { border-top: 5px solid var(--accent); padding-top: 4mm; margin-bottom: 5mm; }
.guia-selo { display: inline-block; border-radius: 40px; padding: 4px 11px; font-size: 8.5pt; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--brand); background: var(--brand-soft); }
.guia-topo .kicker { margin-top: 3mm; color: var(--accent); font-size: 10pt; }
.guia-topo h2 { margin: 1.5mm 0 2.5mm; font-size: 23pt; }
.guia-topo p { font-size: 11pt; line-height: 1.5; text-wrap: pretty; }
.guia-conteudo { display: grid; gap: 4.5mm; align-content: start; }
.guia-figura { margin: 0; }
.guia-print { position: relative; width: 100%; border-radius: 12px; border: 1px solid #d9def2; box-shadow: 0 6px 18px #1f20421f; background: #fff; }
.guia-print img { display: block; width: 100%; height: 100%; border-radius: 11px; }
.guia-figura figcaption { margin-top: 2mm; color: var(--muted); font-size: 8.5pt; font-weight: 700; }
.guia-alvo { position: absolute; border: 2.4px solid var(--brand); border-radius: 7px; box-shadow: 0 0 0 2.5px #ffffffd9, 0 0 0 4px #5a4bff33; }
.guia-alvo--grande { border-style: dashed; border-width: 2px; box-shadow: 0 0 0 2px #ffffffb3; }
.guia-num, .guia-num-legenda { display: grid; place-items: center; border-radius: 50%; background: var(--brand); color: #fff; font-family: 'Baloo 2', Arial, sans-serif; font-weight: 800; line-height: 1; }
.guia-num { position: absolute; width: 6.6mm; height: 6.6mm; transform: translate(-50%, -50%); font-size: 10.5pt; border: 2px solid #fff; box-shadow: 0 2px 6px #1f204259; z-index: 2; }
/* Nos lados, o número fica do lado de fora da marca, para não cobrir o nome do botão. Nos cantos
   (cartões inteiros), fica sobre a quina do contorno. */
.guia-num--t { transform: translate(-50%, calc(-100% - 1.1mm)); }
.guia-num--b { transform: translate(-50%, 1.1mm); }
.guia-num--l { transform: translate(calc(-100% - 1.1mm), -50%); }
.guia-num--r { transform: translate(1.1mm, -50%); }
.guia-legenda { list-style: none; margin: 0; padding: 0; display: grid; gap: 2.6mm 6mm; }
.guia-legenda--larga { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.guia-legenda--lado { grid-template-columns: minmax(0, 1fr); align-content: start; }
.guia-legenda li { display: flex; gap: 2.6mm; align-items: flex-start; }
.guia-num-legenda { flex: none; width: 5.8mm; height: 5.8mm; font-size: 9.5pt; margin-top: .3mm; }
.guia-legenda p { font-size: 9.8pt; line-height: 1.42; text-wrap: pretty; }
.guia-legenda b { color: var(--ink); }
.guia-lado { display: grid; gap: 6mm; align-items: start; }
.guia-nota { font-size: 10pt; }
`
