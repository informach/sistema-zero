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
- \`SZWorld3D.flatten(x, z, raio)\` — aplaina um disco do chão (praça/pátio).
- \`SZWorld3D.path(x1, z1, x2, z2, largura)\` — trilha plana entre 2 pontos.
- \`SZWorld3D.water(altura, cor)\` — água até a altura dada; o carro afunda/
  respinga e respawna se cair fundo.
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
- \`SZWorld3D.carBoost(forca)\` — turbo com Shift (0..4). \`SZWorld3D.engineSound('ligado'|'desligado')\` — motor sintetizado.
- \`SZWorld3D.horn()\` — arma a buzina na tecla H (fom-fom + pulinho da carroceria).
  \`SZWorld3D.onHorn(() => { … })\` — roda ao buzinar.
- \`SZWorld3D.carLights()\` — luzes automáticas: faróis à noite, freio, ré e piscas.
- \`SZWorld3D.tireMarks('ligadas'|'desligadas')\` — marcas de pneu na derrapagem/turbo/neve (somem em ~6 s).
- \`SZWorld3D.carPaint('lisa'|'listras'|'chamas'|'arco-iris'|'estrelas')\` — pintura do carrinho (arco-iris muda de cor sozinho).
- Segredo pronto: o código Konami (cima cima baixo baixo esq dir esq dir B A) vira o carrinho um FOGUETE.
- \`SZWorld3D.confetti()\` — chuva de confete sobre o jogador. \`SZWorld3D.fireworks()\` — 1 foguete sobe e explode (use 3x p/ show).
- \`SZWorld3D.tornado(segundos)\` — tornado passeia, PUXA o carrinho perto e arremessa se encostar; some sozinho (3..60 s).
- \`SZWorld3D.season('primavera'|'verao'|'outono'|'inverno')\` — recolore copas+grama; outono chove folhas, inverno neva (se o clima estiver limpo).
- \`SZWorld3D.clouds('nenhuma'|'poucas'|'muitas')\` — nuvens no alto derivando com o vento.
- weather agora aceita também 'tempestade' (chuva pesada + raios + trovão atrasado; raio no carrinho = chacoalhão + câmera lenta).
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
- \`SZWorld3D.grass('pouca'|'media'|'muita')\` — grama instanciada ao vento
  (1 draw call), acompanha o terreno e segue o carro (parece infinita).
- \`SZWorld3D.dayNight(minutos)\` — liga o ciclo dia/noite (default 4 min por
  dia): céu/sol/névoa/estrelas interpolados por keyframes.
- \`SZWorld3D.setTime('manha'|'meiodia'|'entardecer'|'noite')\` — fixa a hora
  (ou escolhe a hora inicial do ciclo).
- \`SZWorld3D.weather('limpo'|'chuva'|'neve'|'folhas')\` — partículas que
  seguem o carro e obedecem ao vento.
- \`SZWorld3D.setWind(forca)\` — 0..5; mexe grama + clima.
- \`SZWorld3D.onDayNight('dia'|'noite', function () { ... })\` — dispara na
  VIRADA (dia = 6h..18h).
- \`SZWorld3D.timeOfDay()\` → 0..24.
- \`SZWorld3D.setEffects('ligados'|'desligados', brilho)\` — bloom + vinheta
  (composer próprio, ACES). Default LIGADO com brilho 1; brilho 0–3. O modo
  turbo (FPS < 45 nos primeiros segundos) desliga sozinho e reduz a grama.
- \`SZWorld3D.cameraMode('seguir'|'topo'|'cinema')\` — modo da câmera (seguir
  por trás / vista de cima / órbita cinema). \`SZWorld3D.cameraShake(forca, segundos)\`
  — tremor. (Joystick mobile aparece sozinho em toque; não tem método.)
- \`SZWorld3D.onCrash(function () { ... })\` — trombada forte do carro em coisa
  sólida (tem respiro de 0.4 s entre disparos).
- \`SZWorld3D.loadSound(apelido, asset)\` / \`playSound(apelido)\` / \`playMusic(apelido)\` (loop) / \`stopMusic()\` — sons/música do projeto.
- \`SZWorld3D.hud(texto, 'topo-esquerda'|'topo-direita'|'baixo-esquerda'|'baixo-direita')\` — texto fixo num canto (vazio apaga).
- \`SZWorld3D.say(texto, segundos)\` — balão de fala sobre o carro.
- \`SZWorld3D.point(nome, x, z)\` — ponto interativo (pilar + badge 'E').
  \`SZWorld3D.onPoint(nome, function () { ... })\` — aperte E perto do ponto.
- \`SZWorld3D.zone(nome, x, z, raio)\` — área invisível.
  \`SZWorld3D.onZone(nome, function () { ... })\` — dispara ao ENTRAR (1×/entrada).
- \`SZWorld3D.totemText(x, z, titulo, texto)\` — placa de madeira.
- \`SZWorld3D.totemImage(x, z, nomeDaImagem, largura)\` — quadro com imagem do
  projeto.
- \`SZWorld3D.galleryCreate(x, z, titulo)\` + \`SZWorld3D.galleryAdd(nomeDaImagem, legenda)\`
  — praça de exposição; cada quadro abre num overlay de zoom com 'E: ver'.
- 🏁 Corrida: \`SZWorld3D.raceCreate(x, z, graus, voltas)\` +
  \`SZWorld3D.raceCheckpoint(x, z, graus)\` (na ORDEM da pista) +
  \`raceOnStart/raceOnCheckpoint/raceOnFinish(function(){})\` +
  \`raceTime()\`/\`raceBest()\` (segundos; recorde persiste no localStorage).
  Cronômetro e contador i/N no HUD são automáticos.
- 🎳 Boliche: \`SZWorld3D.bowlingCreate(x, z, graus)\` (10 pinos) +
  \`bowlingReset()\` + \`bowlingOnStrike(function(){})\` + \`pinsDown()\` +
  \`SZWorld3D.stack(n, 'caixas'|'latas', x, z)\` (torre) + \`knockedCount()\`.
  Objetos tombam de verdade quando o carro bate (knockdown arcade).
- \`SZWorld3D.onUpdate(function (dt) { ... })\` — gancho por quadro; dt em
  segundos, clampado em 1/30.
- \`SZWorld3D.keyDown(tecla)\` / \`SZWorld3D.keyPressed(tecla)\` → boolean.
  Apelidos PT: 'cima', 'baixo', 'esquerda', 'direita', 'espaco'.

### O que NÃO existe (não invente)

- Sem rede no preview (fetch/XHR morrem) — modelos .glb só do PROJETO (o
  runtime parseia o ArrayBuffer; nada de carregar por URL).
- Sem Rapier/física de biblioteca: o carro é arcade na unha do motor.
- Sem menu/pausa/vidas: não é um jogo de fases, é um mundo.
- Joystick mobile e modos de câmera chegam na próxima versão.
- Use APENAS UMA extensão de jogo/mundo por projeto (brigam pelo canvas).
`
