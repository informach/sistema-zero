# Tiros que saem da nave

Uma aula, organizada em 4 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia2-desafio-primeiro-jogo.md`. SHA-256: `f86024679543a69d6ac450ee09f6985e2275921c0bf72eb876eec1220036f5e9`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Continue o projeto do Dia 1, com a nave se movendo e as estrelas ao fundo.

**Resultado:** Relacionar a posição da nave, o evento de tecla e a direção da velocidade do tiro.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Para onde o tiro vai? | Resolver a descoberta. |
| Prepare o comando de tiro | Verificar os objetivos do projeto. |
| Faça os tiros voarem | Responder uma pergunta de decisão. |
| Acerte o rumo dos tiros | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Para onde o tiro vai?

**Intenção e objetivo (professor):** Exploração · Relacionar a posição da nave, o evento de tecla e a direção da velocidade do tiro.

**Texto para o aluno:**

Oi de novo! Abra sua nave do Dia 1. Hoje ela vai lançar tiros de onde estiver, mesmo quando você mudar de lugar.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Para onde o tiro vai?**

Modelo: `html`. Critério desta seção.

Teste uma velocidade positiva e outra negativa, mantendo o ponto de partida. Depois explique o que mudou.

**Interação:** usar o bloco funcional incorporado ao manifesto. A observação prepara a pergunta; o experimento não avalia o projeto da criança.

**Pergunta:** Para um tiro subir nessa tela, a velocidade vertical deve ser…

- Positiva
- Negativa
- Sempre zero

**Resposta esperada (professor):** Negativa

**Devolutiva:** O y da tela cresce para baixo; diminuir y move o tiro para cima.

**Pistas:**

- Olhe a seta do eixo y. Ela indica em que direção os valores aumentam.

**Texto para o aluno:**

Uma ação pode esperar um acontecimento: a tecla pressionada. Quando isso acontece, nasce um tiro no lugar em que a nave está agora.

Um grupo reúne todos os tiros para mover, desenhar e remover cada um. Na tela, o eixo y cresce para baixo.

Por isso uma velocidade vertical negativa move o tiro para cima. A velocidade é mudança de posição; não é o lugar onde ele nasce.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Prepare o comando de tiro

**Intenção e objetivo (professor):** Aplicação · Organizar os tiros em um grupo e criar o evento do teclado.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Criar o grupo dos tiros

Em Jogo 2D, abra Muitos. Coloque Criar grupo de sprites em Ao iniciar, abaixo da nave, e escreva tiros.

Esse nome vai ligar os blocos que cuidam dos tiros.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Muitos", arrastar "Criar grupo de sprites" para dentro do Ao iniciar, abaixo do Criar nave; trocar o nome para "tiros".

**Produção:** dia-2-passo-01: gravar a demonstração "criar o grupo dos tiros" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### A área que escuta o teclado

Em Áreas do projeto, coloque Quando acontecer ao lado das outras áreas. Em Jogo 2D, Controles, encaixe Quando apertar a tecla dentro dele e escolha barra de espaço.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

categoria "Áreas do projeto", arrastar "Quando acontecer" para o lado das outras duas áreas. Depois, categoria "Jogo 2D", subcategoria "Controles", arrastar "Quando apertar a tecla" para dentro do Quando acontecer e escolher "barra de espaço" no menu.

**Produção:** dia-2-passo-02: gravar a demonstração "a área que escuta o teclado" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** O espaço ainda pode não lançar nada. Nesta etapa você está preparando quem vai escutar o comando.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Crie o grupo tiros em Ao iniciar. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_create_group","area":"start","fields":{"NAME":"tiros"}}`.

- Encaixe o evento da barra de espaço em Quando acontecer. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_on_key","area":"events","fields":{"KEY":"Space"}}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 3. Faça os tiros voarem

**Intenção e objetivo (professor):** Aplicação · Criar, mover e desenhar tiros ligados à nave.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Fazer o tiro nascer na nave

Em Jogo 2D, Muitos, coloque Criar tiro no grupo dentro do evento. Escolha tiros.

