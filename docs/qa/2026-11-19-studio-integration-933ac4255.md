# Integração do transporte 3D — origem 933ac4255

## Referências e escopo

Base da branch de integração: `76c2a2d54`, qualificada em 12/12 jobs no run GitHub `44515314703`. Backup local: `backup-estudio-before-933ac4255-20261119`. O merge de `origin/staging` em `933ac4255` foi preparado sem conflitos na branch isolada `estudio-missao-completar-20261118`; não houve merge em staging/main nem deploy.

A mudança técnica remota é `d8add3ca9`: transporte das cenas 3D no documento da prévia, captura e exportação, com um módulo lazy gerado do carregador canônico. A atualização também contém materiais do curso dos pais, preservados pelo merge; este relatório não afirma revisão editorial integral desses materiais.

## Revisão do contrato

- Cenas referenciam IDs estáveis. Imagens e GLBs continuam nos canais existentes, sem duplicar seus bytes na estrutura transitória. Tipo, orçamento, arquivos ausentes e relações do grafo são conferidos antes de executar.
- O módulo de cenas é carregado somente quando há um cenário. Seus imports usam o mesmo Three do renderer; o pino do runtime clássico passa para 0.184.0. Dependências de projetos Pro autorais não são reescritas.
- A montagem canônica é compartilhada por prévia/player/capa/export. Permanecem CSP, sandbox, origem opaca, hashes de script e rede fechada. Testes incluem nomes hostis, ausência de dependência e nomes que coincidem com propriedades do protótipo.
- O código gerado não contém estado de conta nem materiais do aluno. A revisão reproduziu seus **499.964 caracteres**, três imports externos e SHA-256 `0347fda9991019b53ae4e0780e5acea2a3af32e71391884be5f463abc35df5f7` com `generate-scene3d-runtime.ts --check`.

## Prova pública reproduzível acrescentada

Comando em `packages/studio`:

```text
bunx playwright test --config playwright.scene3d-document.config.ts
```

`serve-scene3d-public-proof.ts` produz um terreno físico plano e um GLB geométrico por meio dos comandos, compilador e importador existentes. Não lê os arquivos privados usados no ensaio remoto. Prepara o documento pelo renderer real e o site pelo exportador clássico; os testes não instalam outro carregador.

O teste usa os mesmos bytes instalados do Three/addons nas URLs autorizadas para controlar a disponibilidade do CDN. A prévia roda num iframe `sandbox="allow-scripts"`, origem `null`, sem conceder `allow-same-origin`. O site exportado roda como página. Somente no site o service worker fica bloqueado pelo contexto de teste: o próprio bloqueador do Playwright lança erro ao consultar essa API em um iframe opaco. Esse erro da configuração inicial foi corrigido sem filtrar exceções nem abrir o sandbox.

Cada execução verifica os dois nós emitidos pelo compilador (terreno e modelo), a mesma instância de Three, altura zero com precisão de seis casas, chamadas reais de desenho, três ciclos de carregar/desenhar/descartar e cancelamento. Confere ausência de fetch/XHR de cena, exceções e erros de console/CSP. A primeira versão da expectativa contava somente o modelo; a prova foi corrigida para exigir os IDs completos do documento compilado, incluindo o terreno, sem descartar objetos.

Resultado final Chromium local: **2 testes aprovados, 5,2 s**, sem retries. Cada ciclo desenhou **três chamadas / três geometrias / uma textura**; após descarte ficaram **zero geometrias / uma textura do renderer**, estáveis nos três ciclos. Após descarte do renderer: **zero geometrias e zero texturas**. As árvores de colisão e os filhos da cena voltaram a zero.

Recibos e PNGs reais do quadro desenhado são escritos em `.cache/mission/scene3d-document-results/` e anexados ao resultado. A imagem foi inspecionada: terreno plano e modelo geométrico, sem arte privada. A captura ocorre antes do descarte, não depois de perder o contexto gráfico. O servidor de prova usa a Response nativa do Bun, capturada antes de registrar o DOM de preparação.

O workflow da missão agora confere a geração canônica e executa esta prova na shard Chromium Linux, preservando os artefatos no diretório da missão.

## Gates locais

- Transporte, exportação, documento, ponte, conversão e PreviewIframe: **56 testes / 225 asserções**, aprovados.
- Regressão de Three, Jogo 3D, Mundo 3D, Jogo 3D Avançado, prévia, captura e exportação: **2.257 testes / 35.264 asserções / 143 arquivos / 46,76 s**, sem falhas.
- Gate de build/grafo: **43 asserções**, tetos originais preservados. Medição capturada: inicial **366.205 bytes brutos / 119.325 gzip / dois arquivos**. A referência 76 tinha 119.332 gzip; a diferença de sete bytes não é apresentada como ganho significativo de desempenho.
- Blocos: **4.736.095 / 1.269.289 gzip**; Ponte: **4.215.080 / 1.132.687 gzip**; Código: **2.653.200 / 744.541 gzip**. O módulo de cenas permanece lazy. Essas medidas são tamanhos de bundles, não latência do editor ou FPS.
- Biome dos novos arquivos de prova e tsconfig aprovado; workflow YAML carregado pelo Bun e presença do novo passo conferida.
- Typecheck completo final aprovado após as alterações da prova. Cursos protegidos: **15 testes / 43 asserções** com Blockly real e **43 / 192** na matriz documental, aprovados nesta integração.

## Pendências e limites

A revisão exata ainda precisa de CI após o commit do merge. O armazenamento padrão desta branch continua v3; o laboratório v4 é separado. Há falhas de instalação Ubuntu nas rodadas v4 recentes, distintas dos testes do produto.

Este ensaio não comprova consumo direto em um projeto Pro autoral, integração completa dos controles de cada motor com cenas, streaming de regiões, mundos extensos, animações complexas, publicação/PWA offline, disponibilidade do CDN, orçamento de heap prolongado ou hardware físico de entrada. As evidências privadas recebidas são históricas e não são atribuídas a esta execução. A missão global continua aberta.
