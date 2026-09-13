# aula-10 — Uma colisão mais justa

Revisão baseada no roteiro original gravado. Demonstração é observação; experimentação é uma atividade separada e delimitada. Todas as construções usam o mesmo Estúdio da aula.

**Entrada:** A batida pode parecer acontecer antes do toque. Vamos enxergar a área usada pela colisão e ajustá-la.

**Saída esperada:** Área de colisão do Dino em 80%, desenho do personagem preservado e instrumento retirado.

**Vídeos:** as falas abaixo são material de montagem por âncoras, não timecodes. O editor deve aplicar os cortes e as substituições indicados antes de exportar cada clipe. Não concatenar automaticamente a fala original inteira com a ponte nova.

## Percurso da criança

| Seção | Experiência | Objetivo |
| --- | --- | --- |
| 1. O que vamos fazer hoje | presentation | A batida pode parecer acontecer antes do toque. Vamos enxergar a área usada pela colisão e ajustá-la. |
| 2. Veja a área que o jogo usa | application | Adicionar um instrumento que revela a geometria de colisão. |
| 3. O contorno e o desenho são iguais? | demonstration | Perceber espaços vazios do desenho dentro da área de colisão. |
| 4. Ajuste só a área de colisão | exploration | Comparar a detecção mantendo os desenhos na mesma posição. |
| 5. Leve o ajuste para o seu jogo | application | Configurar a área sem redimensionar o sprite. |
| 6. Retire o instrumento, mantenha o ajuste | application | Distinguir instrumento temporário de regra permanente. |
| 7. Teste e entregue sua construção | delivery | Área de colisão do Dino em 80%, desenho do personagem preservado e instrumento retirado. |
| 8. Veja o que você aprendeu | closing | Área de colisão do Dino em 80%, desenho do personagem preservado e instrumento retirado. |
| 9. Confira as ideias de hoje | closing | Explicar as relações que acabamos de construir. |

## Decisões e roteiro de cada seção

### Veja a área que o jogo usa

**Por que aqui:** Partir do próprio jogo e de um problema reconhecível depois da aula 9.

**Foco:** Adicionar um instrumento que revela a geometria de colisão.

**Fala de ligação / orientação ao aluno:** “No fim de A cada quadro, coloque Desenhar área de colisão do sprite dino. Veja o contorno ao redor dele.”

**Fonte:** roteiro-aula-10-corre-dino.md → Parte 1. Passo 1: ligar o raio-X.

**Montagem:** Preservar o contorno. Não tratar o desenho da hitbox como a própria configuração da colisão.

**Na tela:** **Na tela:** Jogo 2D › Aparência, arrastar "Mostrar a caixa de colisão do sprite" para dentro do "Se a tela atual é jogando", no fim, abaixo do "Tirar do grupo cactos quem sair da tela"; escolher o dino. Rodar e mostrar o contorno rosa em volta do dino.

**Trecho original selecionado, antes da edição:** Tem uma coisa acontecendo no seu jogo que você não consegue ver. Hoje a gente vai ver. Na categoria Jogo 2D, subcategoria Aparência, pega o bloco Mostrar a caixa de colisão do sprite. Clica nele, segura, arrasta pra dentro do Se a tela atual é jogando e solta lá no fim de tudo, embaixo do Tirar do grupo cactos quem sair da tela, que hoje é o último bloco de lá. Ele tem um campo só, que é o sprite. Abre a listinha e escolhe o dino. Clica na área do jogo, aperta Enter pra começar e olha em volta do seu dino: apareceu um contorno cor-de-rosa. Esse retângulo é a caixa de colisão. É a forma que o jogo usa de verdade pra saber se alguma coisa encostou no dino. E repara: o jogo não olha pro desenho do dinossauro. Ele olha pra esse retângulo. Pro computador, o seu dino é essa caixa. Passo 1 feito, o invisível ficou visível. O segundo passo é entender o que essa caixa tem a ver com a batida injusta.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Desenhe a área de colisão do dino a cada quadro.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### O contorno e o desenho são iguais?

**Por que aqui:** Um close parado explica melhor a geometria do que exigir precisão motora numa partida.

**Foco:** Perceber espaços vazios do desenho dentro da área de colisão.

**Fala de ligação / orientação ao aluno:** “Olhe o espaço vazio junto do corpo. O desenho tem recortes, mas a área de colisão é mais simples.”

**Fonte:** roteiro-aula-10-corre-dino.md → Parte 2. Passo 2: por que a batida pareceu roubada.

**Montagem:** Preservar a explicação dos espaços transparentes. Corrigir qualquer referência a ajustar o cacto: nesta aula o ajuste é do Dino.

