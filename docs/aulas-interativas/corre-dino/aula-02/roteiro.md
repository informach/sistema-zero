# O Dino aparece e corre

Uma aula, organizada em 3 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-02-corre-dino.md`. SHA-256: `c93882dd5de5ee1c27966f6c98e86bf301e5066acc3d059cf1c07cf38a8bd2a1`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Retome o projeto da Aula 1: tela preparada e dino criado, ainda sem aparecer.

**Resultado:** Organizar a ordem de desenho em cada quadro e reconhecer o efeito das camadas.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Quem fica na frente? | Resolver a descoberta. |
| Tire o Dino do esconderijo | Verificar os objetivos do projeto. |
| Uma corrida no seu ritmo | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Quem fica na frente?

**Intenção e objetivo (professor):** Exploração · Organizar a ordem de desenho em cada quadro e reconhecer o efeito das camadas.

**Texto para o aluno:**

Oi de novo! Seu Dino já está guardado no projeto. Agora vamos fazê-lo aparecer e ver a floresta passar.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Quem fica na frente?**

Modelo: `sequence`. Critério desta seção.

Ordene as ações para mostrar o dino na frente da floresta, sem rastros do quadro anterior.

**Peças:** Desenhar o dino · Limpar a tela · Desenhar a floresta

**Ordem para o professor:** Limpar a tela → Desenhar a floresta → Desenhar o dino

**Pistas:**

- O fundo precisa aparecer antes do personagem; a limpeza precisa acontecer antes dos desenhos.

**Texto para o aluno:**

Imagine desenhar um personagem num papel e depois cobri-lo com outro papel de floresta. Ele continua lá, mas fica escondido.

No jogo, a ordem de desenho produz esse efeito: quem é desenhado por último aparece por cima. A cada quadro, limpamos e desenhamos de novo.

O dino parece correr enquanto o fundo passa; o movimento percebido pode vir do cenário, mesmo quando a posição horizontal do personagem muda pouco.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Tire o Dino do esconderijo

**Intenção e objetivo (professor):** Aplicação · Desenhar o personagem a cada quadro e observar a ordem das camadas.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Ligar o motor do jogo

Em Áreas do projeto, coloque Enquanto estiver rodando ao lado de Ao iniciar. Em Jogo 2D, Tempo e repetição, encaixe A cada quadro do jogo dentro dele.

Esse será o motor do desenho.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

primeiro a categoria "Áreas do projeto": pegar o bloco "Enquanto estiver rodando" e soltar ao lado do "Ao iniciar", com um espacinho, mostrando que ficam lado a lado e nunca uma dentro da outra. Depois Jogo 2D › Tempo e repetição, arrastar "A cada quadro do jogo" para dentro dela, ainda vazia.

**Produção:** aula-02-passo-01: gravar a demonstração "ligar o motor do jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Desenhar o mundo

Em Sprites, comece com Desenhar o sprite e escolha dino. Em Aparência, encaixe Limpar a tela no topo.

Em Kit dino, experimente colocar a floresta depois do dino: ele some. Mova a floresta para antes dele.

Use velocidade 5 e remova só o bloco da borda, preservando os vizinhos.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

(no fim da Parte, a sequência das ferramentas: arrastar o "Mostrar a borda da tela" pra lixeira do jeito normal e mostrar os três blocos indo junto; apertar Ctrl+Z e mostrar os três voltando; depois botão direito no bloco, menu de contexto aberto, escolher "Apagar este bloco" e mostrar a pilha se fechando sozinha). Dentro do "A cada quadro do jogo", encaixar primeiro só "Desenhar o sprite dino" (Sprites, trocando "jogador" por "dino") e rodar; depois encaixar "Limpar a tela" (Aparência) no topo; depois encaixar "Desenhar fundo de floresta" (Kit dino, trocar 4 por 5) **abaixo** do dino, de propósito, e rodar (o dino some); por fim mover a floresta para o meio, na ordem certa.

**Produção:** aula-02-passo-02: gravar a demonstração "desenhar o mundo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Experimente a floresta depois do Dino e depois antes dele. Qual ordem deixa o personagem à vista?

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Desenhe o sprite dino dentro de A cada quadro do jogo. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_draw_sprite","area":"loops","fields":{"SPRITE":"dino"},"withinBlock":"sz_g2d_update_each_frame"}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 3. Uma corrida no seu ritmo

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Testar e deixar do seu jeito

Clique no jogo e observe a floresta passando. Teste velocidades 2 e 9 para o fundo.

Compare a sensação de corrida e escolha seu ritmo. Se apagar uma pilha sem querer, use Ctrl+Z; para remover um bloco isolado, use Apagar este bloco no botão direito.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

clicar na área do jogo; a floresta passa e o dino corre; depois trocar a velocidade da floresta de 5 para 2 e para 9, e voltar para a escolhida.

**Produção:** aula-02-passo-03: gravar a demonstração "testar e deixar do seu jeito" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Confirme a ordem limpar, floresta e dino. O personagem precisa aparecer por cima do cenário, sem rastros. Envie o projeto.

Na Aula 3, o dino vai responder ao pulo e voltar ao chão.

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
- `checar-construir-1`: Confira: ligar o motor do jogo
- `checar-construir-2`: Confira: desenhar o mundo
- `checar-construir-3`: Confira: testar e deixar do seu jeito

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
