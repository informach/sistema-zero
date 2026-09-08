# Um jogo com começo e final

Uma aula, organizada em 11 seções. Público: 9 a 16 anos.

Fonte: `roteiro-aula-dia5-desafio-primeiro-jogo.md`. SHA-256: `4752ff35745d17cd7df1473ed1da40f115a8437a87f3d1b455ecd2c27a1ceb7c`.
O original foi preservado. Este roteiro substitui a sequência didática da aula, sem abrir um curso ou uma área de revisão paralela.

## Estado de entrada e resultado

Continue o jogo do Dia 4, com pontos, três vidas e colisões funcionando.

**Resultado:** Usar condições para separar início, partida, vitória e derrota, e publicar o jogo concluído.

**Ambiente:** o mesmo Estúdio incorporado acompanha as seções. Preservar o projeto inicial, a continuidade e a entrega já configurados na aula.

## 1. A criação de hoje

**Texto para o aluno:**

Oi! Continue o jogo do Dia 4, com pontos, três vidas e colisões funcionando.

Hoje você vai usar condições para separar início, partida, vitória e derrota, e publicar o jogo concluído.

Você pode voltar às seções pelo índice e pedir ajuda ao professor onde surgir a dúvida.

## 2. Descoberta antes da explicação

**Modelo:** html. **Essencial:** sim

**Título:** Pontos antes de começar?

Passe um segundo na tela de início, outro jogando e outro no fim. Compare os dois contadores.

**Interação:** usar o bloco funcional do manifesto. Experimentação e HTML guardam estado; a conclusão essencial usa a conferência nativa no servidor. Não pontuar a velocidade nem descontar por pistas.

**Pistas disponíveis:**

- Observe qual contador aumenta mesmo quando ninguém começou a jogar.

## 3. Explicação após observar

**Texto didático (permanece na seção, sem exigir vídeo):**

O mesmo comando pode fazer coisas diferentes dependendo do momento. Na tela de início, Enter começa a partida; depois de ganhar ou perder, reinicia. A condição Se pergunta em que tela estamos antes de agir. Os relógios de criar asteroides também precisam dessa pergunta, ou podem continuar trabalhando fora da partida. O alvo é uma constante: fica em 26 enquanto os pontos mudam. Chegar ao alvo abre vitória; ficar sem vidas abre fim.

**Condução:** se a criança já percebeu a relação, segue para construir; se ainda não percebeu, pode ler, voltar à experiência ou pedir ajuda. Na gravação prática, retomar apenas a frase necessária para orientar o encaixe.

## Demonstrações e aplicação

Helena narra; a captura mostra uma ação de cada vez. Em arte, Júlio demonstra o desenho dele e as escolhas visuais continuam livres. Cada trecho termina devolvendo a ação ao aluno. A duração é determinada pela demonstração legível, sem acelerar o desenho para cumprir uma meta artificial.

### 1. o alvo e a primeira tela

**Narração revisada:**

Em Programação, Variáveis, crie a constante alvo com 26. Depois, em Jogo 2D, Telas e cenas, coloque Ir para a tela inicio como último bloco de Ao iniciar. Essa será a entrada da partida.

**Na tela (sequência técnica preservada do original):**

categoria "Programação", subcategoria "Variáveis", arrastar "Criar constante" para o Ao iniciar, abaixo do Dar vida (nome "alvo", valor 26). Depois, categoria "Jogo 2D", subcategoria "Telas e cenas", arrastar "Ir para a tela" como último bloco do Ao iniciar, e escrever "inicio".

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-5-passo-01: gravar a demonstração "o alvo e a primeira tela" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 2. fazer a pergunta da tela "jogando"

**Narração revisada:**

Em Programação, Lógica e Se, coloque Se no topo de A cada quadro. Retire a comparação que veio nele. No lugar, encaixe a tela atual é, de Telas e cenas, e escolha jogando.

**Na tela (sequência técnica preservada do original):**

categoria "Programação", subcategoria "Lógica e Se", arrastar "Se" para dentro do A cada quadro do jogo, no topo. Tirar a comparação de fábrica da pergunta e encaixar "a tela atual é" (Telas e cenas), escolhendo "jogando" na listinha.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-5-passo-02: gravar a demonstração "fazer a pergunta da tela "jogando"" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 3. mudar o jogo pra dentro

**Narração revisada:**

Leve a sequência de Limpar a tela até Desenhar as vidas para dentro desse Se. No relógio de 40 quadros, envolva também a criação de asteroides com Se a tela atual é jogando. Confira os dois lugares.

**Na tela (sequência técnica preservada do original):**

arrastar todo o conteúdo do loop (do Limpar a tela ao Desenhar as vidas) para dentro do Se. Depois, no A cada 40 quadros, outro Se com "a tela atual é jogando" (tirando a comparação de fábrica), com o criar asteroide dentro.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-5-passo-03: gravar a demonstração "mudar o jogo pra dentro" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 4. criar a vitória e a derrota

**Narração revisada:**

