# P05 · Chegue mais perto

Produção de 14/10/2026. Oito PNGs em **1080 × 1350**, seguindo a [ficha vigente de P05](../../../../postagens/01-p01-a-p10.md#p05). Série **Teste em casa**, dor D05, atração. Copy e legenda preservadas integralmente, com convite para seguir no fechamento. Paleta azul, creme e amarelo; Nunito 600/800.

## Cenas geradas

Seis imagens novas feitas com `image_gen` nativo, para os slides 1, 2, 3, 4, 5 e 8. [Prompts completos](prompts.json) e [origem dos arquivos](imagens-geradas.json). Mãe e menino são fictícios, sem relação com depoimentos ou alunos reais. A foto do slide 2 serviu de referência para manter seus rostos, roupas e ambiente nos demais momentos.

- Slide 1: visão da porta, de costas para o menino, sem ver o conteúdo do monitor. A primeira versão foi ajustada para o computador ficar orientado ao menino, com a tela escondida pelo ângulo e pela porta.
- Slide 2: mãe já sentada ao lado do filho, na mesma altura, ouvindo a explicação.
- Slide 3: aproximação da cadeira e gesto de virar o monitor, em outro enquadramento.
- Slide 4: close do gesto de apontar o ícone de mensagens. A página é genérica, sem marca e sem dados pessoais; não representa nossa plataforma ou um serviço real.
- Slide 5: bilhete de geladeira com um combinado concreto, sem reproduzir mensagem de golpe. O texto manuscrito foi conferido visualmente.
- Slide 8: mãe e filho conversam olhando o telefone. O aparelho fica voltado a eles, sem expor uma conversa privada.

As interfaces genéricas das fotografias são elementos de encenação. Não são capturas de um site real, prova de segurança ou promessa de recurso da Comunidade. Os elementos reais da nossa plataforma estão nos slides 6 e 7.

## Captura da Vila das Vocações

Fonte: `vilaExample`, em `packages/studio/src/official-extensions/world-3d/examples.ts`, executado com o runtime atual do Mundo 3D. A demonstração foi preparada em contexto local isolado, sem acessar conta ou projeto de aluno.

Uma cópia do exemplo recebeu somente as [correções de acentuação](correcoes.json). [Código dessa cópia](demonstracao.js). Permaneceram as mesmas posições, os personagens, o trânsito, as regras da conversa, as duas opções e suas consequências. O deslocamento da Guia foi mantido; ao aproximar o jogador, ela para conforme a regra nativa.

Procedimento conferido:

1. Iniciar o passeio e aproximar o jogador da Guia usando `personPlace`.
2. Pressionar E: aparece **Bem-vindo à Vila das Vocações!**.
3. Pressionar E novamente: aparece **O que você quer ser quando crescer?**, com os botões **Padeiro** e **Mecânico**.
4. Clicar em Padeiro: aparece a orientação para conhecer a padaria e a missão é concluída.

[Estados registrados](capturas-verificadas.json), [fala inicial](06-guia-fala.png), [pergunta com respostas](07-guia-pergunta.png) e [resposta ao escolher Padeiro](resposta-padeiro.png).

Para mostrar a Guia e o jogador sem um esconder o outro, a cópia isolada do runtime recebeu um ajuste de câmera para produção e uma função que apenas lê as posições dos personagens. Esse enquadramento não é anunciado como controle disponível ao aluno. O relógio foi controlado para capturar as falas completas, e a semente aleatória foi fixada para repetibilidade. Nenhum texto de balão ou botão foi redesenhado.

## Blocos e recortes

Os blocos foram carregados da mesma cópia da IR e renderizados com o Blockly, o tema e as definições atuais do Estúdio.

- Slide 6: [bloco nativo em edição](06-bloco-editando.png), com cursor no final da frase, ligado visualmente à captura em que a Guia repete exatamente esse texto. A seta é uma anotação editorial.
- Slide 7: captura do diálogo e três recortes do [bloco original](07-bloco-pergunta.png), mostrando a pergunta e os campos Padeiro/Mecânico. Os comandos internos das respostas ficam fora desses recortes, preservados na origem. Os campos foram reorganizados na arte para ampliar a leitura; não se apresenta essa disposição como a montagem completa do programa.

[Textos e valores dos blocos](blocos-capturados.json). Os recortes são SVGs que exibem regiões dos PNGs reais, sem recriar comandos, personagens ou interface por IA.

## Conferência e entrega

[Verificação da montagem](verificacao.json): oito slides, igualdade da copy, fontes, imagens, margens e prévia móvel. [Verificação final](entrega-verificada.json): dimensões, legenda, arquivos, links locais e correspondência entre os blocos e as falas capturadas. Foi feita inspeção visual das cenas, do bilhete, dos diálogos e dos oito slides.

Scripts em `output/instagram/p05-2026-10-14/`. Fontes, fotos e capturas necessárias à montagem estão guardadas nesta pasta. Revisão editorial e verificação funcional não são teste de conversão. Material produzido localmente; sem publicação, agendamento, commit ou deploy.
