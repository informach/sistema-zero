# Interrupção da primeira execução

## Problema reproduzido

`PreviewIframe` decidia se precisava descartar um processo ocupado usando
somente o último documento que confirmou `load`. Código síncrono pode bloquear
antes dessa confirmação. Nesse caso, Parar e Rodar de novo não reconheciam a
tentativa em curso. O teste de regressão que retém apenas o reconhecimento do
documento executável falhava antes da correção.

## Correção

Registrar a tentativa efetivamente enviada, separadamente do documento carregado.
Uma tentativa ainda não reconhecida exige o intervalo de remoção já existente
ao interromper ou reiniciar. Publicação remota pendente e casca ainda não pronta
não são execução. Pedir um documento vazio também não comprova que o trabalho
anterior terminou: limpar a tentativa somente após confirmação ou remoção.

Os intervalos, limites, sandbox, blocos e estilo visual permanecem iguais.
Não há novo armazenamento nem cópia serializada do projeto. O mecanismo de
remoção de iframe continua dependente do navegador; não substitui isolamento
por worker ou por site, nem demonstra isolamento universal.

## Verificação

- Família de preview/player: 110 testes, 559 asserções, dez arquivos, sem falhas.
- Recorte final de PreviewIframe, MonacoTabs e orçamento inicial: 63 testes,
  311 asserções, sem falhas; guarda de bundle preservada.
- Checagem TypeScript da árvore local concluída sem erros. A primeira rodada
  detectou acesso opcional incompleto no novo teste, corrigido; uma rodada
  intermediária pegou a alteração concorrente de um export 3D ainda incompleto.
  A rodada final passou após o contrato dessa frente ficar disponível, sem
  modificar seus arquivos para silenciar o diagnóstico.
- Chromium completo no Windows: programa começa processamento nativo síncrono
  por 30 segundos antes de completar o carregamento; Parar remove seu iframe;
  os buffers conservam a fonte; colagem nativa substitui o programa e a nova
  execução desenha o pixel verde esperado. Primeira execução aprovada: 14,2 s
  para o fluxo, 38,8 s incluindo o build.
- O fixture usa persistência `none`: prova preservação da fonte em edição,
  não gravação durável. Salvamento continua dependendo das suítes próprias.
- O teste retém tracing sem snapshots DOM durante o bloqueio deliberado;
  snapshots podem esperar o filho ocupado. Não troca comandos nativos por
  eventos sintetizados e não aumenta limites de aprovação.
- Rodada final com o fixture compartilhado: cinco casos de navegador aprovados
  em 1,7 min — interrupção, busca completa, carregamento/reinício do serviço
  de símbolos e digitação contínua com o mapa aberto.

## Correção adicional encontrada na revisão

A primeira rodada conjunta teve quatro aprovações e uma falha de conteúdo:
depois de digitar um comentário longo, uma sugestão assíncrona apareceu **após**
Escape. O trace registra `suggest-widget` visível depois de Escape e oculto
depois de Enter; o buffer contém a declaração colada ao comentário, sem a
quebra de linha esperada. Não era apenas uma consulta obsoleta ao textarea.

`MonacoTabs` agora habilita sugestões automáticas em código e strings, mas
deixa comentários sob solicitação explícita por Ctrl+Espaço. Tipos, diagnósticos,
sugestões em código e opções visuais não foram desabilitados. O teste ficou
mais exigente: usa Enter diretamente no comentário, sem Escape preventivo,
e verifica o conteúdo integral do modelo e a localização do símbolo criado.

Comando do navegador: `bunx playwright test --config e2e/pro-workspace.config.ts
--grep 'first startup' --retries=0`, em `packages/studio`.

## Achado distinto na galeria

A execução [44633216192](https://github.com/informach/sistema-zero/actions/runs/44633216192)
ampliou o diagnóstico para cem casos por sistema. No Linux, 98 passaram e dois
Duelo de Heróis falharam em `keyboard.press('ArrowDown')`. Em ambos os casos:

- A tecla começou 25–31 ms antes de uma navegação de `about:srcdoc`.
- As teclas anteriores tinham `keydown` e `keyup`; ArrowDown não apareceu.
- Cinco segundos depois, CDP confirmou editor e jogo em `readyState=complete`.
- O controle deliberadamente bloqueado passou e distinguiu editor saudável
  de filho sem resposta. Portanto, a leitura não confunde automaticamente
  qualquer timeout de teclado com bloqueio de CPU.

Isso demonstra concorrência entre entrada e navegação, sem ainda provar a
causa do comando pendente. Não fechar o achado com retries, eventos artificiais
ou alteração arbitrária de tempos. Windows terminou cancelado e não conta como
aprovação. Preservar o artefato `studio-input-ubuntu-24.04` desse run.

A missão global continua aberta, incluindo esse achado e os critérios de
homologação descritos no checkpoint.
