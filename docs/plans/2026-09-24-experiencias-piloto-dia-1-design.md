# Revisão das experiências do Dia 1 do Desafio

## Decisão pedagógica

O vídeo conceitual continua explicando a ideia por inteiro. A experiência deixa a criança executar os gestos, observar o efeito e relacioná-lo ao que ouviu, sem que sua instrução antecipe o resultado. Não é preciso transformar cada experiência em quiz: palpite só fica quando confronta uma hipótese útil, e pergunta final só fica quando acrescenta uma interpretação diferente da observação já feita.

## Ajustes por experiência

| Experiência | Ajuste | Preservar |
| --- | --- | --- |
| Uma vez e sempre | Equilibrar as margens laterais da cena no layout dividido. | Vídeo explicativo, comparação da mesma ficha e instrução de observação já ajustada. |
| O endereço na tela | Dizer para aumentar um eixo por vez; retirar a pergunta final que repete o palpite sobre `y`. | Palpite sobre o sentido de `y`, porque é uma hipótese contraintuitiva; metas de `x`, `y` e origem. |
| Criar e mostrar | Convidar a observar bastidores e tela depois de criar, antes de mostrar. | Palpite sobre criar sem desenhar e duas ações distintas. |
| Por que o desenho se repete | Explicitar que se avançam quadros de novo após trocar o modo de desenho e depois de ligar a limpeza, sem narrar o resultado. | Os três estados e a pergunta final sobre limpar e redesenhar. |
| Quem fica na frente? | Deixar uma parte reconhecível da nave à vista atrás do cartão de estrelas, retirar o selo interno que o cartão encobre, descrever o estado inicial corretamente, orientar as três trocas e corrigir a pergunta que dizia que a nave “sumiu”. | Pergunta final sobre a causa do encobrimento e a apresentação dos outros cursos. |

## Interface e escopo técnico

No layout lado a lado, `.sz-scene-console-visual` usa `scrollbar-gutter: stable`, que reserva largura só na borda direita. Usar margens equilibradas no painel visual, inclusive quando a barra de rolagem estiver presente. Confirmar com teste de geometria e nos layouts estreito, dividido e ampliado. O reparo é compartilhado pelas cinco experiências; não alterar o motor das cenas sem falha reproduzida.

Na cena `layers` do Desafio, o cartão de estrelas é largo e tampava a nave e parte do selo desenhado no palco. Ajustar apenas o enquadramento desse elenco: a sobreposição ainda precisa existir, mas a nave deve ser identificável antes da primeira troca. O HUD já nomeia o conceito, então o selo duplicado não é necessário nesse cenário.

O manifesto de origem, os testes do player e o briefing pedagógico acompanham o ajuste. Não modificar os vídeos nem arquivos de outras funcionalidades. Publicação de uma aula existente continua dependendo de reimportar e publicar o manifesto.
