# Observação de comportamento no Estúdio — estudo restrito à aula 3

O piloto mantém a checagem estrutural e o teste do jogo pela criança. Não acrescenta um avaliador automático de comportamento ao avanço da aula 3. O motor tem acontecimentos úteis, mas a ponte com a aula ainda não oferece um contrato suficiente para usar esses acontecimentos como critério confiável.

## O que foi conferido

- [Eventos do mundo](../../packages/studio/src/official-extensions/game-2d/runtime/worldEvents.ts): o motor distingue entrada, contato e acontecimento de salto. Os eventos de salto pertencem ao sprite; apertar uma tecla não equivale a um novo salto.
- [Testes de gravidade e salto](../../packages/studio/src/official-extensions/game-2d/__tests__/gravityAndJump.test.ts): o kit Dino não emite salto por simplesmente executar o laço. Uma entrada válida inicia o salto; eventos de outro sprite não contam. A gravidade é aplicada explicitamente. Nesta revisão, os 18 testes desse arquivo passaram.
- [Ponte do preview](../../packages/studio/src/preview/types.ts): o contrato atual transporta logs, erros, heartbeat e outras mensagens delimitadas, sem evidência versionada da missão de uma seção.
- [Verificador estrutural](../../packages/studio/src/blockly/projectCheckAuthoring.ts): procura construções específicas na representação do projeto. Encontrar um bloco no laço correto não prova que o trecho foi executado, que a condição permitiu sua execução ou que o salto terminou no chão.

## O que seria necessário para um próximo piloto

Uma observação limitada precisaria vincular sessão de execução, revisão do projeto, sprite escolhido e seção. Teria de distinguir comando, início do salto, posição observada, retorno ao chão e interrupção/reinício do preview. Também precisaria lidar com pausas, abas ocultas, execução substituída e estados de partida. O professor teria de poder conferir a evidência e entender por que ela é inconclusiva.

As mensagens continuariam originadas no navegador e em um jogo que executa código do aluno. Não seriam prova inviolável de aprendizagem. Não será usado um log arbitrário, mensagem `passed`, clique em Play ou timeout como substituto desse trabalho.

## Decisão aplicada ao conteúdo

A aula 3 alterna gravidade → criação → impulso → criação, no mesmo projeto. Os critérios de criação indicam os blocos e encaixes que serão conferidos. O roteiro pede testar saltos e retorno ao chão antes de enviar ao professor. A segunda checagem não afirma verificar automaticamente a força escolhida nem a execução completa do jogo.

A exploração v2 é um modelo didático independente: impulso e gravidade têm papéis distintos, o tempo do movimento decorre do modelo e os acontecimentos são reproduzidos ao avaliar a tentativa. Sua conclusão não aprova o projeto do Estúdio.
