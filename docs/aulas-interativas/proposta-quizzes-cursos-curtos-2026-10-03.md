# Quiz de encerramento dos cursos curtos

**03/10/2026 · Aprovado e implementado nos geradores e manifestos locais.** Abrange Cadê Todo Mundo? e Desafio do Primeiro Jogo · A Chave do Farol. Este é o quiz pedagógico respondido pela criança; não é o quiz comercial respondido pelo responsável no funil.

## Recomendação

Um quiz por curso, na última aula, em uma seção imediatamente anterior à seção do certificado. Cadê Todo Mundo recebe três perguntas; Farol, quatro. A diferença acompanha as construções de cada curso, não uma regra fixa por duração.

A criança já montou, testou e enviou o jogo. O quiz serve para retomar por que ele funciona e revelar alguma confusão que o projeto pronto sozinho não mostra. Não deve cobrar nomes de menus, decorar nomes dos blocos, rapidez ou conceitos que não foram ensinados.

Fluxo: **jogo construído e publicação ensinada → seção de quiz → seção do certificado**. O quiz não substitui a verificação do projeto nem torna publicação obrigatória para emitir o certificado. Cada pergunta trata de uma situação e tem três alternativas, uma correta e uma explicação após a resposta enviada.

Na seção do quiz, somente Zappy e quiz, conforme o [briefing](BRIEFING.md) e a [especificação](ESPEC-MANIFESTO.md). Não acrescentar vídeo, Estúdio ou aula nova. A seção do certificado conserva o vídeo de celebração, a ponte e a emissão existentes. Organização dos cursos, cadernos, roteiros, geradores e testes acompanham esta revisão.

## Cadê Todo Mundo?

**Título da seção:** Como o seu jardim funciona

**Zappy:** Você fez os personagens aparecerem e ensinou o jogo a contar. Agora vamos relembrar essas regras com três perguntas. Se errar alguma, leia o porquê, clique em Tentar de novo! e responda outra vez.

### 1. A reação ao toque

**Pergunta:** Você toca em um esconderijo e consegue ver o personagem que estava atrás. Que regra do seu jogo faz isso?

- A. O jogo deixa o esconderijo tocado invisível.
- B. O jogo deixa todos os esconderijos invisíveis.
- C. O jogo troca o personagem de lugar.

**Correta:** A.

**Explicação:** O toque escolhe aquele esconderijo e o chama de escolhido. Dentro do bloco do toque, você colocou a ação que deixa escolhido com 0% de visibilidade. Assim, o personagem que já estava atrás aparece. Os outros esconderijos continuam como estavam.

### 2. O número acompanha a busca

**Pergunta:** Você encontrou um personagem e Achados mostra 1. Depois encontrou outro personagem. Com a regra de contagem que você montou, o que deve aparecer em Achados?

- A. 1, porque o jogo guarda apenas o primeiro personagem.
- B. 2, porque cada personagem encontrado soma um à contagem.
- C. 3, porque existem três personagens no jardim.

**Correta:** B.

**Explicação:** A variável achados guarda quantos personagens foram encontrados. O bloco de somar acrescenta 1 quando um novo esconderijo recebe o toque. Encontrar dois personagens faz a contagem chegar a 2. Ter três personagens no jogo não significa que os três já foram encontrados.

### 3. O mesmo personagem não conta duas vezes

**Pergunta:** Você encontrou um personagem e tocou outra vez no mesmo lugar. Por que a contagem não aumenta nesse segundo toque?

- A. Porque o jogo só pode contar até um.
- B. Porque o jogo precisa ser reiniciado para contar o próximo.
- C. Porque o esconderijo invisível não recebe outro toque.

**Correta:** C.

**Explicação:** O esconderijo ficou invisível depois do primeiro toque. Neste jogo, ele deixa de receber o toque que dispara a contagem. Isso impede contar o mesmo personagem de novo. Para aumentar Achados, você precisa encontrar outro personagem.

## A Chave do Farol

**Título da seção:** As regras da sua aventura

**Zappy:** Você fez o personagem andar, pegar a chave e acender o farol. Agora vamos relembrar essas regras com quatro perguntas. Se errar alguma, leia o porquê, clique em Tentar de novo! e responda outra vez.

### 1. Movimento e borda

**Pergunta:** Seu personagem anda até a beirada da tela. Qual ordem você montou para ele continuar visível enquanto se move?

- A. Conferir a borda e depois mover o personagem para qualquer posição.
- B. Mover o personagem e depois conferir o limite da tela.
- C. Conferir a borda só quando o jogo começa.

**Correta:** B.

**Explicação:** Dentro de A cada quadro do jogo, primeiro o jogo move o personagem. Logo depois, a regra da borda mantém ele dentro da tela. O jogo repete essa sequência enquanto funciona; conferir a posição somente no começo não cuidaria dos movimentos seguintes.

### 2. Conferir a memória da coleta

Atualizada em 04/10/2026, com id `q-memoria-coleta` no lugar de `q2` do Farol.

**Pergunta:** Você pegou a chave: ela sumiu do chão e o aviso mudou. Mas, no farol, o jogo disse que falta a chave. A pergunta da porta está certa. Qual bloco da coleta você deve conferir primeiro?

