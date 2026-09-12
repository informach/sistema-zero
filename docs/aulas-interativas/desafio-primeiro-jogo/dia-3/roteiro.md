# A chuva de asteroides

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia3-desafio-primeiro-jogo.md`. SHA-256: `42f032a7ead97c237bcb82ed1b6a97405484801d4de4dc6e9d6598bc41446b55`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu projeto já tem nave e tiros. Agora falta algo para desviar e acertar.

**Resultado:** Controlar a frequência de criação e ligar a colisão à remoção dos objetos.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Qual chuva fica mais intensa? | Resolver a descoberta. |
| Solte os asteroides | Verificar os objetivos do projeto. |
| Um encontro, uma explosão | Responder uma pergunta de decisão. |
| Escolha o ritmo da chuva | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Qual chuva fica mais intensa?

**Intenção e objetivo (professor):** Exploração · Controlar a frequência de criação e ligar a colisão à remoção dos objetos.

**Texto para o aluno:**

Oi! Sua nave já se move e atira. Agora vamos criar uma chuva de asteroides e escolher um ritmo que dê vontade de jogar outra vez.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Qual chuva fica mais intensa?**

Modelo: `prediction`. Critério desta seção.

Dois jogos rodam no mesmo ritmo. Um cria um asteroide a cada 20 quadros, outro a cada 80. Faça sua previsão. Sua primeira ideia pode mudar depois da observação.

**Previsões (sem nota):** A cada 20 quadros · A cada 80 quadros · A frequência é igual

**Depois de observar:** Em 160 quadros, intervalos de 20 permitem 8 nascimentos; intervalos de 80, apenas 2. O intervalo menor deixa menos tempo entre os asteroides. Você vai conferir no seu jogo.

**Pergunta:** A chuva ficou difícil demais. Qual mudança dá mais tempo entre os asteroides?

- Aumentar o intervalo de 20 para 80 quadros.
- Diminuir o intervalo de 80 para 20 quadros.
- Mudar só a cor dos asteroides.

**Resposta esperada (professor):** Aumentar o intervalo de 20 para 80 quadros.

**Devolutiva:** Esperar mais quadros deixa mais tempo entre os nascimentos. Depois você poderá experimentar os dois ritmos no jogo.

**Pistas:**

- Compare quanto o relógio espera antes de criar de novo.

**Texto para o aluno:**

Um relógio de quadros decide quando nasce outro asteroide. Esperar menos quadros produz mais objetos no mesmo período: 20 é uma chuva mais frequente que 80.

O relógio que cria fica ao lado do que move e desenha, porque são tarefas com ritmos diferentes. A colisão liga duas coisas que se encontram.

Ao tirar o tiro e o asteroide dos grupos, aquela mesma batida não continua valendo nos quadros seguintes.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Solte os asteroides

**Intenção e objetivo (professor):** Aplicação · Separar o relógio de criação da atualização dos objetos.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Criar o grupo dos asteroides

Em Jogo 2D, Muitos, crie o grupo asteroides em Ao iniciar, abaixo de tiros. Agora cada tipo tem seu próprio grupo.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Muitos", arrastar "Criar grupo de sprites" para dentro do Ao iniciar, abaixo do grupo tiros; conferir o nome "asteroides".

**Produção:** dia-3-passo-01: gravar a demonstração "criar o grupo dos asteroides" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Montar o relógio da chuva

Em Tempo e repetição, coloque A cada quadros dentro de Enquanto estiver rodando, ao lado de A cada quadro do jogo. Escreva 40.

O relógio da criação fica separado do movimento.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Tempo e repetição", arrastar "A cada quadros" para dentro do Enquanto estiver rodando, AO LADO do "A cada quadro do jogo" (não dentro), e escrever 40.

**Produção:** dia-3-passo-02: gravar a demonstração "montar o relógio da chuva" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Criar o asteroide surpresa

Em Kit espaço, coloque No grupo criar um asteroide dentro do relógio. Escolha asteroides.

No x, use um x aleatório na tela, de Mira e contas. Confira y menos 30, tamanho 40, vx 0 e vy 3.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Kit espaço", arrastar "No grupo criar um asteroide" para dentro do "A cada 40 quadros" (grupo asteroides); no x, encaixar "um x aleatório na tela" (Mira e contas); y -30, tamanho 40, cor cinza, vx 0, vy 3.

**Produção:** dia-3-passo-03: gravar a demonstração "criar o asteroide surpresa" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Prepare o nascimento. Na etapa seguinte vamos mover e desenhar essa chuva.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Crie o grupo asteroides em Ao iniciar. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_create_group","area":"start","fields":{"NAME":"asteroides"}}`.

- Prepare A cada 40 quadros em Enquanto estiver rodando. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_every_frames","area":"loops","inputs":{"N":40}}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 3. Um encontro, uma explosão

**Intenção e objetivo (professor):** Aplicação · Remover os objetos atingidos para que um encontro não se repita.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Fazer os asteroides caírem e sumirem

Em A cada quadro, abaixo dos tiros, encaixe Atualizar o grupo asteroides, Tirar do grupo quem sair da tela e Desenhar o grupo asteroides. Deixe vazio o fazer da limpeza.

Rode e observe a chuva.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

