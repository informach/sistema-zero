# Foco do Python em segundo plano e integração publicada

As fontes combinam df2d715af e o remoto publicado 994aacd3, com a correção
do foco de testes Python. A execução de gates.json passou nas 22 verificações
sequenciais, sem alteração de fontes entre elas. O índice fontes.json registra
o conjunto e os hashes normalizados. Os pacotes do Molda permanecem idênticos
ao remoto; os dois SDKs autorizados do Estúdio foram regenerados oficialmente,
com imports, dependências e licenças iguais.

A reprodução anterior com o guest Linux52ec perdeu o foco do editor seis vezes,
sem erros de console. O host agora escolhe segundo plano explicitamente fora
do documento autoral, restringe a permissão do quadro e exige a capacidade
python-background-focus-v1 no metadado verificado antes de inicializar o guest.
Runtimes antigos são recusados com mensagem de atualização. O manifesto de
recursos v1 e seu conjunto de três arquivos permanecem compatíveis.

Turtle, Pygame/Pygame Zero e Raylib compartilham a política: em segundo plano
não solicitam foco; jogos visíveis preservam o padrão. O observador dos testes
não substitui focus(), não restaura foco e verifica o console inteiro. Os cinco
casos nativos exercitam os renderizadores, captura gráfica, o executor real do
aluno, entrada sintética e a porta do mundo Pinta.

A primeira rodada nativa falhou por uma fixture Classic que mudou o caminho
do programa sem mover os caminhos de imagens e sons. A conversão QA foi
corrigida; os cinco casos passaram novamente e integram os 22 finais. Uma
tentativa de testes de controlador no diretório raiz também falhou por ausência
de document; a execução no pacote correto passou. Ambas ficam registradas.

O Estúdio passou em 12.112 testes, com quatro pulos padrão do Chrome no
Windows; esses mesmos quatro passaram separadamente com o Chrome instalado.
O Core passou em 3.183 testes. Os ensaios de navegador somam 35 no frontend,
12 na integração Pinta/Estúdio, 22 Pygame/Pinta e 88 Python compartilhado.
Os 22 usam Chromium 159; os 88 usam o Chrome do contrato das referências Raylib.
Não se alteraram tolerâncias, referências ou tetos de payload.

A distribuição registrada aqui foi construída no Windows e não foi ativada.
Ainda é necessário qualificar o commit e a distribuição Linux exatos, preparar
a política de leitura no commit de rollback e concluir o rollout e a homologação
autenticada. Estes testes são locais nesta máquina; não comprovam aparelhos
físicos adicionais, testes com crianças nem a conclusão da missão completa.
