# Full review — experiências e manifestos do Faísca

Revisão concluída em 08/11/2026, 21h18 (America/Sao_Paulo).

**Atualização:** os achados e oportunidades abaixo descrevem o snapshot original. A implementação
solicitada depois do review e suas validações estão registradas em “Correções e melhorias implementadas”,
ao fim deste documento.

## Escopo e resultado

Snapshot: `staging` local em `c4883ea16126c39d6e11a8582aefd32e2fa8d4d2`. Comparação com `93f75cecd`, incluindo a correção anterior `af45b8082`. São 102 arquivos do Faísca no lote; os dois arquivos da correção independente do Vimeo ficaram fora do julgamento funcional deste review.

Foram examinados o motor, as orientações do Zappy, a navegação das oito experiências novas, os componentes compartilhados, a renderização 3D, o CSS, os geradores, os dez manifestos alterados, os textos de produção, as 94 falas dos cinco arquivos de voz e as páginas de experiência dos quatro PDFs regenerados. As suítes também exercitaram a moldura compartilhada e experiências anteriores.

**Cinco achados confirmados: um P1 e quatro P2.** As oito experiências permitem concluir o percurso principal, mas há contradições em percursos alternativos e uma falha de integração do relógio com o vídeo. A checagem de formatação também falha. Nenhum código de produto, manifesto ou PDF foi alterado por este review.

## Achados

### F1 — P1: trocar “ou” por “e” na Cabana mantém a porta aberta e registra uma descoberta contraditória

Confiança: alta. Reproduzido no Chromium com o manifesto real e os componentes reais.

- Entrada nova: [scene-poder-cabana.tsx:137](C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108/packages/member-shell/src/components/scene-poder-cabana.tsx:137).
- Causa no contrato existente do motor: [engine.ts:663](C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108/packages/core/src/learning/scene/engine.ts:663).

Reprodução: escolher “ou”; pegar somente a chave; ir à cabana, que abre; permanecer na porta e trocar a peça para “e”. A tela mostra simultaneamente:

- “Tem a chave? SIM / Tem o emblema? NÃO”;
- “A cabana abriu! Você tinha as duas peças”;
- o cartão concluído “com ‘e’, uma só não basta”;
- a foto do teste “Com uma peça (‘e’): a cabana abriu”.

A nova interface dispara `try-cabin` ao trocar a peça. O motor calcula uma resposta negativa, mas só escreve `door` quando a resposta é positiva; a abertura anterior permanece. Mesmo assim, registra `one-closed`. Isso ensina a operação lógica com uma observação que contradiz a conclusão.

Direção de correção: definir explicitamente o resultado da nova comparação na exploração livre, conservando o comportamento do jogo onde ele for intencional. A figura, o aviso, a foto e a evidência precisam representar a mesma resposta; não basta trocar o texto do aviso.

Evidência: `packages/community-kids/.cache/review-faisca-probe/cabana-after-and.{png,txt}` no worktree de staging.

### F2 — P2: o relógio da Ponte continua contando quando o vídeo assume o foco

Confiança: alta. Reproduzido no player real em teste de integração local.

Código: [scene-poder-ponte.tsx:133](C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108/packages/member-shell/src/components/scene-poder-ponte.tsx:133), em conjunto com [scene-activity.tsx:516](C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108/packages/member-shell/src/components/scene-activity.tsx:516).

Reprodução: escolher o relógio que começa com a partida, iniciar o movimento e deixar passar um segundo. Pedir o foco de mídia pelo mesmo coordenador usado pelo vídeo da aula. O relógio muda de **1 para 2**, mesmo depois da pausa dos relógios da aula. A criança pode voltar ao vídeo para entender a tarefa e perder o intervalo disponível para atravessar.

O intervalo usa um `rodando` local e verifica apenas `document.hidden`. A pausa central modifica `running` do player, que não controla esse intervalo. O caminho `tempo` também não consulta o foco.

Direção de correção: integrar esse relógio à coordenação de mídia e definir uma retomada explícita. A fala do Zappy deve continuar podendo coexistir com o relógio, conforme o contrato já adotado.

Prova: `.cache/review-faisca/clock-probe.log`. O teste temporário `packages/community-kids/.cache/review-faisca-clock.test.tsx` falha no comportamento esperado de pausa: `Expected: "1"; Received: "2"`.

### F3 — P2: a orientação das Moedas pede uma coleta impossível após esgotar o caminho

Confiança: alta. Reproduzido no Chromium.