**Na tela:** Congelar um contato com a área marcada. Alternar desenho e contorno na mesma posição. Não mover o obstáculo enquanto compara os contornos.

**Trecho original selecionado, antes da edição:** Olha com atenção o seu dino dentro da caixa. O dinossauro é um bichinho cheio de pontas e curvas, sem nada de reto nele: tem o rabo pra trás, o focinho pra frente, as perninhas embaixo. Mas a caixa é um retângulo, certinho, quadradão. Então sobra espaço vazio. Aqui em cima da cabeça tem um pedaço de caixa sem dino nenhum. Aqui na frente também. Aqui embaixo, entre os pés, também. E é aí que mora a batida injusta: quando o cacto encosta num desses cantinhos vazios da caixa, o jogo entende que bateu, mesmo que na tela pareça que passou longe. Não foi o jogo que roubou de você. Foi a caixa que é maior que o bichinho. Segundo passo entendido. E o conserto disso tudo é um bloco só, que é o que a gente pega agora.

**Aluno:** assiste, pausa ou revê. Sem alterar parâmetros e sem converter esta seção em experimentação. Conclui com 90% do clipe assistido.

### Ajuste só a área de colisão

**Por que aqui:** Permitir uma comparação controlada que seria difícil de repetir numa corrida real.

**Foco:** Comparar a detecção mantendo os desenhos na mesma posição.

**Fala de ligação / orientação ao aluno:** “Aproxime o cacto até o contato indicado. Depois ajuste apenas a área de colisão e compare. O desenho do Dino continua do mesmo tamanho.”

**Experiência nativa:** hitbox. Modelo didático separado do projeto; não promete reproduzir todos os números e a física do Estúdio.

**Conclusão observável:** Áreas em contato; Áreas separadas; Mesma posição, áreas diferentes.

**Interação:** usar apenas os controles desta missão. Ajudas em três níveis conduzem ao mesmo objetivo. Ao concluir, os controles ficam encerrados e a criança continua a aula; comparações que ela guardou permanecem consultáveis. Não acrescentar outra missão.

### Leve o ajuste para o seu jogo

**Por que aqui:** Aplicar a descoberta uma única vez na preparação da partida.

**Foco:** Configurar a área sem redimensionar o sprite.

**Fala de ligação / orientação ao aluno:** “Em Ao iniciar, depois de criar o dino, ajuste a área de colisão dele para 80%. Mantenha o tamanho do Dino em 64.”

**Fonte:** roteiro-aula-10-corre-dino.md → Parte 3. Passo 3: ajustar a área de colisão.

**Montagem:** Reaproveitar a montagem e o teste com contorno; manter a cor e o desenho iguais.

**Na tela:** **Na tela:** Jogo 2D › Colisões, arrastar "Usar área de colisão de __ % do tamanho para o sprite __" para o Ao iniciar, encaixando como **último bloco**, embaixo do "Ir para a tela inicio"; deixar 80 e escolher o dino. Com o raio-X ainda ligado, mostrar a caixa menor.

**Trecho original selecionado, antes da edição:** Na categoria Jogo 2D, subcategoria Colisões, pega aquele bloco bem comprido, o Usar área de colisão de tanto por cento do tamanho para o sprite. Clica nele, segura e arrasta pra dentro do Ao iniciar. Encaixa ele no fim de tudo, embaixo do último bloco que está lá, o Ir para a tela inicio. Ele tem dois campos. O primeiro é a porcentagem, e já vem 80, que é justamente o que a gente quer, então deixa como veio. No segundo, que é o sprite, escolhe o dino. Esse bloco mora no Ao iniciar, e não no motor, porque é coisa de preparação: acontece uma vez só, quando o jogo liga. E aqui dentro a ordem não faz diferença, porque tudo isso acontece antes de o jogo começar a rodar. O que importa é que ele venha depois do Criar dinossauro, senão ele ajustaria um dino que ainda não existe. Olha o raio-X agora: a caixa encolheu. Ela virou oitenta por cento do tamanho do dino, bem mais grudadinha no bichinho, e aqueles cantos vazios diminuíram bastante. E repara que o desenho do dino não mudou nada. Ele continua do mesmo tamanho na tela. O que mudou foi só a caixa invisível que o jogo usa pra medir a batida. Agora clica na área do jogo e passa raspando num cacto de propósito. Aquelas perdas injustas sumiram: quando você passa perto e escapa, o jogo concorda com você que escapou. Passo 3 feito. E agora o quarto passo, que é onde você vira o dono do jogo.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Em Ao iniciar, ajuste a área de colisão do dino para 80%.
- Desenhe a área de colisão do dino a cada quadro.
- Crie o Dino com tamanho 64 antes do ajuste de colisão.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

