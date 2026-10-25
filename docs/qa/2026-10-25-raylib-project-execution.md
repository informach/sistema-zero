# Raylib no executor de objetivos — prova integrada de 25/10/2026

A composição inclui o renderer 3D, câmeras, formas, colisões, modelos GLB e shaders de `20c83353e`/`c0fc4c29c`, conciliados com o checkpoint autoritativo das missões. O checkpoint permanece após a troca do quadro, a aplicação da entrada/relógio e a limpeza das operações anteriores; funções testadas não perdem o desenho que produzem.

## Prova real

`tests/python-mission-smoke.ts --group=raylib` executou oito casos em Chromium/Pyodide dentro da imagem protegida, sem rede, com filesystem de imagem somente leitura, usuário não privilegiado e container próprio por caso:

- Raylib 2D: tecla move a variável `posicao.x` no sentido pedido; direção contrária e velocidade zero são recusadas.
- Raylib 3D: câmera, cubo e grade são desenhados pelo programa; o objetivo lê o campo real do vetor, com os mesmos três resultados.
- Clique altera a pontuação observada.
- Função importada de outro arquivo do projeto devolve o resultado real e passa pela comparação privada.

Todos produziram o resultado esperado e o runner confirmou que cada container foi removido. O grupo não usa atores 2D fictícios para vetores do Raylib. As comparações e respostas esperadas permanecem no processo de julgamento, fora dos arquivos da criança.

Distribuição usada: `b5a251c5338d911dfb275c2ae8756449af94d941a25d94d51af49d6355e3ef07`, 110 arquivos / 23.485.303 bytes. Imagem local pinada antes da execução e perfil comparado com o perfil canônico atual. Evidências: `.cache/python-missions-20261024/mission-docker/582d5ab7-2e50-4c25-a06f-6641cc091918`; log `raylib-mission-real-r1.log` no mesmo namespace.

## Limites ainda explícitos

Esta prova confirma execução autoritativa, entrada, checkpoint e julgamento, não editor completo, implantação ou desempenho hospedado. Os testes CPython dos módulos e os testes de shader/céu do Molda também passaram após a conciliação, mas são evidências distintas. A paleta 3D e os recibos de blocos entraram pelos commits concluídos `5d4209764`/`e3225d4f3`; nenhuma edição em andamento da outra frente foi copiada.

Na composição `4d5c1558a`, o Chrome executou sete provas gráficas com a mesma distribuição: loop 2D com formas, textura, texto, teclado, mouse e som, mais seis cenas-gabarito (`models3d`, `shaders3d`, `shapes2d`, `shapes3d`, `text2d`, `textures2d`). Todas passaram. Nas seis comparações, nenhum pixel ultrapassou a tolerância preexistente de 48 por canal em relação às imagens produzidas pelo Raylib desktop; isso qualifica essas cenas, não todos os programas possíveis. Servidor e browser próprios foram encerrados. Recibo e logs em `.cache/python-missions-20261024/raylib-browser-r1/`, START 09:20:26.434Z / END 09:20:58.095Z de 25/10/2026. Abertura completa nos modos do Estúdio, CI e distribuição implantada continuam no gate integrado.

A correção hospedada independente da inicialização das sondas Python já aprovou dois objetivos de um programa correto e recusou os dois do programa errado, com limpeza confirmada (`hosted-python-missions-startup-fixed-r2.log`). Isso não transfere homologação hospedada à distribuição Raylib acima.
