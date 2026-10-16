# L6 — gravação existente, preparação e edição integrada

Prova em PostgreSQL nativo, R2 privado `testes-marketing`, Electron e navegador sem preload. O original é `p21-ver-a-atividade/apoio/demonstracao-duelo.webm`: gravação existente de tela, VP9, 800 × 600, 3.938,762 ms, sem áudio. Não representa filmagem de celular nem fala gravada. Projeto técnico separado; nenhuma peça do acervo foi alterada, aprovada ou publicada.

## Falhas encontradas e correções

1. O upload multipart web foi bloqueado pelo CORS do bucket. A regra antiga permitia somente `content-type` e duas origens anteriores. A consulta real confirmou ausência de `content-md5` e da origem local 15334; o navegador mostrou `Failed to fetch`. A assinatura e o endpoint do upload estavam funcionando. A regra de **testes** foi ampliada preservando origens, métodos e regras externas. Produção não foi alterada.
2. A biblioteca encerrava o envio em `verifying` e exigia atualização manual para mostrar a confirmação. Agora consulta a verificação pendente a cada dois segundos somente enquanto o diálogo está aberto e o upload não está ocupado. Não repete bytes, não transforma recebimento em confirmação e interrompe a consulta quando não há verificação pendente. Estados de falha e envio interrompido continuam disponíveis.
3. O harness tinha um observador de execução a cada 1,5 s, além dos dois clientes com a mesma conta. A abertura da prévia recebeu 429 ao fim da produção. A consulta adicional do harness passou a cinco segundos; não foi ampliada a quota do produto. Uma nova execução reabriu os resultados já confirmados sem inferência ou render adicionais e passou. O ensaio não mede capacidade de três usuários físicos.

A UI também encerra a mensagem de espera quando a verificação falha, mostrando o erro e impedindo vínculo. Prova `--smoke-rejected-upload`: uma alteração controlada de byte após a leitura de SHA-256, exclusivamente na janela descartável, manteve o MD5 da parte coerente com os bytes transmitidos. O R2 recebeu a parte; a conferência independente no servidor recusou o SHA-256 final. Estado `failed`, sem botão de vínculo, mensagem inspecionada; `proof-integrity-ui.exit=0`, evidência `rejected-upload.json/png`. A primeira versão do harness usou um contêiner WebM inválido e esperava rejeição de integridade: essa premissa era incorreta. Confirmação de armazenamento verifica bytes/hash; decodificação pertence à preparação/render. A fixture e a falha `proof-rejected-upload.exit=1` foram preservadas, sem alterar o contrato do produto para fazer o teste passar.

`bun run storage:cors` oferece consulta por padrão e aplicação explícita. Exige bucket correspondente às credenciais, origens exatas, preserva configuração externa, relê antes da gravação e confere a resposta. A configuração não é atomicamente condicional na API S3; mudanças administrativas concorrentes devem ser serializadas. Código 1 no modo de consulta representa diferença pendente. Testes cobrem preservação, idempotência, origens inválidas e regra duplicada: 2 testes/17 assertions. Testes combinados com multipart web: 4/32. Referência consultada: [CORS do Cloudflare R2](https://developers.cloudflare.com/r2/buckets/cors/).

## Percurso demonstrado

- Input de arquivo real na web → multipart → SHA-256 confirmado no R2 → botão de vínculo à montagem.
- Pedido de preparação pelo formulário Electron → proxy H264 e miniatura confirmados → metadados vinculados ao original. Como não há áudio, a forma de onda permanece `null`.
- Pedido natural ao Codex pela assinatura existente: usar 500–3.500 ms, manter velocidade, imagem inteira, três segundos, sobrepor “Uma criação em movimento” por dois segundos com fade.
- Proposta validada e aplicada: 90 frames a 30 fps, clipe original e uma cena de texto, sem fonte adicional. Render local pelo formulário → MP4 final confirmado no R2.
- Novo processo Electron → mesmos resultados → web autenticada sem preload → Player usa o **proxy confirmado**, com corte e texto da timeline compartilhada. A ação de preparação permanece identificada como desktop.

Projeto `7da1fcd7-c16b-57bb-8646-61c433a55290`; vídeo `dfff78d0-6a2d-4c06-b9b9-a382d119755a`. Pedidos: preparação `69553466-04b4-400c-8d7b-aeee5194d90e`, edição `3c4c0f84-a315-43ee-8b89-3997e0730b4f`, render `7d246ab6-31c7-4595-a3c3-93977efcdabb`.

Original SHA-256 `c38a68558c6a494705c8e4af5fe1b18eee4e1c2f68404d9fe7f6ef02f5d80b53`, preservado após o processo. Final `73837c5d-5d6d-46e0-9693-5cdf89080760`, 211.785 bytes, H264, 800 × 600, 3.008 ms, SHA-256 `f5789e98ce548bffca42b5131bfd69ae3c4cee025099d981c8967444b83e27fc`. O mux final mantém uma trilha AAC de compatibilidade. Decodificação PCM dos dois canais: 288.768 amostras, pico **0**, RMS **0**; nenhum som foi acrescentado. A compilação FFmpeg incorporada não inclui `volumedetect` nem muxer raw f32le; a medição usou WAV PCM s16le suportado, sem alterar o render.

Evidências em `packages/marketing-desktop/.cache/recorded-video-proof-v2/`: `evidence.json`, `audio-evidence.json`, `final-frame.png`, `web-upload.png`, `web-result.png`, `native-result.png`. Frame final e screenshots de upload/web foram inspecionados. `proof-recorded-video-reopen.exit=0`; execuções anteriores com falha ficaram preservadas em `proof-recorded-video{,-diagnostic,-cors,-v2}`. `storage-cors-before.exit=1`, aplicação e nova consulta **0**, com `changed: false` na segunda consulta. A prova inicial criou cópias de revisão em partições de navegador separadas; envios incompletos não foram apagados para ocultar as falhas.

## Limites

Este ensaio fecha upload web → preparação/edição/render desktop → R2 → prévia web para uma gravação real curta e sem áudio. Não fecha o piloto de celular, transcrição de fala real, interação de SRT/alternativas/conflitos por UI, revisão humana em dois computadores, nem publicação em formato de destino. O quadro 800 × 600 foi escolhido para preservar integralmente a gravação; não constitui um Reel aprovado. As provas anteriores de codecs, VFR, rotação, fala sintética, sinais de áudio, composição isolada, cache e adaptação continuam com seus escopos próprios.
