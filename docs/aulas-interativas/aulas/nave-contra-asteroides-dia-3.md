# Nave Contra Asteroides · Dia 3 · A chuva de pedras

## Resultado pedagógico

O projeto chega do Dia 2 com nave, tiros e som. A criança termina o Dia 3 com asteroides
nascendo acima da tela em x sorteado, um a cada 40 quadros, caindo com vy 3. Cada tiro que
acerta um asteroide remove apenas o par envolvido, cria explosão e toca o efeito. O Dia 4
recebe intactos o intervalo 40, y −30, tamanho base 40, vx 0, vy 3 e os apelidos `tiro` e
`asteroide`. Cores da pedra e da explosão são livres.

São 10 seções, nove vídeos planejados e três experiências. O quiz fica sozinho na seção 9,
seguido pela entrega. Em cada conceito, há um vídeo curto que ensina a ideia e uma experiência
que deixa a criança comprovar a diferença. A fala do Zappy só leva do vídeo à ação. Na
construção, o vídeo mostra o gesto no Estúdio e o Zappy dá uma tarefa breve, sem repetir a
narração nem substituir a instrução. O avanço exige o vídeo e a experiência ou os critérios
do projeto.

No clipe da colisão, a narração acompanha cada um dos quatro blocos do `fazer`: diz de onde ele
sai, onde entra e quais menus mudar. Ver a montagem na tela não substitui ouvir essas etapas.

## Diagnóstico e decisões

| Risco didático anterior | Correção |
|---|---|
| O relógio era descoberto sem vídeo conceitual; o controle de frequência podia ser confundido com velocidade. | `video-intervalo` parte da avalanche que surgiria se o motor criasse pedra a cada quadro. Compara com o relógio de 40 quadros sem mudar a queda. Em `spawn`, a criança testa 40 e 20. |
| Sorteio de x e y −30 pareciam detalhes de copiar no bloco. | `video-sorteio` parte do problema de pedras nascerem sempre na mesma coluna; separa posição horizontal sorteada, possível repetição e nascimento acima da tela. Em `random`, a criança sorteia e vê a pedra entrar. |
| “Cada vez um lugar novo” prometia algo falso, mas exigir um lugar repetido entre 61 possíveis podia prender a criança num sorteio demorado. | O roteiro diz que o sorteio não tem memória. A experiência exige observar dois lugares diferentes e a pedra entrar pela borda; uma repetição aparece na régua quando ocorrer, sem ser condição de conclusão. As pistas deste caso não mencionam o controle de velocidade, que não existe nele. |
| Grupo inteiro versus participantes de uma colisão ficava só em fala. | `video-apelidos` apresenta a ideia; `collision-pair` permite comparar comandos sobre os grupos inteiros e sobre `tiro`/`asteroide`. O palpite testa a crença inicial útil; a pergunta redundante após a ação foi retirada. |
| O roteiro mostrava pedras antes de instalar os blocos que as desenham e dizia que o tiro atravessava sem mostrar esse teste. | `video-asteroide` termina com a regra de nascimento pronta e a tela ainda sem pedras. `video-ciclo-asteroides` instala mover, retirar e desenhar, mostra as pedras caindo e só então o tiro atravessando uma delas. |
| Várias falas do Zappy detalhavam todo o passo a passo. | Uma ponte breve após o vídeo em cada seção. Categoria, subcategoria, bloco e ponto de encaixe ficam no vídeo prático e nos critérios do Estúdio. |
| Quiz misturado à entrega. | Quiz em seção própria, sem vídeo, com uma frase introdutória e conclusão só pelo quiz. |

## Percurso por seção

