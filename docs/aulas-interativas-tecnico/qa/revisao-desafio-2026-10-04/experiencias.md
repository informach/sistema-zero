# Experiências propostas para A Chave do Farol

Complemento da [revisão de 04/10/2026](../revisao-pedagogica-desafio-2026-10-04.md). Especificação aprovada e implementada localmente; os nomes de controles abaixo correspondem à implementação. Veja o [registro de aplicação](aplicacao.md). A atualização remota e o ensaio com crianças continuam pendentes.

## 1. Nova cena: o jogo guardou a chave?

**Id sugerido:** `collect-and-remember`.

**Título:** O jogo guardou a chave?

**Tipo:** experimentação. **Local:** Dia 2, seção existente `contexto`, antes da montagem. **Bloco novo:** `experiencia-memoria`.

**Conceito:** retirar um objeto e mostrar uma mensagem não atualizam automaticamente a informação que o jogo precisa guardar.

**Por que criar:** a cena de contagem de Cadê Todo Mundo torna visível uma quantidade; a cena `lighthouse-key` consulta uma posse já definida. Nenhuma das duas permite comparar a coleta com e sem a atribuição que guarda essa posse. A experiência nova isola exatamente essa relação.

**Elenco/cenário:** `cenario: farol`; reutilizar personagem, chave e cenário de `FAROL_ASSETS`. A porta e o barco podem aparecer como cenário, mas não reagem nesta experiência. O objetivo não é terminar uma segunda aventura.

### O que aparece e o que a pessoa manipula

Palco com personagem perto da chave, sem encostar. Um mostrador de leitura apresenta **Informação guardada: temChave = falso**. Nome e valor vêm do estado real da cena. Falso e verdadeiro também aparecem por escrito, sem depender de cor.

Controles:

| Controle | Tipo e estado inicial | Efeito |
| --- | --- | --- |
| Guardar a coleta | Interruptor, desligado. | Define se o próximo encontro também altera `temChave`. Só fica disponível enquanto a chave ainda está no chão. |
| Encostar na chave | Botão. | Aproxima o personagem e executa as ações de coleta uma vez. |
| Afastar | Botão. | Afasta o personagem, sem mudar o registro. Disponível após o encontro. |
| Recomeçar a partida | Botão. | Recoloca a chave, volta o personagem à posição inicial, restaura o aviso e deixa `temChave` falso. Conserva o modo do interruptor e as descobertas já realizadas. |

Quando o interruptor estiver indisponível após a coleta, mostrar **Recomece a partida para mudar essa regra** junto dele. Não depender somente de tooltip. O vídeo já ensina recomeçar antes de ligar a memória.

Os botões devem funcionar com toque e teclado. O gesto de encontro pode ter deslocamento curto ilustrativo, mas não exige precisão motora. Respeitar movimento reduzido e manter os estados legíveis sem animação.

### Estados e contraste

Os dois modos retiram a chave e mostram a mesma mensagem: **Você pegou a chave!**. Somente a ação de guardar muda. Isso é intencional: impede usar a mensagem como evidência da variável.

| Momento | Guardar desligado | Guardar ligado |
| --- | --- | --- |
| Antes do encontro | Chave visível; `temChave = falso`. | Chave visível; `temChave = falso`. |
| Depois de Encostar na chave | Chave ausente; aviso de coleta; `temChave = falso`. | Chave ausente; mesmo aviso; `temChave = verdadeiro`. |
| Depois de Afastar | Estado preservado. | Estado preservado: verdadeiro. |
| Depois de Recomeçar a partida | Chave visível; falso; aviso inicial. | Chave visível; falso; aviso inicial; regra de guardar continua ligada. |

Repetir Encostar na chave sem chave disponível não altera memória, aviso nem metas. Ligar o interruptor não conta como coleta nem atribui verdadeiro. Recomeçar não troca a configuração da regra, pois isso confundiria programa e estado da partida.

### Tarefa completa para a criança

> Primeiro, deixe Guardar a coleta desligado. Aperte Encostar na chave e compare a chave, a mensagem e o valor de temChave. Depois aperte Recomeçar a partida, ligue Guardar a coleta e encoste outra vez. Aperte Afastar e olhe o valor. Por último, recomece a partida e confira o que voltou ao começo.

O pedido dá todas as ações necessárias. As pistas ajudam quem se perdeu; não guardam passos obrigatórios.

