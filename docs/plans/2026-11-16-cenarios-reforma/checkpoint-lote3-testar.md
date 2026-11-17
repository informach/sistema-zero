# Checkpoint de Testar — parte 3.8 em andamento

17/11/2026 · Continuação de `0287b1cb3` na `staging`. **Este checkpoint não fecha a parte 3.8 nem o lote 3.**

O palco agora oferece uma sessão separada de exploração, com câmeras de primeira/terceira pessoa e voo, gravidade, salto, degraus e colisão por cápsula contra as malhas reais. O chão externo decorativo não vira piso. Caixas, cápsulas e malha respeitam a escolha do objeto; nenhuma colisão e peças pendentes ficam fora. Uma árvore MeshBVH por geometria é compartilhada entre instâncias, com índice de caixas para candidatos. Os triângulos são resolvidos no mundo, inclusive sob escala desigual, sem mudar buffers ou `boundsTree` dos modelos.

A interface Testar mantém os componentes e tokens do Molda, recolhe ferramentas durante a sessão e oferece pausa, retorno à edição e medidor transitório. O medidor registra início/fim, distância direta, distância caminhando e tempo ativo; exclui voo, queda, salto, pausas e reposição. Atalhos de edição ficam suspensos e a sessão não grava comandos autorais. O avatar genérico mede 1,16 m. O contrato aceita modelos da biblioteca, altura nativa/ajustada, orientação e seleção explícita dos clipes. Clipes originais ficam intactos: o transporte global é extraído de cópias para o personagem não sair do corpo físico; articulações continuam animadas.

## Verificado neste checkpoint

- Motor: **66 testes / 2.594 asserções**; oficina/hosts: **66 / 442**. Tipagem dos dois pacotes e build do playground aprovados.
- Testes novos cobrem piso, parede fina, gravidade, degrau baixo/alto, rampa de 25°, encosta de 65°, teto, queda, cápsula pequena, escala não uniforme, índices originais, consulta em 1.000 instâncias compartilhadas, tipos de colisão, pivô/altura/orientação do avatar, clipes e medição.
- O teste de rampa reproduziu redução incorreta da velocidade horizontal pela projeção repetida da gravidade. A resolução passou a separar chão caminhável, parede/encosta e teto; os testes passaram.
- Chrome: claro/escuro de 1.440 px, claro de 1.366×768 e 1.024 px, escuro de 390 px com toque emulado. Caminhada, troca de câmeras, pausa, voo, retorno e documento/revisão inalterados. O layout estreito também usa eventos reais de toque emulado, segurando a direção e arrastando a vista com o segundo dedo. Sem erros de página/console.
- Capturas foram inspecionadas. Corrigidos o quarto elemento indevido na grade do cabeçalho e o preenchimento dos painéis. O cabeçalho recolhe a edição no ensaio. Persistem as mesmas capturas/vídeo reproduzíveis em `output/cenarios-reforma/lote3-testar` (ainda locais; evidências finais serão selecionadas ao revisar o lote).

## Ainda obrigatório antes de fechar 3.8

Ensaiar o Cute Characters real e a Faísca convertida, conferir clipes/contato/escala com vídeo, recortes do terreno, oclusão e retorno preciso de câmera, cancelamento/falhas de carga e vários ciclos com medição de recursos. Finalizar a integração da água ao contrato do ensaio conforme as superfícies reais disponíveis, sem declarar nado testado antecipadamente. Conferir os pontos de início/fim na apresentação do percurso e revisar todos os itens normativos de 3.1–3.8, com regressões pertinentes.

O build avisa chunk do motor de aproximadamente **814 kB / 217 kB gzip**. Este ensaio não comprova FPS em aparelhos físicos. Não houve implantação nem validação remota. Não foram alterados o jogo, sua geografia ou sua velocidade. Os lotes 4–10, composição final da Faísca, revisão global, implantação e validação em staging permanecem pendentes.
