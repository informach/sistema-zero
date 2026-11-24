# Lote 6 — Caminhos — Implementation Plan

> Executar com `writing-plans` e `executing-plans`, na sessão principal, sem delegação nem pausas de aprovação. Lotes 0–5 implementados, testados, revisados e enviados à staging. Base conferida: `7c8810775`, árvore limpa. Somente este lote ativo. Implantação e validação remotas no encerramento global.

**Goal:** trilha, praça, estrada que molda o terreno, cerca, muro e ponte, com edição de pontos na cena e pelo teclado, modelos/materiais da biblioteca, física coerente e autoria durável.

**Architecture:** integrar o núcleo `curvas.ts` do Claude, já usado pelo rio, ao documento/compilação do caminho. Núcleo puro produz geometria/perfis/transformações limitados; o motor desenha e colide a mesma geometria. Reutilizar captura, preview, worker cancelável, binários e fila dos lotes 4/5. Cada caminho com seu molde de terreno é uma transação e um passo de histórico. Não produzir uma segunda navegação, física ou área de transferência.

**Tech Stack:** TypeScript/Zod puro no núcleo; Three/MeshBVH e materiais/modelos do palco; React/tokens Molda na oficina; Members/JSONB, BFF e arquivos por hash existentes.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [núcleo adiantado](../../plans/2026-11-16-cenarios-reforma/adiantamento-nucleo-lotes-4-5-6.md), [interface aprovada](../../plans/2026-11-16-cenarios-reforma/interface-aprovada.pdf), [fechamento da água](../../plans/2026-11-16-cenarios-reforma/revisao-lote5-agua.md).

## Regras de integração

- Preservar as trilhas/praças já importadas e seus identificadores/recursos. Acrescentar estrada/cerca/muro/ponte por tipos explícitos, com parâmetros limitados e unidades documentadas.
- O caminho precisa acompanhar o piso real. Para superfícies nativas sobre o terreno, conferir geometria e recortes contra as mesmas células/triângulos da física; não cobrir buracos com uma lâmina visual sem chão. Resolver coplanaridade com técnica de superfície/decal adequada, sem deslocamentos Y escolhidos para uma câmera.
- Modelos opcionais usam catálogo, dimensões, pivôs e encaixes medidos. Não deduzir orientação por regex de nome de arquivo, alterar o GLB original ou deformar silenciosamente uma peça para esconder folgas. Materiais originais conservados quando não há override autoral.
- Cercas/muros fecham os lances e acompanham os apoios. Pontes usam cabeceiras e tabuleiro medidos; preservar espaço sob o vão e avisar quando terreno invade o tabuleiro. Piso e pilares sólidos só onde há geometria correspondente.
- Estrada altera uma cópia do campo, com limites de trabalho antes de alocar/copiar. Campo e caminho entram juntos na fila. Cancelamento/cabeça nova/restauração não podem apagar preparo de outra ferramenta.
- Captura/seleção/edição de pontos reutilizam o fluxo de órbita/toque/alças do palco. Incluir inserir/remover/mover pontos na cena; coordenadas acessíveis continuam disponíveis. A prévia não cria revisões por quadro.
- Separar prévia funcional de acabamento artístico. Não declarar a Faísca composta ou hardware homologado por haver ferramentas novas. Não iniciar Jogo/Luz, exportadores ou agentes deste lote.

## 6.1 — Contratos, auditoria e geometria pura

**Files:** core `src/v2/{entidades-schema,curvas,validacao,comandos,inverter,fragmento,index}.ts`; novos módulos específicos de caminho; testes do núcleo.

- [x] Escrever testes de trilha/praça existentes e das seis variantes, limites, valores inválidos, referências, auto-interseção, largura e controles insuficientes.
- [x] Auditar suavização/reamostragem, finitude e quantidade antes de alocar; UV em metros, juntas, winding, polígonos côncavos, curvas fechadas e edição de pontos. Preservar as correções de precisão/escavação usadas pelo rio.
- [x] Definir intenção e resultado preparados: descritor, perfil/avisos, regiões e campo somente quando a estrada molda o relevo. Conferir diagonais grandes e orçamento de visitas/cópias.
- [x] Compartilhar a representação geométrica com picking, colisão e futura compilação: piso no terreno e máscaras/recortes, lances modulares e perfil de ponte. Orçamento de peças e triângulos explícito.
- [x] Integrar colocação/apoio em estruturas, especialmente no tabuleiro, pelo contrato de apoio em superfície existente. Conferir transformação do encaixe, movimentação/edição do caminho e referências sem criar outro sistema de apoios.
- [x] Conferir organização, recursos e histórico. Estender o fragmento existente aos caminhos e aos seus acabamentos/texturas; preservar apoios/referências e deslocamento. Pastas com marcadores ainda dependem do lote 7.
- [x] Rodar núcleo/tipagem, revisar e preservar o recorte antes de expandir o motor.