- A. Se o aviso usa exatamente as mesmas palavras do vídeo.
- B. Se o encontro com a chave muda temChave para verdadeiro.
- C. Se a velocidade do personagem está mais alta.

**Correta:** B.

**Explicação:** Destruir o sprite retira a chave do chão. Alterar aviso muda a mensagem para quem joga. Essas duas ações não guardam a coleta em temChave. Dentro do encontro com a chave, o bloco que altera temChave precisa guardar verdadeiro. É essa informação que a porta consulta depois.

### 3. A porta confere uma condição

**Pergunta:** Você chega ao farol sem recolher a chave. Com a condição que programou, o que o jogo deve fazer?

- A. Acender o farol, porque chegar à porta já é suficiente.
- B. Retirar a chave do chão, mesmo sem o personagem encostar nela.
- C. Manter o farol apagado e avisar que falta a chave.

**Correta:** C.

**Explicação:** A porta confere temChave. Sem a coleta, o valor ainda é falso, e o jogo segue a resposta senão: avisa que falta a chave. A resposta então, que acende o farol e aciona o barco, acontece quando a informação é verdadeira.

### 4. Conferir os dois caminhos

**Pergunta:** Você pegou a chave, chegou ao farol e viu a luz acender. Qual teste ainda falta para conferir a regra da porta?

- A. Chegar outra vez ao farol, na mesma partida, ainda com a chave.
- B. Reiniciar a partida e ir ao farol sem pegar a chave.
- C. Recolher a chave e repetir exatamente o caminho que já funcionou.

**Correta:** B.

**Explicação:** A porta tem duas respostas. Você já conferiu o caminho com a chave. Reiniciar e ir direto ao farol permite conferir o caminho sem ela. Nesse teste, a luz deve continuar apagada e a mensagem deve explicar que falta a chave. Testar só o caminho que dá certo pode esconder uma regra montada no lugar errado.

## Correção e conclusão

A seção exige todas as respostas corretas (nota 100), permitindo corrigir sem limite de tentativas e sem espera artificial. O objetivo é terminar com as relações esclarecidas, não premiar quem acerta tudo de primeira. As explicações ficam disponíveis para leitura; os acertos podem permanecer marcados na nova tentativa.

**Funcionamento conferido no código:** o quiz integra `completion.blockIds` da seção. O serviço de submissão reconhece esse critério como formativo, permite nova tentativa imediata e retorna `retryAvailableAt: null`, inclusive ao recarregar. O player mostra as explicações após envio e conserva os acertos durante a correção. O fluxo fora dos critérios de seção conserva sua política de espera. A afirmação anterior de cinco minutos vinha de um comentário desatualizado do player; não descrevia a execução do servidor. Não foi necessário criar uma configuração nova de quiz.

Fonte: `packages/members/src/application/submit-quiz-attempt/submit-quiz-attempt.service.ts`; teste: `packages/members/tests/integration/section-progression.test.ts`.

Na implementação, conferir a progressão antes do certificado, novas tentativas, retorno à aula e certificados já emitidos. Não retirar uma conquista existente de quem concluiu o curso antes desta revisão. Uma nova seção não deve bloquear retroativamente um certificado emitido.

## Conferência com crianças

Ler as perguntas com crianças da faixa atendida, sem explicar a resposta antes. Ver se entendem o enunciado, se reconhecem a situação do próprio jogo e se as explicações ajudam a corrigir. O quiz não comprova sozinho domínio ou autonomia: combinar as respostas com a construção e os testes do projeto. As perguntas acima foram conferidas contra os roteiros locais; ainda não foram ensaiadas com alunos.


## Estado da implementação local

- Dois geradores e manifestos atualizados: Cadê Todo Mundo com onze seções e dez vídeos após a revisão de 05/10 (a seção Deixe o jogo com a sua cara entrou na Aula 2); Farol com onze seções e dez vídeos após a revisão de 04/10. A revisão sem vídeo foi acrescentada à aula do certificado, sem mudar os identificadores existentes.
- Publicação no Members aceita quiz obrigatório em seção anterior ao certificado. A primeira emissão respeita essa seção; certificados emitidos continuam acessíveis. Os endpoints de correção e retorno à aula conservam a tentativa imediata.
- Cadernos gerados e conferidos: Cadê Todo Mundo, seis páginas; Farol, dezenove após a revisão de 04/10. Cores importadas das definições oficiais dos blocos e limites do PDF conferidos no navegador.
- Verificação local: 34 manifestos sem avisos; oito roteiros, dezoito vídeos; 42 tutoriais válidos. Suíte do Members: 1.325 testes aprovados, 49 testes de banco sem execução por dependerem de banco descartável. Os testes posteriores de importação/publicação dos dois cursos e preservação após inclusão de uma nova revisão também passaram.
- Referência das regras: [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md). O briefing, as especificações, a skill de autoria e os relatórios históricos encaminham para ela.

**Ainda não aplicado em ambiente remoto nesta etapa.** Antes de importar e publicar os cursos no Admin, disponibilizar a alteração do Members. Reconciliar vídeos e anexos existentes, substituir os dois PDFs e conferir a jornada com perfil de aluno. As falas revistas que exigem gravação e o ensaio com crianças continuam pendentes; não substituir uma mídia publicada por `plannedVideo` nem declarar compreensão validada com base nos testes de código.
