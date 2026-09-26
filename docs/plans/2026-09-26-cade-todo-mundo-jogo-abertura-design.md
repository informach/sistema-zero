# Jogo jogável na abertura de Cadê Todo Mundo?

## Objetivo

Na primeira seção da Aula 1, a criança assiste ao vídeo de apresentação e brinca com uma cópia pronta de Cadê Todo Mundo? antes de construir seu próprio jogo. Concluir a seção requer assistir ao vídeo e encontrar os três personagens. A seção apresenta o produto com ação imediata, sem transformar a abertura num tutorial longo.

## Experiência

- Em espaço largo, vídeo à esquerda e jogo à direita, usando a divisória já existente da aula. Em espaço estreito, vídeo antes do jogo.
- O jogo é somente para brincar: não mostra blocos, paleta, editor ou botões de publicação. Há controle para ampliar e voltar à aula.
- A criança pode tocar nos esconderijos dentro do jogo ou usar três botões acessíveis, um para cada esconderijo. Esses botões acionam o mesmo evento Jogo 2D, não uma simulação visual paralela.
- O estado mostra `0/3`, `1/3`, `2/3`, `3/3` encontrados; cada esconderijo só conta uma vez. A vitória visual do próprio jogo continua. Reabrir a seção preserva o progresso registrado, sem transferir alterações ao projeto de construção.
- A narração mostra o que será criado, convida a brincar no jogo da seção e explica apenas navegação de vídeo/seção necessária agora. Não demonstra os três achados nem antecipa as atividades futuras.

## Arquitetura

- Criar uma variante própria de atividade interativa para `project-play`, com snapshot de projeto Jogo 2D autocontido e lista finita de alvos. Ela reutiliza a persistência de respostas/tentativas e a conclusão de seção, sem exigir um quiz artificial. O servidor confere que os três IDs esperados estão na resposta; esse progresso é evidência de interação de baixo risco, não prova antitrapaça.
- O projeto demonstrativo é gerado da mesma IR de `cade-todo-mundo-projeto.ts`, adicionando apenas a reação de revelar e a contagem. O `initialProject` do Estúdio permanece como antes.
- O jogador embutido usa `StudioProjectPlayer` num iframe isolado. O runtime Jogo 2D comunica ao host somente quando um alvo do grupo foi realmente tocado. A ponte de entrada aceita coordenadas de controles acessíveis vindas do `parent`, passando pelo mesmo tratamento do clique no canvas. O host confere origem do iframe e alvos declarados antes de atualizar respostas.
- O bloco `project-play` participa da régua de layout como uma experiência: lado da ferramenta, com modo ampliado. A projeção pública expõe apenas os dados necessários para jogar, não gabaritos de outras atividades.

## Limites e testes

- Nenhum novo bloco CSS, Canvas ou HTML no projeto da criança. Nenhuma alteração nos outros cursos.
- Não depender da página pública do Mural, do login do Mural ou de aprovação/publicação para jogar.
- Testar: projeto pronto vs. inicial; importação/validação/projeção; conclusão após três alvos únicos e não antes; ponte de mensagens e controles acessíveis; split responsivo; roteiro/manifesto coerentes e vídeo único.
- Falha de carregamento do motor deve aparecer claramente e não concluir a atividade.
