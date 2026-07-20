/**
 * Contexto do Mundo 3D para o painel de IA (vai CRU no system prompt quando a
 * extensão está instalada). Teto: MAX_PROMPT_CONTEXT_CHARS (36k) — manter
 * enxuto; a API é 1 método por bloco.
 */
export const world3DPromptContext = `## Extensão instalada: Mundo 3D (world-3d)

Mundo 3D aberto dirigível via \`window.SZWorld3D\` (facade global, já carregada
no preview). Modelo mental: a criança monta um MUNDO (não um jogo de fases) e
dirige um carrinho nele. Unidades em METROS; o carrinho tem ~3 m.

### Receita canônica por Área do projeto

\`\`\`js
// ⚙️ Ao iniciar
SZWorld3D.setup({ style: 'floresta', world: 160 });
SZWorld3D.terrain(4, 5);
SZWorld3D.car({ style: 'passeio', color: '#ef4444' });
// 🔁 Loop principal
SZWorld3D.onUpdate(function (dt) {
  // mecânica extra da criança (opcional)
});
\`\`\`

Use 🎯 Eventos para os chapéus “Quando…” e 🔁 Loop principal para onUpdate e
outros loops-raiz. O Studio chama o ciclo de vida automaticamente. NÃO gere
\`SZWorld3D.start()\`: esse método existe apenas para projetos legados.

### API (1 método por bloco)

- \`SZWorld3D.setup({ style, world })\` — estilos: 'floresta' | 'praia' |
  'neve' | 'deserto' | 'primavera' | 'lua' | 'fazenda' (na neve o carro
  escorrega; na LUA a gravidade cai p/ 40%, o céu nasce estrelado e o chão
  ganha crateras automáticas). world = lado do mundo em metros (40–600,
  padrão 160). Use em Ao iniciar, antes do boot automático.
- \`SZWorld3D.terrain(alturaMorros, suavidade)\` — colinas por ruído
  determinístico (mesmo mundo sempre); centro plano p/ o spawn. Pode DEPOIS
  do start (reconstrói na hora). altura 0–30 m, suavidade 1–30.
- \`SZWorld3D.flatten(x, z, raio)\` — aplaina um disco do chão (praça/pátio).
- \`SZWorld3D.path(x1, z1, x2, z2, largura)\` — trilha plana entre 2 pontos.
- \`SZWorld3D.water(altura, cor)\` — água até a altura dada; o carro afunda/
  respinga e respawna se cair fundo.
- \`SZWorld3D.skyPhoto(nomeDoHdr)\` — usa um asset .hdr do projeto como céu
  panorâmico e iluminação ambiente; nunca carrega URL externa.
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
- \`SZWorld3D.pushPlace('tijolo'|'banco'|'cerca'|'lanterna'|'cone', x, z)\` — 1 objeto EMPURRÁVEL (desliza/gira/quica; renasce se cair na água).
  \`SZWorld3D.pushScatter(n, x, z, raio)\` — espalha uma bagunça variada (teto 256 no total).
- \`SZWorld3D.letters('PALAVRA', x, z, tamanho)\` — cubos de letra empurráveis (cap 24; o "BRUNO" do folio).
- \`SZWorld3D.explosive(x, z)\` — caixa TNT: encostão rápido detona (bola de fogo + impulso radial + cadeia entre caixas vizinhas + câmera lenta se te pegar).
  \`SZWorld3D.onExplosion(() => { … })\` — roda a cada explosão.
- \`SZWorld3D.waterfall(x, z, altura, graus)\` — cortina d'água com espuma na base (esconda segredos atrás).
- \`SZWorld3D.lamp(x, z)\` — poste que acende à noite (os 4 mais perto iluminam de verdade). \`SZWorld3D.fireflies('pouca'|'media'|'muita')\` — vaga-lumes noturnos.
- \`SZWorld3D.campfire(x, z)\` — fogueira crepitando que vira CHECKPOINT: afundou na água → volta na última fogueira tocada. A água tem espuma na costa automaticamente.
- weather agora aceita também 'tempestade' (chuva pesada + raios + trovão atrasado; raio no carrinho = chacoalhão + câmera lenta).
- \`SZWorld3D.carPos('x'|'y'|'z')\` → número. \`SZWorld3D.carSpeed()\` → m/s.
- \`SZWorld3D.person(corHex, 'nenhum'|'bone'|'palha'|'coroa'|'capacete')\` — personagem A PÉ (WASD/Shift/espaço); o passeio começa a pé; E perto do carrinho ENTRA, E dirigindo DESCE.
  \`SZWorld3D.personStats(andar, correr, pulo)\` · \`SZWorld3D.personPlace(x, z, graus)\` · \`SZWorld3D.personEmote('acenar'|'pular'|'girar'|'dancar')\`.
- \`SZWorld3D.personAccessory('nenhum'|'jetpack'|'botas')\` — jetpack = segurar espaço no ar VOA; botas = corrida ×1,8 (Coastal-style).
- \`SZWorld3D.onVehicle('entrar'|'sair', () => { … })\` — gancho da troca. \`SZWorld3D.personPos('x'|'y'|'z')\` → número (no carro = posição do carro). \`SZWorld3D.isDriving()\` → booleano.
- \`SZWorld3D.islands(n, alturaDoMar)\` — vira ARQUIPÉLAGO (a água entra sozinha; você nasce na ilha 0, no centro).
- \`SZWorld3D.boat(corHex)\` — barco dirigível: SÓ anda na água, encalha na praia; com personagem, E perto dele embarca; sem carro nem personagem, nasce pilotando.
- \`SZWorld3D.bridge(x1, z1, x2, z2, largura)\` — ponte em arco: carro/personagem POR CIMA, barco POR BAIXO. \`SZWorld3D.lighthouse(x, z)\` — farol com luz girando à noite.
- \`SZWorld3D.ambience('mar'|'passaros'|'grilos'|'desligado')\` — som de fundo sintetizado. scatter/placeThing agora aceitam 'palmeiras' 🌴.
- 🏙️ \`SZWorld3D.city(x, z, 'pequena'|'media'|'grande', 'dia'|'neon')\` — a
  CIDADEZINHA completa (estilo Vocation Vista): praça com coreto + varais,
  anel de rua com faixas de pedestre, 4 ruas de entrada, casinhas/lojas/
  predinhos coloridos instanciados, cercas-vivas, laguinho, postes nos
  cruzamentos; o chão aplaina sozinho e as ruas aparecem no minimapa. UMA
  por mundo. Modo 'neon' = noite + chuva leve por default (se a criança não
  pediu outra hora/clima) + letreiros emissivos brilhando no bloom.
- \`SZWorld3D.district('residencial'|'comercial'|'educacao'|'saude'|
  'industrial'|'turistico', x, z, tamanho)\` — bairro procedural instanciado;
  aplaina e limpa a área sozinho. \`SZWorld3D.roadGrid('grade'|'radial'|
  'organica', x, z, tamanho, largura)\` — rede de ruas em 2 draw calls.
  \`SZWorld3D.houseRow(n, x1, z1, x2, z2, 'coloridas'|'praia'|'modernas'|
  'campo')\` — fileira de casas primitivas instanciadas.
- 🌙 \`SZWorld3D.crater(x, z, raio)\` — tigela com borda erguida no heightAt
  (compõe com flatten/trilha; qualquer estilo). \`SZWorld3D.flag(x, z,
  corHex)\` — mastro + bandeira (cap 8). \`SZWorld3D.rocket(x, z)\` — foguete
  decorativo com colisor (cap 8). O estilo 'lua' já traz ~12 crateras
  automáticas + gravidade 0.4 + noite default.
- 🚜 \`SZWorld3D.crops(n, 'milho'|'alface'|'abobora', x, z)\` — fileiras de
  plantação (área auto-limpa de scatter). \`SZWorld3D.barn(x, z, graus)\` —
  celeiro com colisor. \`SZWorld3D.windmill(x, z)\` — pás giram com o
  setWind. \`SZWorld3D.fence(x1, z1, x2, z2)\` — postes SÓLIDOS + 2 ripas
  (teto 256 postes). \`SZWorld3D.animals(n, 'galinhas'|'vacas', x, z, raio)\`
  — bichinhos instanciados que perambulam e bicam (cap 16 total).
- \`SZWorld3D.door(x, z, graus, 'Título', 'Texto', 'imagem')\` — porta
  interativa: E perto abre um overlay LOCAL (título + texto + imagem do
  projeto via ASSETS; imagem '' = sem). É o "conteúdo do prédio" do
  Vocation Vista sem rede. Cap 16 portas; prio 1 no árbitro do E; E fecha.
- \`SZWorld3D.npcAsk('Nome', 'Pergunta?', 'OpA', fnA, 'OpB', fnB)\` —
  pergunta com 2 escolhas na fila de falas do amigo: balão typewriter + 2
  botões (clique ou teclas 1/2); a escolha roda fnA/fnB (que normalmente
  enfileiram npcSay — conversa RAMIFICADA). Enquanto aberta, E é engolido.
- \`SZWorld3D.traffic(n, 'semaforos'|'livre')\` — carrinhos autônomos (1–12)
  circulando o ANEL da cidade em 1 InstancedMesh: param atrás do jogador
  (buzinam após 2 s), respeitam semáforos sincronizados nos 4 cruzamentos
  (anda 8s → amarelo 1,5s → para 5s, tudo em dt — o bullet-time desacelera
  o ciclo junto) e nunca colidem (freio 1-D na lane). Exige a cidadezinha.
- \`SZWorld3D.stringLights(x1, z1, x2, z2)\` — varal de luzinhas entre 2
  postes (catenária; as lâmpadas acendem com o escurecer). Vale em qualquer
  mundo, com ou sem cidade.
- \`SZWorld3D.npc('Nome', x, z, corHex, chapeu)\` — amigo que olha p/ você de perto (cap 8). \`SZWorld3D.npcWander('Nome', raio)\` — passeia ao redor de casa.
- \`SZWorld3D.npcTalk('Nome', () => { … })\` — roda no E perto do amigo; dentro, \`SZWorld3D.npcSay('Nome', 'fala')\` ENFILEIRA falas (cada E mostra a próxima, typewriter + blip por letra à la Animal Crossing). \`SZWorld3D.npcEmote('Nome', 'acenar'|'pular'|'girar'|'dancar')\`.
- \`SZWorld3D.coinsScatter(n)\` / \`coinsRing(n, x, z, raio)\` / \`coinsLine(n, x1, z1, x2, z2)\` — moedas girando (cap 512; nunca na água). Pegar = encostar: plim + HUD 🪙 automático + \`SZWorld3D.onCollect(() => { … })\`. \`SZWorld3D.coinCount()\` → total.
- \`SZWorld3D.quest('nome', 'descrição')\` — a missão ATIVA aparece no painel sozinha. \`SZWorld3D.questDone('nome')\` — confete + fanfarra + \`SZWorld3D.onQuestDone('nome', () => { … })\`. Meta automática NÃO existe: componha com onCollect + se coinCount() >= N.
- \`SZWorld3D.marker('alerta'|'estrela'|'alvo'|'moeda', x, z)\` — ícone quicando sobre o lugar. \`SZWorld3D.guideArrow(x, z, 'ligada'|'desligada')\` — seta na tela que aponta o alvo e some ao chegar.
- \`SZWorld3D.achievement('nome')\` — conquista PARA SEMPRE (salva no projeto; 1ª vez = toast+confete; repetir não refesteja). \`SZWorld3D.onAchievement('nome', () => { … })\` · \`SZWorld3D.hasAchievement('nome')\` → booleano (vale entre jogadas).
- Inventário persistente: \`SZWorld3D.inventoryGive('item', n)\`,
  \`inventoryRemove('item', n)\`, \`inventoryCount('item')\` → número e
  \`inventoryHas('item', n)\` → booleano. Nunca fica negativo.
- \`SZWorld3D.minimap('ver'|'teleporte')\` — minimapa no canto; M abre o mapa grande (teleporte = clicar viaja).
- \`SZWorld3D.racePodium()\` — fim da corrida pede 3 INICIAIS (setas+E); top-5 salvo no projeto; P reabre.
- \`SZWorld3D.whisperCorner(x, z)\` — cantinho onde o JOGADOR escreve recados (viram chamas 🔥 persistentes, cap 20). \`SZWorld3D.flameNote(x, z, 'texto')\` — a SUA dica-chama (E lê).
- \`SZWorld3D.scatter(n, especie)\` — espalha n cópias procedurais pelo mundo
  (pousadas no terreno, determinístico). especies: 'arvores' | 'pinheiros' |
  'pedras' | 'flores' | 'cogumelos' | 'cactos'. Árvores/pedras/cactos são
  SÓLIDOS (colidem com o carro); flores/cogumelos não. Teto global ~12.000
  instâncias. Respeita as áreas do clearArea; o centro (spawn) já nasce limpo.
- \`SZWorld3D.scatterModel(n, nomeDoModelo, tamanho)\` — espalha um .glb do
  projeto (o aluno envia no painel de assets e escolhe no seletor). Sólido se for
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
- \`SZWorld3D.quality('automatica'|'alta'|'desempenho')\` — escolha explícita;
  automática mede FPS, desempenho reduz resolução interna/sombras/grama.
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
- No toque aparecem direção, pulo, interação, turbo/corrida, buzina, mapa e pódio.
- Use APENAS UMA extensão de jogo/mundo por projeto (brigam pelo canvas).
`
