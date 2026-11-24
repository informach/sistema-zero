# Lote 8.4 — Pacote Raylib e auxiliar oficial

19/11/2026. Continuação da `staging` em `1ba3f0193`. **8.4 permanece aberto:** este checkpoint registra o pacote/auxiliar Raylib. Ainda faltam a importação pelo produto, `scene3d` e os quatro destinos de blocos do Estúdio. Não é fechamento do lote 8 nem validação de implantação.

## Implementação

O destino Python/Raylib utiliza a mesma cena compilada e a junção estática compartilhada por região/material. O pacote contém os GLBs em `models/`, `cenario.json`, um módulo de dados com identificador Python portátil, `cenario.py`, `main.py`, requisito `raylib==6.0.1.0`, instruções e licenças nominais. As medidas da interface refletem o pacote resultante. Personagens e peças com propriedades de jogo permanecem separados. Nomes autorais são dados, não código Python interpolado.

`cenario.py` é uma fonte canônica do Estúdio. Integra o contrato do módulo Raylib, sua distribuição para navegador e o gerador existente de fontes para exportação. A exportação desktop o coloca junto ao entrypoint, registra os arquivos gerados e conserva módulos/pacotes da pessoa, inclusive conflitos de case. O módulo oficial é reconhecido somente com a extensão Raylib; o próprio `cenario.py` da pessoa mantém precedência.

O auxiliar confere inventário, caminhos locais, tamanhos, digests, matrizes, volumes e alturas antes de carregar os modelos. Compartilha modelos estáticos, mantém instâncias de esqueleto separadas e aplica matrizes completas. `dados` conserva fonte, entidades, propriedades, marcadores, águas, caminhos e demais metadados. As consultas de chão usam os mesmos valores Float32 e a mesma interpolação triangular, peças, recortes e máscara de buracos do núcleo.

`colide_caixa` é consulta de AABBs aproximadas, com filtro de tipos/entidades. Não se apresenta como física de malha. Água é estática; céu, luzes e névoa ficam como dados para o programa. O exemplo usa câmera livre para inspecionar também cenas cujo início fica sobre água ou uma ponte; o programa conecta as consultas de chão/caixas às suas próprias regras. O auxiliar não cria outro controlador ou motor de jogo.

## Correções encontradas na execução real

- O Raylib 6 não descarrega as texturas dos materiais ao descarregar um modelo. O auxiliar registra cópias dos handles de texturas que ele carregou, deduplica IDs e as libera após os modelos, preservando a textura padrão. O teste reproduziu retenção `1 != 0` antes da correção e passou depois. O log nativo confirma a liberação das 22 texturas do cenário de prova.
- O avatar compilado tinha seis vínculos do mesmo esqueleto: juntas e matrizes de ligação eram idênticas, mas havia um registro por malha. O exportador consolida somente equivalentes na cópia Raylib, mantendo BIN, acessores, clipes e transformações. Esqueletos distintos são recusados explicitamente nesse destino; não se perde o segundo silenciosamente. A origem e os formatos Three/GLB continuam intactos. O normalizador usa os leitores limitados e o escritor GLB existentes do Molda.
- As consultas respeitam a altura de fundo de uma peça ausente na cobertura em grade e a convenção dos buracos nas bordas externas. Há teste de regressão da diferença de altura e comparação com o núcleo sobre o pacote real.
- O contrato de metadados do tutor passou a reconhecer `cenario` entre os módulos autorais que sombreiam o oficial. A tipagem encontrou a divergência entre produtor/consumidor; os testes de contexto reproduziram a recusa e passaram depois de atualizar o enum estrito compartilhado, sem aceitar nomes arbitrários ou enviar código privado ao tutor.

## Ensaios

O cenário técnico tem terreno com pintura, buraco/recorte, lago do Reino, ponte Adventure Land, água procedural, três caminhos, conjunto transformado, avatar Cute Characters e marcadores. Não é avaliação artística da Faísca.

O destino foi baixado e conferido nos quatro layouts, claro/escuro, incluindo toque em emulação, revisão/licenças e recursos temporários. A rodada final repetiu os oito casos depois das correções, com o pacote definitivo: **34 arquivos e 5.848.985 bytes**, 20 nós e 17 modelos visuais carregados, com recursos estáticos compartilhados. [Resultados completos](evidencias/lote8-raylib/interface.json), [desktop](evidencias/lote8-raylib/1440-900-light-raylib.png), [celular escuro](evidencias/lote8-raylib/390-844-dark-raylib.png) e [vídeo](evidencias/lote8-raylib/exportar-raylib.mp4).

