# Revisão durável ao esconder a aba e host dos testes

Base: `48914b464`, PR #273. Não conclui a missão global.

## Falha reproduzida e dados preservados

O run `44435310978` falhou em Windows Chromium ao procurar o journal temporário depois de `visibilitychange`. A primeira repetição local teve uma falha em três casos. Uma execução com diagnóstico teve cinco passagens; a seguinte, usando Chromium completo, teve três falhas em seis casos. Não se ignoraram essas falhas.

Nos três diagnósticos reprovados, a transação readonly encontrou o documento final com a extensão `game-3d-advanced` versão `0.23.0` e head de sequência 3. Não havia journal nem cópia síncrona: a promoção já havia sido concluída. O teste observava a permanência de um registro temporário, que uma confirmação concorrente pode legitimamente consumir. Os traces locais estão em `packages/studio/.cache/mission/hidden-full-chromium/`; as falhas incluem o anexo `exit-storage-diagnostic`.

O teste corrigido estabelece uma revisão nova e verificável: confirma a instalação, muda o nome pela interface, comprova que esse nome ainda não está no disco, esconde a aba e exige o mesmo nome com a extensão no journal ou no documento confirmado. Em seguida **recarrega ainda escondido**, sem disparar o retorno à aba nem solicitar outro salvamento. Confere o nome recuperado e a extensão. Assim uma gravação anterior da instalação não pode satisfazer a verificação. Autosave continua retido por dez minutos, sem alteração de timeouts ou remoção de casos.

Resultados locais, sem retries:

- Chromium completo: seis repetições, seis passagens, 44,8 s.
- WebKit: os três fluxos de saída passaram em 47,0 s, incluindo o céu de 1,5 MB, três materiais do Molda com modal aberta e a revisão escondida.
- Typecheck incremental completo: aprovado.

Não há alteração do protocolo de persistência nesta correção. A duração dos testes não é métrica de responsividade do editor.

## Processo que hospeda Vite

Uma tentativa local com Bun 1.3.11 ficou após a transformação de 2.729 módulos e ultrapassou o mesmo prazo de 120 s observado num run Windows anterior. A comparação com Node 24.15.0 concluiu build e preview em 32.992 ms. O script E2E passa a usar Node 24, já instalado nos jobs, com `import.meta.dirname` em lugar do alias exclusivo do Bun. Não se mudou Vite, o build, os cabeçalhos ou o teto de inicialização.

Verificação adicional pelo Playwright iniciando e encerrando automaticamente o novo host: dois fluxos CSS/menu passaram em 40,4 s, incluindo o build. Isso confirma este arranjo local; não demonstra ausência universal de travamentos internos do bundler. O novo run Windows/Linux precisa qualificar a mudança no GitHub.

Comandos, de `packages/studio`:

```powershell
bunx playwright test e2e/reload-flush.spec.ts --project=chromium --grep 'esconder a aba' --repeat-each=6 --retries=0 --trace=on
bunx playwright test e2e/reload-flush.spec.ts --project=webkit --retries=0 --trace=on
bunx playwright test e2e/css-learning.spec.ts --project=chromium --retries=0 --trace=on
```

Para a primeira comparação usou-se `PW_CHROMIUM` apontando ao executável retornado por `playwright-core.chromium.executablePath()`, como na CI. Testes de saída reutilizaram um preview Node descartável; o último comando qualificou também o ciclo automático do host.
