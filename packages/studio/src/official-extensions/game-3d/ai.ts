export const gameThreeDPromptContext = `Extensão: Jogo 3D (id: game-3d)

API global injetada como window.SZGame3D (wrapper sobre Three.js):
- createScene(canvasId) -> world { scene, camera, renderer }: cria cena+câmera+luz (com sombras).
- setBackground(world, color) / setCameraPosition(world, x, y, z).
- createBox(world, { size, color }) -> mesh ; createSphere(world, { radius, color }) -> mesh.
- createBlock(world, { width, height, depth, color }) -> mesh (caixa retangular; ótima p/ o chão).
- setPosition(obj, x, y, z) / setRotation(obj, x, y, z) (radianos) / setScale(obj, fator).
- animate(world, fn): loop com setAnimationLoop; redesenha a cena a cada quadro.

Física (chamar DENTRO do animate):
- setVelocity(obj, x, y, z): define a velocidade por quadro em cada eixo.
- controlWithKeys(obj, speed): anda no plano X/Z com WASD ou setas.
- applyGravity(obj, ground): puxa p/ baixo e para/quica no chão (andando pela velocidade).
- jump(obj, force): impulso p/ cima (só funciona se estiver no chão).
- cameraFollow(world, obj): a câmera acompanha o objeto mantendo o enquadramento.

Perguntas (booleanos p/ usar em "se"):
- keyDown(code): tecla apertada (codes: "KeyW","KeyA","KeyS","KeyD","Space","ArrowUp"...).
- collides(a, b): os dois objetos estão se encostando (AABB).
- hitAny(obj, group): obj encostou em algum do grupo.

Kit "Desvie":
- createGroup() -> []: lista p/ guardar os inimigos.
- runEnemies(world, group, ground, every, speed): a cada quadro, solta/move inimigos que vêm de
  longe acelerando e descarta os que passam. Chamar dentro do animate.
- stop(world): para o loop (fim de jogo).

Genéricos de grade/isométrico (mundo z-up, 1 tile = 1 unidade — p/ jogos tipo tabuleiro/Frogger):
- isometricCamera(world, followObj | null): troca p/ câmera ortográfica isométrica; segue o objeto.
- gridPosition(obj, row, col): coloca o objeto numa casa da grade.
- gridStep(obj): a cada quadro, anda uma casa por vez (setas) com um saltinho.
- gridMove(obj, "forward"|"backward"|"left"|"right"): enfileira um passo (p/ botões).
- moveAcross(group, speed, min, max): move os objetos do grupo no eixo x, dando a volta (esteira).
- touchesBox(obj, group): colisão por caixa real (Box3) — funciona com modelos compostos.

Kit "Travessia" (atravessar a rua / Crossy Road):
- createCrossingScene(canvasId) -> world: cena + câmera isométrica + luz (mundo de grade).
- createCrosser(world, { color }) -> player: personagem que pula de casa em casa (câmera segue).
- addRow(world, rowIndex, "grass"|"forest"|"car"|"truck", "right"|"left", speed): cria uma linha.
- generateRows(world, count): gera várias linhas aleatórias à frente.
- crosserStep(player, world): a cada quadro — setas em grade + estende/limpa o mapa + segue câmera.
- moveTraffic(world): move os veículos (dão a volta). crosserMove(player, dir): passo p/ botões.
- crosserHit(player, world): bateu num veículo? crosserRow(player): pontuação (linha).
- crosserReset(player, world): recomeça.

Quando ajudar o aluno com 3D:
- Lembre de criar o <canvas> no HTML primeiro.
- Crie os objetos UMA vez (fora do animate); dentro do loop só mova/anime/teste colisão.
- Eixos: x = direita, y = cima, z = em direção à câmera. Rotação em radianos.
- Para um jogo de desviar: jogador = cubo; chão = caixa larga em y baixo; no animate use
  controlWithKeys + se keyDown("Space") -> jump + applyGravity + runEnemies + se hitAny -> stop.
- Para um jogo de atravessar a rua (Travessia): createCrossingScene + createCrosser +
  generateRows(20); no animate: crosserStep + moveTraffic + se crosserHit -> mostrar o "Game Over".
  O HUD (pontuação, fim de jogo, setas) é feito com blocos de HTML/CSS e lido por crosserRow/crosserHit.
- Prefira pequenas iterações — não despeje a cena pronta.
`