| # | Seção | Vídeo | Ação e conclusão |
|---|---|---|---|
| 1 | Abertura | `video-abertura`: pedras chegando e um acerto | Assistir. Não prometer placar ainda. |
| 2 | Uma pedra de cada vez | `video-intervalo`: frequência não é velocidade | `experiencia-relogio` (`spawn`, preset `pedra-quadros`): comparar sem relógio, 40 e 20 quadros. Assistir e experimentar. |
| 3 | Grupo e relógio | `video-grupo-e-relogio`: grupo `asteroides` e relógio vizinho ao motor | Estúdio: grupo em Ao iniciar; `A cada 40 quadros` fora, não dentro, de `A cada quadro do jogo`. Vídeo e critérios. |
| 4 | De onde vem a pedra | `video-sorteio`: por que sortear x; y −30 como lugar | `experiencia-sorteio` (`random`, preset `pedra-acima`): nascimentos sorteados e entrada pela borda superior. Assistir e experimentar. |
| 5 | Pedra fora da tela | `video-asteroide`: montagem com x aleatório, y −30, tamanho 40, vx 0, vy 3; tela ainda sem pedras desenhadas | Estúdio: um único criador no relógio de 40 quadros. Vídeo e critérios. |
| 6 | As pedras caem | `video-ciclo-asteroides`: mover, retirar, desenhar e testar o tiro que atravessa | Estúdio: trio aplicado ao grupo asteroides. A falta da colisão se torna visível. Vídeo e critérios. |
| 7 | Quem some na trombada | `video-apelidos`: grupo e par não são a mesma coisa | `experiencia-trombada` (`collision-pair`): comparar remover grupo inteiro com remover só os participantes. Assistir e experimentar. |
| 8 | Faça o acerto | `video-colisao`: evento da colisão e quatro comandos | Estúdio: remover tiro, remover asteroide, explodir o atingido e tocar efeito. Vídeo e critérios. |
| 9 | Quiz | Nenhum; Zappy introduz em uma frase | Duas questões sobre intervalo e participante. Só o quiz conclui. |
| 10 | Entrega | `video-fecho`: teste, conferência, envio e ponte para o Dia 4 | Estúdio: critérios de todo o dia; vídeo e projeto concluem. |

## Auditoria das experiências

**`spawn`, preset `pedra-quadros`.** O cenário é espacial, sem chão ou cacto. A criança vê
uma “parede” se a criação acontece a cada quadro, depois deixa nascer pelo menos duas pedras
com intervalo 40 e compara com 20. A instrução dá tempo suficiente em cada etapa para observar
o caminho das pedras. É essencial que a cena não acelere individualmente as
pedras ao mudar o intervalo. A instrução manda observar quantidade e trajetória, sem declarar
o resultado. O antigo checkpoint repetia a própria comparação e foi retirado. As metas da
cena devem depender da ação da criança, não do vídeo.

**`random`, preset `pedra-acima`.** A régua do x fica acima da borda, com marca para cada
sorteio. A criança pode observar posições próximas ou iguais; não há promessa de unicidade nem
exigência de repetir um lugar específico entre as 61 posições possíveis.
O y −30 indica nascimento fora da tela e o vy 3 indica queda posterior. A instrução separa
sortear de deixar o tempo passar até uma pedra entrar. O checkpoint antigo cobrava a mesma
inferência sobre repetição e foi retirado para evitar uma pergunta extra depois de observar.

**`collision-pair`.** Três tiros e três pedras; apenas um par está alinhado. A primeira
tentativa remove o grupo inteiro, a segunda usa os apelidos dos participantes. A criança
compara os dois contadores e observa que os demais objetos ficam. O palpite prévio é
justificado porque testa a concepção “grupo = peça atingida”, mas não bloqueia a manipulação.
A pergunta final redundante foi retirada. A experiência só se completa após as duas
configurações e a comparação com os demais preservados.

Em todas as experiências, o contexto visual (HUD e cena) aparece antes; a instrução fica
próxima dos controles, abaixo ou à direita conforme a largura. No palpite, só cena, pergunta
e alternativas ficam visíveis. A criança deve conseguir agir e ver a consequência sem
rolagem entre controles e resultado.

## Gravação e continuidade

Os três vídeos novos (`video-intervalo`, `video-sorteio`, `video-apelidos`) são planos de
gravação, não arquivos de mídia já publicados. O [roteiro](nave-contra-asteroides-dia-3.roteiro.md) detalha
fala, enquadramento e gesto dos nove clipes. Na gravação dos práticos, mostrar o nome real
do bloco, as três gavetas da paleta e o ponto de encaixe. Não reutilizar “Tocar som de
explosão”: o nome atual é `Tocar efeito`, opção explosão. A explosão está em Jogo 2D ›
Desenho e efeitos › Partículas. Evitar contagem de seis passos e não convidar a mudar
o intervalo 40 ou vy 3, que o Dia 4 toma como dados.

A transição central do dia é verificável no jogo da criança: antes do bloco de colisão,
o tiro atravessa o asteroide; depois, só o tiro e o asteroide atingidos desaparecem, com
explosão e som, enquanto os outros continuam. O vídeo final deve mostrar as duas situações
relevantes de teste: acertar uma pedra e disparar no vazio. O envio só vem depois da
conferência do projeto salvo. A introdução e o certificado do Desafio do Primeiro Jogo não fazem parte deste curso.
