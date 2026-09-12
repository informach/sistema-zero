# Um salto que volta ao chão

Uma aula, organizada em 3 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-03-corre-dino.md`. SHA-256: `98f59a849d4d2f0fb36aa23422de7cb453cb6bf39057665cdfc4fac573495b3b`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu dino já aparece correndo na floresta, mas ainda não responde a você.

**Resultado:** Relacionar a gravidade à trajetória e ajustar a força do salto pelo resultado.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| O que traz o salto de volta? | Resolver a descoberta. |
| Um salto e uma volta | Verificar os objetivos do projeto. |
| Escolha seu salto | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. O que traz o salto de volta?

**Intenção e objetivo (professor):** Exploração · Relacionar a gravidade à trajetória e ajustar a força do salto pelo resultado.

**Texto para o aluno:**

Oi! Seu Dino já corre na floresta. Hoje ele vai saltar e voltar ao chão. Vamos experimentar alturas diferentes?

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: O que traz o salto de volta?**

Modelo: `experiment`. Critério desta seção.

Teste gravidade zero e depois um valor maior que zero. Compare a trajetória atual com a anterior.

**Interação:** usar o bloco funcional incorporado ao manifesto. A observação prepara a pergunta; o experimento não avalia o projeto da criança.

**Pergunta:** O que muda quando há gravidade neste modelo?

- O personagem ganha uma cor diferente
- A velocidade vertical muda e ele pode voltar ao chão
- Todos os personagens caem automaticamente

**Resposta esperada (professor):** A velocidade vertical muda e ele pode voltar ao chão

**Devolutiva:** A gravidade muda a velocidade vertical. No seu projeto, o sprite precisa receber o bloco que aplica a gravidade.

**Pistas:**

- Na linha sem gravidade, observe se a direção vertical chega a se inverter.

**Texto para o aluno:**

Quando você joga uma bola para cima, ela sobe, perde velocidade, para por um instante e volta. No modelo da descoberta, a gravidade muda a velocidade a cada passo.

No Estúdio, a gravidade do mundo só age nos sprites que recebem o bloco que a aplica. A força do pulo e a gravidade têm papéis diferentes: uma inicia o salto; a outra muda seu movimento e o traz de volta.

Alterar um valor por vez ajuda a enxergar o efeito de cada um.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Um salto e uma volta

**Intenção e objetivo (professor):** Aplicação · Aplicar gravidade ao personagem controlado e observar a volta ao chão.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Dar o comando de pulo ao dino

Em Jogo 2D, Kit dino, encaixe Controlar o dinossauro depois da floresta e antes do desenho do dino. Deixe a força em 15.

Teste espaço: ele ainda não está pronto para pular do chão.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Kit dino", arrastar "Controlar o dinossauro" pra dentro do "A cada quadro do jogo", logo abaixo de "Desenhar fundo de floresta" e logo acima de "Desenhar o sprite dino". Deixar a força do pulo em 15. Aproximar o zoom no dino pra mostrar a pose travada e os pés no ar. Apertar espaço e a seta pra cima várias vezes, mostrando que nada acontece.

**Produção:** aula-03-passo-01: gravar a demonstração "dar o comando de pulo ao dino" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### A gravidade traz o dino pro chão

Em Jogo 2D, Movimento, coloque Aplicar a gravidade do mundo ao sprite antes de Controlar o dinossauro. Troque jogador por dino.

Rode e teste espaço, seta para cima e o clique na parte de cima do jogo. Ele precisa voltar ao chão.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Movimento", arrastar "Aplicar a gravidade do mundo ao sprite" e encaixar logo ACIMA do "Controlar o dinossauro". Mostrar o campo escrito "jogador", clicar e trocar pra "dino". Mostrar o dino descendo, pousando na grama e as perninhas voltando a correr. Depois pular com espaço, com a seta pra cima, com o clique na parte de cima da área do jogo, e abaixar com a seta pra baixo e com o clique segurado embaixo. Cartela ilustrando a bolinha subindo, perdendo força, parando no alto e voltando.

**Produção:** aula-03-passo-02: gravar a demonstração "a gravidade traz o dino pro chão" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Use espaço, seta para cima ou clique na parte de cima do jogo. Escolha o controle mais confortável e observe a volta ao chão.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Aplique a gravidade ao sprite dino em A cada quadro do jogo. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_apply_gravity","area":"loops","fields":{"SPRITE":"dino"},"withinBlock":"sz_g2d_update_each_frame"}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 3. Escolha seu salto

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Você escolhe a altura

Na força do pulo, compare 2 e 30. Um quase não sai do lugar, outro vai alto demais.

Experimente 14 e depois valores de 12 a 18. Escolha pelo salto que deixa você jogar melhor, sem mudar a gravidade junto.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

trocar a força do pulo pra 2, clicar na área do jogo e pular; depois pra 30 e pular, mostrando o dino saindo da tela e o tempo que demora pra voltar. Por fim, deixar em 14 e testar pular por cima de um cacto imaginário.

**Produção:** aula-03-passo-03: gravar a demonstração "você escolhe a altura" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Teste um salto curto e um alto; depois escolha sua força. Confira se o dino volta ao chão e pode pular novamente. Envie o projeto.

Na Aula 4, você vai ligar o som ao acontecimento certo.

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
- `checar-construir-1`: Confira: dar o comando de pulo ao dino
- `checar-construir-2`: Confira: a gravidade traz o dino pro chão
- `checar-construir-3`: Confira: você escolhe a altura

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
