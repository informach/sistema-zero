# Lote 3 — Objetos completos e Testar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Neste repositório, usar a skill local `executing-plans`. Executar e revisar internamente, sem delegar e sem pausas para aprovação; a usuária autoriza continuidade e exige fechar um lote de cada vez.

**Goal:** concluir integralmente a aba Objetos e o ensaio jogável genérico do lote 3, preservando a fundação e a conversão já concluídas.

**Architecture:** documento e operações determinísticas no núcleo puro; palco Three e recursos do Molda; controles React na mesma oficina; dados de bibliotecas e histórico no Members, com BFF e armazenamento existentes. Câmera e ensaio não entram no estado autoral. Conjuntos precisam de definições reutilizáveis e referências, evitando regravar todos os cenários a cada mudança.

**Tech Stack:** TypeScript, Zod, Three 0.184, MeshBVH, React, Bun, Drizzle/Postgres e R2 UGC.

**Spec:** [plano aprovado](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [PDF aprovado](../../plans/2026-11-16-cenarios-reforma/interface-aprovada.pdf), [rastreamento integral](2026-11-16-cenarios-reforma-execucao.md). Base local e remota conferida: `staging`, `b092670b8`, árvore limpa.

## Global Constraints

- Somente o lote 3 está em execução. Não iniciar as ferramentas do terreno/água/caminhos dos lotes 4–6.
- Um lote só fecha com implementação, testes e revisão. Implantação, validação remota e full review ficam no encerramento global.
- Manter as quatro telas, seis abas, ferramentas laterais, palco, painel recolhível e gaveta do PDF. Não criar outra identidade visual ou outro motor.
- Núcleo sem Three, React ou IO; motor genérico sem imports do Arquipélago; Rapier permanece no perfil do jogo.
- Usar MeshBVH sem escrever `boundsTree` nas geometrias. Reaproveitar os recursos e padrões existentes do Molda.
- Manter cota, licença restrita, isolamento entre espaços, prova do BFF, controle de revisão e idempotência.
- GLBs e credenciais fora do Git. Todos os códigos, testes, relatórios e evidências permitidas entram em commits na staging.
- Uma verificação pesada e uma sessão de tipagem por vez. Não afirmar desempenho em aparelhos físicos sem teste nesses aparelhos.
- Incorporar os critérios da [issue 267, conferidos pela sessão principal](../../plans/2026-11-16-cenarios-reforma/triagem-issue-267.md), nas partes 3.4, 3.6 e 3.8, sem outro editor nem implementação concorrente. As dependências de terreno/água/caminhos permanecem nos lotes 4/5/6.
- Não chamar um recorte de lote concluído. Os itens abaixo são partes internas do mesmo lote 3.

## Estado inicial preservado

O commit `17db70fd7` já acrescentou alinhamento, distribuição, repetição e variação com semente, medidas de volume e o painel Organizar. Há histórico durável de comandos e versões, escala por eixo, seleção múltipla por teclas, instâncias de modelos e transformações básicas. No lote 2 esses recursos passaram a receber a fonte explícita de alturas importadas.

Faltam as demais ferramentas abaixo. A revisão inicial também encontrou soma direta de ângulos Euler na repetição circular e na variação: isso não representa um giro em torno da vertical do mundo quando o objeto está inclinado. Corrigir antes de ampliar essas operações.

### 3.1 — Revisar a matemática e completar operações de composição

**Files:** `molda-cenarios-core/src/v2/{rotacao,organizar,chao,volume}.ts`; `molda-cenarios-motor/tests/composicao.test.ts`; `molda-cenarios-core/tests/organizar.test.ts`; `molda-cenarios/src/oficina/telas/Organizar.tsx`.

**Interfaces:** operações continuam recebendo documento, seleção, opções, IDs e `FonteDeAlturas` explícita. Produzem lotes de `ComandoDeCenario`, nunca mutações fora da fila. `girarNaVertical(rotacao, angulo)` será puro e terá a mesma convenção XYZ do motor.

- [x] Reproduzir a falha de rotação inclinada com uma referência independente do Three nos testes do motor.
- [x] Corrigir composição de giros e conferir repetição, variação, volumes, limites, bloqueios e inversão dos lotes. Os dois casos falharam antes e passaram depois; núcleo 63 testes/202 asserções, motor 21/150, tipagem de ambos aprovada. O lote 3 e esta parte permanecem abertos para os itens seguintes.
- [x] Completar espelho e troca de modelo, conservando posição, proporções e contato com o chão. Geometrias refletidas com faces/normais/tangentes corrigidas; sem escala negativa de instância. Troca pela gaveta e histórico existentes, preservando referências de peças não selecionadas. Testes e Chrome claro/escuro/390 px aprovados; [revisão do recorte](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-espelho-troca.md). O lote continua aberto.
- [x] Conferir suportes e transformações das ações existentes, sem introduzir heurísticas por nome de arquivo. Contato local acompanha o suporte; movimento conjunto e duplicação conferidos no recorte de encaixes. Apoios legados preservados.
- [x] Testar, revisar e preservar o recorte; lote 3 continua aberto. Registros de [espelho/troca](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-espelho-troca.md) e [encaixes](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-encaixes.md).

### 3.2 — Grade modular e encaixes

**Files:** core v2 `documento.ts`, `comandos.ts`, `inverter.ts` e operações de composição; motor `tipos.ts`, `Palco.ts`, consultas de superfície e controles de gesto; UI `Oficina.tsx` e painel de encaixes.

**Interfaces:** parâmetros explícitos de grade, origem, ângulo e altura de andar; preferências de vista separadas dos dados autorais. O palco devolve pontos e transformações de mundo; a fila existente grava os comandos.

- [x] Implementar passo configurável, giros de 90°, níveis de andar e origem modular.
- [x] Implementar encaixe em superfície com a consulta espacial existente, preservando pivôs e volumes reais.
- [x] Conferir terreno inclinado, ponte, topo de objeto e perfis importados; indicar claramente as opções ativas. Rampa, banco, Ponte 4, pontilhão e regressão da Faísca convertida aprovados.
- [x] Exercitar mouse, teclado e toque emulado, sem perder navegação de câmera ou capturar um gesto de órbita como edição. Dois arrastes reais por modelo e ensaio de órbita; preferências e aplicação conferidas no Chrome claro/escuro/390 px. [Revisão](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-encaixes.md).

### 3.3 — Formas de rascunho e acabamento por objeto

**Files:** core v2 para definições e comandos; motor para geometria, materiais e variantes de instância; UI nas ferramentas e painel da aba Objetos; Members/BFF para referências de texturas.

**Interfaces:** caixa, rampa, escada e cilindro são dados validados e determinísticos, sem fingir que são arquivos GLB de uma biblioteca. Cor e textura são ajustes explícitos do objeto, usando texturas já guardadas no espaço.

- [x] Acrescentar as quatro formas, com dimensões e resolução limitadas, medidas de volume e geração comum para renderer e compilação futura. Tabela autoral `formas`, diálogo Blocos, malhas fechadas e recursos compartilhados; [revisão e evidências](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-formas.md).
- [x] Acrescentar cor e textura por objeto, com repetição física; compartilhar geometrias e materiais equivalentes e liberar variantes retiradas. Cor por `instanceColor` e seletor do Molda; texturas do acervo, repetição física, seleção múltipla, undo, reentrada, restauração e descarte conferidos; [cor](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-cores.md) e [fechamento da parte 3.3](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-texturas-objetos.md).
- [x] Proteger novas referências no armazenamento, nas cópias e no histórico, incluindo limites e licenças. Conferências de espaço/papel na aplicação e transação; GC conserva revisões, lotes, inversos e restaurações. Postgres real e hosts conferidos; [registro](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-referencias-texturas.md).
- [x] Conferir renderização, normais, seleção, descarte e orçamento; nenhuma forma de referência pode virar um falso modelo licenciado. Projeção física, GLBs originais preservados, variantes compartilhadas, recursos estáveis em três ciclos, Chrome claro/escuro/390 px e regressões conferidos; [revisão da parte 3.3](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-texturas-objetos.md).

### 3.4 — Árvore, camadas, laço e área de transferência

**Files:** núcleo de seleção/grupos/camadas; `controlador.ts`; painéis de árvore/camadas; palco e seleção por área; atalhos de `Oficina.tsx`.

**Interfaces:** a árvore representa os grupos e objetos do documento; camadas têm estado autoral próprio. A seleção permanece no controlador, com cadeados/visibilidade herdados. Copiar/colar usa um fragmento validado com referências e IDs remapeados.

- [x] Acrescentar árvore com busca, grupos, olho, cadeado, seleção e reorganização sem ciclos. Lista virtual, contexto no controlador e destinos estáveis; Chrome 1.440/1.024/390 px conferido. [Registro do recorte](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-organizacao-selecao.md).
- [x] Acrescentar camadas, inclusão/remoção e visibilidade/bloqueio coerentes no palco e na árvore. Permissões próprias/herdadas e histórico JSONB testados no Postgres, incluindo restauração de definições compartilhadas.
- [x] Implementar laço/seleção por área sem conflitar com órbita e gestos de transformação. Captura do Molda, projeção, soma por teclado ou botão, cancelamento e toque emulado conferidos; não cria revisão autoral.
- [x] Implementar copiar, recortar e colar, conservando relações internas e recusando referências inacessíveis de outra conta. Fragmento limitado, IDs/apoios remapeados, referências confirmadas, clipboard nativo e buffer de sessão; [revisão da parte 3.4](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-transferencia.md).
- [x] Verificar apagar, desfazer, refazer, recarga e ações recusadas sem aplicação parcial. Chrome claro/escuro/1.440/1.024/390 px, GLB e textura reais, Postgres e regressão integrada conferidos. O lote 3 continua aberto.

### 3.5 — Espalhar com intenção e semente

**Files:** core `espalhar.ts` e esquemas/comandos; motor de pincel e prévia; UI de área, densidade, distância, variação e semente.

**Interfaces:** receita determinística com área, modelos escolhidos, densidade/afastamento, variação, semente e IDs fornecidos. Alturas são resolvidas pelo contrato de apoio, sem IO no núcleo.

- [x] Gerar posições com limites de tentativas e distância mínima, sem aleatoriedade global ou laços sem teto. Grade irregular ancorada no mundo e PRNG inteiro; núcleo confere determinismo e limites.
- [x] Acrescentar prévia e aplicação por gesto, preservando receita, seleção e um desfazer coerente. Mouse/toque, catálogo/seleção, alturas reais e replay JSONB conferidos; [revisão da parte 3.5](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-espalhamento.md).
- [x] Conferir limites de 20.000 objetos e 500 comandos por lote, áreas inválidas, bordas, cancelamento e concorrência. Uma intenção limitada por gesto; revisão alterada, Escape, foco e segundo dedo descartam a prévia.
- [x] Verificar que não há colocação aleatória automática na Faísca: a ferramenta executa a intenção de quem edita. Nenhum cenário do jogo foi modificado automaticamente. Parte 3.5 implementada, testada e revisada; lote 3 continua aberto.

### 3.6 — Conjuntos reutilizáveis e vivos

**Files:** core para fragmentos/instâncias/referências; Members domínio, porta, serviço, repositório, DDL gerada e rotas; gateway/BFF; hosts; gaveta e edição de conjuntos na oficina existente.

**Interfaces:** uma definição de conjunto pertence à biblioteca/espaço; cópias referenciam essa definição e têm transformação própria. Mudar a definição atualiza as cópias sem sobrescrever seus cenários. A edição da definição reaproveita a oficina e a lista de comandos.

- [ ] Definir o contrato e os índices de uso, com limite de expansão, modelos, formas, materiais e grupos internos.
- [ ] Implementar salvar seleção como conjunto, organizar na biblioteca, colocar cópias e editar a definição.
- [ ] Nome e miniatura na biblioteca; ensaiar praça funcional com apoios por contato e vínculos internos. Colocar, mover, girar, duplicar, salvar/reabrir e conferir IDs remapeados, posições relativas e proporções. Alterar a definição e reabrir versões anteriores dos cenários para provar que continuam resolvíveis e preservadas (issue 267).
- [ ] Conferir atualização de todas as cópias, versões, conflitos, licença, exclusão e proteção de arquivos ainda usados.
- [ ] Validar soma de objetos e orçamento antes de aceitar uma atualização que afete cópias existentes.
- [ ] Testar dados e SQL reais, bordas HTTP e a experiência nos dois temas.

### 3.7 — Retratos das versões e eficiência dos objetos

**Files:** histórico Members/BFF/hosts; `Versoes.tsx`; captura e fila da oficina; `lotes.ts` e picking do motor.

**Interfaces:** retrato associado à revisão capturada, sem atribuir uma imagem atrasada à cabeça nova. O histórico e as referências continuam no mesmo armazenamento. Matrizes e seleção usam somente as faixas alteradas quando possível.

- [ ] Guardar e listar retratos por revisão, sem criar uma fotografia integral do documento por gesto.
- [ ] Conferir cancelamento, resposta atrasada, capa atual, exclusão e licenças.
- [ ] Completar faixas sujas de instâncias e consultas espaciais para evitar varrer/enviar toda a cena a cada movimento.
- [ ] Conferir câmera e planos de recorte para os tamanhos aceitos pelo documento, incluindo o relevo convertido.

### 3.8 — Testar e fechar o lote

**Files:** `molda-cenarios-motor/src/teste/*`; contrato do palco e UI da oficina; testes unitários/browser; relatório e evidências deste lote.

**Interfaces:** sessão de ensaio separada do documento, com três modos: terceira pessoa, primeira pessoa e voo. Cápsula com MeshBVH; avatar genérico ou modelo da biblioteca; o perfil do Arquipélago usa sua própria física mais adiante.

- [ ] Implementar gravidade, chão real, objetos por tipo de colisão, degraus, inclinação e fronteiras; não criar piso onde houver fundo/furo.
- [ ] Implementar os três modos, controles de teclado/mouse/toque, entrada/saída e retorno à edição na mesma vista.
- [ ] Aceitar personagem da biblioteca com escala e pose corretas; conservar animações disponíveis do arquivo.
- [ ] Derivar cápsula e câmera da altura do personagem em uso; conferir o Cute Characters em aproximadamente 1,16 m, a reserva da Morada e os marcos da Faísca. Registrar caminhada em primeira e terceira pessoa, com vídeo; voo não substitui a travessia (issue 267).
- [ ] Medidor de percurso da sessão: pontos de início/fim, distância direta, distância percorrida caminhando e tempo. Descontar pausas e excluir voo/teletransporte/retomada; registrar percursos reais sem reposicionar automaticamente a geografia. A régua autoral permanece no lote 7 (issue 267).
- [ ] Exercitar Faísca convertida, formas, espelhos, conjuntos, carregamento e estados de erro no ensaio.
- [ ] Conferir toda a lista normativa do lote 3, rodar regressões/tipagem/build pertinentes, revisar tudo e versionar evidências e relatório.
- [ ] Só então marcar o lote 3 como concluído e iniciar o 4. Não aguardar implantação intermediária e não declarar o projeto global concluído.
