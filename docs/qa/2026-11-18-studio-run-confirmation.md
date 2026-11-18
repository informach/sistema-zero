# Confirmação de revisão antes de Rodar

Correção do achado R3 da revisão de 18/11. A missão inteira continua em andamento.
Nenhuma alteração de fonte, cores, blocos ou percursos de aula.

## Reprodução e causa

O coordenador anterior ignorava a rejeição de `save()` e liberava a execução após
1,5 segundo. Depois da confirmação, um novo flush podia avançar o projeto sem
confirmar a nova revisão. Dois testes do contrato corrigido falharam antes da
implementação: executar após rejeição e executar a segunda revisão usando só a
confirmação da primeira. Os registros locais são `.cache-run-confirmation-before.log`
e `.cache-run-components.log` no pacote Studio.

O coordenador agora aguarda a persistência existente, confirma novamente se o
documento imutável mudou e só começa quando a revisão corrente estiver confirmada.
Não há timeout que autorize execução. Sem alteração, Rodar continua síncrono.
Uma escrita que retorna sem confirmar nem mudar o documento gera erro, evitando
repetição de microtasks. Parar e troca de autoridade/projeto cancelam intenção,
nunca a mutação. Falha conserva o documento anterior da prévia e o buffer editável.

## Verificação local

Na worktree isolada, Windows, Chromium completo 148:

- `bun test ./src/components/preview/prepareRun.test.ts ./src/components/preview/PreviewIframe.save.test.tsx`:
  24 aprovados, 96 asserts, incluindo confirmações separadas de duas revisões,
  falha, demora, cancelamento e ausência de confirmação sem loop de tentativas.
- `bunx playwright test e2e/run-save-revision.spec.ts e2e/preview-hostile-programs.spec.ts e2e/reload-flush.spec.ts --project=chromium --trace=retain-on-failure`:
  nove aprovados em 1,7 minuto. Servidor de produção local na porta 5301,
  `PW_REUSE_SERVER=1`, `PW_CHROMIUM` e `SZ_CHECK_CHROMIUM` apontando para o Chromium completo.
- O teste novo segura autosave por 600.000 ms, edita Monaco de verdade, clica Rodar,
  observa o código executado, recarrega imediatamente e confirma fonte e execução.
  Não clica Salvar nem espera o selo ou o autosave.
- Biome dos cinco arquivos TS/TSX alterados: aprovado.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit --incremental --tsBuildInfoFile .cache/mission-types.tsbuildinfo`:
  saída 0. No PowerShell, definir `NODE_OPTIONS` com `$env:NODE_OPTIONS`.

O primeiro servidor encontrou a porta 5299 ocupada por outra sessão. Ele não foi
interrompido; o ensaio foi executado em 5301. Nenhuma cota/timeout do produto ou
teste foi aumentado.

O armazenamento `none` sem callback não promete durabilidade: esse contrato de
incorporação continua explícito. Validar queda do processo, adaptadores reais e
perfil conectado continua na matriz de homologação; estes testes não substituem
esses cenários, nem resolvem o isolamento do Firefox/WebKit (R1).

R6: README agora registra a integração já realizada. A tabela Linux mantém os
números históricos, mas nomeia o que foi medido: abertura da página, segundo frame
como proxy e ida/volta Só o jogo/Lado a lado; não troca de arquivo, INP ou responsividade
em três tamanhos de tela. A revisão original permanece intacta como evidência anterior.
