# A Chave do Farol · Dia 2 · A chave muda a aventura

## Ponto de partida e vitória

Retomar o projeto enviado no Dia 1. A alternativa sem projeto salvo inclui movimento, quatro botões direcionais e borda, mas **não** inclui a coleta. A criança programa que o encontro de `personagem` com `chave` destrói a chave e muda `temChave` de falso para verdadeiro. A mensagem da tela acompanha a coleta. Vitória do dia: a chave some uma única vez e o jogo guarda a informação. O farol ainda não abre.

## Seções e pedagogia

1. **Encostar ainda não é pegar:** mostrar o problema no próprio jogo. Analogia da campainha para acontecimento e ação; variável como caixinha nomeada que guarda uma resposta. Conceito antes dos blocos.
2. **Guarde que a chave foi encontrada:** vídeo prático e Estúdio na mesma seção. Criar `temChave = falso` em **Ao iniciar**; evento de contato em **Quando acontecer**; primeiro testar evento vazio; depois destruir `chave`, guardar `verdadeiro` e atualizar `aviso`. Testar uma coleta, tentar a segunda, conferir **Salvo** e **Enviar**. Não antecipar a regra da porta.

## Conclusão

Vídeo e projeto são exigidos na construção. Verificar variável inicial, evento correto, destruição de `chave` dentro dele e atribuição `temChave = verdadeiro`. O texto do Zappy fora do Estúdio apenas liga a explicação ao trabalho real, sem repetir cada encaixe. O projeto enviado alimenta o Dia 3; o fallback inclui esta coleta apenas na ausência do trabalho salvo.
