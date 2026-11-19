# Lote 8.3 — Interface de exportação e arquivos baixados

19/11/2026. Continuação da `staging` em `531756c8f`. A interface utiliza o compilador, o runtime portátil, o GLB único e o preparo autorizado já revisados nos checkpoints anteriores. Raylib/Estúdio e publicação pertencem a 8.4/8.5; não fazem parte deste fechamento de 8.3.

## Implementação e revisão

A ação Exportar está nos cartões do mundo e no cabeçalho da oficina. O diálogo nativo reutiliza componentes, tipografia, cores e temas do Molda. Exibe cenário/revisão, destino, bibliotecas usadas e licenças nominais, junção estática opcional por região, progresso, cancelamento, erro/repetição, medidas reais e download. Os únicos destinos oferecidos neste recorte são os dois já implementados: pacote Three e GLB único.

A oficina bloqueia a abertura enquanto há edição transitória, gesto, prévia, operação ou salvamento pendente. O fluxo confere novamente autorização, revisão e digest antes de cada geração. Alterações no controlador invalidam o preparo e o resultado anterior. Atalhos do editor não atuam por trás de diálogos modais. Exportar não modifica a autoria nem cria uma publicação.

O compilador recebe os recursos do espaço autorizado. Peças com propriedades opacas de jogo conservam sua hierarquia, pois um consumidor pode movimentá-las; personagens animados também não são assados na junção. Os limites são verificados sobre os recursos efetivamente compilados. Medidas do arquivo e avisos específicos do formato aparecem antes do download. O nome baixado não admite caminhos, controles ou extensões fornecidas pelo nome do cenário.

Cancelar ou fechar aborta o trabalho cooperativo. A fila compartilhada impede empilhar encoders quando um diálogo é fechado e reaberto antes de terminar o descarte anterior. Respostas antigas não substituem a execução atual. URLs de download são revogadas ao trocar opções, fechar ou invalidar a revisão. O estado final retém apenas o endereço e as medidas, sem conservar o pacote intermediário.

A revisão encontrou e corrigiu duas causas de perda de foco no ciclo modal. Em StrictMode, `close()` enfileirava um evento que chegava depois de o diálogo reabrir; o evento agora só fecha uma janela realmente fechada. Além disso, desabilitar o botão invocador durante a abertura removia seu foco antes da captura; o modal nativo já torna o fundo inerte, portanto o invocador permanece disponível para a restauração correta. Os ensaios finais executam a oficina inteira em React StrictMode.

## Evidências locais

[Resultados dos oito ensaios](evidencias/lote8-interface/resultado.json), em Chrome instalado, cobrem 1440×900, 1024×768, 768×1024 e 390×844 nos temas claro e escuro. Toque foi exercitado nos dois tamanhos menores; isso é emulação, não aprovação de desempenho em aparelhos físicos. Abertura pelos cartões e pela oficina, foco modal/restauração, ausência de rolagem horizontal, controles de ação com pelo menos 44 px e autoria preservada foram conferidos.

O cenário de prova usa modelos reais do Reino, Adventure Land e Cute Characters, relevo, água de catálogo e procedural, três caminhos, conjunto transformado, textura própria e marcadores. Não é uma aprovação artística da Faísca. Os downloads Three contêm 35 arquivos e 6.152.059 bytes, com fonte/revisão/digest preservados. O GLB baixado tem 7.414.896 bytes; o validador Khronos retornou zero erros e zero avisos. Sua reabertura pelo carregador recuperou quatro animações e seis malhas com esqueleto, além da mesma identificação da fonte.

Foram exercitados falha de recurso e repetição, cancelamento com resposta atrasada, fechamento/reabertura sem encoders simultâneos, cartão com revisão antiga recusado e reabertura da revisão atual, salvamento pendente e atalhos durante o modal. Não houve erro de página. O console registra a normalização de atributos de normais feita pelo GLTFExporter em modelos do acervo; esse aviso é registrado, sem ser confundido com um aviso Khronos nem ocultado por alteração do modelo original.

Capturas: [preparo](evidencias/lote8-interface/1440-900-light-preparo.png), [ZIP pronto](evidencias/lote8-interface/1440-900-light-pronto.png), [GLB](evidencias/lote8-interface/1440-900-light-glb.png), [revisão divergente](evidencias/lote8-interface/1440-900-light-revisao-divergente.png), [oficina escura](evidencias/lote8-interface/1440-900-dark-oficina.png), [celular claro](evidencias/lote8-interface/390-844-light-pronto.png), [celular escuro](evidencias/lote8-interface/390-844-dark-oficina.png). [Vídeo curto do fluxo](evidencias/lote8-interface/exportar-oficina.mp4). As demais resoluções estão na mesma pasta. Arquivos licenciados GLB/ZIP e a fixture autoral com bytes do acervo permanecem somente no `output` local.

## Verificação de fechamento

**8.3 implementado, testado e revisado localmente.** A regressão passou com **803 testes, zero falhas e 17.315 verificações**, abrangendo núcleo, motor, oficina, serviço/histórico/HTTP Members, BFF e gateway. Biome conferiu os 14 arquivos de código alterados, sem erros. Tipagem da oficina e do member-shell passou em sequência, usando o heap de 6 GiB já adotado no CI. Build Vite 8.3.4 passou, mantendo o aviso conhecido de chunks acima de 500 kB; compilação/encoders e runtime portátil continuam carregados sob demanda.

O runtime reproduzível manteve SHA-256 `0a9ed85ce3544ef030d28d9847c70bda3320b0f2c69fd41ed59d6f8c2f4a7b65`. O [ZIP efetivamente baixado](evidencias/lote8-interface/portatil.json) foi extraído, conferido e aberto por outro servidor estático: 84 leituras de recursos sem cookies/autorização, nenhuma origem externa e nenhum erro. A exploração percorreu 1,70 m pela física existente sem cair; pausa, retorno ao início e controles móveis passaram. O conteúdo extraído ocupa 9.847.828 bytes. Esses ensaios não afirmam equivalência de desempenho com celulares físicos.

Próximo recorte exclusivo: **8.4 — Python/Raylib e Estúdio nos quatro destinos**. O lote 8 permanece aberto.

Nenhuma implantação foi validada neste recorte. O encerramento global continua exigindo todos os lotes, composição final da Faísca, full review, CI, implantação e validação em staging. Não houve publicação de cenário, concessão de progresso ou abertura da ferramenta a membros.