**6.1 implementado, testado e revisado no núcleo.** Representação pura e contrato de apoios prontos; sua instalação no desenho/picking/física é 6.2. Envelopes de pilares não substituem a conformação real das tampas. [Revisão e limites](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-estruturas-apoios.md).

## 6.2 — Desenho, materiais, modelos e física

**Files:** motor `src/curvas/*`, `Palco.ts`, seleção e fontes do Testar; testes de geometria/picking/colisão e helpers browser.

- [x] Desenhar trilha e praça com encaixe correto no terreno e acabamento/texture do catálogo quando escolhido. Conferir bordas/juntas, água adjacente e ausência de superfícies duplicadas.
- [x] Integrar o desenho da estrada ao campo preparado e às regiões; preservar a atualização dos apoios pelo campo compartilhado. Gesto e publicação atômica estrada+campo são conferidos em 6.3.
- [x] Cercas/muros com módulos medidos, eixo explícito, juntas e apoios em desnível. Instanciar/compartilhar recursos; colisão conforme a geometria visível.
- [x] Ponte nativa de referência e acabamento de catálogo com encaixe explícito nas cabeceiras; tabuleiro transitável, vão livre e pilares coerentes. Não criar piso invisível sobre a água.
- [x] Seleção, visibilidade/camada, reentrada e descarte, com alertas úteis para modelo/encaixe inválido. Reusar o loop de render e cache.
- [x] Conferir dia/noite, enquadramento do avatar, UV, física e recursos após ciclos; tipagem/revisão do recorte.

## 6.3 — Pontos, prévia, worker e autoria

**Files:** captura de pontos/alças no motor; oficina preparação em worker e autoria sobre `terreno-autoria.ts`; testes de fila e browser.

- [x] Reutilizar o gesto de pontos para criar linhas/polígonos e cabeceiras. Selecionar/mover pontos, inserir no trecho e remover respeitando o mínimo, com Escape/cancelamento e toque.
- [x] Numerais editáveis e direção/fechamento legíveis; órbita não insere pontos. Proteger Testar, retratos e operações concorrentes durante o preparo.
- [x] Preparar campo/recursos antes de enfileirar estrada+caminho; guardar uma revisão, atualizar objetos/conjuntos apoiados no terreno, sem perder o gesto ou publicar campos intermediários. Reusar nova tentativa de upload, idempotência e prova de recursos.
- [x] Conferir no-op, cancelamento, resposta atrasada, mudança de cabeça, desmontagem, falha de envio, undo/redo e reabertura. Preservar água/terreno e seus recursos.
- [x] Revisar e preservar o recorte.

## 6.4 — Aba Caminhos na identidade Molda

**Files:** `useCaminhos.ts`, `telas/Caminhos.tsx` e componentes específicos; integração em `Oficina.tsx`; CSS prefixado.

- [x] Rail com trilha/praça simples e estrada/cerca/muro/ponte no mesmo fluxo; nenhum botão sem comportamento.
- [x] Largura, suavização, material/textura, módulo, altura/encaixe e moldagem com limites/unidades acessíveis. Modelos escolhidos pela biblioteca existente, com medidas conferidas.
- [x] Criar, selecionar, nomear, editar, ocultar, camada, copiar/colar e remover caminhos pelo histórico existente. Reaproveitar o alvo da árvore.
- [x] Mostrar prévia, avisos de invasão/vão/juntas/orçamento e erro com nova tentativa. Não expor caminhos internos de armazenamento ao usuário.
- [x] Conferir inspector, drawer, abas e teclado/mouse/toque em 1440/1366/1024/390, claro/escuro. Revisar o recorte.

## 6.5 — Fechamento exclusivo do lote

- [x] Conferir os requisitos de Caminhos na especificação e issue 267: chegadas às entradas, margens, reassentamento de conjuntos e escala do avatar.
- [x] Núcleo, motor, oficina/hosts, Members/HTTP/BFF/Postgres pertinentes, tipagem e build aprovados. Extensão do clipboard, referências e cota preservadas.
- [x] Browser: seis ferramentas, criar/editar pontos, piso/curvas/juntas, estrada no relevo, ponte sobre água, camadas, cancelamento, falha/retomada e histórico após reabrir.
- [x] Percorrer com o avatar real, testar câmera, colisões, margem rasa/vão da ponte e controles de toque; sem flutuação, z-fighting ou piso invisível introduzido.
- [x] Capturas/vídeos comparáveis e orçamento do renderer após ciclos. Diferenciar emulação/aparelhos físicos e prova técnica/aceite artístico.
- [x] Revisar, documentar, commitar e enviar à staging. Somente depois iniciar lote 7. Full review, composição final, CI, implantação e validação remota no fechamento global.

## Estado atual

**Lote 6 implementado, testado e revisado localmente.** [Revisão de fechamento e evidências](../../plans/2026-11-16-cenarios-reforma/revisao-lote6-caminhos.md). Preservar o fechamento na staging e seguir exclusivamente ao lote 7. Lotes 8–10, composição final, full review, CI e implantação/validação remota permanecem pendentes.