Código: [guidance-moedas.ts:58](C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108/packages/core/src/learning/scene/guidance-moedas.ts:58).

Reprodução: pegar as seis moedas com o sumiço ligado, passar novamente por uma delas para registrar que não conta duas vezes, desligar o sumiço e seguir a orientação “Sem sumiço: passe de novo na mesma moeda”. Todas as entradas de `present` já são falsas; o interruptor afeta coletas futuras e não devolve as moedas. Voltar ao lugar de uma moeda mantém o contador em 6 e nunca realiza `counts-again`.

Há saída pelo botão “Jogar de novo”, mas o Zappy não a indica e continua pedindo a ação sem resultado. Isso atinge justamente a liberdade de explorar fora da ordem sugerida.

Direção de correção: considerar as moedas disponíveis ao escolher a próxima orientação. Sem moeda utilizável para essa comparação, pedir nova partida, preservando descobertas e a escolha do sumiço. Não restaurar silenciosamente itens já coletados.

Evidência: `packages/community-kids/.cache/review-faisca-probe/moedas-after-toggle.{png,txt}`.

### F4 — P2: o caderninho dos Símbolos fica em “2 de 3” depois de completar a sequência

Confiança: alta. Reproduzido no Chromium.

Código: [scene-poder-simbolos.tsx:159](C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108/packages/member-shell/src/components/scene-poder-simbolos.tsx:159).

Reprodução: no modo de conferir a ordem, tocar sol, lua e estrela. O baú abre e a descoberta da ordem é registrada, mas “Em que passo da placa?” continua em “2 de 3”. O motor mantém `passo = 2` ao aceitar a estrela; esse número é o estado usado pela regra do projeto, não uma contagem de três etapas concluídas.

Direção de correção: separar o estado da regra da representação de progresso. Mostrar uma conclusão coerente no caderninho ou retirar o denominador que sugere uma etapa ainda pendente. Não alterar a regra do curso apenas para corrigir o indicador.

Evidência: `packages/community-kids/.cache/review-faisca-probe/simbolos-right-order.{png,txt}`.

### F5 — P2: dois arquivos alterados reprovam a formatação exigida pelo CI

Confiança: alta. Comando executado, saída 1.

- [gerar-ilha-do-farol.ts:55](C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108/docs/aulas-interativas-tecnico/qa/gerar-ilha-do-farol.ts:55).
- [video-experiencia.test.ts:137](C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108/docs/aulas-interativas-tecnico/qa/video-experiencia.test.ts:137).

O Biome pede a formatação da assinatura do helper e da cadeia `flatMap`. O workflow executa `bun run ci` em `.github/workflows/ci.yml:119`; portanto, o verde dos testes não é suficiente para liberar esse snapshot.

Direção de correção: formatar esses dois arquivos e repetir a mesma checagem. As dez advertências e cinco informações adicionais foram separadas dos dois erros; não foram tratadas automaticamente como novos bugs.

Evidência: `.cache/review-faisca/biome.log`.

## Oportunidades de melhoria

### O1 — tornar a cena e os controles utilizáveis juntos no celular

Prioridade sugerida: alta para a experiência de uso. As verificações novas medem largura, mas não garantem que a criança consiga tocar nas setas e observar o personagem ao mesmo tempo.

Na experiência de contato da Ilha ampliada em 390 × 844, a distância entre o topo do palco e o fim da seta direita foi aproximadamente **880 px**, antes de reservar a barra superior. Ao levar as setas à vista, o palco saiu inteiro da janela. Nos Poderes, a disposição também exige administrar a rolagem, embora seja possível encontrar um enquadramento que mostre ambos.

Sugestão: aproximar ou fixar os controles essenciais junto ao palco e tornar os módulos secundários mais compactos. Validar com toque, em orientação vertical, medindo a interseção real com a área visível. Não basta verificar `scrollWidth <= innerWidth`.

Evidências visuais: `packages/community-kids/.cache/review-faisca-probe/mobile-{ilha,ponte,moedas,cabana,simbolos}.png`. O ensaio não usou um aparelho físico.

### O2 — acrescentar percursos completos e inversão de escolhas aos E2E

O novo `faisca-livres.spec.ts` cobre uma descoberta por experiência e a largura em 390 px. Parte relevante dos testes dos componentes renderiza HTML estático; isso não exercita os efeitos de chegada nem o relógio.

Os 78 E2E existentes selecionados passaram mesmo com F1–F4. Os percursos completos realizados neste review chegaram a 6/6 na Ponte, 6/6 nas Moedas, 6/6 nos Símbolos, 5/5 na Cabana, 2/2 no ponto de vista, 3/3 na posição, 2/2 no contato e 2/2 na porta com “não”.

