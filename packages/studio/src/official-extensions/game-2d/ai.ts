export const gameTwoDPromptContext = `Extensão: Jogo 2D (id: game-2d)

API global injetada como window.SZGame2D:
- createSprite({ x, y, w, h, color }) -> { x, y, w, h, color, vx, vy }
- drawSprite(ctx, sprite): desenha como fillRect.
- moveByKeys(sprite, speed): aplica setas do teclado / WASD.
- isColliding(a, b): AABB.
- gameLoop(fn): chama fn a cada requestAnimationFrame.
- keys: estado das setas { left, right, up, down }.

Quando ajudar o aluno com jogos 2D:
- Sempre lembre que o canvas precisa ser criado em HTML primeiro.
- Mostre que sprites são apenas objetos JS com x/y/w/h.
- Prefira pequenas iterações didáticas — não despeje o jogo pronto.
`
