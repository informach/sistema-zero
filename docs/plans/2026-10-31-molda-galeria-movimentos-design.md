# Molda: galeria viva de movimentos do personagem

Data: 31/10/2026. Pedido: os movimentos prontos devem trocar dinamicamente no personagem, como no
Mixamo. Escopo escolhido: "Galeria viva".

## Decisões

- Em Animar, "Movimentos do personagem" (Parado, Andando, Correndo, Pulando) fica sempre à
  mostra. Os movimentos de uma peça (pular, balançar, girar) ficam atrás de um botão próprio.
- Um clique troca a prévia na hora e ela repete em loop; não há diálogo entre prévias nem depois
  de guardar. O diálogo continua só quando há pose marcada à mão e não gravada.
- Velocidade (0,5–2×) e Intensidade (50–150%) são sliders. Mudar refaz a prévia no mesmo ponto
  do ciclo, sem reiniciar.
- No máximo um de cada movimento por personagem: o guardado é o clipe com o nome do movimento.
  Guardar de novo vira "Atualizar <nome>" e troca o clipe no lugar (mesmo id, nome e posição),
  em um passo de desfazer. Os guardados mostram ✓.
- A prévia continua fora do arquivo e do desfazer até guardar. Sem mudança de formato.

## Espaço no painel

A galeria parada ocupa o que precisa (até 45% da altura) e a pose fica com o resto. Com uma
prévia tocando, a área dos movimentos cresce e a pose cede.

## Testes

`characterRig.test.ts` (troca no lugar e id inexistente), `SceneWorkshop.test.tsx` (troca sem
diálogo, sliders, guardar, ✓, atualizar e desfazer, miniatura durante a marcação),
`e2e/character-rig.spec.ts` (Correndo → Andando → sliders → guardar → atualizar).
