# Cada coisa na sua tela

Uma aula, organizada em 3 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-07-corre-dino.md`. SHA-256: `7f3962d0ac9c56eae11ecd55631ff082d2ff03e8de476014f204f07b47ba9db5`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

O projeto vem da Aula 6 com limpeza dos cactos e sem o contador de diagnóstico.

**Resultado:** Usar uma condição para executar a partida somente na tela jogando.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| O relógio espera a partida? | Resolver a descoberta. |
| A floresta espera a partida | Responder uma pergunta de decisão. |
| Confira a espera do jogo | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. O relógio espera a partida?

**Intenção e objetivo (professor):** Exploração · Usar uma condição para executar a partida somente na tela jogando.

**Texto para o aluno:**

Oi! Vamos ensinar o jogo a esperar pelo jogador. No fim de hoje, só a floresta deve aparecer. Esse é o plano!

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: O relógio espera a partida?**

Modelo: `html`. Critério desta seção.

Teste o relógio em início e em jogando. Observe por que uma ação repetida também precisa de uma condição.

**Interação:** usar o bloco funcional incorporado ao manifesto. A observação prepara a pergunta; o experimento não avalia o projeto da criança.

**Pergunta:** Um relógio fora da condição pode executar antes da partida?

- Pode; ele precisa perguntar se a tela é jogando
- Não; todos os relógios já sabem a tela

**Resposta esperada (professor):** Pode; ele precisa perguntar se a tela é jogando

**Devolutiva:** A condição precisa proteger cada ação que depende do estado da partida.

**Pistas:**

- Compare o contador sem condição quando a tela ainda está em início.

**Texto para o aluno:**

Uma condição é uma pergunta que o programa faz antes de agir. A tela atual guarda em que momento estamos.

Podemos manter a floresta desenhando e deixar as ações da partida dentro de Se a tela é jogando. O relógio que cria cactos também precisa dessa proteção.

Mover uma sequência para dentro de uma condição muda quando ela funciona, sem reconstruir seus blocos. O resultado de hoje pode parecer vazio: é a partida esperando para começar.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. A floresta espera a partida

**Intenção e objetivo (professor):** Aplicação · Condicionar tanto a atualização quanto o relógio de criação à tela jogando.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Dizer em qual tela o jogo abre

Em Jogo 2D, Telas e cenas, coloque Ir para a tela em Ao iniciar, como último bloco. Escolha inicio.

Agora o jogo sabe em qual tela começa.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

Jogo 2D › Telas e cenas, arrastar "Ir para a tela" como último bloco do Ao iniciar, logo abaixo do "Criar grupo de sprites", com "inicio" escolhido na listinha.

**Produção:** aula-07-passo-01: gravar a demonstração "dizer em qual tela o jogo abre" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### A pergunta da tela "jogando"

Em Programação, Lógica e Se, coloque Se depois de Desenhar fundo de floresta. Retire a comparação que veio nele e encaixe a tela atual é, de Telas e cenas.

Escolha jogando.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

Programação › Lógica & Se, arrastar o "Se" para dentro do "A cada quadro do jogo", logo abaixo do "Desenhar fundo de floresta"; tirar a comparação de fábrica e jogar na lixeira; encaixar "a tela atual é" (Jogo 2D › Telas e cenas) no lugar e escolher "jogando".

**Produção:** aula-07-passo-02: gravar a demonstração "a pergunta da tela "jogando"" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Mudar o jogo pra dentro

Arraste a sequência a partir de Aplicar a gravidade para dentro do Se: são seis blocos. Limpar a tela e a floresta ficam fora.

Envolva também a criação do relógio de 1.4 com Se a tela é jogando. Preserve o evento de pulo.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

arrastar do "Aplicar a gravidade do mundo" para baixo (6 blocos) para dentro do Se; o Limpar a tela e o fundo de floresta ficam FORA. Cartela na tela com o nome da manobra e as 4 etapas do "embrulhar no Se". Depois, repetir a manobra uma vez: envolver o conteúdo do relógio de 1.4 s num "Se a tela atual é jogando". Mostrar o evento do pulo intacto, sem mexer nele, enquanto explica por que ele não precisa. No fim, rodar e ficar só a floresta.

**Produção:** aula-07-passo-03: gravar a demonstração "mudar o jogo pra dentro" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Confira os dois lugares protegidos pelo Se: as ações de cada quadro e o nascimento dos cactos.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Você protegeu o desenho com Se jogando, mas o relógio ficou de fora. O que pode acontecer?

- Ele vai esperar só porque o Dino não aparece.
- Ele passa a funcionar apenas quando alguém pula.
- Ele pode criar cactos enquanto a partida ainda espera.

**Resposta esperada (professor):** Ele pode criar cactos enquanto a partida ainda espera.

**Devolutiva:** A condição precisa proteger também a criação. Nesta aula, ficar só com a floresta é o resultado esperado.

**Pistas:**

- O relógio pode executar mesmo quando os objetos não são desenhados.

**Critério configurado:** `checar-construir-3`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Confira a espera do jogo

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Texto para o aluno:**

Ao recarregar, deve aparecer só a floresta. Confira os dois Se e os blocos que ficaram dentro. A partida ainda não tem comando de início; isso chega na próxima aula. Envie.

Na Aula 8, a tela de início vai convidar o jogador e permitir que ele comece.

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
- `checar-construir-1`: Confira: dizer em qual tela o jogo abre
- `checar-construir-2`: Confira: a pergunta da tela "jogando"

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
