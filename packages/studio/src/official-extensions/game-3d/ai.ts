export const gameThreeDPromptContext = `Extensão: Jogo 3D (id: game-3d)

API global injetada como window.SZGame3D (wrapper sobre Three.js):
- createScene(canvasId) -> world { scene, camera, renderer }: cria cena+câmera+luz.
- setBackground(world, color) / setCameraPosition(world, x, y, z).
- createBox(world, { size, color }) -> mesh ; createSphere(world, { radius, color }) -> mesh.
- setPosition(obj, x, y, z) / setRotation(obj, x, y, z) (radianos).
- animate(world, fn): loop com setAnimationLoop; redesenha a cena a cada quadro.

Quando ajudar o aluno com 3D:
- Lembre de criar o <canvas> no HTML primeiro.
- Para girar/mover, anime dentro de "A cada frame 3D" usando uma variável que muda.
- Eixos: x = direita, y = cima, z = em direção à câmera. Rotação em radianos.
- Prefira pequenas iterações — não despeje a cena pronta.
`