### Metas

| Id | Pedido da faixa | Rótulo após a observação | Evidência necessária |
| --- | --- | --- | --- |
| `collected-without-memory` | Com Guardar a coleta desligado, encoste na chave e acompanhe temChave. | A chave saiu do chão, mas a coleta não ficou guardada. | Encontro real com chave presente e modo desligado; chave retirada, valor falso. |
| `collected-with-memory` | Recomece, ligue Guardar a coleta e encoste na chave. | O encontro mudou a informação guardada. | Encontro real com modo ligado e valor passando de falso a verdadeiro. |
| `remembered-after-leaving` | Depois de guardar a coleta, aperte Afastar e confira temChave. | A informação continuou guardada longe da chave. | Afastamento depois de uma coleta que efetivamente guardou verdadeiro nesta partida. |
| `reset-after-remembering` | Depois de guardar a coleta, recomece a partida e confira o valor. | A nova partida começou sem a chave. | Reinício cujo estado anterior era verdadeiro, retornando a falso com a chave presente. |

As quatro metas são necessárias para concluir. Aceitar exploração em outra ordem e manter metas acumuladas entre tentativas. A elegibilidade de persistência e reinício depende do estado da partida em curso; uma coleta em tentativa antiga não deve conceder uma meta nova por um clique sem efeito.

Não exigir um tempo mínimo olhando o mostrador nem cliques para confirmar “eu entendi”. As metas comprovam ações e contrastes visitados, não compreensão. Esta é avaliada no ensaio e retomada na montagem/quiz.

### Pistas, uma por vez

1. **Olhe a chave, o aviso e temChave. São três coisas diferentes para acompanhar.**
2. **Compare o valor guardado nas duas tentativas, mesmo quando a mensagem for igual.**
3. **Use Recomeçar a partida antes de ligar Guardar a coleta. Depois encoste, afaste-se e recomece novamente.**

**Palpite:** não acrescentar formulário de previsão nesta primeira versão. Já há quatro ações com comparação; observar se a pessoa consegue explicar a diferença antes de decidir incluir uma pergunta.

**Pergunta final:** nenhuma nesta cena. Configurar a ausência com o mecanismo existente, sem criar uma segunda avaliação. A pergunta de diagnóstico do quiz final pede interpretar um defeito no programa, outra tarefa.

**Frase de sucesso:** Você comparou tirar a chave do chão com guardar que ela foi encontrada. Também conferiu o que permanece na partida e o que recomeça.