### Registros anteriores

**Atualização de 6.2:** [integração ao Palco](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-palco.md) conecta as seis variantes ao desenho, seleção, apoios e física, com agrupamento, materiais e descarte. O ensaio local gerou capturas dia/noite e três ciclos estáveis. A prova da Faísca revelou custo de recortes distantes e bloqueio entre lajes; causas identificadas e corrigidas. **6.2 continua aberto**, principalmente para encontros sem sobreposição e pilares em modelos arqueados; não avançar a outro lote nem declarar acabamento aprovado.

**Encontros de pisos conferidos:** [recorte e evidências antes/depois](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-encontros.md). Praça e trilhas deixam de compartilhar duas camadas de GLB. Ocultar/mover restaura trechos, terreno permanece intacto e a física usa a malha recortada. Núcleo 266, motor 116, oficina 96 testes; tipagem, build e workers aprovados. Percurso completo da Faísca repetido até o Farol com o avatar nativo, sem erros. **Continuar somente em 6.2**, com pontes de catálogo e apoios arqueados; 6.3–6.5 e lotes seguintes permanecem pendentes.

Primeiro recorte: [auditoria do núcleo de curvas](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-auditoria.md), com reprodução/correção de valores infinitos, perda de precisão da área e alturas inválidas. Suíte do núcleo 206/8.490, motor 98/2.800 e oficina 92/595, sem falhas. **6.1 continua aberto:** contratos e geometria das seis variantes ainda pendem.

[União das seis variantes e validação material](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-contratos.md) implementadas/testadas/revisadas em recorte de dados. Núcleo 212/8.517, motor 98/2.800, oficina 93/599, conversão 2/3.130 e Postgres real 39/349; tipagem conferida. **6.1 permanece aberto** até as operações/geometria/apoios/transferência. Não há interface de Caminhos entregue por este recorte.

[Preparo e moldagem de estrada](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-operacoes.md) implementados/testados/revisados: operações das seis variantes, cópia imutável e orçamento antes da alocação, ponte com vão/invasão e topologia comum. Núcleo 220/8.564 e tipagem passaram. **6.1 continua aberto**, seguindo para geometria/apoios/transferência. Não iniciar lote 7 nem declarar a aba Caminhos entregue.

[Piso conformado e clipboard](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-piso-transferencia.md) conferidos no núcleo e no histórico: triângulos do chão, máscaras/recortes, juntas, precisão e orçamento; seis variantes transferidas pelo contrato existente. Núcleo 235/10.007, motor 98/2.800, oficina 94/603, Members 51/244 e Postgres 40/356, sem falhas. **6.1 ainda aberto:** faltam estruturas modulares, acabamentos GLB e apoios antes da integração do desenho no palco. A geometria pura não equivale a ferramenta visual entregue.

**Fechamento de 6.1:** [estruturas e apoios](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-estruturas-apoios.md) implementados/testados/revisados. Núcleo 254/10.117, motor 98/2.800, oficina 96/610, Members 51/244 e Postgres 40/358, sem falhas; tipagem de cinco pacotes, build e regressão dos workers compilados passaram. **Somente 6.2 é a próxima frente.** Renderer/picking/física de Caminhos, depois pontos/worker, interface e fechamento do lote continuam pendentes.

**6.2 em andamento:** [conformação e picking](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-conformacao.md) implementados/testados/revisados como componentes, ainda sem gerenciador de Caminhos no Palco. Recorte compartilhado de peças 3D, preservação do acervo, atualização regional e invalidação do índice físico de seleção. Núcleo 261/10.145, motor 104/3.456, oficina 96/610 e consulta Molda 4/7.916, sem falhas; tipagem/build/regressão dos workers conferidos. Montagem de módulos, materiais, integração de cena/picking/Testar e avaliação visual continuam em 6.2.

**Pontes de catálogo e pilares conferidos:** [revisão e medidas](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-pontes.md). Três modelos reais atravessados nos dois sentidos; tampas pelos triângulos do tabuleiro, bases pelo campo, aviso para juntas, afastamento medido e recursos estáveis após três ciclos. Recorte quase coincidente corrigido com reprodução mínima; núcleo 274, motor 117, oficina 96, Members 51 e Postgres 40 testes aprovados, além de tipagem/build/workers e repetição completa da Faísca. **6.2 permanece aberto:** terminar estrada e módulos em relevo antes de pontos/worker/interface. Não iniciar lote 7.

**Fechamento de 6.2:** [revisão do desenho e da física](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-renderer-fechamento.md). Estrada moldada e módulos reais no relevo, contato de bases, colisão do muro, recursos estáveis, dia/noite e preservação do acervo conferidos. Somente **6.3 — pontos, prévia, worker e autoria** é a frente ativa seguinte. Aba Caminhos e revisão integral do lote ainda pendentes; lotes 7–10 não iniciados.
