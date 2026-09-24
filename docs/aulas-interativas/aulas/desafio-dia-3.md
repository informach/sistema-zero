# A Chave do Farol · Dia 3 · A luz do farol

## Ponto de partida e vitória

Retomar o projeto enviado no Dia 2. A retomada alternativa já contém movimento e coleta, mas **não** a regra da porta. O farol apagado e o barco fora da cena são um problema visível. A criança programa um evento de contato com o farol e uma condição que lê `temChave`: sem ela, aviso de porta fechada; com ela, `ganhou = verdadeiro`, imagem `farol-aceso` e mensagem final. O movimento do barco já está preparado e começa quando `ganhou` muda; não atribuí-lo à autoria da criança.

## Seções e pedagogia

1. **O que a porta precisa?** Vídeo conceitual da condição, com analogia de uma porta comum. No mesmo momento, experiência nativa `lighthouse-key`: testar a porta sem e com a chave. Sem palpite obrigatório. Mudar o estado da chave sozinho não conclui a atividade; são necessárias as duas tentativas reais. O Zappy fora da experiência conecta a palavra **condição** ao teste, sem repetir a instrução interna.
2. **Faça a porta conferir a chave:** vídeo prático e Estúdio. Um novo evento em **Quando acontecer** para personagem/farol; **Se valor da variável temChave** dentro dele; **senão** com aviso de falta da chave; **então** com `ganhou = verdadeiro`, imagem acesa e mensagem final. Testar a situação sem chave antes da solução e depois comparar com chave. Vídeo e projeto são exigidos.
3. **Você guiou o barco:** celebra autoria real e aponta o certificado. Não diz que a criança criou cenário, arte ou a animação pronta do barco.

## Checagens

Verificar evento para `personagem`/`farol`, condição dentro dele, troca da imagem do farol e atribuição `ganhou = verdadeiro` dentro da condição. A experiência avalia duas descobertas distintas. A conclusão do curso não depende de palpite, quiz ou compra.
