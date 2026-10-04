# Módulos de Cadê Todo Mundo?

**Título do curso:** Cadê Todo Mundo?

**Descrição curta:** Monte um jogo de procurar personagens escondidos.

**Descrição:** Faça os esconderijos sumirem com um toque e conte os personagens encontrados.
O jardim já está preparado. Você monta as regras com blocos e testa até achar todo mundo.

## Módulo 1: Minha primeira busca

**Resumo:** Jogue o exemplo, faça os personagens aparecerem e programe a contagem dos três achados.

- **Aula 1:** [O primeiro achado](aulas/cade-todo-mundo-aula-1.md)
- **Aula 2:** [Complete a busca](aulas/cade-todo-mundo-aula-2.md)
- **Aula 3:** [Seu certificado](aulas/cade-todo-mundo-certificado.md)

## Situação editorial

O curso já foi gravado e testado com duas crianças. A revisão de 27/09/2026 muda a linguagem
das nove seções: tarefa imediata, passos completos e tutoriais de interface no Como Fazer.
A revisão atual tem quatro seções na Aula 1, quatro na Aula 2 e duas no certificado: quiz e celebração. São dez seções e nove vídeos.

Os arquivos plannedVideo dos manifestos são moldes de autoria. As novas falas precisam de
novas gravações. Ao atualizar o Admin, reconciliar os blocos pelos identificadores e preservar
vídeos, PDF, configuração do certificado, projetos e progresso existentes. Não importar
um molde com vídeos planejados e materiais vazios por cima do conteúdo publicado.

## Conteúdo e continuidade

A Aula 1 começa com a versão pronta do jogo para brincar e encontrar os três personagens.
Apresenta o caderno como consulta opcional, propõe os dois testes de toque e ensina a regra
de visibilidade. A prática termina com envio, confirmação e conclusão da aula.

A Aula 2 retoma o contador em zero, propõe quatro testes na experiência e ensina a soma no
evento de toque. A montagem continua com caminho completo, encaixe, campos e teste de 1, 2, 3.
O fechamento ensina a publicar o mesmo jogo no Mural: Compartilhar, gerar capa, publicar,
esperar a confirmação, fechar e concluir a aula. A publicação é a tarefa ensinada, sem novo
bloqueio técnico de conclusão. Personalização e cópia do link ficam no Como Fazer.

Complemento de 03/10/2026: todas as nove seções têm uma ponte do Zappy após o vídeo.
Caderno, retomada e publicação receberam as falas que faltavam, sem novos critérios de conclusão.
O [quiz único antes do certificado](proposta-quizzes-cursos-curtos-2026-10-03.md) integra o manifesto e o caderno: três perguntas, fala inicial do Zappy e nenhum vídeo na seção de revisão.

O jardim e os personagens já vêm preparados. A narração reconhece que a criança programou
a reação ao toque e a contagem. O certificado encerra o curso sem oferta comercial.

## Caderno

Um único PDF para as duas aulas, anexado ao bloco **caderno** de **Seu Caderno do Aluno**, na
Aula 1. A leitura, o download e a impressão continuam opcionais; apenas o vídeo conta para
concluir essa seção. O mesmo anexo alimenta a consulta na tela e o download.

Arquivo: **output/pdf/cade-todo-mundo-caderno-do-aluno.pdf**. Fonte editável:
**recursos/cade-todo-mundo/caderno-do-aluno.template.html**. Para regenerar, usar
**bun docs/aulas-interativas/recursos/cade-todo-mundo/gerar-caderno.ts**.

A Aula 2 mantém **retireBlockKeys: ['caderno']** para o molde anterior, mas não recebe outro PDF.
O PDF atualizado tem seis páginas: visão geral, montagem, publicação, revisão e certificado. Os desenhos usam as cores oficiais de cada bloco. A atualização do anexo no Admin deve preservar o bloco e o histórico existentes. Para gerar com conferência de cores, fontes e limites: **python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py cade-todo-mundo**.
Como folhear e baixar está no tutorial de materiais.

## Configuração que deve ser preservada

- Curso **cade-todo-mundo**, etapa Primeiros Passos / 2D, curso extra sem posição.
- Lições **aula-1**, **aula-2** e **certificado**, nessa ordem.
- Cadeia **cade-todo-mundo** para continuar o projeto entre aulas. A Aula 2 usa a retomada
  preparada somente quando não há projeto salvo.
- Estúdio incorporado em modo blocos, nível **iniciante-2d**, extensão Jogo 2D e blocos de
  [blocos-cade-todo-mundo.json](blocos-cade-todo-mundo.json). Sem Pinta ou Estúdio completo.
- Visibilidade dentro do evento na primeira prática; soma de 1 em achados na segunda.
- Compartilhamento habilitado apenas no projeto da Aula 2, depois do envio. O mesmo
  workspace permanece no fechamento. A publicação não é condição de conclusão.
- Matrículas, ofertas externas e permissões de Mural existentes. Não prometer acesso
  permanente ao Mural nem introduzir oferta dentro do certificado.

## Verificação

Executar **bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo**,
**python docs/aulas-interativas/validar-roteiros.py cade-todo-mundo** e os testes existentes
**cade-todo-mundo-*.test.ts**. Conferir as falas e a nova seção de quiz antes do certificado,
preservando os identificadores das seções anteriores, projetos, alvos e permissões. A revisão
exige todas as respostas corretas com nova tentativa imediata; certificados já emitidos permanecem acessíveis.

Na gravação, conferir rótulos atuais, envio com confirmação e conclusão. No ensaio com crianças,
verificar se começam a atividade sem explicação extra do adulto. Na abertura, devem saber
qual jogo vão construir, jogar a versão pronta e saber como avançar. Repetir essa conferência
nas experiências e nas duas montagens antes de substituir os vídeos.