**Vídeo de apoio:** 50–75 segundos como estimativa de produção. Apresenta brevemente o encontro sem coleta no projeto atual, depois a experiência. Define variável e falso no mostrador inicial. Aponta os quatro controles e orienta os dois modos, afastamento e reinício. Não executa o contraste nem mostra os valores finais. [Fala proposta](roteiros-propostos.md#dia-2-seção-1-o-jogo-guardou-a-chave).

**Ponte do Zappy:** Compare o que some da tela com o que fica guardado no jogo. A experiência mostra a informação temChave durante cada tentativa.

### Reutilização e limites

A mesma relação atende jogos em que pegar um item guarda uma informação de posse: chave de uma passagem, cartão de acesso ou equipamento encontrado. Reutilizar a cena em cursos futuros quando houver essa relação, adaptando título/elenco se necessário. Esses usos são possibilidades de autoria, não integrações já existentes.

Não substituir por ela a experiência `found-counter`: quantidade de achados e informação de posse são relações diferentes. Não ensinar que qualquer coleta, por existir, sempre usa um booleano; esse é o modelo deste jogo.

### Aceitação funcional

- Nenhuma meta cai apenas ao mudar a regra, abrir a cena ou apertar reiniciar no estado inicial.
- Coletar sem guardar e coletar guardando têm o mesmo efeito visual na chave e no aviso, com valores distintos no mostrador.
- Afastar conserva verdadeiro e recomeçar volta a falso após uma coleta válida.
- Os testes funcionam em ordem livre; recomeçar preserva descobertas, mas reinicia o estado transitório corretamente.
- O mostrador, o texto acessível e as metas leem o mesmo estado. Não há uma simulação visual independente da regra avaliada.
- Voltar à seção não altera o projeto do aluno. A experiência não participa da cadeia do Estúdio.
- No player, vídeo e experiência entram na conclusão; diálogo e pistas não entram.

Implementação a localizar no padrão atual: registros de cenas em `packages/core/src/learning/scene/` (ações, estado, motor, catálogo, leitura, perguntas e pistas), componente correspondente em `packages/member-shell/src/components/`, roteamento da cena/controles e fixtures/testes relacionados. Regenerar `CATALOGO-CENAS.json` pelo procedimento do repositório. Não declarar a cena pronta só por adicionar o id ao manifesto.

## 2. Melhorar a experiência existente da porta

**Id preservado:** `lighthouse-key`. **Título preservado:** O que a porta precisa?

**Tipo:** experimentação. **Local:** Dia 3, seção `condicao`. **Bloco preservado:** `experiencia-porta`.

**Conceito:** ao acontecer o encontro, o jogo consulta a informação guardada para escolher entre duas respostas.

### O que já funciona

Levar a chave sozinho não conclui. A pessoa precisa testar sem chave e testar com chave. O motor só registra `locked-without-key` e `opened-with-key` nas tentativas reais. Esses controles, metas e comportamentos devem permanecer.

### Ajuste proposto

Acrescentar ao palco uma representação curta, legível também em tela estreita:

- **Informação guardada: temChave = falso/verdadeiro**, sempre visível, lendo o estado `hasKey` existente.
- **Pergunta da porta: temChave é verdadeiro?**
- Após **Testar a porta**, realçar somente a resposta selecionada: **então: acender** ou **senão: avisar que falta a chave**.

A indicação do ramo aparece após a tentativa. Antes dela, mostrar as duas possibilidades sem indicar resultado. Trocar o estado da chave apaga o destaque da tentativa anterior e conserva as metas já obtidas. Isso evita mostrar um ramo antigo ao lado de um valor novo.

O aviso do caso falso precisa aparecer como consequência da tentativa, além da porta fechada. Usar texto legível e distinção que não dependa só da cor. Não adicionar código do barco ou montagem de blocos à bancada: a conexão aqui é valor → pergunta → resposta.

### Tarefa, pistas e conclusão

**Controles:** conservar **Levar a chave / Deixar a chave** e **Testar a porta**. A troca da chave prepara uma situação de teste; não corresponde a um novo comando que o aluno terá de programar no próprio jogo.

**Início:** sem chave, porta fechada, nenhuma tentativa destacada.

**Tarefa:** testar sem chave, levar a chave e testar novamente; comparar valor consultado e resposta. A criança pode testar outras vezes.

**Metas:** conservar `locked-without-key` e `opened-with-key`, com os mesmos significados. Não acrescentar meta por ler o mostrador ou clicar em um ramo.

**Pistas propostas:**

1. Veja qual valor temChave guarda antes de testar a porta.
2. Depois da tentativa, acompanhe a resposta que ficou marcada.
3. Teste sem chave. Depois aperte Levar a chave e Testar a porta outra vez.

**Palpite:** o catálogo atual oferece uma previsão opcional. Não torná-la bloqueio, não adicionar outra nem contar seu acerto como evidência. Conferir seu comportamento real ao integrar a nova representação.

**Pergunta final:** continuar sem pergunta final, conforme `semPerguntaFinal: true` no bloco do curso.

**Sucesso proposto:** A porta consultou a mesma informação nas duas tentativas. Quando o valor mudou, ela escolheu outra resposta.

**Vídeo de apoio:** conservar a estrutura e os comandos do roteiro atual, acrescentando a orientação de observar o valor e o ramo. Não mostrar os resultados antes da experiência. [Fala proposta](roteiros-propostos.md#dia-3-seção-1-o-que-a-porta-precisa).

**Ponte do Zappy:** A coleta já guarda uma informação. Veja como a porta usa essa informação para escolher uma resposta.

### Aceitação funcional

- Alterar a chave mantém a porta fechada até testar, como hoje.
- Só tentar a porta atualiza o destaque e registra a meta correspondente.
- Começar pelo caso com chave também permite concluir após visitar os dois casos.
- Texto da condição, estado acessível, desenho e destaque correspondem ao mesmo valor consultado.
- A alteração preserva os ids das metas, a identificação da cena e o progresso compatível.

Essa melhoria da cena não corrige os critérios do projeto real. Ambos os trabalhos são necessários: a experiência ensina a relação, e o Estúdio confere a montagem da criança.
