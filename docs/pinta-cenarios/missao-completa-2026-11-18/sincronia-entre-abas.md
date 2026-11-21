# Atualização que chega depois do foco

No ensaio autenticado da Vila em 20/11, a criança simulada voltou ao Estúdio
antes de a ponte adiada do Pinta terminar. A biblioteca pessoal foi atualizada,
mas o jogo conservou a cena anterior até outro foco. O código permaneceu intacto.
A prova está em `qa/vila-atualizacao-autenticada-2026-11-20/`.

## Causa e contrato

O Pinta publica na biblioteca após o gesto; o observador do Estúdio consulta essa
biblioteca ao abrir, trocar projeto, voltar ao foco ou tornar a página visível.
O sinal persistente de mudança já é gravado no localStorage depois do commit da
biblioteca, por perfil. O observador não acompanha a chegada desse sinal em outra
aba. Um foco anterior ao commit não garante outra consulta depois dele.

A biblioteca continua sendo a fronteira entre Pinta e Estúdio. A correção deve
consumir seu sinal existente, capturando o perfil do observador e ignorando eventos
de outros perfis ou sessionStorage. Atualização durante uma consulta em andamento
precisa provocar nova passagem depois dela, sem varreduras simultâneas. Desmontagem
e troca de conta cancelam o trabalho anterior. Nenhum comportamento de jogo vai
para o Pinta, nenhum componente visual ou estilo precisa mudar.

## Execução e aceite

1. Reproduzir nos dois editores reais locais: foco antes de editar, commit posterior
   da biblioteca, sem segundo foco. Conferir o quadrado apagado no projeto e a
   conservação integral de código, IR e blocos.
2. Integrar o sinal e o agendamento ao observador existente; testar isolamento de
   perfil, chegada durante consulta e encerramento. Preservar marcadores legados.
3. Executar navegador, regressões da biblioteca e componentes, tipos e formatação.
4. Publicar somente em staging qualificado e repetir com a Vila autenticada.
   Somente depois disso considerar fechado o intervalo encontrado; a publicação
   do jogo, o runtime Python e o rollout de nuvem continuam critérios separados.

## Resultado local

O sinal da biblioteca e a fila de leitura foram integrados ao observador existente.
A guarda captura também a sessão de armazenamento: trocar A → B → A não reativa
trabalho do observador anterior. Seis regressões de reconciliação passaram, assim
como os 12 fluxos Pinta/Estúdio e as verificações completas de tipos e componentes.
Reproduções vermelhas/verdes, contagens, códigos e limites estão em
`qa/sincronia-entre-abas-2026-11-20/README.md`. A repetição autenticada após implantação
continua necessária; a prova local não a substitui.

## Identidade da mudança, independente do relógio

Na revisão da árvore integrada, duas gravações com o mesmo Date.now reproduziram
outra perda de atualização visual: o segundo desenho estava salvo, mas a sincronia
o considerava inalterado. Cada commit da biblioteca agora publica um changeId
aleatório junto ao at existente. A comparação usa o token inteiro; clientes que
leem apenas at continuam aceitando o marcador. Esse sinal é local e não muda os
formatos autorais nem os números de leitura/escrita da nuvem.

Marcador ausente ou inválido exige conferência conservadora. Se publicar o sinal
falhar depois do commit, somente o marcador anterior é removido; os desenhos
permanecem no IndexedDB. A exclusão também captura o namespace antes do await,
para não notificar outro perfil durante uma troca de conta. A fixture C3 que
verifica a otimização de receitas passou a produzir um marcador válido pelo
salvador real, preservando sua exigência de não reler partições JS sem mudança.

A reprodução mínima do relógio passou de vermelho para verde. Casos de marcador
legado, falta/corrupção, falha de publicação e troca de perfil na exclusão exercitam
o protocolo; a bateria integrada verifica também seus consumidores. A implantação
e a repetição autenticada continuam obrigatórias antes de concluir esta etapa.
