# A Chave do Farol · Dia 2 · A chave muda a aventura

## Resultado e diagnóstico

O personagem recolhe a chave uma vez por partida; o jogo guarda `temChave = verdadeiro` e mostra uma mensagem. Retomar o projeto enviado no Dia 1. A alternativa preparada do Dia 2 contém movimento e borda, sem a coleta.

A revisão retira analogias desnecessárias e a antecipação da próxima aula. A necessidade aparece no próprio jogo: o personagem anda, mas ainda atravessa a chave sem recolhê-la.

## Seções finais

| Seção | Vídeo | Atividade e conclusão |
| --- | --- | --- |
| Encostar ainda não é pegar | `video-d2-contexto` | Observar a necessidade da coleta e entender evento/variável; vídeo. |
| Guarde que a chave foi encontrada | `video-d2-programar` | Montar no Estúdio `projeto`; vídeo, critérios de projeto e envio. |

## Conceitos e montagem

**Evento** é a instrução que responde a um acontecimento. **Variável** é uma informação com nome que o jogo consulta e muda. Explicar cada termo pelo encontro com a chave, sem exigir uma analogia de caixa ou campainha.

1. Em **Ao iniciar**, depois dos controles, criar `temChave` com valor **falso**.
2. Em **Quando acontecer**, criar o encontro entre `personagem` e `chave`.
3. Dentro dele, retirar o sprite `chave`, alterar `temChave` para **verdadeiro** e alterar `aviso` para **Você pegou a chave! Agora vá ao farol.**
4. Mostrar que destruir o sprite retira a chave daquela partida; não apaga a imagem do projeto.

Não criar cena paralela para demonstrar o que o próprio projeto já permite observar. A variável `aviso` e sua exibição vieram preparadas.

## Testes e entrega

Recolher a chave, conferir mensagem, atravessar o mesmo lugar e reiniciar por **Atualizar** para vê-la voltar. A coleta só ocorre uma vez por partida. Ainda não programar a porta.

Os critérios verificam declaração inicial falsa, encontro correto, retirada da chave e mudança de `temChave`. A mensagem também é conferida jogando. Teste visual e verificação estrutural se complementam.

Finalizar com **Verificar esta etapa**, corrigir pendências, conferir **Objetivo da etapa cumprido!**, esperar **Salvo**, **Enviar para o professor**, confirmar **Enviar** e **Concluir aula**. O professor não recebe a atividade apenas porque o jogo foi salvo.

## Continuidade e produção

Preservar as duas seções, chaves dos vídeos, chave do Estúdio e cadeia. Manter a aposentadoria histórica de `video-d2-teste`. Regravar os dois vídeos. A fala final termina na conclusão desta aula, sem promessa de amanhã. O Dia 3 retoma o envio da criança.