A execução nativa em janela oculta, no Windows com Raylib **6.0.1.0**, e o módulo real de desenho/transporte do Estúdio em CPython deram os mesmos resultados: **441 consultas de altura por runtime, diferença máxima zero contra o núcleo**, quatro clipes e matrizes dos 44 ossos com diferença máxima zero no quadro amostrado. Passaram três ciclos de carregar/desenhar/descartar: as **66 texturas nativas** foram liberadas uma vez por carregamento; o contador do motor Python voltou a zero. Não houve avisos/erros no log nativo final. [Comparação e contagens](evidencias/lote8-raylib/comparacao.json), [captura nativa](evidencias/lote8-raylib/native.png). Essa comparação não afirma equivalência de todos os quadros ou de todas as possíveis animações.

O `main.py` efetivamente baixado também executou no Raylib nativo. O harness limitou o loop a três quadros e omitiu somente a captura do cursor em janela oculta, sem editar os arquivos do pacote. [Recibo e hash do exemplo](evidencias/lote8-raylib/exemplo-native.json); não é aprovação de conforto de câmera ou de interação prolongada.

A fonte oficial também executou no **Pyodide/WebGL do Estúdio, em Chrome**, com os bytes reais do pacote: carregamento dos 20 nós, quatro clipes, desenho e descarte, estado final `completed`, sem erros de página. Outro programa comprovou a precedência do módulo autoral. [Resultados](evidencias/lote8-raylib/pyodide.json), [canvas real](evidencias/lote8-raylib/pyodide-cenario.png). A fixture prepara dois binários pequenos no filesystem por código; **isso não substitui o fluxo de produto Trazer do Molda**, ainda pendente no recorte de importação.

A distribuição foi construída pelo Bun pinado **1.3.11**, hash `2ae94d87985625238aed66db84e18f06d757e55bea91e7c20c390347e676363d`, com 126 arquivos. O servidor de qualificação Windows usou Bun **1.4.3 isolado**, conforme o contrato existente do harness sobre handles de sockets; nenhum pin global/CI foi alterado. Não houve ativação dessa distribuição no catálogo da plataforma.

## Verificação e revisão do recorte

Regressão final: **810 testes, zero falhas e 17.561 verificações**, nos pacotes de núcleo/motor/oficina, módulos Raylib/distribuição Python, exportadores Python, GLB do Molda e contexto do tutor pertinentes. Biome conferiu 27 arquivos, sem erros. A suíte Python do novo auxiliar executa oito casos reais dentro do teste CPython. Tipagem completa do Estúdio e da oficina passou em sequência; build Vite 8.3.4 passou, com o aviso conhecido de chunks acima de 500 kB. Fontes Python geradas e runtime portátil reproduzível foram conferidos.

A exposição do escritor GLB já existente no subpath público do Molda mudou a ordem dos módulos no empacotamento portátil. O artefato foi regenerado da fonte canônica, SHA-256 `7d66f2567a028af248087cb96c3789f68cc2e10f86e76fbf291559dc498143a6`, com as mesmas três dependências e 1.106.050 caracteres. O [novo ZIP Three baixado pela interface](evidencias/lote8-raylib/three-sem-sessao.json) reabriu por servidor estático sem sessão: 35 arquivos, 6.152.064 bytes, 84 leituras sem cookies/autorização, nenhuma origem externa e zero erros; caminhada, pausa/retomada e controles móveis passaram novamente. O GLB único também reabriu na rodada final. Não há afirmação de desempenho em celulares físicos.

Revisados fronteiras de dependência (a oficina acessa somente a entrada de fontes Raylib do Estúdio), identidade fonte/revisão, junção e hierarquia, conversão sem perda de esqueletos equivalentes, recursos nativos/temporários, precedência autoral, serialização/caminhos, orçamento e limites reais do destino. GLBs/ZIPs licenciados, a fixture com os bytes do acervo e os binários do venv continuam somente em `output`.

**Recorte de pacote/auxiliar Raylib implementado, testado e revisado localmente. 8.4 continua aberto.** O próximo recorte é `scene3d`, dependências e importação atômica, seguido dos quatro motores de blocos e do fluxo Python Trazer do Molda. Publicação, lotes 9–10, composição final, full review, CI e implantação/validação de staging seguem pendentes.