No fim do Se jogando, compare pontos maior ou igual a alvo e vá para vitoria. Abaixo, faça outra pergunta: as vidas da nave acabaram? Se sim, vá para fim. Confira os nomes de cada tela.

**Na tela (sequência técnica preservada do original):**

no finalzinho do Se "jogando", depois do Desenhar as vidas: um Se (Lógica e Se) com a comparação (Valores) "valor da variável pontos ≥ valor da variável alvo" e, dentro, "Ir para a tela vitoria" (Telas e cenas). Abaixo, outro Se com "as vidas do sprite nave acabaram?" (Vida) e, dentro, "Ir para a tela fim".

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-5-passo-04: gravar a demonstração "criar a vitória e a derrota" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 5. montar as telas de início, de vitória e de derrota

**Narração revisada:**

No Se grande, adicione três senão se: inicio, vitoria e fim. Em cada um, use Mostrar tela, em Telas e cenas. Escolha seus textos e cores; a dica deve dizer que Enter começa ou reinicia, conforme a tela.

**Na tela (sequência técnica preservada do original):**

clicar no "+ senão se" do Se grande três vezes, uma pra cada tela. Em cada senão se: "a tela atual é" (inicio / vitoria / fim) e, dentro, "Mostrar tela" (Telas e cenas) com título, subtítulo, dica e fundo preenchidos.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-5-passo-05: gravar a demonstração "montar as telas de início, de vitória e de derrota" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 6. o Enter comanda o jogo

**Narração revisada:**

Em Controles, adicione o evento da tecla Enter em Quando acontecer. Se estiver em inicio, vá para jogando. Se estiver em fim ou vitoria, use Reiniciar o jogo. Preserve o evento de tiro que já existe.

**Na tela (sequência técnica preservada do original):**

categoria "Jogo 2D", subcategoria "Controles", arrastar "Quando apertar a tecla" para a área Quando acontecer, abaixo do bloco da barra de espaço; escolher Enter. Dentro: Se "a tela atual é inicio" → "Ir para a tela jogando"; + senão se "a tela atual é fim" → "Reiniciar o jogo"; + senão se "a tela atual é vitoria" → "Reiniciar o jogo".

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-5-passo-06: gravar a demonstração "o Enter comanda o jogo" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

### 7. testar do começo ao fim e publicar

**Narração revisada:**

Teste o ciclo inteiro: comece com Enter, perca uma partida, reinicie e tente ganhar outra. Confira o jogo antes de Enviar para o professor. Depois use Compartilhar, escreva o resumo, confira a capa e publique no Mural.

**Na tela (sequência técnica preservada do original):**

jogar o ciclo completo: tela de início, Enter, jogar, perder de propósito, Enter, jogar de novo até ganhar. Depois, Enviar para o professor, botão Compartilhar, resumo, capa e o link do jogo publicado.

**Depois do trecho:** o aluno realiza a etapa, testa e mantém o trabalho no mesmo projeto. A explicação conceitual está na descoberta e no texto anterior; não repetir um monólogo teórico durante a montagem.

**Produção:** dia-5-passo-07: gravar a demonstração "testar do começo ao fim e publicar" conforme roteiro.md; enviar o vídeo e inserir o bloco nesta seção.

## Fechamento e evidência

**Fala / texto de fechamento:**

Antes de publicar, teste início, derrota, vitória e reinício. Confira se uma partida nova começa com zero pontos e três vidas. Abra o link publicado e jogue.

Seu primeiro jogo está pronto. Siga as próximas aulas do curso e confira na Carreira o que sua conclusão e publicação liberaram. O Jogo do Meu Jeito usará o projeto do Dia 5.

**Professor:** observar as relações escolhidas, os parâmetros testados e a aplicação no projeto. Uma previsão diferente é ponto de partida para conversar; não é diagnóstico de dificuldade. Responder ao pedido de ajuda na seção em que ocorreu.

**Conclusão:** cumprir as atividades essenciais e as entregas já configuradas. Assistir ao vídeo inteiro não é requisito. Não adicionar XP, publicação ou desbloqueio ao clicar na experiência.

## Produção e importação

1. Abrir a aula original em rascunho, carregar `manifesto.json`, vincular ao destino e conferir a prévia. Os slugs são rótulos de autoria; o vínculo explícito usa o curso e a aula reais.
2. Preservar os blocos de projeto, os quizzes, anexos e seus IDs. O importador mantém os materiais não referenciados em uma seção final; reposicionar os quizzes e materiais apropriados antes de publicar.
3. Gravar os trechos acima no estado correto do projeto, enviar no uploader Vimeo já existente no admin e posicionar cada novo bloco na seção indicada. Conferir legibilidade, áudio e legendas. Não há arquivo de vídeo novo neste pacote.
4. Remover cada pendência de mídia apenas depois de vincular e conferir o trecho. Fazer a prévia completa e testar a continuidade para a aula seguinte; publicar somente após essa revisão.

Nenhuma URL, mídia ou minutagem foi inventada. Nenhuma aula publicada foi sobrescrita automaticamente.
