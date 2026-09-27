# Nave Contra Asteroides · Dia 5 · O jogo ganha começo e fim

## Resultado pedagógico

O Dia 5 fecha o jogo dos quatro dias anteriores. A criança monta os momentos `inicio`,
`jogando`, `vitoria` e `fim`, protege o motor, o relógio e o tiro com a pergunta `jogando`,
desenha três telas, decide vitória por pontos ≥ `alvo` (26), decide derrota quando acabam
as vidas e usa Enter para começar ou reiniciar. O jogo só compartilha depois do envio;
publicar continua opcional.

São 12 seções, 11 vídeos planejados e duas experiências. A antiga seção com dois vídeos
foi separada: primeiro a visão dos quatro momentos, depois a montagem de `alvo` e `inicio`.
O fechamento deixou de ser um segundo vídeo na entrega e virou o fim do clipe de teste.
Quiz em seção própria antes da entrega. Em cada exploração, vídeo + experiência são
necessários; em cada prática, vídeo + critérios de projeto. Uma ponte breve do Zappy
aparece depois do vídeo para conduzir à ação, sem copiar a instrução da experiência.

Nos vídeos práticos, repetir o caminho completo mesmo quando a peça é igual à anterior:
categoria, seção, bloco, encaixe e menu. A criança não precisa deduzir o segundo e o terceiro
ramo de uma frase como "a receita é a mesma". A duração dos clipes de montagem foi ampliada
para caber essa condução sem acelerar os gestos.

## Decisões críticas

| Risco | Direção aplicada |
|---|---|
| Quatro momentos, constante e montagem dividiam uma seção com dois vídeos e três falas. | `video-telas` parte do percurso conhecido de abrir, jogar, ganhar ou perder antes de nomear os quatro momentos. `video-alvo` recupera a caixinha lacrada do roteiro original e mostra `alvo=26` e `inicio` numa seção prática própria. |
| O estado do jogo era apresentado sem vídeo conceitual. | `video-estado-do-jogo` separa “o relógio tocou” de “a ação foi autorizada”. `game-state` permite comparar criação fora da pergunta, dentro da pergunta no início e dentro dela jogando. |
| A longa montagem em `Se` podia parecer mera movimentação de blocos. | O vídeo prático mostra sem corte as quatro etapas e mantém zoom no contorno de `então`; a experiência anterior já mostrou por que a pergunta importa. |
| O reinício era usado no Enter antes de a criança entender sua diferença para trocar de tela. | `video-reiniciar` e a cena `restart` agora vêm antes da montagem do Enter: primeiro a criança compara os dois retornos, depois usa Reiniciar nos finais. O checkpoint redundante saiu porque o quiz final já pergunta pelo retorno à abertura. |
| Dois vídeos na entrega e quiz misturado ao envio. | `video-ciclo-completo` contém teste, envio, compartilhamento opcional e fecho. Quiz vem antes e sozinho. |

## Percurso por seção

| # | Seção | Vídeo | Ação e critério |
|---|---|---|---|
| 1 | Abertura | `video-abertura` apresenta o jogo completo | Assistir. |
| 2 | Os quatro momentos | `video-telas` mostra primeiro um percurso familiar de jogo, depois quatro cartões e transições | Assistir; ainda não montar o projeto. |
| 3 | Meta e primeiro momento | `video-alvo` mostra a constante e o estado inicial | Estúdio: `alvo=26` e `inicio` em Ao iniciar. Vídeo + critérios. |
| 4 | O relógio pode agir agora? | `video-estado-do-jogo` explica estado guardado e condição | `experiencia-estado` (`game-state`): comparar fora da pergunta, esperando no início e agindo na partida. Vídeo + experiência. |
| 5 | Embrulhe a partida | `video-embrulhar` mostra a cadeia entrando no `então` | Estúdio: `Se jogando` com motor inteiro, começando por Limpar. Vídeo + critérios. |
| 6 | Relógio e tiro perguntam | `video-relogio-e-tiro` aplica o mesmo padrão em dois lugares | Estúdio: criar asteroide e disparar só durante `jogando`. Vídeo + critérios. |
| 7 | O jogo decide o fim | `video-finais` monta vitória e derrota em sequência | Estúdio: pontos ≥ alvo leva a `vitoria`, vidas esgotadas levam a `fim`. Vídeo + critérios. |
| 8 | Três telas | `video-mostrar-telas` mostra abertura, vitória e derrota | Estúdio: ramos `inicio`, `vitoria` e `fim` com dicas fiéis ao Enter. Vídeo + critérios. |
| 9 | Jogue outra vez | `video-reiniciar` explica troca de tela versus reinício completo | `experiencia-reiniciar` (`restart`): comparar estados após as duas escolhas antes de usar Reiniciar no Estúdio. Vídeo + experiência. |
| 10 | O Enter comanda | `video-enter` mostra três respostas para a tecla | Estúdio: `inicio → jogando`; `fim` e `vitoria` reiniciam. Vídeo + critério. |
| 11 | Quiz | Sem vídeo; uma frase do Zappy | Duas questões: proteger o evento da barra de espaço e voltar à abertura após reiniciar. |
| 12 | Entrega | `video-ciclo-completo` mostra teste, envio, compartilhar opcional e fecho | Estúdio e verificação do projeto inteiro; vídeo + projeto. |

