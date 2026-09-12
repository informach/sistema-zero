# Estudo do Brilliant e diagnóstico das explorações do Corre Dino

Este estudo fundamenta a [proposta revisada de aulas Kids](2026-09-12-exploracao-direta-aulas-kids-proposta-v5.md). A recomendação é aprofundar a manipulação do conceito, a clareza das consequências e a progressão da dificuldade. A quantidade de gestos, animações ou respostas certas não será usada como medida isolada de aprendizagem.

## Base e alcance das evidências

A consulta foi realizada em 12/09/2026. Foram confrontados a proposta original, o plano de implementação, os 13 modelos nativos do Dino, os roteiros e a experiência dos componentes locais. Também foram examinados documentos oficiais recentes do Brilliant, demonstrações públicas e pesquisas de aprendizagem com simulações.

O catálogo público Scientific Thinking mostrou a organização em famílias — engrenagens, móbiles, bilhar, estruturas, óptica e engrenagens compostas. Iniciar Connecting Gears encaminhou para a apresentação/cadastro. O fluxo foi interrompido quando passou a pedir idade. Não houve criação de conta, acesso Premium nem execução de uma aula completa autenticada. Portanto, a análise dos problemas se apoia nas demonstrações e descrições identificadas abaixo, sem declarar que todos os gestos foram exercitados no produto. [1](https://brilliant.org/courses/puzzle-science/)

Foram examinados quadros de duas demonstrações oficiais: peças positivas/negativas e equilíbrio de móbiles. A segunda integra um artigo sobre problemas de qualidade; não deve ser tomada como exemplo de puzzle perfeito. No Sistema Zero, foi possível operar os componentes locais de colisão e salto, sem aula publicada nem progresso de aluno.

## O que as referências acrescentam

| Evidência | O que a fonte efetivamente mostra ou declara | Aplicação proposta no Sistema Zero |
| --- | --- | --- |
| Peças positivas e negativas | O gesto sobre uma alça acrescenta/retira peças na própria representação. A ajuda reconhece que alguns alunos tentam tocar nas peças e não descobrem a alça. [2](https://brilliant.org/help/features/how-do-i-use-interactives-on-brilliant/) | Manipulação direta com alças visíveis, indicação inicial curta e alternativa tocar-origem/tocar-destino. Um gesto escondido pode trocar uma dificuldade conceitual por uma dificuldade de interface. |
| Equilíbrio de móbiles | A demonstração permite acompanhar a mudança de posição dos pesos e a inclinação resultante. O artigo discute estados impossíveis, clareza visual e soluções alcançáveis pelas operações disponíveis. [3](https://blog.brilliant.org/when-almost-right-is-catastrophically-wrong-evals-for-ai-learning-games/) | A criança vê a consequência da sua montagem. Cada missão precisa de ao menos uma solução alcançável e de feedback compatível com o modelo; inclusive por toque e teclado. |
| Desenvolvimento de jogos de aprendizagem | O Brilliant descreve feedback pelo acontecimento, variações de um conceito e progressão de dificuldade, com direção pedagógica humana. [4](https://blog.brilliant.org/hand-crafted-machine-made/) | Projetar o pequeno desafio e seu contraste antes de produzir controles. Reutilizar famílias de cenas, mas revisar cada missão e seu vínculo com a aula. |
| Sequenciamento didático | A explicação oficial atual articula modelos visuais, tentativas, orientação e prática com menos apoio. [5](https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/) | Começar por uma ação possível de compreender, acrescentar uma dificuldade pertinente e reduzir pistas na aplicação. A primeira tentativa não é uma prova sobre conteúdo desconhecido. |
| Tutor contextual | Os materiais atuais descrevem Koji acompanhando a interação e usando destaques/diagramas para ajudar. A disponibilidade varia por curso. [6](https://blog.brilliant.org/a-world-class-tutor-in-every-home/)[7](https://brilliant.org/help/features/how-does-koji-work/) | Zappy deve conhecer a missão e o acontecimento relevante. A primeira versão pode usar falas e destaques autorados; não depende de criar outro tutor generativo. |
| Diversidade de prontidão | O Brilliant descreve o currículo principal por conhecimentos prévios e diferencia uma biblioteca K–5. [8](https://brilliant.org/faq/) | Não copiar uma interface presumindo que o público é homogêneo. Testar especialmente a faixa mais nova do Kids e alunos com menor fluência de leitura. |

A mudança desde os textos de 2025 é relevante: o Brilliant passou a apresentar Koji como parte importante da experiência em 2026. Isso não demonstra que um chatbot seja requisito da interatividade. Para o Dino, o investimento inicial recomendado continua sendo a qualidade da cena, das missões e das pistas.

Também não se propõe reproduzir o produto inteiro. O Sistema Zero tem professor em vídeo, projetos autorais, Estúdio/Pinta, entregas e comunidade. A contribuição do Brilliant é a integração entre ação, representação e feedback. A composição com vídeos curtos é uma adaptação ao curso e ao público do Sistema Zero.

## O que a pesquisa permite afirmar

A meta-análise de Alfieri e colegas reuniu 164 estudos e separou descoberta sem assistência de descoberta apoiada. Os resultados favoreceram instrução explícita em comparação com descoberta não assistida e favoreceram descoberta apoiada em outras comparações. Os estudos abrangem públicos e tarefas diversos; não estimam o efeito desta plataforma. A conclusão útil é oferecer exemplos, feedback e ajuda graduada, em vez de presumir que deixar a criança mexer livremente basta. [9](https://openresearch.surrey.ac.uk/esploro/outputs/journalArticle/Does-Discovery-Based-Instruction-Enhance-Learning/99515521902346)

O estudo de Podolefsky, Perkins e Adams investigou exploração em uma simulação de ondas com universitários. Discute feedback dinâmico, representações, possibilidades de ação e limites que orientam a exploração. Não constitui teste de programação infantil nem prova de retenção no Dino. A aplicação proposta é dar liberdade dentro de uma situação cuidadosamente desenhada. [10](https://phet.colorado.edu/publications/prst-per-2010.pdf)

O PhET também descreve entrevistas individuais com alunos como parte de seu processo de desenho. Isso sustenta a necessidade de observar compreensão e dificuldades de interface antes de expandir um modelo. Não há observação de crianças do Sistema Zero nesta entrega. [11](https://phet.colorado.edu/en/research)

As orientações de acessibilidade da W3C distinguem alternativa por teclado de alternativa por ponteiro sem arraste. Ter setas no teclado não resolve, sozinho, o uso de quem depende apenas de toque. A proposta prevê as duas alternativas. Pausa e controle de movimento também precisam fazer parte da experiência. [12](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)[13](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)

Não se transportam alegações comerciais de eficácia do Brilliant para o Sistema Zero. A hipótese a validar é que missões com consequência visível, orientação suficiente e aplicação no próprio projeto aumentem autonomia e compreensão. Mais conclusões ou mais tempo de tela não bastam para confirmar essa hipótese.

## Diagnóstico do que existe hoje

O código já oferece uma evolução relevante: 13 cenas nativas, Zappy nas instruções, critérios próprios de exploração, persistência, pausa e passos. A camada comum de interface ainda apresenta praticamente todos os parâmetros como formulário. A avaliação considera configurações registradas ao terminar uma reprodução.

| Achado local | Evidência verificável | Consequência |
| --- | --- | --- |
| Predomínio de configuração | `LearningSimulation` percorre `definition.controls` e produz selects ou sliders para todas as cenas. | A criança precisa interpretar variáveis antes de experimentar a ação. |
| Manipulação direta concentrada | `LearningSimulationScene` recebe apenas `onDistanceChange`, usado pelo cacto da colisão. | As outras cenas são sobretudo representações do que foi escolhido fora delas. |
| Reconhecimento atrasado | O ensaio é registrado quando `position >= 1`; a reprodução comum dura aproximadamente 4,5 segundos. Na colisão, distância 40 já mostrou contato, enquanto a missão de contato continuou pendente. | A experiência exige uma reprodução adicional mesmo quando a ação relevante já aconteceu. |
| Tempo não comparável no salto | A duração física é normalizada para a mesma reprodução. | Comparações temporais podem induzir uma interpretação incorreta sobre o efeito da força/gravidade. |
| Fenômeno pode sair do enquadramento | Com gravidade 0,1 e força 9, o meio do salto levou o Dino a `translate(110 -222)` em uma cena `480 × 242`; ele deixou de aparecer. | A legenda fala da trajetória, mas a criança perde o objeto que deveria observar. |
| Sorteio escolhido manualmente | Aula 12 apresenta sliders para o nascimento e o resultado inteiro 0/1. | Selecionar o resultado de um sorteio não ensina bem sua variabilidade. |
| Reinício encenado pelo tempo | `restart` muda de início para partida/fim/nova partida a partir de frações da reprodução. | “Provoque a batida” promete uma ação que atualmente é demonstrada pela animação. |
| Comparação depende de memória | “Comparar meus testes” oferece botões Teste 1, Teste 2 etc. que restauram parâmetros. | Não torna visível, por si só, o que mudou ou o contraste entre resultados. |
| Pistas pouco específicas no conteúdo | Os roteiros repetem a orientação genérica de mudar uma coisa, rodar e comparar. | A ajuda não distingue, por exemplo, som associado à tecla de som associado ao salto. |
| Critério e autoria ainda duplicados | O bloco interativo expõe `required` e a seção seleciona `completion.blockIds`. | O professor pode interpretar duas configurações como decisões independentes de obrigatoriedade. |
| Prévia ainda livre | O player detecta a prévia pela ausência de contexto de aluno e não aplica os bloqueios reais. | Permite examinar conteúdo, mas não ensaiar todos os estados da experiência. |
| Relatório de simulação incompleto | `answerLines` trata os experimentos antigos, mas não apresenta um resumo próprio dos `simulationTrials` novos. | O professor precisa de uma leitura mais clara do que o aluno comparou e com qual ajuda. |
| Separação em notebook | O limite de lado a lado continua em 1536 px. | O vídeo e o projeto podem se distanciar em telas comuns. |
| Quiz pode ficar fácil por eliminação | No roteiro da aula 3, uma alternativa contrapõe aplicar gravidade a trocar a cor do céu. | Acertar essa alternativa é uma evidência fraca para distinguir força inicial de aceleração. |

Esses achados não invalidam os testes anteriores. Eles mostram aspectos de qualidade pedagógica e de interação que a verificação de funcionamento não cobria integralmente.

## Vínculo com o Estúdio

O motor Jogo 2D declara que a gravidade do mundo é uma aceleração; definir seu valor sozinho não a aplica a um sprite. A aplicação depende do comando correspondente. A nova descoberta da aula 3 deve evidenciar essa distinção: manter o mundo e comparar o Dino com e sem aplicação da gravidade.

As descobertas são modelos didáticos. Elas não devem simular uma aprovação do projeto real. Para a construção, distinguir estrutura conferida, versão salva, execução iniciada e comportamento efetivamente observado. Um bloco presente no lugar esperado não garante, sozinho, que o jogo funciona.

A progressão estrutural pode continuar onde corresponde ao objetivo. Instrumentação de execução será restrita a comportamentos do Dino que tenham um contrato verificável; um avaliador universal de jogos não é requisito desta revisão.

## Decisões sustentadas pelo estudo

1. Manter vídeos curtos e Zappy, reduzindo as operações preparatórias entre a instrução e a cena.
2. Trocar o formulário genérico por gestos específicos: mover, ordenar, conectar, acionar e redimensionar.
3. Preservar botões e controles numéricos quando expressam bem o conceito; apresentá-los no contexto e no momento adequado.
4. Fazer cada missão reconhecer o acontecimento pertinente, sem uma duração universal nem contagem genérica de cliques.
5. Mostrar comparação visual com mesma escala, condição inicial e variável alterada identificada.
6. Separar uma descoberta guiada de desafios opcionais e da criação autoral.
7. Revisar precisão do modelo, legibilidade e solucionabilidade como critérios de entrega.
8. Validar transferência para o próprio projeto e para uma situação ligeiramente diferente, além de satisfação e conclusão.
9. Manter os critérios especiais aprovados para legado, caderno, vídeo isolado, ações e galeria.
10. Reavaliar as pendências antigas pelo resultado desejado; não executar mecanicamente todo item da primeira proposta.
11. Compor cada aula conforme seu conteúdo. Exploração e criação podem se alternar várias vezes, retomando o mesmo projeto e usando critérios próprios de cada seção. O ciclo de uma descoberta não define uma sequência fixa para a aula inteira; esta decisão incorpora o refinamento explícito do professor.

## Fontes externas

1. Brilliant. [Scientific Thinking](https://brilliant.org/courses/puzzle-science/) e [Thinking in Code](https://brilliant.org/courses/thinking-in-code/). Catálogo consultado em 12/09/2026. Estrutura e temas; não comprovação de aula completa percorrida.
2. Brilliant. [How do I use interactives on Brilliant?](https://brilliant.org/help/features/how-do-i-use-interactives-on-brilliant/). Atualizado em 10/08/2026. Instruções e demonstração das peças negativas; [GIF oficial](https://brilliant.org/images/help/negative-number-tiles-interactive.gif).
3. Blake Farrow / Brilliant. [When “almost right” is catastrophically wrong: Evals for AI learning games](https://blog.brilliant.org/when-almost-right-is-catastrophically-wrong-evals-for-ai-learning-games/). 27/02/2025. Qualidade, solucionabilidade e consistência; [vídeo oficial dos móbiles](https://storage.ghost.io/c/76/92/7692747c-e18b-4db4-9f84-385d77c55a1e/content/media/2025/02/mobiles2.mp4).
4. Brilliant Staff. [Hand-crafted, machine-made: How we make learning games with AI](https://blog.brilliant.org/hand-crafted-machine-made/). 30/01/2025. Desenho de jogos, feedback e direção humana.
5. Brilliant. [How Brilliant teaches math and helps understanding stick](https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/). Atualizado em 26/08/2026. Sequenciamento e prática; descrição do produto, não ensaio independente.
6. Lea Marolt Sonnenschein / Brilliant. [A world-class tutor in every home](https://blog.brilliant.org/a-world-class-tutor-in-every-home/). 29/05/2026. Desenho do Koji e observações internas relatadas.
7. Brilliant. [How does Koji, Brilliant’s Tutor, work?](https://brilliant.org/help/features/how-does-koji-work/). Atualizado em 01/09/2026. Capacidades e limites de disponibilidade.
8. Brilliant. [Who is Brilliant for?](https://brilliant.org/help/using-brilliant/who-is-brilliant-for/) e [FAQ](https://brilliant.org/faq/). Consultados em 12/09/2026. Prontidão e públicos distintos.
9. Alfieri, L.; Brooks, P. J.; Aldrich, N. J.; Tenenbaum, H. R. [Does Discovery-Based Instruction Enhance Learning?](https://openresearch.surrey.ac.uk/esploro/outputs/journalArticle/Does-Discovery-Based-Instruction-Enhance-Learning/99515521902346). Journal of Educational Psychology, 103(1), 1–18, 2011. DOI: 10.1037/a0021017.
10. Podolefsky, N. S.; Perkins, K. K.; Adams, W. K. [Factors promoting engaged exploration with computer simulations](https://phet.colorado.edu/publications/prst-per-2010.pdf). Physical Review ST Physics Education Research, 6, 020117, 2010. DOI: 10.1103/PhysRevSTPER.6.020117.
11. PhET / University of Colorado Boulder. [Research](https://phet.colorado.edu/en/research). Consultado em 12/09/2026. Processo de desenho e observação.
12. W3C / WAI. [Understanding SC 2.5.7: Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). Consultado em 12/09/2026. Alternativa por ponteiro sem arraste e distinção de teclado.
13. W3C / WAI. [Understanding SC 2.2.2: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide). Consultado em 12/09/2026. Controle do movimento.

## Fontes locais

- [Proposta original](2026-09-12-evolucao-experiencia-aulas-kids-proposta.md) e [plano da implementação](2026-09-12-piloto-corre-dino-implementacao.md).
- [Guia de autoria vigente](../aulas-interativas/guia-de-autoria.md) e [validação anterior](../aulas-interativas/qa/piloto-v4-2026-09-12.md).
- [Interface das simulações](../../packages/member-shell/src/components/learning-simulation.tsx), [cena](../../packages/member-shell/src/components/learning-simulation-scene.tsx), [modelos e critérios](../../packages/core/src/learning/simulation.ts).
- [Player das seções](../../packages/member-shell/src/components/lesson-sections.tsx), [autoria dos blocos](../../packages/admin/src/components/editor/learning-builder.tsx), [critérios](../../packages/admin/src/components/editor/section-completion-editor.tsx).
- [Painel do professor](../../packages/admin/src/components/professor/lesson-learning-panel.tsx), [integração do Estúdio](../../packages/member-shell/src/components/studio/studio-block.tsx), [física do Jogo 2D](../../packages/studio/src/official-extensions/game-2d/runtime/physics.ts).
- [Roteiro do salto](../aulas-interativas/corre-dino/aula-03/roteiro.md) e os demais 12 roteiros do Corre Dino.
