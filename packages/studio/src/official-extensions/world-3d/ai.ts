/**
 * Contexto do Mundo 3D para o painel de IA (vai CRU no system prompt quando a
 * extensão está instalada). Teto: MAX_PROMPT_CONTEXT_CHARS (36k) — manter
 * enxuto; a API é 1 método por bloco.
 */
export const world3DPromptContext = `## Extensão instalada: Mundo 3D (world-3d)

Mundo 3D aberto dirigível via \`window.SZWorld3D\` (facade global, já carregada
no preview). Modelo mental: a criança monta um MUNDO (não um jogo de fases) e
dirige um carrinho nele. Unidades em METROS; o carrinho tem ~3 m.

### Receita canônica (a ordem importa só no começar)

\`\`\`js
SZWorld3D.setup({ style: 'floresta', world: 160 });
SZWorld3D.terrain(4, 5);
SZWorld3D.car({ style: 'passeio', color: '#ef4444' });
SZWorld3D.onUpdate(function (dt) {
  // mecânica extra da criança (opcional)
});
SZWorld3D.start(); // SEMPRE por último
\`\`\`

### API (1 método por bloco)

- \`SZWorld3D.setup({ style, world })\` — estilos: 'floresta' | 'praia' |
  'neve' | 'deserto' | 'primavera' (na neve o carro escorrega). world =
  lado do mundo em metros (40–600, padrão 160). Só ANTES do start.
- \`SZWorld3D.terrain(alturaMorros, suavidade)\` — colinas por ruído
  determinístico (mesmo mundo sempre); centro plano p/ o spawn. Pode DEPOIS
  do start (reconstrói na hora). altura 0–30 m, suavidade 1–30.
- \`SZWorld3D.start()\` — monta tudo, telinha "Começar o passeio", liga o laço.
- \`SZWorld3D.worldSize()\` → número (lado do mundo).
- \`SZWorld3D.groundHeight(x, z)\` → altura do terreno naquele ponto (use para
  pousar objetos SEUS em cima dos morros).
- \`SZWorld3D.car({ style, color })\` — carrinho COMPLETO: WASD/setas, espaço
  pula, molejo, câmera que segue com zoom por velocidade. styles: 'passeio' |
  'jipe' | 'corrida'.
- \`SZWorld3D.carStats(velocidadeMax, curvaGrausPorSeg, forcaPulo)\` — depois
  do car().
- \`SZWorld3D.carPlace(x, z, graus)\` — teleporta (pousa no chão, parado).
- \`SZWorld3D.carPos('x'|'y'|'z')\` → número. \`SZWorld3D.carSpeed()\` → m/s.
- \`SZWorld3D.scatter(n, especie)\` — espalha n cópias procedurais pelo mundo
  (pousadas no terreno, determinístico). especies: 'arvores' | 'pinheiros' |
  'pedras' | 'flores' | 'cogumelos' | 'cactos'. Árvores/pedras/cactos são
  SÓLIDOS (colidem com o carro); flores/cogumelos não. Teto global ~12.000
  instâncias. Respeita as áreas do clearArea; o centro (spawn) já nasce limpo.
- \`SZWorld3D.scatterModel(n, nomeDoModelo, tamanho)\` — espalha um .glb do
  projeto (o aluno envia no painel de assets e usa o NOME). Sólido se for
  grandinho.
- \`SZWorld3D.placeThing(especie, x, z, tamanho)\` — UMA cópia num ponto exato.
- \`SZWorld3D.placeModel(nome, x, z, tamanho, graus)\` — UM .glb num ponto.
- \`SZWorld3D.clearArea(x, z, raio)\` — círculo sem natureza espalhada; chame
  ANTES dos scatter.
- \`SZWorld3D.onCrash(function () { ... })\` — trombada forte do carro em coisa
  sólida (tem respiro de 0.4 s entre disparos).
- \`SZWorld3D.onUpdate(function (dt) { ... })\` — gancho por quadro; dt em
  segundos, clampado em 1/30.
- \`SZWorld3D.keyDown(tecla)\` / \`SZWorld3D.keyPressed(tecla)\` → boolean.
  Apelidos PT: 'cima', 'baixo', 'esquerda', 'direita', 'espaco'.

### O que NÃO existe (não invente)

- Sem rede no preview (fetch/XHR morrem) — modelos .glb só do PROJETO (o
  runtime parseia o ArrayBuffer; nada de carregar por URL).
- Sem Rapier/física de biblioteca: o carro é arcade na unha do motor.
- Sem menu/pausa/vidas: não é um jogo de fases, é um mundo.
- Grama ao vento, água, dia/noite, clima, pontos interativos, corrida,
  boliche e galeria chegam em versões futuras da extensão — se os blocos não
  estão na paleta, o método não existe ainda.
- Use APENAS UMA extensão de jogo/mundo por projeto (brigam pelo canvas).
`
