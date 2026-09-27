import { PROGRAMMING_CATEGORY_COLORS } from './programmingAppearance'

// COR = IDENTIDADE DA CATEGORIA (igual ao MakeCode): cada CATEGORIA de topo tem
// UMA cor bem distinta, e suas SUB-categorias são VARIAÇÕES (tons) dessa cor —
// a cor diz à criança a que categoria o bloco pertence. Cada blocks/<cat>.ts faz
// `const C = CATEGORY_COLORS.<cat>`; os tons de sub-grupo vivem em *_GROUPS.
// ⚠️ "Programação" é UMA categoria (guarda-chuva): TUDO dentro dela — js/math/
// values/dom/events/objects/functions/classes — fica em tons de ÂMBAR/laranja.
export const CATEGORY_COLORS = {
  // Categorias de topo — 9 cores BEM distintas (escolha da usuária). Jogo 2D (rosa)
  // e Jogo 3D (amarelo) são EXTENSÕES — cor própria no blocks.ts de cada uma.
  search: '#8a94a6', // cinza (busca)
  html: '#2348cf', // azul escuro
  css: '#e63946', // vermelho
  svg: '#1aaf54', // verde
  canvas: '#9333ea', // roxo
  canvas3d: '#0d9488', // teal (Canvas 3D — three.js cru)
  // Magenta escuro: precisa ser distinto do rosa da extensão (#ec4899) e do
  // vermelho do CSS (#e63946). Este é mais escuro e mais roxo que os dois.
  som: '#a21caf', // magenta (Som — tocar os arquivos que a criança enviou)
  advanced: '#38bdf8', // azul do céu (claro)
  extension: '#ec4899', // rosa (extensão genérica = Jogo 2D)
  // Programação (guarda-chuva) — TUDO em tons de LARANJA, variando por área.
  ...PROGRAMMING_CATEGORY_COLORS,
} as const

// As funções de tonalidade vivem num módulo PURO (sem Blockly) p/ as extensões
// reusarem sem puxar o motor; re-exportadas aqui p/ os blocks/* internos.
export { categoryShades } from './colorShades'