## Auditoria das experiências

**`game-state`.** A cena mostra que o relógio continua tocando em `inicio`, mas a pergunta
impede a criação. A criança observa três chamadas com Criar pedra fora da condição
(`outside`), depois três chamadas com a peça dentro de `Se jogando` ainda no menu
(`waiting`), e três após começar (`playing`). Contadores de chamadas e nascimentos
devem estar visíveis ao lado da cena para que “tocou” e “criou” não se confundam. O
vídeo ensina a lógica abstrata; a instrução propõe o contraste sem dizer de
antemão quantas pedras haverá. O checkpoint antigo repetia o resultado e foi removido.

**`restart`.** A comparação não é “apertar Enter ou não”; é o que o ramo do fim faz.
Primeiro, Mudar o estado para `inicio` deixa pedras, pontos e vidas da partida anterior
guardados (`screen-only`). Depois, Reiniciar roda Ao iniciar, recria grupos, zera pontos,
devolve três vidas e termina no menu (`back-to-menu`). A criança precisa observar que
um segundo Enter começa a nova partida. A instrução manda comparar o que persistiu e o
momento final, sem enumerar a resposta. O quiz retoma a inferência em vez de um
checkpoint logo após a cena.

O HUD e a cena são o contexto visual. A instrução fica junto dos controles, abaixo
da cena em largura estreita e ao lado em largura ampla ou no modo ampliado. No palpite,
se houver, nenhum controle aparece desativado. Contadores e mudanças devem continuar
visíveis durante a ação, sem exigir rolar para observar o que acabou de acontecer.

## Continuidade, limites e gravação

`alvo=26`, dicas “Aperte Enter para começar” e “Aperte Enter para voltar ao início”,
comparação maior ou igual e nomes internos dos quatro momentos são canônicos.
Títulos, subtítulos e cores das telas ficam a critério da criança, com contraste.
`Mudar o estado do jogo para` não reinicia a partida. `Reiniciar o jogo` executa Ao
iniciar e volta ao menu porque o último bloco inicial guarda `inicio`. Se vitória
e derrota ocorrerem no mesmo quadro, a pergunta de derrota vem por último e pode
prevalecer; não prometer prioridade à vitória.

O [roteiro de gravação](nave-contra-asteroides-dia-5.roteiro.md) especifica os 11 clipes, com os dois
novos vídeos conceituais. Não há duas gravações na mesma seção. Conferir rótulos
atuais: `o estado do jogo é ?`, `Mudar o estado do jogo para` e Jogo 2D › Jogo e
telas › Telas e partida. O teste final precisa mostrar menu, partida, um fim,
retorno ao menu e outro Enter. Após o envio, Compartilhar fica disponível; o link só vem após a
escolha de publicar. A janela de publicação e seus campos podem mudar e não são parte obrigatória
da aula. O fecho
celebra o que foi aprendido sem afirmar que a criança já publicou. Este curso termina no Dia 5;
a introdução e o certificado ficam no Desafio do Primeiro Jogo.
