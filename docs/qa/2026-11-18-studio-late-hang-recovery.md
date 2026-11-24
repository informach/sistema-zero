# Recuperação após travamento tardio

Incremento da etapa 1, complementar ao isolamento. Não fecha R1.

## Falha reproduzida

`PreviewIframe` removia a marca de execução após três heartbeats. Um programa podia
passar os primeiros segundos saudável e depois bloquear a thread. Se o navegador
compartilhasse a thread com o editor, a página não conseguiria registrar nada antes
de ser fechada; a reabertura automática executaria novamente o mesmo programa.

O teste que exige conservar a marca depois de três batimentos falhou antes da
correção (28 passaram, um falhou em `PreviewIframe.test.tsx`). O marcador não é
uma prova de isolamento ou uma tentativa de interromper a execução: é uma cerca
de recuperação para a próxima abertura.

## Implementação

Sinais de vida alimentam somente o watchdog. A marca dura por toda a execução e
é removida em parada, troca controlada de documento/desmontagem e `pagehide` de
uma página responsiva. Se a execução não puder encerrar corretamente, a próxima
abertura espera o Rodar. Recarregar normalmente continua permitindo execução
automática. Identificadores de projetos e formato dos blocos não mudam.

## Verificação local

- `bun test ./src/components/preview/PreviewIframe.test.tsx ./src/components/preview/prepareRun.test.ts ./src/components/preview/PreviewIframe.save.test.tsx`:
  53 aprovados, 209 asserts.
- `bunx playwright test e2e/preview-hostile-programs.spec.ts e2e/run-save-revision.spec.ts --project=chromium --trace=retain-on-failure`:
  seis aprovados em 1,5 minuto no Chromium 148 completo, build atualizado, porta 5301.
  O teste espera 3,5 s com o jogo saudável, confere a marca, recarrega corretamente
  e confere a execução automática; depois simula a marca deixada por encerramento
  interrompido e confere que reabre parado e aceita Rodar.
- Biome nos quatro arquivos alterados e typecheck incremental: aprovados.

Limite: a interrupção abrupta é simulada na parte de reabertura do E2E. A unidade
reproduz a remoção indevida após batimentos. Não afirmar que o ensaio matou o processo
do navegador nem que o WebKit agora isola jogos DOM. Os resultados anteriores de
isolamento continuam exigindo um executor adequado para cada arquitetura.

## Qualificação hospedada

Primeira execução da nova matriz: https://github.com/informach/sistema-zero/actions/runs/44280842226
no commit `be0ef11c5` (R3/documentação/CI, antes desta correção de marca).
Resultados só podem ser atribuídos ao SHA testado. A execução seguinte deverá
qualificar também este incremento. O workflow preserva execuções em curso e seus
artefatos, sem deploy ou acesso a produção. O job adicional de runtime reutiliza
os smokes Docker existentes com as mesmas imagens/contratos, sem executar programas
de alunos reais. Artefatos são limitados aos relatórios dos ensaios, não ao vendor
Python completo ou a segredos da pilha local.