### Retire o instrumento, mantenha o ajuste

**Por que aqui:** Encerrar com o jogo visualmente limpo, sem desfazer a solução.

**Foco:** Distinguir instrumento temporário de regra permanente.

**Fala de ligação / orientação ao aluno:** “Depois de testar, apague apenas Desenhar área de colisão. O ajuste de 80% fica em Ao iniciar.”

**Fonte:** roteiro-aula-10-corre-dino.md → Parte 4. Passo 4: você escolhe o quanto perdoar.

**Montagem:** Pode aproveitar a comparação 40/100 como observação rápida, mas remover a tarefa de escolher livremente. Encerrar em 80 e retirar o contorno.

**Na tela:** **Na tela:** trocar o 80 por 40 (jogar e ver como fica fácil demais), depois por 100 (voltar a ser injusto), depois voltar pra um número entre 70 e 85; por fim, apagar o bloco do raio-X.

**Trecho original selecionado, antes da edição:** Esse número da porcentagem é muito mais poderoso do que parece. Os criadores de jogos chamam ele de dial de dificuldade, que é tipo um botão de ajuste. E vamos ver o que ele faz. Troca o 80 por 40 e joga um pouco. Com 40 a caixa fica minúscula, quase no meio do dino, e o jogo fica fácil demais, porque o cacto passa praticamente por dentro dele e não acontece nada. Chega a parecer que o jogo está com pena de você, e aí perde a graça também. Agora troca por 100 e joga de novo. A caixa voltou ao tamanho cheio, e voltaram aquelas batidas injustas do começo da aula. Então lembra desta regra, que vale na grande maioria dos jogos que você vai fazer: pra coisa que machuca o jogador, área menor que 100 deixa o jogo mais justo. É o cacto do seu jogo. O jogador sente que só perde quando merece. Agora põe um número entre 70 e 85, testa e escolhe o que deixou o seu jogo mais gostoso. O meu está em 80, e o seu pode ser outro. E pra fechar, apaga o bloco Mostrar a caixa de colisão, arrastando ele pra lixeira. Ele era o nosso raio-X e já cumpriu a missão. Mas lembra dele: sempre que uma colisão do seu jogo estiver esquisita, liga o raio-X e olha. É assim que se investiga.

**Aluno:** assiste ao gesto, pausa, monta no Estúdio já aberto e usa Conferir. Assistir ao vídeo não substitui a construção.

**Critérios automáticos:**

- Em Ao iniciar, ajuste a área de colisão do dino para 80%.
- Retire o desenho provisório da área de colisão.

**Se não passar:** apontar o objetivo pendente pelo nome. Rever o encaixe ou a configuração, corrigir no mesmo projeto e conferir novamente. A revisão visual do jogo continua necessária.

## Conferência final e quiz

Jogue uma rodada. A batida deve continuar funcionando com a margem escolhida; o Dino não encolheu e o contorno não aparece mais.

**Critérios da entrega:**

- Em Ao iniciar, ajuste a área de colisão do dino para 80%.
- Retire o desenho provisório da área de colisão.
- Crie o Dino com tamanho 64 antes do ajuste de colisão.

**Ao ajustar a área para 80%, o desenho precisa encolher?**

- Não, a área de colisão e o desenho são diferentes. (correta)
- Sim, são sempre a mesma coisa.

O ajuste atua na geometria da detecção.

**O que manter igual ao comparar duas áreas?**

- As posições do Dino e do cacto. (correta)
- Apenas a música.

Mudar a posição junto impediria saber a causa do resultado.

**Apagar o desenho da área apaga o ajuste?**

- Não, o ajuste continua em Ao iniciar. (correta)
- Sim, o instrumento é a própria regra.

Um bloco mostra; outro configura.

## Orientação ao professor e à edição

- 80% é a escolha desta versão do Corre Dino; não ensinar que uma área sempre menor é universalmente mais justa.
- Evitar comparar tentativas com posições diferentes como prova do ajuste. A experiência nativa mantém o caso de comparação.

O professor acompanha os objetivos e a entrega, confere o comportamento descrito acima e intervém no ponto da dificuldade. A checagem estrutural verifica a montagem; não equivale a uma prova automática de jogabilidade, contraste ou áudio.

Fonte íntegra conferida por SHA-256: bdc328d620c6cb758db35578544f6beb4f2916714bf30bf0e4e6a0aad7f6519c. O mapa de cortes completo, com entrada, saída e novas falas, está em [montagem.json](montagem.json).