No x encaixe o centro x da nave; no y, a posição y da nave, em Posição e tamanho. Use raio 5 e escolha uma cor.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Muitos", arrastar "Criar tiro no grupo" para dentro do Quando apertar a tecla (grupo "tiros"). No x, encaixar "o centro x do sprite" (Posição e tamanho, selecionar nave); no y, "a posição y do sprite" (Posição e tamanho, selecionar nave); raio 5, escolher a cor.

**Produção:** dia-2-passo-03: gravar a demonstração "fazer o tiro nascer na nave" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### A velocidade e o som do tiro

No tiro, deixe vx em 0 e vy em menos 9. Ele deve subir, como na descoberta.

Em Kit espaço, coloque Tocar som de tiro logo abaixo, no mesmo evento.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

ainda no "Criar tiro no grupo": vx 0, vy -9. Depois, categoria "Jogo 2D", subcategoria "Kit espaço", "Tocar som de tiro" logo abaixo, dentro do Quando apertar a tecla.

**Produção:** dia-2-passo-04: gravar a demonstração "a velocidade e o som do tiro" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Fazer os tiros voarem pela tela

Volte a A cada quadro. Abaixo do desenho da nave, em Muitos, encaixe Atualizar o grupo tiros, Tirar do grupo quem sair da tela e Desenhar o grupo tiros.

O espaço fazer da limpeza fica vazio.

**Vídeo planejado:** `video-construir-5-1`

**Na tela (sequência técnica preservada):**

dentro do "A cada quadro do jogo", abaixo do Desenhar o sprite nave, encaixar na ordem: "Atualizar (mover) o grupo" (Muitos, grupo tiros), "Tirar do grupo quem sair da tela" (Muitos, grupo tiros, espaço do fazer vazio), "Desenhar o grupo" (Muitos, grupo tiros).

**Produção:** dia-2-passo-05: gravar a demonstração "fazer os tiros voarem pela tela" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Atire primeiro parado e depois de mudar a nave de lugar. O tiro precisa nascer junto dela.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** A nave mudou de lugar, mas o tiro nasceu no ponto antigo. O que você investigaria?

- Se o tiro usa a posição atual da nave.
- Se a cor do tiro combina com o fundo.
- Se o som do tiro está mais alto.

**Resposta esperada (professor):** Se o tiro usa a posição atual da nave.

**Devolutiva:** Usar a posição atual liga o nascimento do tiro à nave. Uma posição fixa deixa o tiro sempre no mesmo lugar.

**Pistas:**

- Compare os encaixes de x e y do tiro com os da demonstração.

**Critério configurado:** `checar-construir-3`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 4. Acerte o rumo dos tiros

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Hora de atirar

Mova a nave e aperte espaço de lugares diferentes. O tiro deve nascer junto dela.

Compare vy menos 9 e menos 15: confirme o número clicando fora do campo antes de testar.

**Vídeo planejado:** `video-construir-6-1`

**Na tela (sequência técnica preservada):**

clicar na área do jogo, apertar a barra de espaço várias vezes, andar com as setas e atirar de posições diferentes. Depois demonstrar os três passinhos bem devagar, com o vy: trocar menos 9 por menos 15, **clicar num espaço vazio da área dos blocos** (mostrando que é esse clique que confirma), e só então clicar na área do jogo e testar. Vale mostrar de propósito o erro de clicar direto no jogo sem ter clicado fora antes, pra criança ver o jogo continuar com o valor antigo.

**Produção:** dia-2-passo-06: gravar a demonstração "hora de atirar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Atire da esquerda, do centro e da direita. Os tiros devem acompanhar a nave, subir e sair da tela. Confira os nomes do grupo e envie seu projeto.

No Dia 3, os tiros vão encontrar asteroides.

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
- `checar-construir-1`: Confira: criar o grupo dos tiros
- `checar-construir-2`: Confira: a área que escuta o teclado
- `checar-construir-4`: Confira: a velocidade e o som do tiro
- `checar-construir-5`: Confira: fazer os tiros voarem pela tela
- `checar-construir-6`: Confira: hora de atirar

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
