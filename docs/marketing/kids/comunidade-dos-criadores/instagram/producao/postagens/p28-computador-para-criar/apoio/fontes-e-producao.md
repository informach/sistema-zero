# P28 · Fontes e produção

Produzido em 14/10/2026. Sete PNGs, 1080 × 1350, conforme a [ficha vigente](../../../../postagens/03-p21-a-p30.md#p28). Calendário comum, terceiro post da semana 10; dor D28, série Antes de escolher. O assunto é o aparelho necessário para criar na plataforma e a disponibilidade dele em casa.

## Copy e direção

Copy dos sete slides e legenda preservadas integralmente. A exigência de computador ou notebook com internet, mouse e teclado está nas páginas de oferta atuais: `packages/funnel/src/content/home-comunidade.ts` e `presente.ts`. Não foi afirmado que nenhuma ferramenta de criação funciona no celular, nem que qualquer computador atende. Não foram inventados requisitos mínimos ou necessidade de comprar outro aparelho. O teclado integrado do notebook aparece nas cenas de uso; o teclado externo da ilustração representa o item, sem exigir sua compra.

## Imagens geradas

Cinco fotografias editoriais e uma ilustração criadas com a ferramenta nativa `image_gen.imagegen`. [Prompts integrais](prompts.json) e [arquivos de origem](imagens-geradas.json).

- Slide 1: menina fictícia de cerca de 12 anos jogando no celular. O jogo da capa é genérico, não a plataforma da Comunidade.
- Slide 2: mesma menina diante do notebook; imagem destaca a tela e o uso do mouse.
- Slide 3: novo ângulo da mesma atividade, destacando mãos no teclado e no mouse.
- Slide 5: ilustração com notebook, mouse, teclado e símbolo de navegador/internet. Rótulos aplicados na montagem.
- Slide 6: computador em ambiente familiar, com lembrete “terça e quinta, 17h”. É exemplo de horário combinado, não uma grade de aulas.
- Slide 7: mesma menina usando o Estúdio, com rosto, tela e controles visíveis.

A imagem da capa serve como referência de aparência e ambiente para as outras cenas. Nenhuma identidade, fala, conquista ou resultado foi atribuído a aluna real. Uma captura real do Estúdio foi fornecida para compor as telas das fotos 2, 3, 6 e 7; as fotografias são composições geradas. A demonstração ampliada e os dois comandos do slide 4 são capturas diretas, sem geração ou reconstrução por IA.

## Estúdio real

Projeto local isolado, sem conta de aluno, criado a partir do IR completo do exemplo oficial Quadra Maluca. A extensão Jogo 3D Avançado foi instalada no projeto local. A área Enquanto estiver rodando foi reposicionada apenas no espaço visual do editor, para separar os blocos dos demais grupos. O foco e o zoom foram ajustados para mostrar o comando de movimento. Depois da atualização automática da prévia, o botão Jogar foi acionado; o estado de execução foi confirmado antes da captura.

[Captura usada como referência das telas](03-editor-completo.png) e [registro](editor-verificado.json). A disposição dos comandos, as categorias e a prévia são da interface atual. O código e os parâmetros do exemplo permanecem originais.

## Quadra Maluca

Fonte: `packages/studio/src/official-extensions/game-3d-advanced/examples.ts`, exportação `quadraMalucaExample`. [Código gerado original](quadra-original.js). Runtime atual `gameKit3DRuntime`, com Three.js local.

Na captura direta, foi clicado Jogar, a tecla W foi pressionada, e um arrasto real do mouse girou a câmera em direção à pista de gelo. A segunda pressão de W confirmou a mudança de direção do movimento em relação à câmera. Os dois deslocamentos foram medidos por leitura de estado, sem alteração das posições. O cosseno entre as direções foi aproximadamente -0,990. As cinco bolas permaneciam no jogo, a partida estava em andamento, e o registro não apresentou erros.

O recorte da captura remove as margens externas do palco. Preserva o herói, as cinco bolas, a pista, as caixas, a instrução nativa e o placar. Não houve teletransporte, mudança de câmera por código, reposicionamento de elementos ou alteração das regras. Não se alega vitória ou coleta na cena. [Capturas e estados](capturas-verificadas.json).

Os comandos foram renderizados pelo Blockly a partir do IR original: `sz_g3k_platformer_keys`, com WASD a 7 e pulo 10; e `sz_g3k_camera_orbit`, a 26 de distância. Capturados separadamente e ampliados para leitura, sem reescrever o conteúdo. [Registro dos comandos](blocos-capturados.json).

## Entrega e verificações

[Copy usada](copy.json), [verificação da montagem](verificacao.json) e [verificação final](entrega-verificada.json). Fonte Nunito 600/800 local, paleta azul, creme e amarelo. Copy aplicada em HTML, separada da geração das imagens. Todos os sete slides foram inspecionados visualmente; texto e legenda comparados à ficha, dimensões conferidas, fontes e imagens carregadas, sem conteúdo cortado ou rolagem horizontal na prévia móvel.

Scripts: `output/instagram/p28-2026-10-14/`. A pasta de entrega contém os PNGs numerados, legenda, textos alternativos, prévia, montagem editável e instruções. Nenhuma publicação ou automação foi acionada. Próximo carrossel: P54, primeira publicação da semana 11.
