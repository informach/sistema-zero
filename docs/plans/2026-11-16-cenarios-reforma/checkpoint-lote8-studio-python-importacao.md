# Lote 8.4 — Preparo, fontes e commit Python

19/11/2026, continuação da `staging` em `d98349501`. **8.4 continua aberto.** Este recorte conecta a importação Python ao preparo e ao store existentes. Adapter/interface e quatro motores de blocos ainda não estão concluídos.

## Implementado

O preparo aceita projetos Python com Raylib 3D. Os recursos novos usam arquivos por hash em `cenarios/modelos`, `cenarios/imagens` e `cenarios/dados`; os existentes conservam ID, nome e caminho. O manifesto compilado conserva seus caminhos lógicos. Dois caminhos com o mesmo conteúdo podem apontar ao mesmo asset/arquivo físico, sem duplicar bytes ou alterar a cena.

Um módulo portátil com nome livre é gerado junto ao entrypoint. Ele resolve a raiz pelo próprio `__file__`, lê o envelope e entrega o mapa físico ao auxiliar oficial `Cenario`. Não depende do diretório atual para localizar a cena. `main.py`, outros módulos e módulos gerados já editados são preservados; reimportação idêntica não grava outra revisão. O metadado fechado `cena3dPython.modulo` registra o arquivo para a interface e acompanha o manifesto de assets Python.

Módulos/pacotes autorais chamados `cenario` mantêm prioridade e geram aviso. O preparo não tenta substituí-los nem capturar uma incompatibilidade de API para usar outro auxiliar silenciosamente. Arquivos/pastas em conflito, limites do workspace, falhas e cancelamentos impedem o commit inteiro.

A conversão de skins saiu para a entrada CPU compartilhada `motor/raylib`; o exportador mantém sua reexportação. O Estúdio usa a mesma conversão, sem Studio→Oficina, duplicação do algoritmo ou compilador completo no consumidor. Somente vínculos equivalentes são consolidados; BIN, clipes e fonte permanecem intactos. O pacote transformado é conferido novamente antes de virar assets.

O store reconstrói e verifica o plano, incluindo as fontes propostas, antes de aplicar arquivos e assets em uma única atualização. Uma reimportação sem mudanças não marca o projeto como editado.

## Achados da revisão

- Colisão entre um arquivo autoral `cenarios` e a pasta pretendida é recusada antes da busca de nomes de módulos, preservando os arquivos e informando a causa.
- Uma alteração no próprio objeto do projeto durante a última espera assíncrona podia escapar à comparação por identidade. A regressão reproduziu o commit incorreto. O store captura o conteúdo base e o compara sincronamente após a última espera, antes da atualização; os módulos necessários são carregados antes do preparo final. Não há nova espera entre essa conferência e o commit.
- Caminhos físicos e conteúdo usados por um módulo Python ficam fixos enquanto a cena permanece no projeto. Renomear o rótulo continua permitido. Isso protege tanto o manifesto quanto suas dependências contra alterações de workspace que deixariam o mapa gerado desatualizado.
- O orçamento de projetos grandes decodificava e calculava hash de materiais que não podiam ser reaproveitados pela cena. O preparo agora considera os tipos necessários e reaproveita a decodificação na mesma operação, mantendo contagem de bytes reais e os limites originais. O teste de 24 MiB voltou a passar sem elevar timeout ou cotas.

## Provas já executadas

- 67 testes do Estúdio, 405 asserções: preparo/limites, preservação, reimportação, módulos autorais, aliases, pasta ocupada, conversão compartilhada, commit/tampering, alteração tardia, documentos, registry e export web.
- 609 testes de núcleo/motor e exportação Raylib, 15.857 asserções. Tipagem isolada do motor aprovada.
- Cena técnica real: 20 nós, 25 partes, 28 assets e orçamento de 8.715.621 bytes. Classic e Pro passaram pelo store em uma atualização, foram serializados/reabertos e exportados. O Pro usa `src/main.py`, exercitando a resolução da raiz e o auxiliar junto ao entrypoint.
- Os dois exports executaram no Raylib nativo **6.0.1.0** em janela oculta; os dois projetos reabertos executaram no Chrome/Pyodide/WebGL com o runtime local qualificado no recorte anterior. Desenho, quatro clipes e descarte passaram; a precedência autoral foi repetida.
- As capturas do navegador são colhidas num pedido explícito de entrada antes do descarte, não depois do fechamento da janela. O ensaio confere o PNG de 640 × 420 antes de responder e permitir a conclusão. [Classic](evidencias/lote8-studio-python-importacao/classic.png), [Pro](evidencias/lote8-studio-python-importacao/pro.png), [registros](evidencias/lote8-studio-python-importacao/pro-browser.json).
- Tipagem integral do Estúdio e tipagem isolada da oficina/motor aprovadas. A primeira conferência encontrou anotações que escondiam a mutabilidade da cópia do pacote e o tipo de seu buffer; foram corrigidas para representar a cópia local com precisão, sem cast ou supressão.
- Build real e 29 asserções de orçamento aprovados, sem mudar os tetos: inicial 361.235 bytes/117.140 gzip; Blocos 4.724.823/1.265.035; Ponte 4.203.805/1.128.399; Código 2.641.974/740.242. O runtime Three portátil continua exatamente em 1.106.050 caracteres, SHA-256 `7d66f2567a028af248087cb96c3789f68cc2e10f86e76fbf291559dc498143a6`.
- Biome dos 14 arquivos TS/JS alterados e `git diff --check` aprovados. Suíte do Estúdio executada a partir do próprio pacote, que configura o `FileReader` necessário ao teste real de junção estática.

Os arquivos GLB/ZIP, projetos privados, runtime compilado e ambiente Python de ensaio ficam em `output`/cache, não no Git. As imagens mostram uma cena técnica e não representam aceite da direção de arte, conforto de animação ou desempenho em aparelhos físicos.

## Pendente antes de fechar 8.4

Conectar a galeria/adapter ao preparo autorizado do host e à ação existente, com lifetime de perfil e cancelamento; validar o botão real em Classic/Pro e Python. Depois integrar e revisar os quatro motores, um por vez. Publicação/perfil, lotes 9–10, composição final, full review, CI e implantação/validação de staging continuam no encerramento global.
