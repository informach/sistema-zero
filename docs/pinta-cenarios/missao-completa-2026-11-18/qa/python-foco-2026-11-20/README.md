# Python/Pygame: delegação explícita de foco

Continuação sobre 2662cb845, em 20/11/2026. O Chromium 159 revelou que o
host Python também precisava delegar focus-without-user-activation ao seu
iframe isolado. As seis cenas Pinta completavam as verificações de física e
portas, mas produziam violação da política no console. A prova anterior não
verificava esse console; os seis resultados vermelhos estão preservados aqui.

O host agora utiliza a constante nominal já compartilhada pelo Core. O sandbox
permanece allow-scripts allow-pointer-lock. Nenhum estilo, mecanismo de física,
geometria ou programação do aluno foi alterado. Não há filtro para esconder
erros de foco: os casos Pinta verificam todos os erros do console e pageerror.
O favicon ausente do probe recebe uma resposta vazia, separada dos recursos do jogo.

Passaram 17 ensaios reais no Chromium 159 fornecido pelo Playwright, incluindo
Vila → Cabana → Vila em duas escalas, colisões precisas, plataformas e PyDew Valley.
A execução é local nesta máquina Windows, com Pyodide e Pygame no navegador.
A suíte Python completa passou em 307 casos; os 19 casos dirigidos são um
subconjunto e não devem ser somados. Tipos completos do Estúdio e Members,
perfil oficial e Biome também passaram. Logs, relatórios e hashes acompanham a prova.

A compilação produziu a distribuição 5547157507fe0e54141bd784fccc4a7596a0417f4a353fbd16fa7b7b5ca54a1f,
com 126 arquivos e todos os hashes relidos. Em relação a f7a5b01e, mudaram
playtest.mjs e standalone.mjs e seus objetos gzip. O perfil do Worker permanece
18aedaded74dfd6feb7cd37e91493f59939f216831c4c11e0e34765c18790976.

Esta prova não ativa distribuição, catálogo, política ou gravador. A imagem
qualificada anteriormente para 2662 contém a distribuição f7 e não qualifica
estes bytes novos. É necessária nova qualificação Linux da fonte commitada,
seguida do rollout e do ciclo autenticado. Não se afirma validação física de
outros aparelhos ou com crianças, nem conclusão da missão.
