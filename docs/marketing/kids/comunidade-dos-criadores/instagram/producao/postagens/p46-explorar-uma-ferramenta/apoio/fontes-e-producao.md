# P46 · Fontes e produção

Produzido em 14/10/2026. Sete PNGs, 1080 × 1350, conforme a [ficha vigente](../../../../postagens/10-p41-a-p50.md#p46). Calendário comum, semana 9, terceiro post; desejo W16, série Teste em casa. O assunto é começar a aprender uma ferramenta com uma tarefa pequena e consultar orientações quando necessário.

## Ajuste factual na copy

No slide 6, “O objetivo de alcançar uma plataforma continua” passou a “O objetivo passa a ser alcançar outras plataformas”. A Mini plataforma anda e pula no chão da tela; não tem plataformas separadas. O Salto nas Nuvens introduz essa tarefa. O restante da copy e a legenda foram preservados. O arquivo editorial também recebeu a correção, evitando divergência entre documento e arte.

## Fotografias

Três imagens novas com a ferramenta nativa `image_gen.imagegen`. [Prompts integrais](prompts.json) e [origens](imagens-geradas.json).

- Slide 1: menina fictícia diante do Pinta, observando o desenho aberto e as ferramentas.
- Slide 3: mesma menina, em outro ângulo, consulta as Dicas rápidas com o pai fictício ao lado. Ela mantém o mouse; ele acompanha sem operar.
- Slide 7: mesmos personagens diante do resultado azul, em nova composição.

São cenas editoriais inventadas, sem atribuição de resultado, identidade de aluno ou depoimento. As capturas reais do Pinta foram fornecidas como conteúdo das telas ao gerador. As fotografias são composições geradas, não registros de uso da plataforma por essas pessoas. As capturas independentes e o estado salvo documentam o funcionamento verificado.

## Pinta

O playground local monta o `PintaApp` real, com os estilos do pacote. Navegador isolado, armazenamento local, sem conta de aluno. Criado um desenho de demonstração de 128 × 128, chamado Meu quadrado, contendo uma forma laranja. Foram usados os controles da interface: Selecionar, toque na forma e Preenchimento: azul escuro. O estado persistido confirma a nova cor `#003fad`, com posição e tamanho preservados. [Registro](pinta-verificado.json).

No slide 2, palco e paleta são recortes da mesma captura, ampliados e aproximados para leitura. As alças de seleção são nativas. No slide 3, a frase “Selecionar deixa mover, girar e trocar a cor” vem da dica nativa e é ampliada abaixo da foto, mantendo a pontuação visível da interface. O desenho foi preparado pela equipe, não por um aluno.

## Mini plataforma

Fonte: `packages/studio/src/official-extensions/game-2d/examples/foundations.ts`, exportação `platformerExample`. [Código gerado original](mini-original.js). Runtime atual `gameTwoDRuntime`.

O palco tem 320 × 200; a captura exibe o canvas a 960 × 600 por CSS, sem mudar o espaço do jogo. O personagem é um quadrado verde, e a borda inferior funciona como chão. Setas esquerda/direita movem; seta para cima pula. O movimento foi feito pelo teclado, com relógio controlado. Um observador de criação conserva a referência do sprite para ler suas coordenadas; não altera o objeto ou os controles.

No slide 4, o personagem saiu de x=20 para x=92, mantendo y=164 e contato com o chão. A instrução fixa de teclas foi ocultada apenas nessas duas capturas, pois se sobrepõe ao personagem no chão. A regra, o chão, as posições, a física e os controles permanecem originais. Os recortes mostram a mesma faixa inferior do palco. A instrução voltou a ser desenhada na captura de pulo do slide 5.

O bloco `sz_g2d_platformer` foi capturado no Blockly a partir do IR original, com velocidade 4 e pulo 11. Está dentro de Enquanto estiver rodando. É um comando específico do Jogo 2D. [Registro do comando](blocos-capturados.json).

## Salto nas Nuvens

Fonte: `packages/studio/src/official-extensions/game-3d-advanced/examples.ts`, exportação `saltoNasNuvensExample`. [Código gerado original](nuvens-original.js). Runtime atual `gameKit3DRuntime`, com Three.js local. Não houve alteração do exemplo, teletransporte, reposicionamento de moedas ou mudança de câmera.

O clique em Pular inicia o jogo. Após pousar, as setas e a barra de espaço produzem o salto capturado. O herói está no ar, entre plataformas, com a câmera nativa seguindo atrás e uma moeda adiante. O estado confirma altura maior que a inicial, ausência de contato com o chão, partida em andamento e três moedas ainda presentes. Não é alegada vitória ou coleta nessa cena.

## Verificações e arquivos

[Capturas e estados](capturas-verificadas.json), [copy usada](copy.json), [verificação da montagem](verificacao.json), [verificação final](entrega-verificada.json). As sete artes foram inspecionadas visualmente, com correção do recorte do personagem no slide 4. Fonte Nunito 600/800 local, paleta azul, creme e amarelo. Textos aplicados em HTML, separados da geração de fotografias.

Scripts: `output/instagram/p46-2026-10-14/`. PNGs numerados, legenda integral, textos alternativos, prévia e montagem editável estão na pasta de entrega. Produção local; nenhuma publicação ou automação foi acionada.
