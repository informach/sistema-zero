# Lote 3.5 — Pincel de objetos — Implementation Plan

> Executar com a skill `executing-plans`, sem delegação nem aprovação intermediária. Somente o lote 3 está ativo. Base conferida: staging `00ee310bc`, limpa; partes 3.1–3.4 fechadas.

**Goal:** pintar agrupamentos de objetos por intenção explícita, com prévia real, semente, afastamento, variação, cancelamento e uma ação de histórico por gesto.

**Architecture:** amostragem pura no núcleo; receita e amostras aceitas registradas no comando `objetos.espalhar`; motor reaproveita captura de ponteiros e cursor do Molda, instanciamento e materiais existentes; painel integrado à mesma oficina e gaveta. Não espalhar automaticamente nada na Faísca.

**Tech Stack:** TypeScript/Zod, React, Three, recursos de viewport do Molda e fila/histórico existentes. Sem dependência ou armazenamento novo.

## Decisões de contrato

- Receita com até oito protótipos de objeto (modelo/forma, proporção, giro inicial, espelho, aparência e colisão), raio, densidade por 100 m², afastamento, variação de giro/tamanho, semente, destino e traço limitado. Modelos vêm da gaveta ou da seleção existente.
- O gerador recebe IDs do chamador e fonte de chão explícita quando necessária. Usa PRNG inteiro, grade de proximidade, tentativas e resultados limitados; não depende de `Math.random`, React, Three ou IO.
- A receita acompanha as amostras efetivamente aceitas no histórico. Essas amostras são o resultado autoral, inclusive filtros de chão/furos: o replay não precisa reler binários de altura nem recalcular uma pincelada com uma implementação futura. O comando confere limites, tipos, área, referências, IDs, destino e cadeados; cada amostra materializa uma instância com apoio no volume do terreno. Não usa uma restauração de cenário para inserir objetos.
- Prévia e aplicação usam as mesmas amostras. Nenhuma matriz temporária é salva antes de terminar o gesto. Escape, segundo dedo, perda de captura/foco, mudança de ferramenta, revisão externa ou fechamento descartam o traço; órbita e seleção não recebem seus eventos.
- Máximo inicial de 2.000 peças por gesto, até 512 pontos e 100.000 tentativas; limite global do documento continua 20.000 objetos e 8 MiB. O lote de comandos mantém seu limite de 500; a pincelada é uma intenção atômica, acompanhada apenas das definições novas necessárias. Informar saturação em vez de executar trabalho sem teto.
- Alturas não prontas não viram zero. Modelos/peças/texturas faltantes impedem aplicar uma prévia incompleta. Geometrias e conteúdo de biblioteca continuam imutáveis; o motor possui e descarta somente os recursos próprios da prévia.
- Parâmetros de ferramenta e câmera são estado da sessão. A semente efetiva fica explícita; após aplicar pode avançar para o próximo traço, sem aleatoriedade oculta.

## 1. Amostragem e comando

**Files:** core `v2/{espalhar-schema,espalhar,sorteio,comandos,index}.ts`, teste `espalhar.test.ts`; reaproveitar o PRNG de `sortearTransformacoes` sem alterar sua sequência.

- [x] Esquema e gerador com protótipos, diversidade, densidade, afastamento, bordas, ocupação existente e limites; geometria do gesto normalizada e fonte explícita.
- [x] Comando materializa as amostras, respeita origem/destino e não substitui IDs existentes. Aparência e proporção do protótipo preservadas; giros compõem pela vertical do mundo.
- [x] Testar determinismo, limites, dados malformados, filtros, fontes ausentes, colocação e restauração; cenário original preservado em recusa.

## 2. Gesto e prévia

**Files:** subcaminho `molda/palco`; motor `Espalhamento.ts`, `Palco.ts`, `tipos.ts`, prévia instanciada e testes.

- [x] Reutilizar `CapturedPaintInput`, `paintPointerPath` e `SceneBrushCursor`; amostrar o chão real e limitar o traço. Atualização visual por frame, sem gravar ou refazer React em cada ponto.
- [x] Desenhar modelos reais com o mesmo espelho, proporção, tonalidade/textura e apoio da aplicação; compartilhar recursos carregados, sem adulterar os originais.
- [x] Cancelar corretamente por teclado/toque/foco/desmontagem e não alterar câmera/seleção durante o gesto. Descartar materiais/geometrias próprios sem soltar recursos ainda usados.

## 3. Oficina e autoria

**Files:** `telas/{Oficina,Espalhar}.tsx`, estado de sessão/adaptador, gaveta e CSS prefixado quando necessário.

- [x] Ferramenta Espalhar com escolha pela gaveta ou seleção; parâmetros compreensíveis, lista de protótipos, remoção de escolha e destino explícito.
- [x] Prévia, quantidade, saturação/carregamento/erro; aplicar no fim do gesto, selecionar os IDs novos e manter undo/redo/retomada. Recusa de destino bloqueado não gera meia pincelada.
- [x] Teclado, toque, foco, claro/escuro e 390/1.024/1.440 px; não modificar as identidades Kids/adulta.

## 4. Verificação e revisão

- [x] Ensaiar catálogo e formas, mistura de modelos, proporções/espelhos, solo plano e alturas convertidas, cancelamento, reentrada e recursos após ciclos. Preservar receitas no histórico e verificar Postgres/HTTP relevantes.
- [x] Conferir testes, tipagem, build, regressões de organização/gestos/aparência e comportamento do palco.
- [x] Revisar, registrar evidências e relatório, commitar e enviar à staging. Só depois marcar 3.5 e abrir 3.6; o lote 3 continua aberto até 3.8.
