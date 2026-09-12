# Os seus asteroides entram no jogo

Uma aula, organizada em 3 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-07-o-jogo-do-meu-jeito.md`. SHA-256: `8c6a62c7bee3bb50f7fb44aa1422d8bf18ed5744b6962819d43009532f7cfaf6`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Seu projeto livre usa a nave própria. O recurso asteroide já foi trazido do Pinta e ainda falta trocar a criação dos obstáculos.

**Resultado:** Substituir um recurso mantendo o grupo, as posições e as regras que já fazem o jogo funcionar.

**Ambiente:** ferramentas externas e galeria próprias; voltar a esta aba para continuar. Não incorporar um Estúdio ou Pinta completo nesta aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Troque sem perder a configuração | Resolver a descoberta. |
| Troque a pedra sem perder a chuva | Responder uma pergunta de decisão. |
| Cada pedra ganha movimento | Responder uma pergunta de decisão. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Troque sem perder a configuração

**Intenção e objetivo (professor):** Exploração · Substituir um recurso mantendo o grupo, as posições e as regras que já fazem o jogo funcionar.

**Texto para o aluno:**

Oi! Sua nave já tem a sua arte. Agora os asteroides vão ganhar seus desenhos sem perder a chuva e as colisões.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Troque sem perder a configuração**

Modelo: `sequence`. Critério desta seção.

Organize a substituição do bloco que cria os asteroides, preservando o sorteio e os campos.

**Peças:** Apagar o bloco antigo depois de conferir · Montar o novo bloco com os campos corretos · Transferir o sorteio de x e comparar as configurações

**Ordem para o professor:** Montar o novo bloco com os campos corretos → Transferir o sorteio de x e comparar as configurações → Apagar o bloco antigo depois de conferir

**Pistas:**

- O bloco antigo ajuda a conferir o novo antes de ser removido.

**Texto para o aluno:**

O desenho e o comportamento são partes que se conectam. Um asteroide com sua arte pode continuar no mesmo grupo e receber a mesma posição e velocidade.

Aqui, preparar o bloco novo antes de apagar o antigo permite reaproveitar o sorteio de x e conferir os campos. Não deixe as duas criações executando juntas ao finalizar, ou a chuva dobra.

Cada novo asteroide precisa receber a animação quando nasce.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. Troque a pedra sem perder a chuva

**Intenção e objetivo (professor):** Aplicação · Preservar grupo, sorteio e movimento na substituição do recurso.

**Ferramenta externa:** Estúdio livre. Orientar a alternância de abas e o retorno à aula. O sistema não verifica automaticamente essa criação externa.

**Narração revisada / instruções disponíveis em texto:**

### Preparar a folha do asteroide

Abra o mesmo jogo no Estúdio. Em Jogo 2D, Animação, prepare folha-asteroide usando a imagem asteroide e quadros 64 por 64.

A folha da nave continua como está.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

abrir o Estúdio pelo menu da esquerda e **clicar no cartão do projeto do jogo da nave**.
Na coluna da esquerda, **clicar em Jogo 2D e clicar na subcategoria Animação**. Arrastar mais um
"Carregar folha de quadros __ da imagem __ com quadros de __ x __ px" para a área Ao iniciar,
encaixando entre o "Animar sprite nave" e o "Criar grupo de sprites tiros". Escrever `folha-asteroide`
no nome da folha, escolher `asteroide` na gradezinha da imagem e **trocar os dois 32 por 64**. Cortar
para a área do jogo e mostrar, sem pressa, que nada
mudou: os asteroides continuam cinzas.

**Produção:** aula-07-passo-01: gravar a demonstração "preparar a folha do asteroide" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Trocar o bloco que cria os asteroides

No relógio A cada 40 quadros, prepare a criação nova antes de apagar a do kit. Use o grupo asteroides, nome asteroide, y menos 30, largura 40, altura 40, vx 0 e vy 3.

Transfira o sorteio de x, confira os campos e só então remova a criação antiga.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

rolar até a área Enquanto estiver rodando e achar o "A cada 40 quadros", ao lado do
"A cada quadro do jogo". Dentro dele, o "Se a tela atual é jogando", e dentro dele o bloco velho do
Kit espaço. Dar zoom nos campos dele para mostrar que não existe campo de imagem. Ir na coluna da
esquerda, **clicar em Jogo 2D e clicar na subcategoria Muitos** e apontar o bloco **"No grupo __
criar um sprite chamado __ ... com imagem __ vx __ vy __"**, percorrendo o rótulo dele até o
**"com imagem"**. Arrastar o novo para dentro do "Se a tela atual é jogando", logo abaixo do bloco
velho. Arrastar a pecinha "um x aleatório na tela" de dentro do bloco velho para o campo x do bloco
novo, e **dar zoom no campo do bloco velho, que fica sem ela**. Preencher os outros campos. Mostrar a área do jogo com asteroides cinzas
nascendo todos no mesmo ponto e asteroides dela caindo espalhados ao mesmo tempo. Só então clicar
com o botão direito no bloco velho e apagar.

**Produção:** aula-07-passo-02: gravar a demonstração "trocar o bloco que cria os asteroides" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Prepare a criação nova, confira os valores e remova a antiga. Rode só depois de conferir a troca.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Depois da troca, nasceram dois asteroides por vez. O que investigar?

- Se a folha da nave tem dois quadros.
- Se a capa do jogo foi alterada.
- Se as duas criações, antiga e nova, ficaram executando.

**Resposta esperada (professor):** Se as duas criações, antiga e nova, ficaram executando.

**Devolutiva:** Duas criações no mesmo relógio podem dobrar a chuva. Preserve a nova e remova a antiga depois de conferir os dados.

**Pistas:**

- Conte quantos blocos de criação ficaram dentro do relógio.

**Critério configurado:** `checar-construir-2`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Cada pedra ganha movimento

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. A pergunta verifica compreensão, sem avaliar automaticamente o trabalho externo.

**Ferramenta externa:** Estúdio livre. Orientar a alternância de abas e o retorno à aula. O sistema não verifica automaticamente essa criação externa.

**Narração revisada / instruções disponíveis em texto:**

### Fazer os asteroides girarem

Em Animação, faça o asteroide que acabou de nascer usar girando, do quadro 0 ao 1 a 8 fps, com folha-asteroide. Teste vários nascimentos.

Cada objeto novo deve aparecer animado e continuar reagindo aos tiros e à nave.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

na coluna da esquerda, **clicar em Jogo 2D e clicar na subcategoria Animação**, arrastar outro
"Animar sprite __ com a folha __ na animação __, do quadro __ ao __ a __ fps" para dentro do
"Se a tela atual é jogando", logo abaixo do bloco "No grupo asteroides criar um sprite chamado
asteroide". Escolher `asteroide` na listinha do sprite e `folha-asteroide` na listinha da folha (que
agora tem duas, `folha-nave` e `folha-asteroide`), abrir a listinha da animação e escolher
`girando`, com zoom nos três campos seguintes se preenchendo sozinhos. Clicar na área do jogo,
apertar Enter e jogar por alguns segundos, com zoom na nave e nos asteroides girando. Enquanto a
narração fala do editar desenho, abrir o
menu de três pontinhos, o título Exibição, o item "Imagens", dar um close no "✏️ editar desenho" de
um dos cards **sem clicar nele**, e **fechar a modal no "Fechar"** antes do Fecho.

**Produção:** aula-07-passo-03: gravar a demonstração "fazer os asteroides girarem" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Confira um único nascimento por disparo do relógio, a queda, a animação, os acertos e as vidas. A nave e os asteroides agora têm sua arte, com as regras do jogo preservadas.

Na Aula 8, você publica essa versão e aprende uma rotina para continuar criando fora dos cursos.

Depois de conferir o salvamento, volte a esta aba para a pergunta final. Na próxima aula você continua o trabalho guardado na ferramenta.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Só o primeiro asteroide animou. Quando configurar a animação de cada um?

- Quando cada novo asteroide nasce.
- Só uma vez antes de criar qualquer asteroide.
- Só depois que o asteroide sai da tela.

**Resposta esperada (professor):** Quando cada novo asteroide nasce.

**Devolutiva:** A configuração deve alcançar cada objeto novo. Confira folha-asteroide, girando, quadros 0 e 1, e teste vários nascimentos.

**Pistas:**

- Cada nascimento cria outro objeto no grupo.

**Critério configurado:** `checar-fechamento`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## Cadastro e validação em staging

1. Abra a aula correspondente no admin de staging. Importe `manifesto.json` no rascunho com **Vincular ao destino aberto** e confira a prévia. Preserve a configuração do Estúdio existente e sua cadeia, quando houver.

2. Confira o quadro de critérios de cada seção. Os nomes acima correspondem ao manifesto. Cada vídeo mantém a chave original: reimportar preserva mídias já vinculadas. Vincule e confira os vídeos planejados pelo uploader Vimeo.

3. Se uma versão anterior deste pacote já foi importada, retire do rascunho os cartões antigos listados abaixo. O importador preserva blocos omitidos e pode levá-los ao fechamento; omitir uma chave no arquivo não apaga o cartão antigo. Confira quizzes e entregas existentes separadamente para manter apenas as exigências intencionais.

4. Use a prévia para revisar apresentação e continuidade. Para testar bloqueios, publique apenas em staging e entre com um perfil de aluno de teste sem conclusão anterior. A prévia navega livremente e marcos concluídos são preservados.

5. Tente uma resposta incorreta ou um projeto sem o requisito, confira o bloqueio e depois cumpra o critério. Verifique liberação, retorno, recarga e continuidade para a próxima aula. Em uma etapa com vários objetivos, cumprir só um não deve liberar.

**Cartões antigos a retirar após reimportação:**

- `checar-comeco`: Confira: A criação de hoje
- `checar-entenda`: Confira: O que aconteceu?
- `checar-construir-1`: Confira: preparar a folha do asteroide
- `checar-construir-3`: Confira: fazer os asteroides girarem

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