Transformar em regressões permanentes: conclusão das oito experiências, alternância “ou → e” com uma peça, coleta de todas as moedas antes da comparação, pausa por vídeo e coerência do indicador final. Também exercitar persistência com o servidor real antes da publicação; os ensaios de navegador deste review usaram a prévia local.

### O3 — centralizar a mecânica comum de movimento e pausa

`useAndarLivre` (`scene-discovery-frame.tsx:789`), `useMapaLivre` (`scene-faisca-livre.tsx:296`) e `useAndar3D` (`scene-ilha-porta.tsx:78`) repetem estado das teclas, ciclo de `requestAnimationFrame`, cálculo de delta, início/parada e limpeza. Aproximadamente 150–200 linhas têm estrutura semelhante, com diferenças legítimas na projeção e nas colisões.

Uma base comum pode receber a transformação de direção e o predicado de colisão, mantendo as regras específicas de cada cena. Isso reduz os lugares a atualizar para foco de mídia, suspensão, retomada e limpeza. É uma oportunidade de manutenção, não uma proposta de reescrever o motor agora.

Não foi identificado arquivo novo inteiramente morto. Os helpers novos possuem consumidores, e os dois helpers de eixo removidos não deixaram referências encontradas. O typecheck do Kids também passou.

## Evidência de validação

Executado no worktree `C:/Users/tocha/projects/sistema-zero-video-fullscreen-20261108`, sobre o snapshot informado. Os logs estão em `.cache/review-faisca/`, salvo onde indicado.

| Verificação | Comando ou seleção | Resultado |
| --- | --- | --- |
| Motor e conteúdo | `bun test ./packages/core/src/learning/scene ./packages/core/tests/learning.test.ts ./docs/aulas-interativas-tecnico/qa` | 2.943 passaram, 0 falhas; 115 arquivos |
| Componentes compartilhados | `bun test` com os 57 arquivos `packages/member-shell/tests/scene-*.test.ts*` | 734 passaram, 0 falhas |
| DTO e publicação | `bun test tests/unit/learning-dto-acoes-das-cenas.test.ts tests/unit/learning-dto-conformance.test.ts tests/unit/scene-setup-publicacao.test.ts`, em Members | 116 passaram, 0 falhas |
| Player do Kids | `bun test` com os 9 arquivos `tests/lesson-scene*.test.ts*` | 196 passaram, 0 falhas |
| Navegador | Playwright `playwright.scenes.config.ts`: `faisca-livres`, `livres-novas`, `lighthouse-walk`, `lighthouse-position` | 78 passaram; desktop e larguras de 320/390 px |
| Tipos do Kids | `node node_modules/typescript/bin/tsc --noEmit --incremental false`, em community-kids | Saída 0 |
| Arquivos alterados | `biome check` com os 73 arquivos TS/TSX/CSS/JSON do diff | Saída 1: 2 erros de formatação, 10 advertências, 5 informações |
| Espaços do diff | `git diff --check 93f75cecd..c4883ea16` | Saída 0 |
| Contrato do relógio | Prova temporária `review-faisca-clock.test.tsx`, com player e coordenador de mídia reais | Falha esperada da reprodução de F2: relógio 1 → 2 após pausa |
| Conteúdo serializado | Comparação semântica dos 15 JSON alterados | 66 folhas alteradas nos dez manifestos; alterações de texto, pistas, cenário e pedidos; sem mudança nos snapshots dos projetos |
| Falas | Comparação das 94 entradas dos cinco `zappy-etapas.json` com `discoverySpeech` | Nenhuma divergência |
| PDFs | Extração e renderização local das páginas das experiências nos quatro PDFs dos Poderes | Conteúdo atualizado e legível nas páginas examinadas |

Total das suítes existentes executadas: **3.989 testes unitários/integrados e 78 E2E aprovados**. Isso não inclui a reprodução adicional que falha em F2. Os percursos exploratórios adicionais são evidência separada, não foram contabilizados como testes permanentes do repositório.

## Limites e publicação

