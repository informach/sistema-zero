# Sincronização entre abas e vida do perfil — 20/11/2026

A Vila autenticada revelou que voltar ao Estúdio antes do commit adiado do Pinta
deixava o mapa antigo no jogo até outro foco. A reprodução nos dois editores reais
locais confirmou: a biblioteca já tinha a célula -1, mas o projeto continuava com
15 após dez segundos. O mesmo ensaio passou depois de integrar o sinal real de
localStorage publicado pela biblioteca após seu commit, sem segundo foco.

O observador filtra o perfil e o armazenamento, agrupa pedidos durante a ociosidade
e executa nova leitura quando uma atualização chega durante a anterior. Cleanup
remove listeners e aborta o trabalho. A revisão identificou ainda a leitura ociosa
agendada antes da troca de conta: duas reproduções isoladas demonstraram aplicação
da biblioteca do outro perfil e reativação ao voltar à mesma conta. A guarda agora
confere o perfil e a sessão capturada do armazenamento, incluindo seu AbortSignal.
As mesmas duas reproduções passaram depois da correção.

## Verificação final

- Seis casos reais de reconciliação do observador: 33 asserções, sem falhas. Somente
  a fronteira de IndexedDB é substituída na fixture isolada; sincronizador e store
  do projeto são os reais. Inclui nova chegada durante leitura, eventos de outra
  pessoa/sessionStorage, desmontagem com leitura pendente e troca A → B → A.
- Biblioteca: 23 casos de armazenamento e 88 de sincronização, em processos
  isolados; os dois testes externos são wrappers, não a contagem desses casos.
- Integração final: 12 ensaios Chrome nos editores de produção locais, incluindo
  JavaScript/Python, mundos conectados, contornos e programação preservada.
- Componentes: 626 testes, 3.474 asserções, 75 arquivos, sem falhas.
- Tipos completos de Estúdio e Members, perfil oficial e Biome passaram. O último
  conferiu 16.642 arquivos, sem correções. O orçamento Node de tipos é 6 GiB,
  igual ao CI; as verificações pesadas foram executadas em sequência.

Antes da guarda final, a suíte completa de cenários/Phaser passou 48 ensaios em
desktop e toque. A guarda final altera somente o observador do Estúdio; seus 12
fluxos foram repetidos depois dela. A prova da fixture de portas está na pasta
fixture-de-portas-ci-2026-11-20. Os testes de perfil e o wrapper completo também
distinguem seleção de casos (quatro filtrados na reprodução mínima) de omissão.

São provas locais nesta máquina, com toque emulado onde indicado. Falta integrar
o remoto publicado, qualificar a fonte final e repetir o commit depois do foco no
staging autenticado. O gravador 6 e o Python 132 continuam desativados; não houve
publicação de jogo nem operação em produção por estes testes. Nenhuma mudança visual.

Trechos dos logs normalizados para LF e sem espaços finais; resultados preservados.
