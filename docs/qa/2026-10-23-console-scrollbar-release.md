# Fechamento: barras de rolagem e conferência adicional do Pro

Complemento da [revisão e implantação do Admin e oficinas](2026-10-23-admin-workshops-release.md),
concluído em 23/10/2026. [Evidências resumidas](evidence/2026-10-23-console-scrollbar-release.json).

## Resultado

A barra nativa sem tema do Admin foi substituída pela receita compartilhada dos três consoles:
Admin, Marketing e Atendimento. O traço mede 6 px dentro de uma área de arrasto de 14 px,
com tinta clara no menu escuro e tinta escura sobre o conteúdo claro. A variante discreta
responde também ao foco do teclado. As regras locais duplicadas foram removidas; a folha
gerada de tokens continua sendo a fonte das cores.

Chromium/WebKit e Firefox recebem seus mecanismos correspondentes, sem a combinação que
desativa os pseudoelementos no Chromium. Alto contraste conserva as cores nativas.
Não houve alteração de regra de curso, autorização, conquista ou configuração de ambiente.

## Fonte e gates

- PR [209](https://github.com/informach/sistema-zero/pull/209), head aprovado
  `67797f7508cf4a44373940c5580903fc0542ba05`.
- Merge normal em `f1f68b72896726c625c6f0f5c1618b4e307c277f`; árvore idêntica ao head:
  `f0400e3dbf7a94f8fb1d51a2b5796540dc3e86df`.
- [CI do PR](https://github.com/informach/sistema-zero/actions/runs/39988277919), tentativa 1:
  dez jobs de código aprovados.
- [CI e deploy automático de staging](https://github.com/informach/sistema-zero/actions/runs/39988223416),
  tentativa 1: onze jobs aprovados, incluindo a implantação. A falha SSH do lote anterior
  permanece registrada como histórica; este fluxo automático terminou com sucesso.
- Plano Railway do PR: zero alterações. Conferência de produção no merge e sincronização
  automática de staging também aprovadas. `main`, staging local e remoto sincronizados.

Os [testes locais e seus limites](2026-10-23-console-scrollbar-review.md) incluem o tema,
navegação/cadastro/oficinas, rolagem por teclado/roda, foco e alto contraste. A compilação
pelo PostCSS/Tailwind real do Admin incluiu a folha compartilhada sem avisos.

O apontamento automático sobre especificidade no alto contraste foi conferido antes de
alterar código: Chromium e Firefox computaram `scrollbar-color: auto` na variante discreta,
em repouso e com foco. Isso corresponde à
[regra do CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/#forced-colors-properties).
Não foi necessária uma sobrescrita com `!important`.

## Implantação e interface publicada

Staging encerrou com 18 serviços saudáveis, uma versão ativa por serviço e nenhuma implantação
pendente. O fluxo automático reconciliou o histórico e atualizou os 17 serviços selecionados;
o recorder permaneceu inalterado. Seis relações de URLs públicas corresponderam aos domínios
pertencentes ao ambiente.

Em produção, somente os três consoles com mudança efetiva neste complemento foram atualizados.
Os outros cinco consumidores do lote principal permaneceram no merge já validado `a2ff0fe49`;
os dez serviços sem mudança de runtime conservaram suas versões anteriores. Não houve
janela de manutenção, nova migração ou troca de credenciais.

A conferência final confirmou 18 serviços saudáveis e nenhuma publicação pendente. Nos
snapshots carregados, as sete relações de credenciais e as seis URLs públicas corresponderam
à configuração atual, com zero divergências. Valores e hashes de credenciais não foram
gravados nas evidências.

Nos Admins autenticados de staging e produção, o navegador conectado confirmou a nova classe
do menu, largura computada de 14 px, tintas distintas para menu e conteúdo e ausência de
avisos/erros de console. As abas originais da responsável foram preservadas. A inspeção raster
da receita ocorreu na fixture Chromium local; a prova das páginas publicadas usa o CSS
efetivamente computado pelo navegador.

## Conferência adicional de Python Pro

A indisponibilidade observada inicialmente vinha da largura de 958 px do navegador de teste.
O código oferece Pro a partir de 1024 px. Em 1280 px, os exemplos Pro ficaram disponíveis
ao mesmo administrador, sem concessão de permissão ou alteração de conquistas.

O exemplo Cobrinha em código abriu no editor Pro com seus arquivos, mostrou `import turtle`,
foi salvo na conta, executou o canvas Turtle e respondeu ao Stop. O projeto salvo reabriu em
Pro com a fonte preservada. A gravação retornou HTTP 200; a exclusão do próprio projeto de QA
também retornou 200, e a galeria voltou a ficar vazia. A largura original foi restaurada.

Houve uma negociação esperada de upload `409 CREATION_PARTS_NEED_BYTES`: o cliente enviou
os bytes solicitados e concluiu o commit com 200. O código do protocolo foi conferido no
cliente, BFF e servidor; não se descartou genericamente um erro inexplicado de console.

Este smoke não certifica terminal, instalação de pacotes, LSP/formatter, exportação ou
desempenho completo do Pro. A espessura nativa do Firefox headless continua sem prova raster,
conforme o registro local. Transmissão/gravação reais, carga e dispositivos físicos mantêm
sua qualificação separada; `LIVE_MEDIA_READY=false` foi preservado.
