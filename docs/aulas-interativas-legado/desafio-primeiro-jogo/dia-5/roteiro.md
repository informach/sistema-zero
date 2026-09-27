# Um jogo com começo e final

Uma aula, organizada em 5 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia5-desafio-primeiro-jogo.md`. SHA-256: `4752ff35745d17cd7df1473ed1da40f115a8437a87f3d1b455ecd2c27a1ceb7c`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Continue o jogo do Dia 4, com pontos, três vidas e colisões funcionando.

**Resultado:** Usar condições para separar início, partida, vitória e derrota, e publicar o jogo concluído.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## Percurso e ritmo

Cada seção reúne ações que chegam a uma pequena conquista. Não fazer uma prova depois de cada clique. A criança pode consultar o texto, pausar o vídeo, pedir uma pista e tentar novamente. Cores, formas e outros detalhes livres não são critérios de aprovação.

| Etapa | O que libera o avanço |
| --- | --- |
| Pontos antes de começar? | Resolver a descoberta. |
| A partida espera você | Responder uma pergunta de decisão. |
| Dê um final para cada partida | Responder uma pergunta de decisão. |
| O convite para jogar de novo | Verificar os objetivos do projeto. |
| Jogue e mostre sua criação | Enviar o projeto; atingir a nota automática se o Estúdio exigir. |

## Orientações de produção e acessibilidade

Helena narra; nas aulas de arte, Júlio demonstra as escolhas dele. Mostrar uma ação por vez e devolver o controle à criança. Nomear ferramenta, categoria e encaixe. Manter texto e legendas legíveis, sem exigir rapidez, precisão de arraste ou áudio para compreender a orientação. Nas ordenações, demonstrar também os botões de mover as peças. Não usar somente cor para indicar o que mudou.

Convidar a prever, testar e ajustar. Mostrar o erro e sua recuperação com calma. Se um trecho ficar longo, a criança pode pausar entre os passos da mesma seção; não precisa passar por outra pergunta para cada pausa. As alternativas e gabaritos abaixo orientam a produção, não são texto para revelar antes da resposta.

## 1. Pontos antes de começar?

**Intenção e objetivo (professor):** Exploração · Usar condições para separar início, partida, vitória e derrota, e publicar o jogo concluído.

**Texto para o aluno:**

Oi! Seu jogo já tem tiros, pontos e vidas. Hoje você vai dar a ele uma entrada, um final e o convite para jogar de novo.

Você pode fazer uma pausa, voltar às etapas concluídas e usar Preciso de ajuda. Não precisa acertar de primeira.

**Atividade: Pontos antes de começar?**

Modelo: `html`. Critério desta seção.

Passe um segundo na tela de início, outro jogando e outro no fim. Compare os dois contadores.

**Interação:** usar o bloco funcional incorporado ao manifesto. A observação prepara a pergunta; o experimento não avalia o projeto da criança.

**Pergunta:** Qual regra mantém a contagem dentro da partida?

- Somar sempre que o relógio passa
- Somar somente se a tela atual é jogando
- Somar ao desenhar a tela de início

**Resposta esperada (professor):** Somar somente se a tela atual é jogando

**Devolutiva:** A condição limita a ação ao momento em que ela faz sentido.

**Pistas:**

- Observe qual contador aumenta mesmo quando ninguém começou a jogar.

**Texto para o aluno:**

O mesmo comando pode fazer coisas diferentes dependendo do momento. Na tela de início, Enter começa a partida; depois de ganhar ou perder, reinicia.

A condição Se pergunta em que tela estamos antes de agir. Os relógios de criar asteroides também precisam dessa pergunta, ou podem continuar trabalhando fora da partida.

O alvo é uma constante: fica em 26 enquanto os pontos mudam. Chegar ao alvo abre vitória; ficar sem vidas abre fim.

**Critério configurado:** `descoberta`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 2. A partida espera você

**Intenção e objetivo (professor):** Aplicação · Proteger ações e criação de asteroides com a condição da tela jogando.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### O alvo e a primeira tela

Em Programação, Variáveis, crie a constante alvo com 26. Depois, em Jogo 2D, Telas e cenas, coloque Ir para a tela inicio como último bloco de Ao iniciar.

Essa será a entrada da partida.

**Vídeo planejado:** `video-construir-1-1`

**Na tela (sequência técnica preservada):**

categoria "Programação", subcategoria "Variáveis", arrastar "Criar constante" para o Ao iniciar, abaixo do Dar vida (nome "alvo", valor 26). Depois, categoria "Jogo 2D", subcategoria "Telas e cenas", arrastar "Ir para a tela" como último bloco do Ao iniciar, e escrever "inicio".

**Produção:** dia-5-passo-01: gravar a demonstração "o alvo e a primeira tela" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Fazer a pergunta da tela "jogando"

Em Programação, Lógica e Se, coloque Se no topo de A cada quadro. Retire a comparação que veio nele.

No lugar, encaixe a tela atual é, de Telas e cenas, e escolha jogando.

**Vídeo planejado:** `video-construir-2-1`

**Na tela (sequência técnica preservada):**

categoria "Programação", subcategoria "Lógica e Se", arrastar "Se" para dentro do A cada quadro do jogo, no topo. Tirar a comparação de fábrica da pergunta e encaixar "a tela atual é" (Telas e cenas), escolhendo "jogando" na listinha.

**Produção:** dia-5-passo-02: gravar a demonstração "fazer a pergunta da tela "jogando"" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Mudar o jogo pra dentro

Leve a sequência de Limpar a tela até Desenhar as vidas para dentro desse Se. No relógio de 40 quadros, envolva também a criação de asteroides com Se a tela atual é jogando.

Confira os dois lugares.

**Vídeo planejado:** `video-construir-3-1`

**Na tela (sequência técnica preservada):**

arrastar todo o conteúdo do loop (do Limpar a tela ao Desenhar as vidas) para dentro do Se. Depois, no A cada 40 quadros, outro Se com "a tela atual é jogando" (tirando a comparação de fábrica), com o criar asteroide dentro.

**Produção:** dia-5-passo-03: gravar a demonstração "mudar o jogo pra dentro" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Rode sem começar a partida. Ela pode parecer vazia por enquanto; as telas vêm nos próximos passos.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Os asteroides já nascem antes de apertar Enter. Onde pode faltar Se a tela é jogando?

- No tamanho dos corações.
- Dentro do relógio que cria asteroides.
- Na escolha da cor do título.

**Resposta esperada (professor):** Dentro do relógio que cria asteroides.

**Devolutiva:** Proteger só o desenho não impede o relógio de criar objetos. A criação também precisa verificar se a partida começou.

**Pistas:**

- O desenho e o relógio de criação trabalham em lugares diferentes.

**Critério configurado:** `checar-construir-3`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 3. Dê um final para cada partida

**Intenção e objetivo (professor):** Aplicação · Distinguir condições de vitória e derrota e comunicar o próximo comando.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Criar a vitória e a derrota

No fim do Se jogando, compare pontos maior ou igual a alvo e vá para vitoria. Abaixo, faça outra pergunta: as vidas da nave acabaram?

Se sim, vá para fim. Confira os nomes de cada tela.

**Vídeo planejado:** `video-construir-4-1`

**Na tela (sequência técnica preservada):**

no finalzinho do Se "jogando", depois do Desenhar as vidas: um Se (Lógica e Se) com a comparação (Valores) "valor da variável pontos ≥ valor da variável alvo" e, dentro, "Ir para a tela vitoria" (Telas e cenas). Abaixo, outro Se com "as vidas do sprite nave acabaram?" (Vida) e, dentro, "Ir para a tela fim".

**Produção:** dia-5-passo-04: gravar a demonstração "criar a vitória e a derrota" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Narração revisada / instruções disponíveis em texto:**

### Montar as telas de início, de vitória e de derrota

No Se grande, adicione três senão se: inicio, vitoria e fim. Em cada um, use Mostrar tela, em Telas e cenas.

Escolha seus textos e cores; a dica deve dizer que Enter começa ou reinicia, conforme a tela.

**Vídeo planejado:** `video-construir-5-1`

**Na tela (sequência técnica preservada):**

clicar no "+ senão se" do Se grande três vezes, uma pra cada tela. Em cada senão se: "a tela atual é" (inicio / vitoria / fim) e, dentro, "Mostrar tela" (Telas e cenas) com título, subtítulo, dica e fundo preenchidos.

**Produção:** dia-5-passo-05: gravar a demonstração "montar as telas de início, de vitória e de derrota" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Escolha seus títulos e cores. Deixe a dica de Enter legível em todas as telas.

**Atividade: Uma decisão para continuar**

Modelo: `checkpoint`. Critério desta seção.

Escolha uma resposta. Se precisar, consulte a explicação ou use uma pista e tente de novo.

**Pergunta:** Você quer abrir vitória quando chegar ao alvo. Que comparação usar?

- Pontos maior ou igual a alvo.
- Pontos igual a zero.
- Vidas igual a zero.

**Resposta esperada (professor):** Pontos maior ou igual a alvo.

**Devolutiva:** Chegar ao alvo abre vitória. Ficar sem vidas abre fim. As duas perguntas cuidam de resultados diferentes.

**Pistas:**

- O alvo é a meta de pontos; as vidas indicam outra coisa.

**Critério configurado:** `checar-construir-4`. A resposta é corrigida pelo sistema; a criança pode consultar as pistas e tentar de novo.

## 4. O convite para jogar de novo

**Intenção e objetivo (professor):** Aplicação · Reiniciar o estado da partida pelo evento de Enter.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### O Enter comanda o jogo

Em Controles, adicione o evento da tecla Enter em Quando acontecer. Se estiver em inicio, vá para jogando.

Se estiver em fim ou vitoria, use Reiniciar o jogo. Preserve o evento de tiro que já existe.

**Vídeo planejado:** `video-construir-6-1`

**Na tela (sequência técnica preservada):**

categoria "Jogo 2D", subcategoria "Controles", arrastar "Quando apertar a tecla" para a área Quando acontecer, abaixo do bloco da barra de espaço; escolher Enter. Dentro: Se "a tela atual é inicio" → "Ir para a tela jogando"; + senão se "a tela atual é fim" → "Reiniciar o jogo"; + senão se "a tela atual é vitoria" → "Reiniciar o jogo".

**Produção:** dia-5-passo-06: gravar a demonstração "o Enter comanda o jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

**Sua vez:** Perca uma partida e use Enter. Confira se os pontos e as vidas voltam ao começo.

Depois, use **Verificar esta etapa**. A conferência olha os blocos pedidos. Rode o jogo também para observar o resultado.

**Critérios configurados em Para liberar a próxima seção:** todos os objetivos abaixo precisam passar no mesmo projeto.

- Encaixe Reiniciar o jogo no evento de tecla, em Quando acontecer. Regra de cadastro: `{"type":"usesBlock","blockType":"sz_g2d_restart","area":"events","withinBlock":"sz_g2d_on_key"}`.

**Limite da conferência:** comprova a estrutura pedida, não executa a partida nem avalia sua qualidade. A observação sugerida na etapa continua necessária para aprender.

## 5. Jogue e mostre sua criação

**Intenção e objetivo (professor):** Fechamento · Testar e guardar a criação, reconhecendo o próximo passo. Conferir a entrega configurada no Estúdio.

**Ferramenta:** continuar o mesmo Estúdio incorporado. Não criar outra entrega entre os passos.

**Narração revisada / instruções disponíveis em texto:**

### Testar do começo ao fim e publicar

Teste o ciclo inteiro: comece com Enter, perca uma partida, reinicie e tente ganhar outra. Confira se uma partida nova volta a zero pontos e três vidas.

Na seção de fechamento, envie ao professor e depois use Compartilhar para publicar no Mural.

**Vídeo planejado:** `video-construir-7-1`

**Na tela (sequência técnica preservada):**

jogar o ciclo completo: tela de início, Enter, jogar, perder de propósito, Enter, jogar de novo até ganhar. Mostrar a checagem da etapa; a entrega e o compartilhamento serão feitos no fechamento.

**Produção:** dia-5-passo-07: gravar a demonstração "testar do começo ao fim e publicar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

**Texto para o aluno:**

Antes de publicar, teste início, derrota, vitória e reinício. Confira se uma partida nova começa com zero pontos e três vidas. Abra o link publicado e jogue.

Seu primeiro jogo está pronto. Siga as próximas aulas do curso e confira na Carreira o que sua conclusão e publicação liberaram. O Jogo do Meu Jeito usará o projeto do Dia 5.

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
- `checar-construir-1`: Confira: o alvo e a primeira tela
- `checar-construir-2`: Confira: fazer a pergunta da tela "jogando"
- `checar-construir-5`: Confira: montar as telas de início, de vitória e de derrota
- `checar-construir-6`: Confira: o Enter comanda o jogo
- `checar-construir-7`: Confira: testar do começo ao fim e publicar

A retirada acontece no rascunho; o histórico persistido não deve ser apagado. Nenhum manifesto desta pasta foi aplicado automaticamente ao staging ou à produção por esta revisão.
