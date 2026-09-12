# Cactos no ritmo certo

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-05-corre-dino.md`. SHA-256: `7a103a2dd829c7795d691ef38ec384b3da742f02566db055e311358df080352d`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu dino corre, pula e faz som. A pista ainda não tem obstáculos.

**Resultado:** Separar a criação de objetos do movimento contínuo e ajustar o ritmo de nascimento.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Um cacto por quadro | Resolver a descoberta. |
| Uma avalanche de cactos | Verificar os objetivos do projeto. |
| Dê espaço aos obstáculos | Verificar os objetivos do projeto. |
| Teste a sua pista | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Um cacto por quadro

**Intenção e objetivo (professor):** Exploração · Separar a criação de objetos do movimento contínuo e ajustar o ritmo de nascimento.

**Texto para o aluno:**

Oi! Sua pista vai ganhar cactos. Primeiro vamos provocar uma pequena avalanche para descobrir como dar espaço entre eles.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Um cacto por quadro**

Modelo: `prediction`. Critério desta seção.

Você colocou Criar cacto dentro de A cada quadro do jogo. O que espera acontecer? Sua primeira ideia pode mudar depois da observação.

**Previsões (sem nota):** Nasce só um cacto no começo · Nascem muitos cactos em sequência · O dino para de pular

**Depois de observar:** O bloco executa de novo em cada quadro, criando muitos cactos. Mover a criação para um relógio de 1,4 segundo controla o nascimento; mover e desenhar continuam a cada quadro.

**Pergunta:** Qual mudança pode dar uma pausa entre os nascimentos dos cactos?

- Mudar só a cor dos cactos.
- Criar em um relógio com intervalo.
- Criar duas vezes em cada quadro.

**Resposta esperada (professor):** Criar em um relógio com intervalo.

**Devolutiva:** Um relógio separado controla a espera. Mover e desenhar continuam acontecendo a cada quadro.

**Pistas:**

- Criar de novo a cada quadro deixa pouco tempo entre os objetos.

**Texto para o aluno:**

Criar um cacto em cada quadro produz uma avalanche, porque o desenho atualiza muitas vezes por segundo. Um relógio separado deixa você escolher quanto esperar entre nascimentos.

O grupo cactos reúne os obstáculos para mover e desenhar juntos. Um x além da borda direita faz o cacto entrar gradualmente; uma velocidade horizontal negativa o leva para a esquerda.

Intervalo e velocidade influenciam a dificuldade de formas diferentes.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Uma avalanche de cactos

**Intenção e objetivo (professor):** Aplicação · Reconhecer o efeito de criar objetos em cada quadro.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Criar o grupo dos cactos

Em Jogo 2D, Muitos, coloque Criar grupo de sprites em Ao iniciar, abaixo do dino. Escreva cactos.

Use esse mesmo nome nos próximos blocos.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Muitos, arrastar "Criar grupo de sprites" para dentro do Ao iniciar, logo ABAIXO do "Criar dinossauro"; trocar o nome para "cactos". (Ele fica sempre abaixo do Criar dinossauro; a partir da Aula 10, abaixo também do "Usar área de colisão".)

**Produção:** aula-05-passo-01: gravar a demonstração "criar o grupo dos cactos" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Fazer o cacto nascer, andar e aparecer

Abaixo do desenho do dino, coloque criar obstáculo do Kit dino, Atualizar o grupo e Desenhar o grupo, de Muitos. Escolha cactos nos três.

Rode por pouco tempo para observar a avalanche.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

dentro do "A cada quadro do jogo", logo abaixo do "Desenhar o sprite dino", encaixar na ordem: "No grupo __ criar obstáculo" (Kit dino, grupo cactos, o resto nos valores de fábrica), "Atualizar (mover) o grupo __" e "Desenhar o grupo __" (Muitos, grupo cactos nos dois). Rodar e mostrar a avalanche.

**Produção:** aula-05-passo-02: gravar a demonstração "fazer o cacto nascer, andar e aparecer" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Rode só um pouco e observe quantos nascem. Essa avalanche faz parte da experiência; você vai organizá-la a seguir.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Crie o grupo cactos em Ao iniciar. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_create_group","area":"start","fields":{"NAME":"cactos"}}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 3. Dê espaço aos obstáculos

**Intenção e objetivo (professor):** Aplicação · Mover o nascimento dos cactos para um relógio separado.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### O relógio

Em Tempo e repetição, coloque A cada segundos ao lado de A cada quadro, dentro de Enquanto estiver rodando. Use 1.4.

Leve somente a criação do cacto para dentro desse relógio.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Tempo e repetição, arrastar "A cada __ segundos fazer" para dentro do Enquanto estiver rodando, AO LADO do "A cada quadro do jogo"; mover o bloco de criar cacto para dentro dele; trocar o 2 por 1.4. Rodar.

**Produção:** aula-05-passo-03: gravar a demonstração "o relógio" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Nascer fora da tela

No cacto, troque x 400 por 560 e vx menos 3 por menos 5. O tamanho fica 44.

Observe que agora ele nasce fora da tela e entra pela direita.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

apontar o cacto materializando perto da borda direita; trocar o x de 400 para 560; depois trocar o vx de -3 para -5. Rodar.

**Produção:** aula-05-passo-04: gravar a demonstração "nascer fora da tela" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Rode outra vez e compare com a avalanche. Agora há uma pausa entre os nascimentos.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Encaixe o relógio de 1,4 segundo em Enquanto estiver rodando. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_every_seconds","area":"loops","inputs":{"SECS":1.4}}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 4. Teste a sua pista

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Testar

Compare vx menos 3 e menos 9 mantendo o relógio. Depois compare intervalos 0.8 e 2.5 mantendo a velocidade.

Volte ao ponto de partida de 1.4 e menos 5 antes de seguir.

**Vídeo planejado:** `video-construir-5-1`

**Na tela (sequência técnica preservada):**

clicar na área do jogo, os cactos vindo da direita, o dino pulando; depois a pausa; na resolução, mexer no vx (-3 e -9) e no tempo do relógio (0.8 e 2.5).

**Produção:** aula-05-passo-05: gravar a demonstração "testar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Os cactos devem nascer espaçados, entrar pela direita e atravessar a pista. Ainda não há derrota ao encostar neles. Envie seu projeto.

Na Aula 6, você vai investigar o que acontece com os cactos que já saíram da tela.

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
- `checar-construir-1`: Confira: criar o grupo dos cactos
- `checar-construir-2`: Confira: fazer o cacto nascer, andar e aparecer
- `checar-construir-3`: Confira: o relógio
- `checar-construir-4`: Confira: nascer fora da tela
- `checar-construir-5`: Confira: testar

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
