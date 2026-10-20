# Pinta em projetos Python — representação portátil e importação segura

Este lote fecha R17 da proposta já autorizada. O Pinta continua sendo a origem editável; o projeto guarda a imagem escolhida e sua receita. Turtle usa a API oficial com arquivos PNG/GIF, no navegador e na exportação nativa. Não se acrescenta um decodificador SVG ao Turtle nem um motor de mapas JavaScript ao Python.

## Evidência que motivou o lote

Auditoria e reprodução em `.cache/studio-python-l0/pinta-python-integration-review-r1/`: vetor real aceito em Classic/Pro falhava ao materializar; a referência de quadro do exportador comum produz a folha completa; importar depois de fechar/desmontar ou trocar A→B ainda gravava no projeto. O materializador usa os mesmos bytes para executar, publicar e exportar, portanto esses problemas não são apenas de apresentação.

O sublote independente do decoder já aceita o charset UTF-8/US-ASCII usado pelo Pinta, sem transcodificação nem alteração do `atob`. RED preservado;32testes/265asserções e revisão independente sem P1/P2. Outros parâmetros/encodings continuam fora do contrato. Fonte normativa do cabeçalho: [RFC2397](https://www.rfc-editor.org/rfc/rfc2397/). Isso preserva o SVG original; não o torna uma imagem Turtle.

## A — limites assíncronos

- Capturar intenção de importação, adapter, autoridade, projeto e escopo de armazenamento. Fechar, desmontar, trocar adapter/posse, projeto ou namespace revoga a intenção antes do commit. A→B→A também deve revogar; edição comum do mesmo documento não precisa cancelar o import.
- Usar os mecanismos existentes de owner/epoch/storage scope. Exclusão mútua síncrona; resultado tardio não grava, não chama `onImported` e não atualiza a modal antiga. AbortSignal é complementar ao fence.
- Host captura namespace explicitamente. Pinta usa a mesma instância de persistência para fonte e dependências durante o pedido. Nunca salvar um payload lido do perfil novo no perfil antigo.
- Fechar a intenção de anexar não apaga um desenho canônico que já tenha sido salvo corretamente na biblioteca pessoal original.
- Testar modal/store reais, troca de namespace/adapter e origem dos dados, além da regressão JS. Review antes de B.

## B — fonte, receita e derivação

### Responsabilidades

Pinta lê e prepara sua fonte; host liga os contratos por subpaths; Studio seleciona e guarda o resultado no projeto. Não criar dependência direta Studio→Pinta. O default do exportador comum e o payload da biblioteca pessoal continuam canônicos para JS.

O derivador deve ser pequeno e específico, separado de `buildStudioPayload` quando este contrato produzir folha/metadados de motor JS. Reutilizar os renderizadores existentes de pixel/vetor/mapa. Importação e sincronização fazem a derivação; execução, teclado, frame do jogo e exportação apenas usam os bytes capturados.

### Receita versionada

Contrato estrito opcional no material do projeto, sem defaults adicionados a documentos antigos:

- Versão da receita e do algoritmo.
- Origem Pinta e identificador do desenho, fingerprint da fonte capturada e das dependências relevantes, incluindo tileset de mapa.
- Operação discriminada: cenário achatado, quadro de animação, peça de tileset ou mapa completo achatado.
- Seleção e escala explícitas; dimensões e SHA do PNG efetivamente gerado.
- `animationId + frameIndex` é seleção **por posição**. Os quadros atuais do Pinta não têm identidade estável; não inventar garantia de seguir um quadro após reordenação. Se animação/posição desaparecer, preservar último PNG e pedir nova escolha. Nunca escolher quadro zero silenciosamente.

`libId` mantém o vínculo ao desenho original para Editar. A identidade do derivado considera origem e receita: dois quadros do mesmo desenho coexistem. Atualizar um derivado mantém assetId/nome/proPath. Metadados de folha/tileset do motor JS não podem ser anexados como se descrevessem um quadro PNG isolado.

Separar na estrutura a receita de seleção, a proveniência da fonte e a descrição da saída. A chave de identidade usa desenho original + algoritmo/operação/seleção/escala; exclui fingerprint/revisão da fonte e hash/dimensões resultantes. Assim uma nova edição atualiza o mesmo derivado, em vez de criar outro material a cada revisão. O hash integral dos metadados continua cobrindo todos esses campos.

### Captura coerente

Capturar fonte e tileset como dados validados no namespace original. Preferir leitura atômica do conjunto de chaves, após descobrir a dependência, ou checagem explícita de consistência que recuse uma fonte que mudou durante o preparo. Não misturar revisões nem usar `updatedAt` isoladamente como prova de identidade. Fingerprint representa os bytes nativos capturados, não um hash aproximado de aparência.

### Recursos e desempenho

Definir e testar limites de dimensão, pixels, bytes e quantidade antes de alocar canvas. Reutilizar as quotas aplicáveis já existentes; qualquer limite adicional precisa ser explícito na receita/UI, não um downscale silencioso. Um mapa completo contém sua imagem completa, não o thumbnail da lista. Se exceder o orçamento, oferecer escolha explícita de escala ou recusar com mensagem para a criança.

Fechar ImageBitmap/BlobURL em finally, preservar erro primário e erro de cleanup. Não usar fetch externo, fontes de rede arbitrárias, shell ou conversão remota. Manter paletas, transparência, formas vetoriais/fontes portáteis e camadas visíveis do mapa. Cache por fingerprint+receita+algoritmo; não converter por tecla ou quadro do jogo.

### Gates de B

Pixel e vetor, Unicode/fontes, transparência, dois quadros distintos, animação ausente, peça, mapa full/camada frontal, dependência alterada, quota antes de alocação, cancelamento e descarte de recursos. Testes de integração com os renderizadores reais; mocks de canvas não comprovam pixels. PNG gerado deve ter assinatura, dimensões e hash reais. Review antes de C.

## C — seleção, persistência e sincronização

### Interface

Python oferece uma prévia e escolha coerente com o papel do desenho: imagem de cenário, animação/quadro, peça ou mapa achatado. A escolha é explícita; não apresentar folha inteira como quadro. Frame único não promete animação automática. Usar os controles/estilo já existentes e manter mensagens simples.

A lista pode fornecer metadados leves de seleção. Fonte, permissões e seleção são rechecadas no momento de importar. Uma prévia não concede autoridade para salvar ou executar. AssetsPanel deve distinguir receitas do mesmo desenho e oferecer revisão da seleção sem sobrescrever outra.

### Persistência e fonte portátil

Sanitizer/reader preservam a receita válida e recusam perda silenciosa de receita inválida. O manifesto Python inclui origem/receita e hash de saída, além do hash geral de metadados. Salvar, reabrir, snapshot, remix, fonte ZIP e web levam o mesmo PNG/proPath. Exportar não busca a fonte mais recente e não depende de ter Pinta instalado/aberto.

PNG exportado funciona como arquivo comum no Turtle oficial. A receita não é um documento Pinta editável e não deve ser apresentada como tal. Fonte indisponível em outro aparelho mantém os bytes já salvos e informa que atualizar exige recuperar a origem autorizada.

### Atualização

Biblioteca pessoal guarda o payload canônico; derivados pertencem ao projeto. `personalSync` não pode copiar SVG/folha canônica por cima de um PNG derivado. Resolver de representação vem do adapter/host e serve ao projeto aberto e aos fechados com seus fences/CAS existentes.

Capturar projeto/material/receita/revisão anterior/owner/namespace; preparar representação atual e conferir CAS depois de awaits. Edição manual, remoção, troca de projeto ou de perfil prevalecem. Falha mantém o último PNG e comunica revisão necessária, sem ressurreição nem substituição parcial.

Mudanças do tileset devem invalidar a representação do mapa mesmo sem mudar o timestamp do mapa ou da cópia pessoal. Agrupar a inspeção da mesma origem por ciclo de foco e derivar somente receitas efetivamente alteradas. PUSH/foguete/auto-resync continuam enviando canônico e notificando atualização; a receita do projeto determina o quadro utilizado, independentemente do quadro aberto no Pinta.

Equipe/Pensa não são um atalho para este lote. Um id de cópia de equipe não deve ser tratado como desenho local. Pensa continua JS; qualquer capacidade Python não suportada precisa ser recusada na fronteira apropriada, sem habilitar missões Python por acidente.

### Gates de C

Dois derivados da mesma origem; reabrir/remixar/exportar sem a fonte; atualização de origem e tileset; CAS perdido para edição/remoção; perfil/projeto A→B→A; fechar durante o preparo; adapter/posse revogados. JS conserva SVG/folha/metadados. Exemplos Python oferecem PNG com a API oficial, além de GIF, e respeitam shadowing do módulo turtle.

## D — qualificação e revisão

- Chrome/Edge reais: escolher/importar em Classic e Pro, executar pelo Turtle, editar no Pinta, voltar, atualizar e preservar o outro derivado/JS.
- ZIP fresco fora do monorepo, CPython/Tk oficial: o mesmo PNG e código renderizam, sem módulo adaptador web. Identificar separadamente terminal e UI de VS Code.
- Mural/player anônimo/remix com PNG derivado e bytes/hashes capturados; atualização não muda uma publicação existente sem nova publicação autorizada. Revogação, cancelamento e descarte seguem os contratos existentes.
- Molda Python permanece futuro. Não oferecer uma importação 3D Python que só seja recusada ao final. Pensa permanece JS. Não afetar a oferta existente em JS.
- Gerar/checkar o perfil canônico após o diff e comparar inputs. Se o perfil mudar, construir nova imagem e requalificar SDK; se permanecer256, registrar a igualdade sem transferir automaticamente gates gráficos anteriores ao fluxo Pinta novo.
- Review entre sublotes, correção de achados, verificações afetadas e full review final conforme autorização geral. Nenhum aceite de R17 por teste que apenas confirme a existência de um campo ou por mock do runtime.

## Resultado D: interface e fonte portátil, 20/10

O recorte frontend e exportação passou: quatro fluxos Clássico/Pro × Chrome/Edge, dois casos adicionais de raster e quatro execuções dos ZIPs frescos no CPython3.14.2/Turtle/Tk oficial. Agregado `.cache/studio-python-l0/pinta-r17d-frontend-r1/final-d-r1/receipt.json`, SHA `670a861eeac6eddeaa91d1589f95378f302a0dc2b7af92ed3d82552a1d542ebc`. Os 79 arquivos protegidos, 242 arquivos do build, 90 pins de QA e sete pins nativos foram conferidos antes/depois. Os quatro tsconfigs completos sobre os mesmos 79 arquivos continuam ligados pelo recibo a7a1bee5, sem execução repetida dos compiladores.

Os quatro fluxos usaram o StudioEditor, o adapter useStudioCreationLibraries, PintaApp e IndexedDB reais. A criança escolhe dois quadros, importa PNGs distintos, escreve fonte pelo teclado no Monaco editável, executa Turtle, salva/reabre, edita o desenho no Pinta e retorna com foco nativo. A sincronização atualiza o quadro escolhido e preserva o outro, mantendo ID/nome/proPath. A segunda execução e o ZIP conferem os bytes e os metadados integrais de receita/proveniência/saída. O controle JavaScript conserva SVG e folha canônicos. Clássico usa Ponte; Pro usa Código e os botões visíveis Materiais → Abrir biblioteca de materiais. Os casos de raster verificam pixel30×12, transparência vetorial, peça e mapa completo com camada frontal nos dois navegadores.

Identidades dos casos aprovados: `chrome-classic-execution-r7`, `edge-classic-execution-r7`, `chrome-pro-execution-r10`, `edge-pro-execution-r10`, `chrome-raster-execution-r7` e `edge-raster-execution-r7`. Cada um terminou com exit0, console/página sem erros e preview encerrado por IPC, porta e lease liberados. Os negativos anteriores permanecem: configuração CJS, descoberta de cópia histórica, modo/grant de fixture, observação de foco, sons Blockly servidos como HTML e seletores/guardas incompatíveis com Pro e JS legado. O diagnóstico de r9 mostrou que kind ausente é válido no JS Clássico; a hipótese anterior de race de ready não foi demonstrada. As correções foram no QA, sem alterar produto, ampliar prazo global ou filtrar erros.

O preparo nativo `native-zip-r1/preparation.json`, SHA `1bee43c584bdacf26839238c8ddfbb46ccd9eedf3e9dd148186225aa44a3706d`, vincula exatamente esses quatro ZIPs aos recibos. Cada arquivo foi extraído para TEMP novo fora do monorepo, com17arquivos e main.py original de437bytes/SHA b9c4b225. Sem adaptação da fonte ou PNG, o Turtle oficial carregou duas PhotoImages e conferiu as mesmas amostras de pixels, dimensões, ligação e geometria do Canvas. Mainloop real retornou; Map0/Destroy1, árvore intacta, exit0, stderr vazio e processo encerrado foram obrigatórios. O observer fecha a tela após a leitura; não representa fechamento autoral, captura do compositor, entrada física ou UI do VS Code. O pacote opcional de áudio não foi instalado nem importado.

A execução browser usa a distribuição43fa e release QA bb602; não promove catálogo nem implantação. O host é um harness Vite com adapter de integração QA fino, não a cadeia completa Next/autenticação/BFF. Publicação/Mural/player anônimo/remix e F9/desempenho seguem abertos e não herdam este resultado. A imagem/perfil8a5e e seus controles SDK têm recibos separados; este agregado não os reexecuta nem substitui.
