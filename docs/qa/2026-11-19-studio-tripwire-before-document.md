# Marca de execução no commit do documento

## Falha reproduzida

O CI Linux da ativação v4 observou `srcdoc` executável sem a marca `sz:run-tripwire` correspondente. A marca era armada por um efeito passivo do React, depois de o documento entrar no DOM. O teste anterior podia ler a condição entre essas duas fases.

Foi acrescentada uma regressão com MutationObserver real do DOM de testes: observa alterações de `srcdoc` e captura, naquele instante, a marca em localStorage. Com a implementação anterior, a observação encontrou uma marca nula e o teste reprovou. Não há sleep, tempo maior ou substituição da asserção de integridade. Logs: `.cache/mission/v4-tripwire-dom-order-red.txt` e `v4-tripwire-dom-order-green.txt`.

## Correção

A armação e sua limpeza passam para `useLayoutEffect`, no mesmo commit que instala o documento. A observação posterior do DOM já encontra a marca. Continuam as mesmas condições de documento ativo/projeto, o mesmo descarte no encerramento controlado/pagehide e a preservação após heartbeats. Não muda a política de autoexecução, o sandbox, os buffers nem o protocolo de salvar antes de Rodar.

O teste passou após essa mudança. A correção protege a ordenação da recuperação; não transforma um iframe em execução isolada nem comprova interrupção universal de trabalho síncrono.

## Verificação desta correção

- Preview, preparação de execução, player e gamepad: **104 testes / 515 asserções / dez arquivos**, aprovados em 11,28 s.
- Chromium completo, build de produção novo: os cinco programas hostis e Rodar/salvar/recarregar passaram, **6 testes / 1,7 min**, sem retries. Conservados os limites e os comandos reais de Parar/Rodar de novo.
- Typecheck completo e Biome dos dois arquivos aprovados.

Os ensaios são locais em Windows. Não comprovam isolamento DOM em Firefox/WebKit, aparelhos físicos de entrada ou memória prolongada. A revisão exata ainda exige CI.

## Tentativa independente de Linux

Foi preparado um container local Bun 1.3.11 com arquivos commitados, sem `.git` ou configurações locais. A instalação de dependências não terminou e não executou os testes; o Docker retornou 500. A preparação esgotou o espaço disponível e uma verificação npm concorrente reprovou explicitamente com ENOSPC. O arquivo TAR da tarefa (1.739.356.160 bytes) foi removido por caminho literal verificado, recuperando espaço. A falha npm deve ser repetida com espaço disponível e não conta como resultado do produto.

Não houve reinício global do Docker nem intervenção nos outros containers. Recursos próprios ainda a conferir: container `estudio-v4-linux-377-test` e volume `estudio-v4-linux-377-20261119`, marcado `codex.task=studio-v4-qualification`. Não declarar essa tentativa como qualificação Linux. O servidor E2E antigo PID 7432 foi encerrado; a nova prova usa o build da correção, porta 5327, com PID registrado em `.cache/mission/v4-ui-server.json`.
