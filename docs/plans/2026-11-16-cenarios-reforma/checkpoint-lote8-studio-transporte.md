# Lote 8.4 — Transporte do cenário no Estúdio

19/11/2026. Continuação do carregador compartilhado de `973bebd82`. Este recorte liga o mesmo carregador ao documento clássico, captura, player, export clássico e conversão para Pro. **Não fecha 8.4:** os quatro motores ainda precisam dos blocos e da integração com seus controladores.

## Implementação

- O transporte carrega o manifesto e os campos de terreno uma única vez, com referências por ID aos canais de imagens e modelos já existentes. Não cria inventário paralelo nem entrega JSON ao GLTFLoader. Os limites originais de arquivos/caracteres e as dependências completas são conferidos antes da montagem; canal incompleto falha em vez de produzir meia cena.
- `window.SZScene3D.carregar(id, sinal, opções)` chama exatamente `carregarCena3DDoProjeto`, empacotado em módulo ESM sem editor/conta. Three, GLTFLoader e SkeletonUtils permanecem externos, compartilhados com o renderer. A geração tem versão fixa, inventário/licenças, hash e `--check` no CI. O coletor de licenças foi extraído do gerador portátil sem mudar aquele artefato.
- O módulo só entra quando há um asset de cenário. Preview do editor, documento do player e captura usam a receita comum, mantendo CSP, sandbox, guardas, hash de scripts e orçamento. O export inclui o módulo antes dos motores e do programa. A conversão para Pro usa a dependência npm compatível e materializa os mesmos canais pelo coordenador existente, sem base64 na árvore autoral.
- O pino dos runtimes passa de Three 0.180.0 para 0.184.0, versão já instalada no Estúdio e motor. Projetos Pro autorais não têm suas dependências reescritas. O consumo direto de cenários em projetos Pro autorais permanece uma tarefa explícita antes do fechamento de 8.4.

## Correções encontradas

Os manifestos de imagens, sons e modelos usam dicionários sem protótipo: um nome como `__proto__` não pode desaparecer do canal e quebrar o vínculo do cenário. Os canais continuam com as mesmas chaves, formatos e orçamento.

A conversão de um projeto com cenário, mas ainda sem programa, não deve emitir o aviso de scripts globais com ordem ambígua. A detecção continua protegendo scripts reais no head ou múltiplos scripts globais no body; a ausência de código não impede a conversão. Teste específico cobre o caso e a regressão preserva os casos de HTML existentes.

## Prova de navegador

O projeto usado foi produzido pela galeria real do ensaio anterior. `preparar-documento.ts` monta o documento pelo renderer canônico e o site pelo exportador clássico; `verificar-documento.mjs` executa ambos, sem instalar outro carregador no teste.

- Preview em iframe `sandbox="allow-scripts"`, origem opaca `null`, CSP `strict`, `connect-src 'none'`, imagens `data:`/`blob:` e scripts autorizados por hash. SHA-256/WebCrypto funciona nessa origem sem polyfill.
- Preview e site exportado: 20 nós, duas águas, três caminhos, quatro clipes e 44 ossos com matrizes finitas. Cada um faz três ciclos; as 441 consultas de altura/recorte por ciclo coincidem com o Raylib nativo em 1e-6 m. `instanceof` confere a mesma instância de Three tanto na cena quanto nas malhas animadas.
- Cada ciclo desenha 34 chamadas/35.174 triângulos, com 23 geometrias/20 texturas. Após descarte ficam estáveis os caches do renderer (uma geometria/uma textura); o descarte final volta a zero. Colisões/filhos são liberados. Cancelamento antes/durante o carregamento e alteração de um byte de terreno são recusados.
- Sem fetch/XHR de cena ou erros de script/CSP. O ensaio serve as implementações reais instaladas do Three/addons nas URLs pinadas para controlar a disponibilidade do CDN; isso não comprova disponibilidade da internet. O site exportado roda como página, sem o sandbox do preview. Seu service worker é bloqueado no contexto de ensaio em memória; a atualização/cache offline do PWA não é validada por esta prova.
- Capturas mostram uma cena técnica, não a composição artística final da Faísca. Não são prova de desempenho em aparelhos físicos.

Evidências: [preview isolado](evidencias/lote8-studio-transporte/preview.png), [site exportado](evidencias/lote8-studio-transporte/export.png), [recibo completo sem bytes de arte](evidencias/lote8-studio-transporte/documento.json).

## Qualificação e limites

Tipagem integral do Estúdio aprovada, sem supressões. Os testes de transporte, ponte, documento e export verificam também ausência de duplicação dos GLBs, arquivos faltantes, nomes hostis sem injeção de scripts, preservação dos IDs, Pro e ausência do módulo em jogos comuns.

Build/orçamento aprovado com os limites originais: carga inicial 365.070 bytes/118.282 gzip (dois arquivos); Blocos 4.730.125/1.267.086 gzip, Ponte 4.209.110/1.130.459 gzip e Código 2.647.226/742.262 gzip. O módulo de cenário permanece lazy. A primeira execução do teste ultrapassou seu deadline e não produziu medição; a repetição serial passou em 14,42 s. Não foram alterados deadline ou limites de bytes.

Regressão combinada: 2.187 testes aprovados, um teste preexistente do Pinta falhando (abaixo), 35.245 asserções em 123 arquivos. Inclui os quatro motores atuais, a auditoria Canvas 3D, preview/capa/export e conversão. Os dois testes que fixavam a antiga versão do Three foram atualizados para o contrato novo; não se trata de alterar uma dependência de projeto autoral.

Geração reproduzível conferida: novo módulo com 499.964 caracteres, três imports externos e SHA-256 `0347fda9991019b53ae4e0780e5acea2a3af32e71391884be5f463abc35df5f7`. Runtime portátil anterior permanece byte idêntico: 1.106.050 caracteres, SHA-256 `7d66f2567a028af248087cb96c3789f68cc2e10f86e76fbf291559dc498143a6`.

A regressão encontrou um teste de tamanho do Pinta já falhando na própria `staging` commitada: `sceneDocumentBytes.test.ts` espera diferença menor que 74.000 bytes e recebe 83.871. A comparação com os arquivos originais de HEAD reproduziu exatamente o mesmo resultado, com os arquivos de trabalho restaurados byte a byte. Não foi alterado limite, teste ou runtime do Pinta para ocultar essa falha. Os logs completos e projetos privados permanecem em `output/cenarios-reforma/lote8-raylib`.

## Próximo recorte

Implementar/testar/revisar Mundo 3D, depois Canvas 3D, Jogo 3D e Jogo 3D Avançado. Qualificar também o consumo direto por projetos Pro autorais, além da conversão já testada. Publicação, 8.5/8.6, lotes 9–10, composição final, full review global, CI e implantação/validação em staging permanecem no encerramento global.
