# Lote 8.3 — GLB único: revisão local

18/11/2026. Base `staging` conferida em `5da218d5c`. Este checkpoint fecha somente o destino GLB e suas verificações. **8.3 continua aberto**: preparo autorizado da revisão no Members/hosts/BFF e interface de exportação ainda faltam. 8.4/8.5, lotes 9–10, composição final da Faísca e encerramento global permanecem pendentes.

## Implementado

`gerarGlbUnico` recebe o mesmo pacote compilado já conferido pelo runtime Three. Não consulta o Palco nem modifica a autoria. O arquivo reúne composição visual, materiais, imagens, animações, luzes pontuais compatíveis com glTF e metadados de fonte/revisão, entidades, marcadores, ambiente e licenças em extras. `exportarGlbUnico` entrega o Blob para o futuro fluxo de download.

O destino reutiliza o gravador GLB e a normalização de pele/morphs/clipes existentes. As malhas com skin continuam na raiz glTF, com a hierarquia dos ossos preservada. Instâncias estáticas compartilham geometria/material: duas caixas repetidas geraram uma malha glTF referenciada por dois nós. O runtime agora expõe as instâncias por nó, inclusive nós sem entidade; a atualização conserva as hierarquias solicitadas e também anima nós sem entidade.

Clipes obrigam o GLTFExporter a escrever TRS. As matrizes afins externas são fatoradas com o `affineTrsChain` existente do Molda, sem assar posições mundiais em Float32. Reflexo, giro, escala não uniforme e cisalhamento estáticos conservam posições/normais; transformações de pele que glTF não representa são recusadas explicitamente, sem alterar a fonte ou invalidar o pacote Three.

O gravador estabiliza a ordem das imagens produzidas pelos encoders assíncronos: referências numéricas de geometria/animação continuam nos mesmos índices, pixels e payloads são preservados e extras opacos não são tratados como referências BIN. A rotina é exclusiva para GLBs gerados após a conferência do perfil de extensões. Um teste com duas ordens de conclusão diferentes comprova bytes finais iguais e idempotência.

A regressão de falha de imagem identificou um Blob URL interno que o GLTFLoader não revogava no erro. Um LoadingManager próprio fecha essa via, preservando URLs pertencentes ao chamador. O ensaio real recusou PNG com cabeçalho válido e conteúdo indecodificável: quatro URLs criados, nenhum retido, URL emprestado preservado.

## Limitações explícitas

- Um GLB tem teto de 32 MiB e 8.192 partes visíveis conforme os leitores/gravadores existentes. O pacote Three permite distribuir a cena em recursos separados.
- Água conserva o acabamento estático. Ondas e efeitos dinâmicos pertencem ao runtime Three.
- Céu panorâmico, névoa e iluminação hemisférica não têm representação padrão neste arquivo; o visualizador aplica seu ambiente. Luz pontual/foco com decaimento diferente do físico 2 gera aviso nominal, preservando os parâmetros autorais em extras.
- Um visualizador GLB não executa nado, colisões ou regras de jogo. Metadados conservados não equivalem a essa integração.
- Cancelamento impede entregar o resultado e libera recursos após terminar o encoder assíncrono. Não promete interromper uma operação síncrona interna do GLTFExporter.

## Evidências e resultados

[Resultados completos](evidencias/lote8-glb-unico/resultado.json), [validador Khronos](evidencias/lote8-glb-unico/validacao-khronos.json), [falha e posse de imagens](evidencias/lote8-glb-unico/imagem-recusada.json). GLB e modelos licenciados permanecem somente em `output/`, fora do Git.

- Arquivo real de **7.418.912 bytes**, SHA-256 `c6f2dcf21db9115c627592b59982bb1ab4a71cf4cf7f9b4b8543bcbd7d26c6f9`, idêntico em três ciclos; 23 malhas ativas, 31.850 triângulos, maior parte com 22.653 vértices.
- Reabertura independente pelo GLTFLoader e validador Khronos: **zero erros e zero avisos**. Onze informações sobre UVs sem uso, nó vazio e imagem não potência de dois, preservadas no relatório.
- Quatro clipes reais do Cute Characters, 12 quadros por clipe: erro máximo medido de posição mundial **zero** frente ao runtime de origem. Três cancelamentos recusaram o resultado; manifesto original intacto.
- Três câmeras sob iluminação de comparação igual: erro médio inferior a 0,001 canal/255; no máximo quatro canais diferiram acima de 16. Sol conserva a direção. GPU após renderer descartado: zero geometrias e zero texturas.
- [Geral antes](evidencias/lote8-glb-unico/geral-antes.png) / [depois](evidencias/lote8-glb-unico/geral-depois.png), [aproximação antes](evidencias/lote8-glb-unico/aproximacao-antes.png) / [depois](evidencias/lote8-glb-unico/aproximacao-depois.png), [rasante antes](evidencias/lote8-glb-unico/rasante-antes.png) / [depois](evidencias/lote8-glb-unico/rasante-depois.png). São fixtures técnicas com caixas suspensas intencionais para testar transformações, não composição artística nem aceite da Faísca.
- Motor: **248 testes**, 5.205 verificações. Molda/export: **133 testes**, 1.675.431 verificações. Oficina: **112 testes**, 757 verificações. Tipagem de motor, Molda e oficina passou.
- Build do playground com Vite instalado 8.3.4 passou; continua o aviso conhecido de chunks acima de 500 kB. Não é medição em aparelhos físicos.
- Regressão do runtime: quatro pacotes com/sem junção e com/sem terreno de catálogo, três ciclos, física, clipes e descarte aprovados. Pacote portátil regenerado da fonte canônica; ZIP com 36 arquivos, 6.153.429 bytes, conteúdo extraído conferido; reabertura local em 308,8 ms. Exemplo sem sessão, caminhada e toque aprovados novamente no Chrome.

## Revisão

Conferidos posse/descarte, cancelamento, recursos compartilhados, TRS/skin/bind e retarget de canais, limites, iluminação, estabilização de imagens, fonte/revisão/licenças e separação entre autoria e destinos. Não há novos controles de navegação ou inventário. A inspeção visual compara a preservação da cena técnica, sem aprovar arte final. Servidor de ensaio reiniciado antes da regressão para garantir os módulos atuais.

Próximo passo exclusivo: contrato de preparo autorizado no Members e hosts equivalentes, depois interface completa de exportação. **Implantação e validação remotas somente no encerramento global, como solicitado.**
