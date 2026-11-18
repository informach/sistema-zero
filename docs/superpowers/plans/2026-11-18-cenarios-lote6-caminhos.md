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

- [ ] Escrever testes de trilha/praça existentes e das seis variantes, limites, valores inválidos, referências, auto-interseção, largura e controles insuficientes.
- [ ] Auditar suavização/reamostragem, finitude e quantidade antes de alocar; UV em metros, juntas, winding, polígonos côncavos, curvas fechadas e edição de pontos. Preservar as correções de precisão/escavação usadas pelo rio.
- [ ] Definir intenção e resultado preparados: descritor, perfil/avisos, regiões e campo somente quando a estrada molda o relevo. Conferir diagonais grandes e orçamento de visitas/cópias.
- [ ] Compartilhar a representação geométrica com picking, colisão e futura compilação: piso no terreno e máscaras/recortes, lances modulares e perfil de ponte. Orçamento de peças e triângulos explícito.
- [ ] Integrar colocação/apoio em estruturas, especialmente no tabuleiro, pelo contrato de apoio em superfície existente. Conferir transformação do encaixe, movimentação/edição do caminho e referências sem criar outro sistema de apoios.
- [ ] Conferir organização, recursos e histórico. Estender o fragmento existente aos caminhos e aos seus acabamentos/texturas; preservar apoios/referências e deslocamento. Pastas com marcadores ainda dependem do lote 7.
- [ ] Rodar núcleo/tipagem, revisar e preservar o recorte antes de expandir o motor.

## 6.2 — Desenho, materiais, modelos e física

**Files:** motor `src/curvas/*`, `Palco.ts`, seleção e fontes do Testar; testes de geometria/picking/colisão e helpers browser.

- [ ] Desenhar trilha e praça com encaixe correto no terreno e acabamento/texture do catálogo quando escolhido. Conferir bordas/juntas, água adjacente e ausência de superfícies duplicadas.
- [ ] Integrar a estrada ao campo modificado e às regiões; atualizar objetos/conjuntos apoiados no terreno sem perder o gesto ou publicar campos intermediários.
- [ ] Cercas/muros com módulos medidos, eixo explícito, juntas e apoios em desnível. Instanciar/compartilhar recursos; colisão conforme a geometria visível.
- [ ] Ponte nativa de referência e acabamento de catálogo com encaixe explícito nas cabeceiras; tabuleiro transitável, vão livre e pilares coerentes. Não criar piso invisível sobre a água.
- [ ] Seleção, visibilidade/camada, reentrada e descarte, com alertas úteis para modelo/encaixe inválido. Reusar o loop de render e cache.
- [ ] Conferir dia/noite, enquadramento do avatar, UV, física e recursos após ciclos; tipagem/revisão do recorte.

## 6.3 — Pontos, prévia, worker e autoria

**Files:** captura de pontos/alças no motor; oficina preparação em worker e autoria sobre `terreno-autoria.ts`; testes de fila e browser.

- [ ] Reutilizar o gesto de pontos para criar linhas/polígonos e cabeceiras. Selecionar/mover pontos, inserir no trecho e remover respeitando o mínimo, com Escape/cancelamento e toque.
- [ ] Numerais editáveis e direção/fechamento legíveis; órbita não insere pontos. Proteger Testar, retratos e operações concorrentes durante o preparo.
- [ ] Preparar campo/recursos antes de enfileirar estrada+caminho; guardar uma revisão. Reusar nova tentativa de upload, idempotência e prova de recursos.
- [ ] Conferir no-op, cancelamento, resposta atrasada, mudança de cabeça, desmontagem, falha de envio, undo/redo e reabertura. Preservar água/terreno e seus recursos.
- [ ] Revisar e preservar o recorte.

## 6.4 — Aba Caminhos na identidade Molda

**Files:** `useCaminhos.ts`, `telas/Caminhos.tsx` e componentes específicos; integração em `Oficina.tsx`; CSS prefixado.

- [ ] Rail com trilha/praça simples e estrada/cerca/muro/ponte no mesmo fluxo; nenhum botão sem comportamento.
- [ ] Largura, suavização, material/textura, módulo, altura/encaixe e moldagem com limites/unidades acessíveis. Modelos escolhidos pela biblioteca existente, com medidas conferidas.
- [ ] Criar, selecionar, nomear, editar, ocultar, camada, copiar/colar e remover caminhos pelo histórico existente. Reaproveitar o alvo da árvore.
- [ ] Mostrar prévia, avisos de invasão/vão/juntas/orçamento e erro com nova tentativa. Não expor caminhos internos de armazenamento ao usuário.
- [ ] Conferir inspector, drawer, abas e teclado/mouse/toque em 1440/1366/1024/390, claro/escuro. Revisar o recorte.

## 6.5 — Fechamento exclusivo do lote

- [ ] Conferir os requisitos de Caminhos na especificação e issue 267: chegadas às entradas, margens, reassentamento de conjuntos e escala do avatar.
- [ ] Núcleo, motor, oficina/hosts, Members/HTTP/BFF/Postgres pertinentes, tipagem e build aprovados. Extensão do clipboard, referências e cota preservadas.
- [ ] Browser: seis ferramentas, criar/editar pontos, piso/curvas/juntas, estrada no relevo, ponte sobre água, camadas, cancelamento, falha/retomada e histórico após reabrir.
- [ ] Percorrer com o avatar real, testar câmera, colisões, margem rasa/vão da ponte e controles de toque; sem flutuação, z-fighting ou piso invisível introduzido.
- [ ] Capturas/vídeos comparáveis e orçamento do renderer após ciclos. Diferenciar emulação/aparelhos físicos e prova técnica/aceite artístico.
- [ ] Revisar, documentar, commitar e enviar à staging. Somente depois iniciar lote 7. Full review, composição final, CI, implantação e validação remota no fechamento global.

## Estado atual

Lote 6 iniciado apenas pela leitura e pelo planejamento. **6.1 em andamento; nenhum requisito de Caminhos declarado implementado.** O núcleo de curvas do Claude é matéria-prima preservada e será auditado/integrado, não refeito sem necessidade. Lotes 7–10 não iniciados.

Primeiro recorte: [auditoria do núcleo de curvas](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote6-auditoria.md), com reprodução/correção de valores infinitos, perda de precisão da área e alturas inválidas. Suíte do núcleo 206/8.490, motor 98/2.800 e oficina 92/595, sem falhas. **6.1 continua aberto:** contratos e geometria das seis variantes ainda pendem.
