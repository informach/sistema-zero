# Abertura regional com admissão antes do gesto

Base `3f0c4dfdc`. O autosave atual já grava por diferença de uma base que o editor conserva inteira.

- Abrir uma sessão pela chave da criação. Fixar revisão, namespace, espelho e recursos em uma leitura de diretório. O estado consumido pela tela contém geometria e camadas para exibição, sem payload de documento autoral.
- A câmera lê os chunks visíveis na revisão da sessão. O lápis, a borracha, as formas e o terreno calculam a região do gesto antes de carregar seu conteúdo. O terreno inclui a vizinhança aceita pelo mesmo algoritmo do editor. Uma entrada ausente no diretório certificado significa uma região vazia. Uma entrada presente exige seus bytes.
- Empregar o CAS regional existente para conferir a revisão e os recursos e atualizar diretório, chunks tocados, espelho e quota. A sessão só muda de revisão após a confirmação. Um conflito anterior à autoria deixa o gesto disponível para decisão explícita e impede substituir a revisão de outra aba.
- Guardar reversões limitadas aos chunks e metadados alterados no orçamento de histórico do editor. Desfazer e refazer conferem a mesma base no CAS. Exportação e captura pedem dados completos pela autoridade.
- Conectar a abertura focal ao editor existente sem promover um formato de arquivo ou protocolo. Operações que precisam de um documento integral sobem pela autoridade completa com uma revisão conferida.

O aceite em Chromium começa por um mapa que ainda não foi hidratado. Mede abertura, câmera, primeiro traço e reabertura offline para uma galeria com um mapa de 2.048 chunks e outra criação grande. Confere RGBA, terreno cruzando chunks, histórico, interrupção durante IDB e recusa de uma revisão concorrente. A prova separa os chunks lidos por etapa e verifica a autoria preservada fora da janela.

## Prova da primeira edição

O ensaio em Chromium desktop em 22 de novembro de 2026 abriu o `TilemapEditor` pela porta focal em uma galeria de dois mapas regionais, cada um com 2.048 chunks. A abertura retornou metadados e leu sete registros e zero chunks. A câmera inicial leu quatro chunks de 2 KiB. A câmera deslocada leu seis. O primeiro arrasto atravessou dois chunks e leu 4 KiB durante a gravação. Desfazer e refazer leram os mesmos dois chunks. Outra criação da galeria e uma casa distante do mesmo mapa conservaram seus bytes. A reabertura offline leu zero chunks na admissão e oito na primeira pintura, enquanto a geometria do palco se estabilizava. Uma segunda aba confirmou uma mudança na mesma região e o CAS da sessão antiga recusou o gesto com zero leituras de chunks.

Os contadores e durações da execução estão em `docs/pinta-cenarios/revisao-2026-11-18/qa/autoria-regional-2026-11-22/primeiro-gesto.json`. O tempo do primeiro gesto inclui o arrasto e o salvamento. A execução ocorreu na mesma máquina Windows do perfil de autosave.

```powershell
$env:PINTA_AUTHORITY_PORT='5492'
bun --no-env-file x playwright test --config=playwright.pinta-physical-regions.config.ts --project=desktop --grep='cold map editor admits viewport'
```

## Abertura pela Oficina local

O clique no cartão usa a sessão focal quando a persistência local oferece a leitura por diretório e o perfil é compatível. A galeria mantém os cartões regionais separados dos assets completos. A capa pinta um recorte real perto de um chunk ocupado e libera a memória temporária. O backup continua lendo a autoridade completa, e a captura do desenho no editor confere a revisão salva antes de abrir as opções de download.

O editor focal reúne lápis, borracha, linha, retângulo, terreno e histórico. O botão Avançado abre as ferramentas que precisam da criação inteira. A galeria conserva o inventário completo enquanto um editor que pode remapear peças estiver aberto. Edições de objetos continuam disponíveis nesse editor. Conta, formatos fora da política rápida e relações que exigem um inventário integral usam a autoridade correspondente.

Execute em `packages/studio`. O ensaio de ponta a ponta usa `--project=desktop --grep='the workshop gallery opens and edits'`. Ele abre o cartão, guarda o primeiro lápis na galeria offline e reabre o mesmo desenho, contando as chamadas às APIs de inventário e documento completos.
