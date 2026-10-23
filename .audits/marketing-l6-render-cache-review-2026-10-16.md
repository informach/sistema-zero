# L6C — reaproveitamento de render, revisão de 16/10

## Entrega

O exportador Remotion reutiliza os trechos visuais cuja entrada continua igual. A faixa de áudio é produzida continuamente pelo próprio Remotion e possui identidade independente: alterar copy/efeito não refaz o áudio; alterar volume/mudo não refaz o vídeo. FFmpeg apenas empacota vídeo e áudio, sem interpretar cortes, fades ou outra timeline.

- Faixas visuais de aproximadamente cinco segundos, em quadros inteiros; planos longos aumentam esse intervalo para conservar no máximo 240 trechos. Último trecho pode ser menor. A composição e sua origem temporal permanecem integrais.
- SHA-256 considera motor efetivamente verificado (bundle/worker/plataforma), parâmetros globais, ordem de camadas, clipes/fontes/legendas incidentes e conteúdo das mídias. URLs temporárias locais não entram na identidade. Duração, FPS e fontes globais invalidam conservadoramente os trechos; uma fonte usada por arte é aguardada pelo motor inteiro.
- Áudio usa identidade própria por mídia, intervalo original, posição, duração, taxa, volume, fades e estado/ordem de trilhas. Exportação AAC em M4A conserva os metadados de priming; o empacotamento não aplica deslocamento nem nova codificação. Vídeos sem som recebem faixa silenciosa.
- Cache separado por conta/projeto, arquivos e recibos conferidos por hash antes de reuso. Recibo é promovido por último. Tentativa incompleta nunca vale como sucesso; corrupção de bytes obriga nova renderização local. Cancelamento conserva intermediários já concluídos.
- Limite de 512 MiB por projeto após execução/retomada, com descarte dos mais antigos e limpeza de tentativas órfãs. Integra o orçamento global do app. Reserva de trabalho limitada a 6 GB e checada enquanto produz; MP4 final continua limitado a 2 GB. Limites não autorizam apagar original, arquivo final ou journal de execução.
- “Liberar cópias locais” inclui esses intermediários regeneráveis. A ação permanece exclusiva com a execução pesada; cópias confirmadas continuam sujeitas às regras de proteção existentes. Contagem de arquivos/bytes inclui os intermediários removidos.
- Progresso e resultado informam trechos e áudio reaproveitados. Recibo de exportação continua vinculando revisão inteira e arquivo final exato; cache não modifica aprovação/publicação.

## Problemas encontrados e corrigidos na revisão

1. A primeira configuração da prova tentou usar `testsrc2` no FFmpeg embarcado, que não inclui esse gerador (`proof-render-chunks`, exit 1). A amostra e a medição passaram a usar explicitamente o FFmpeg completo instalado, somente no comando de desenvolvimento. O aplicativo continua renderizando com os binários embarcados. Não foi adicionada dependência operacional de FFmpeg externo.
2. A implementação inicial dividia também o áudio AAC seguindo as opções de junção do Remotion. A comparação real com render integral falhou: RMSE 0,038 na primeira junção; análise de correlação encontrou deslocamento de 18 amostras após ela (`proof-render-chunks2`, exit 1). Os limiares do teste foram mantidos. A arquitetura final usa faixa contínua independente, eliminando a concatenação de AAC e ampliando o reuso para alterações exclusivamente visuais. A implementação inicial foi substituída, sem fallback oculto.
3. A revisão de armazenamento adicionou a limpeza desses intermediários ao diálogo existente e preservou o caminho de recuperação do journal. A identidade visual deixou de depender de volume/mudo, que só afetam áudio.

## Evidência final

`packages/marketing-desktop/.cache/proof-render-cache-final.{out,err}.log/.exit`, **código 0**. JSON em `.cache/render-chunks-proof/25d1bc17-fe97-4ed0-b8fe-20059c3d9183/evidence.json` dentro do pacote desktop.

- Electron real, utilityProcess, Remotion 4.0.535, fonte sintética com movimento/áudio e caminho com espaço/acento. 440 quadros a 30000/1001 FPS, 320×240, H264/AAC, BT.709.
- Inicial: **25.608 ms**, três trechos produzidos e áudio novo.
- Mudança na cena central: **7.605 ms**, um trecho produzido, dois e áudio reaproveitados.
- Repetição idêntica: **1.539 ms**, três trechos e áudio reaproveitados.
- Mudança só no volume: **7.523 ms**, todos os trechos visuais reaproveitados, áudio refeito.
- Render por trechos e integral: **440 quadros** em ambos, PSNR **46,567784 dB**. Áudio decodificado: **705.536 amostras** em ambos. Comparação de 14.400 amostras em torno de cada uma das duas junções: **RMSE 0**, sem compensar deslocamento no teste.
- Montagem sem mídia sonora: 30 quadros a 30 FPS, aproximadamente 1.003 ms, faixa silenciosa e codec/dimensões/cor corretos.
- Cancelamento depois do primeiro trecho concluído. Cache de mídia fechado/reaberto com novas URLs; nova execução reaproveitou exatamente um trecho e produziu os dois restantes. Nenhuma saída incompleta foi importada como final.
- Regressão desktop: **75 testes / 1.777 assertions**, zero falhas (`tests-render-cache-final`). Inclui invalidação, corrupção, tipo incorreto, recuperação, quota e contagem de limpeza. Workbench: **28 testes / 112 assertions**, zero falhas; check de 78 arquivos limpo.
- TypeScript desktop passou (`types-render-cache-final`); build desktop completo passou (`build-render-cache-final`). Check desktop final: 160 arquivos, limpo (`check-render-cache-final`). O aviso existente de tamanho dos chunks do Studio permanece visível.

## Limites e continuidade

Esta prova valida a implementação de cache e a montagem temporal; não é um vídeo real de celular de vários minutos, benchmark generalizável ou piloto físico em dois computadores. A integração de limpeza foi revisada em código e testes de filesystem, não recontada como nova prova visual do diálogo.

Autoria isolada de código de composição por IA, ensaios operacionais restantes de vídeo/desktop, full review, commit e merge local continuam pendentes. Nenhum push, deploy ou publicação social. Docker permanece dispensado pelo usuário.

Referências primárias consultadas: [renderização por trechos](https://www.remotion.dev/docs/distributed-rendering), [combineChunks](https://www.remotion.dev/docs/renderer/combine-chunks), [renderMedia](https://www.remotion.dev/docs/renderer/render-media), [codecs de áudio](https://www.remotion.dev/docs/options/audio-codec) e [faixa silenciosa](https://www.remotion.dev/docs/options/enforce-audio-track). A faixa contínua foi escolhida a partir da prova acima; não se atribui à documentação uma garantia de igualdade entre encoders.