dentro do "A cada quadro do jogo", abaixo do "Desenhar o grupo tiros", encaixar na ordem: "Atualizar (mover) o grupo" (asteroides), "Tirar do grupo quem sair da tela" (asteroides, fazer vazio), "Desenhar o grupo" (asteroides). Os asteroides começam a cair na tela.

**Produção:** dia-3-passo-04: gravar a demonstração "fazer os asteroides caírem e sumirem" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Explodir asteroide com tiro

Em Colisões, encaixe Para cada colisão entre os grupos, usando tiros e asteroides. Dentro, tire tiro e asteroide de seus grupos, solte uma explosão no asteroide e toque o som de explosão.

Confira os apelidos antes de testar.

**Vídeo planejado:** `video-construir-5-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Colisões", arrastar "Para cada colisão entre os grupos" para dentro do "A cada quadro do jogo", abaixo do "Desenhar o grupo asteroides"; configurar grupos tiros e asteroides (apelidos tiro e asteroide). Dentro, na ordem: "Tirar o sprite tiro do grupo tiros" (Muitos), "Tirar o sprite asteroide do grupo asteroides" (Muitos), "Soltar explosão no sprite asteroide" cor laranja (Kit espaço), "Tocar som de explosão" (Kit espaço).

**Produção:** dia-3-passo-05: gravar a demonstração "explodir asteroide com tiro" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Tente acertar um asteroide. Observe o tiro e a pedra depois do encontro; o efeito também pode ser visto sem som.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Um tiro acertou, mas a mesma explosão continua se repetindo. O que conferir?

- Se o fundo tem estrelas suficientes.
- Se o relógio cria ainda mais asteroides.
- Se tiro e asteroide foram retirados de seus grupos.

**Resposta esperada (professor):** Se tiro e asteroide foram retirados de seus grupos.

**Devolutiva:** Retirar os dois objetos encerra aquele encontro. Assim o mesmo acerto não dispara de novo a cada quadro.

**Pistas:**

- O que acontece se os dois objetos continuarem se encostando no quadro seguinte?

**Critério configurado:** `checar-construir-5`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 4. Escolha o ritmo da chuva

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Hora de explodir

Clique no jogo, desvie e atire. Compare o relógio em 20 e em 80.

Sua previsão combinou com o resultado? Volte a 40 para seguir com o mesmo ponto de partida.

**Vídeo planejado:** `video-construir-6-1`

**Na tela (sequência técnica preservada):**

clicar na área do jogo, desviar dos asteroides, atirar e explodir vários; depois trocar o 40 do relógio por 20 e por 80.

**Produção:** dia-3-passo-06: gravar a demonstração "hora de explodir" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Um tiro que acerta deve desaparecer junto com o asteroide, produzir explosão e som. Observe também os objetos saindo da tela. Envie o projeto.

No Dia 4, essas batidas vão mudar os pontos e as vidas.

Se algo sair diferente, conte o que tentou em **Preciso de ajuda**. Você pode rever os passos e ajustar seu projeto com calma.

**Estúdio compartilhado:** reutilizar o primeiro Estúdio da aula. A entrega acontece aqui, uma única vez.

**Critério configurado:** entrega do Estúdio. Se houver nota mínima, conferir a atividade vinculada: o manifesto preserva sua configuração. Para exigir aprovação automática na seção, ela precisa usar checagens estruturais compatíveis. O carimbo “já conferi” do professor não controla este avanço.

## Cadastro e validação em staging

1. Abra a aula correspondente no admin de staging. Importe `manifesto.json` no rascunho com **Vincular ao destino aberto** e confira a prévia. Preserve a configuração do Estúdio existente e sua cadeia, quando houver.

2. Confira o quadro de critérios de cada seção. Os nomes acima correspondem ao manifesto. Cada vídeo mantém a chave original: reimportar preserva mídias já vinculadas. Vincule e confira os vídeos planejados pelo uploader Vimeo.

3. Se uma versão anterior deste pacote já foi importada, retire do rascunho os cartões antigos listados abaixo. O importador preserva blocos omitidos e pode levá-los ao fechamento; omitir uma chave no arquivo não apaga o cartão antigo. Confira quizzes e entregas existentes separadamente para manter apenas as exigências intencionais.

4. Use a prévia para revisar apresentação e continuidade. Para testar bloqueios, publique apenas em staging e entre com um perfil de aluno de teste sem conclusão anterior. A prévia navega livremente e marcos concluídos são preservados.

5. Tente uma resposta incorreta ou um projeto sem o requisito, confira o bloqueio e depois cumpra o critério. Verifique liberação, retorno, recarga e continuidade para a próxima aula. Em uma etapa com vários objetivos, cumprir só um não deve liberar.

**Cartões antigos a retirar após reimportação:**

- `checar-comeco`: Confira: A criação de hoje
- `checar-entenda`: Confira: O que aconteceu?
- `checar-construir-1`: Confira: criar o grupo dos asteroides
- `checar-construir-2`: Confira: montar o relógio da chuva
- `checar-construir-3`: Confira: criar o asteroide surpresa
- `checar-construir-4`: Confira: fazer os asteroides caírem e sumirem
- `checar-construir-6`: Confira: hora de explodir

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