- Não houve build de produção completo nem typecheck separado de Admin/Members/Community adulta. O typecheck executado foi o programa completo do Kids, incluindo os módulos compartilhados importados por ele.
- O Chromium usou o fixture local com os manifestos reais e os componentes/CSS reais. Não valida autenticação, importação remota, gravação real na conta, Safari ou dispositivos móveis físicos.
- Os PDFs tiveram a página de experiência inspecionada visualmente; isso não é uma nova revisão editorial de todas as páginas já existentes.
- Reimportar aulas, regenerar as vozes e anexar os PDFs novos são pendências de produção já documentadas nos READMEs. Não foram classificados como bugs inéditos nem executados neste review.
- O servidor temporário e os navegadores desta revisão foram encerrados. A `staging` permaneceu em `c4883ea16`, sem alterações rastreadas.

Recomendação: corrigir F1–F5 e acrescentar as regressões correspondentes antes da publicação; priorizar O1 no refinamento seguinte da interface.

## Correções e melhorias implementadas

Branch `fix/faisca-review-20261108`, baseada em `c4883ea16`, com commit e merge em staging local
solicitados pelo usuário após a implementação.

| Item | Resultado |
| --- | --- |
| F1 | A exploração livre da Cabana recalcula a porta a cada comparação. Trocar “ou” por “e” com uma peça fecha a porta; figura, aviso, foto e descoberta concordam. O jogo original conserva sua abertura persistente. |
| F2 | Relógio e movimento consultam o dono de mídia da atividade. Vídeo pausa a Ponte; “Continuar partida” ou um novo movimento retomam sem reiniciar a partida. A fala do Zappy continua coexistindo com o relógio. |
| F3 | Sem moedas disponíveis, o Zappy pede nova partida antes da comparação. O reinício conserva descobertas e a escolha do sumiço. A nova fala foi incluída no arquivo de gravação. |
| F4 | Caderninho e descrição acessível dos Símbolos mostram 3 de 3 na conclusão, preservando `sequence.passo = 2` usado pela regra do projeto. |
| F5 | Os dois arquivos que reprovavam a formatação foram formatados. A checagem final dos 31 arquivos de código alterados não tem erros; permanecem 9 advertências e 2 informações preexistentes. |
| O1 | A moldura tem uma faixa única de movimento imediatamente após o palco, antes das regras e do caderninho. Setas e palco ficam visíveis juntos em 320/390 px, também durante toque e no modo ampliado. |
| O2 | Foram acrescentados percursos completos das oito experiências, alternativas de Cabana/Moedas/Símbolos, pausa por vídeo, checagem das falas e regressões nas rotas de gravação de progresso. |
| O3 | `useMovimentoContinuo` centraliza direções, RAF, delta e limpeza. Os três adaptadores preservam velocidade, colisões e projeção. Soltar, recomeçar, perder foco, esconder a aba e desmontar cancelam o movimento. |

### Validação da implementação

Executada no worktree `C:/Users/tocha/projects/sistema-zero`. Logs em `.cache/faisca-review-*.log`
na raiz e nas pastas dos aplicativos, conforme a execução.

| Verificação | Resultado final |
| --- | --- |
| Motor e conteúdo, incluindo paridade das falas dos cinco cursos | 2.951 passaram; 116 arquivos |
| Componentes compartilhados | 735 passaram; 57 arquivos |
| Player do Kids, mídia e movimento | 205 passaram; 11 arquivos |
| Community adulta | 118 passaram; 22 arquivos |
| Members: DTO, publicação e gravação das cenas | 128 passaram; 4 arquivos |
| E2E: Faísca, experiências anteriores e moldura normal/ampliada | 137 passaram |
| E2E de toque: seis experiências × duas larguras, cada uma normal/ampliada | 12 passaram |
| Build de produção da Community adulta, incluindo TypeScript e 84 páginas | Saída 0 |
| Build de produção do Kids, incluindo TypeScript e 123 páginas | Saída 0 |
| Biome dos 31 arquivos TS/TSX/CSS/JSON alterados e `git diff --check` | Saída 0 |

Total: **4.137 testes unitários/integrados e 149 cenários de navegador aprovados**.
As primeiras execuções simultâneas com o build tiveram dois timeouts de testes que fazem varreduras
extensas. As suítes completas foram repetidas em sequência; motor/conteúdo e Community adulta usaram
`--timeout 15000`, sem alterar as asserções dos testes.

Os E2E usam Chromium e toque emulado, componentes e manifestos reais no fixture local. As regressões
de progresso passam pelas rotas e pelo serviço reais, com repositórios em memória. Esses resultados
não equivalem a uma gravação na conta publicada nem a testes em aparelhos físicos. A checagem de
persistência no ambiente publicado, reimportação de aulas, geração das vozes e anexação dos PDFs
continuam pertencendo à etapa de publicação; este trabalho termina no merge local.
