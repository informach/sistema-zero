# Python gráfico em segundo plano: preservar o foco do editor

## Reprodução e escopo

O lote publicado `569c7217f` acrescenta um executor Python de testes do aluno
em um iframe dentro de um contêiner `inert`, com opacidade zero. A integração
Pinta já delega foco aos quadros Python visíveis para permitir jogar pelo teclado
no Chromium 159. O provedor aplica essa delegação também a quadros fornecidos.

Um ensaio real compôs o mesmo contêiner com a sessão fornecida e o cenário
Pinta/Pygame da distribuição Linux `52ec7bb5…`. O canvas solicitou foco ao iniciar:
o observador registrou seis leituras do iframe ativo, e o campo do editor perdeu
o foco. O console permaneceu sem erros. A reprodução não altera métodos de foco
e não devolve o foco artificialmente ao campo. É uma prova do mecanismo; a aba
Python do lote novo ainda precisa ser exercitada depois de sua integração.

Esta correção faz parte do fechamento do leitor e da distribuição Python,
antes de sua ativação em staging. A identidade visual do Pinta permanece igual.

## Decisão

Adicionar um modo explícito de execução em segundo plano no caminho
controlador → provedor → sessão → inicialização do quadro → renderizadores.
O padrão preserva o jogador visível. O executor escondido escolhe o modo de
segundo plano, e os renderizadores deixam de solicitar foco nesse modo.

Uma capacidade versionada da distribuição permite recusar esse modo em um
runtime anterior, com orientação para atualização. Os arquivos e manifestos
imutáveis já existentes ficam preservados. A nova capacidade deve ser declarada
somente pelo builder que inclui o leitor e os renderizadores correspondentes.

A sessão também deve restringir a delegação de foco do iframe em segundo plano.
O sandbox, a identidade da execução, o canal autenticado, os recursos aprovados
e os controles sintéticos usados pelo piloto permanecem sujeitos aos contratos
existentes. O foco é uma decisão de apresentação do host, fora dos dados autorais.

Alternativas avaliadas: retirar somente a delegação deixa solicitações de foco
indevidas no guest e produz violações de política. Restaurar o foco depois ou
substituir métodos DOM esconderia a transição já observada. O contrato explícito
permite evitar a solicitação na origem e verificar o comportamento completo.

## Execução e aceite

1. Concluir a verificação e registrar o corte de integração `e8f5241b0`.
2. Integrar o próximo lote publicado, preservando as mudanças concorrentes.
3. Testar o modo nos contratos de preparação/inicialização e a recusa em runtimes
   antigos; implementar sua propagação, sem alterar o padrão dos jogos visíveis.
4. Reutilizar uma política de foco entre Turtle, Pygame/Pygame Zero e Raylib;
   verificar captura, entradas e descarte, além do elemento ativo do documento.
5. Ligar o executor Python escondido ao modo explícito e conferir os respectivos
   testes de controlador, sessão e executor.
6. Executar jogos reais em navegador: console sem erros, campo do host com foco
   durante toda a execução e entradas sintéticas funcionando. Conferir também
   o teclado do jogo visível, os mundos Pinta e os controles existentes.
7. Executar a bateria integrada, gerar o perfil oficial, qualificar imagem e
   distribuição Linux exatas, registrar provas e seguir o rollout de staging.

O usuário autorizou a execução contínua das etapas e as decisões técnicas
justificadas. Não há aprovação intermediária nem autorização de produção neste
plano. As regiões expansíveis continuam depois do fechamento desse fluxo.
