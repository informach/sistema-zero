# Publicação de cursos pelo Admin

Conferência local de 01/11/2026, com componente e CSS reais do Admin, BFF limitado por operação, rotas e worker do Members e publicação canônica no Postgres. A cópia Kids para adulto e a promoção Kids staging para produção passaram em cinco fluxos de navegador.

## Execução

```powershell
$env:COURSE_SYNC_TEST_DATABASE_URL='postgres://postgres:course-sync-local@127.0.0.1:63790/sistemazero_course_sync_test'
$env:COURSE_PROMOTION_TEST_DATABASE_URL='postgres://postgres:course-sync-local@127.0.0.1:63790/sistemazero_course_promotion_test'
bun --no-env-file packages/admin/tests/e2e/course-publication-server.ts .cache/course-audience-sync/publication-browser-r7
$env:COURSE_PUBLICATION_PRINTS='.cache/course-audience-sync/publication-browser-evidence-r4'
node packages/admin/tests/e2e/course-publication-browser.mjs
```

Cada tentativa exige diretórios inéditos e fixture nova. Os dois bancos são locais, descartáveis e distintos, com nomes conferidos pelo controlador. Portas 127.0.0.1:5391 e 5392, com dois ambientes de mídia e relay real entre eles. A identidade da equipe é injetada apenas no BFF local: isso não é prova de login Next/Gateway. R2, Vimeo e ElevenLabs são provedores determinísticos nesta composição. O registro Vimeo usa o mesmo journal de fases imutáveis da aplicação. As provas dos adapters com serviços reais estão em `../2026-11-01-promocao-midias.md`.

## Resultado

Cinco fluxos aprovados, nenhum erro de página. Uma resposta HTTP 400 esperada, exclusivamente para a prévia com endereço inválido. Chrome sem interface, 1366×1000 e 390×844, Playwright já instalado no workspace.

1. Validar endereço, conferir origem e destino, publicar adulto ausente e reabrir o resultado persistido.
2. Fechar e reabrir durante a preparação, depois cancelar.
3. Falhar no provedor, retomar, concluir, conferir largura no celular e retorno do foco com Escape.
4. Confirmar que a resposta tardia da mídia não reabre nem publica o trabalho cancelado.
5. Promover entre dois bancos locais: capa com URL de produção, PDF em chave privada nova, vídeo com novo ID/hash, voz e conhecimento do tutor; a origem continua em staging.

Recibo privado em `.cache/course-audience-sync/publication-browser-evidence-r4/receipt.json`, logs em `publication-browser-run-r4.log`. O servidor foi encerrado pelo endpoint próprio, que para o worker, os listeners e as conexões. Nenhum aplicativo alheio é encerrado.

| Estado | Imagem |
| --- | --- |
| Prévia no computador | [desktop-preview.png](desktop-preview.png) |
| Publicação concluída | [desktop-completed.png](desktop-completed.png) |
| Cancelamento no celular | [mobile-cancelled.png](mobile-cancelled.png) |
| Falha sem publicação | [mobile-failed.png](mobile-failed.png) |
| Retomada concluída | [mobile-resumed.png](mobile-resumed.png) |
| Prévia da promoção | [mobile-promotion-preview.png](mobile-promotion-preview.png) |
| Promoção concluída | [mobile-promotion-completed.png](mobile-promotion-completed.png) |

## Outras verificações e limites

A suíte focada do Members tem 39 testes e 206 asserções, incluindo edição concorrente, cancelamento, posse vencida, adiamento de um vídeo sem bloquear os outros e publicação de conteúdo/tutor na mesma transação. O leitor limitado e o inventário do core têm 10 testes e 38 asserções. A suíte ampla do Members passou com 2.217 testes; 563 testes de outros ambientes permanecem explicitamente ignorados. O Admin passou com 981 testes, 4.068 asserções e zero falhas na execução ampla final r4. Contagens não somam wrappers duplicados nem substituem os testes dos demais serviços.

Esta prova não publica curso real, não mede um curso grande nem comprova a autenticação do serviço implantado. A migração e os deploys continuam separados das evidências locais. O histórico de falhas de preparação da fixture e dos adapters foi preservado no cache privado.

## Revisão final

O build de produção do Admin passou, incluindo as rotas privadas novas e a configuração do proxy. O Members passou no typecheck completo com o operador incluído. O palco passou em 21 testes e no build com as escolhas de curso, aula e parte. O lint global passou em 14.213 arquivos, após corrigir três pontos do manual do jogo que também será enviado.

A execução ampla Admin r3 teve 980 testes aprovados e um timeout de cinco segundos no subprocesso de autorização do jogo durante o build. O mesmo teste passou isolado em 875 ms. O negativo foi preservado; a repetição ampla final r4 passou em 138,86 segundos, com 981 testes e zero falhas, sem o build pesado concorrente e sem ampliar o timeout ou alterar a regra de autorização.
