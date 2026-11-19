# CI Windows: falha antes de abrir a aplicação

Run `44492414266`, revisão `53ce8709b`: 11/12 grupos aprovados. O grupo Windows Chromium teve 18 testes aprovados e falhou no primeiro teste, `blockly-media`, ao criar a página. Os contratos Windows/Linux, Python, hosted runtime e demais navegadores passaram.

Foi analisado o artefato `studio-browser-windows-chromium`, ID `14515507304`, incluindo o trace original. Ele registra lançamento do Chromium completo fixado (chrome.exe, Chromium 1223 / Chrome 148.0.7778.96), criação de contexto e início de `BrowserContext.newPage`. O fixture atingiu o prazo de 30 segundos antes de a operação retornar. A trilha de rede tem zero bytes; não houve navegação ao Estúdio nem execução do corpo do teste.

Isso localiza a falha na inicialização do navegador da máquina de CI; não demonstra sua causa específica (CPU, disco, renderer ou outra). Não se atribui o problema a uma regressão da aplicação, nem se declara o Chromium Windows corrigido.

Reprodução local com o mesmo executável Chromium completo:

```powershell
# em packages/studio
$env:PW_CHROMIUM = node -e "process.stdout.write(require('playwright-core').chromium.executablePath())"
bunx playwright test e2e/blockly-media.spec.ts --project=chromium --retries=0 --repeat-each=3 --trace=on --global-timeout=180000
```

Resultado: três repetições aprovadas em 38,5 s. Os traces confirmam chrome.exe, sem troca para headless shell. Não é uma reprodução da imagem física do runner nem uma prova de que a falha remota desapareceu.

A CI Windows passa a registrar `DEBUG=pw:browser` para obter stderr/lifecycle de inicialização em eventual recorrência. Timeout de teste, execução, quotas, asserções e `--retries=0` permanecem iguais. A falha histórica fica registrada; a revisão atual precisa de qualificação própria.
