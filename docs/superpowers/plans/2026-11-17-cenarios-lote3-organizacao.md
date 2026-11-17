# Lote 3.4 — Organização e seleção — Implementation Plan

> **For agentic workers:** usar a skill local `executing-plans`, executar os itens em sequência e revisar internamente. Não delegar nem parar para aprovação. Apenas o lote 3 está ativo.

**Goal:** completar árvore, camadas, seleção por área e área de transferência na oficina existente.

**Architecture:** grupos já autorais continuam sendo as pastas. Camadas são classificações independentes; visibilidade e cadeados acumulam os efeitos da entidade, seus grupos e suas camadas. Fragmentos de copiar/colar são dados limitados e validados, sem binários nem URLs, aplicados pelos mesmos comandos e pela mesma fila de autoria.

**Tech Stack:** núcleo TypeScript/Zod; palco Three e recursos do Molda; React; histórico e autorização Members existentes.

**Spec:** [plano aprovado](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [PDF](../../plans/2026-11-16-cenarios-reforma/interface-aprovada.pdf), [lote inteiro](2026-11-17-cenarios-lote3-objetos-ensaio.md). Base conferida: staging local/remota `d1cb0d629`, limpa. Partes 3.1–3.3 concluídas; lote 3 aberto.

## Regras

- Preservar quatro telas, seis abas, gaveta, palco e painel recolhível. Árvore/camadas abrem por botão, fora da área de circulação habitual da interface.
- Reusar grupos, histórico, seleção do controlador e recursos de interação do Molda. Não criar um segundo documento, motor de gestos ou sistema de armazenamento.
- Camadas autorais opcionais, até 128; referência opcional em entidades, mantendo documentos existentes válidos. Referências inexistentes, ciclos e profundidade acima de 64 são recusados.
- Um cadeado de grupo ou camada não pode ser contornado movendo o filho para outro lugar. Destrancar permite somente remover o próprio cadeado; undo restaura os estados herdados e os arquivos ainda usados.
- Núcleo sem IO, Three ou React; importações e permissões continuam no host. Não copiar recursos licenciados entre espaços.
- Não abrir lote 4. Cada parte abaixo precisa de implementação, teste e revisão; a implantação é no encerramento global.

## 1. Contrato e avaliação de hierarquia/camadas

**Files:** core `v2/{documento,comandos,validacao,inverter,organizacao}.ts`, testes de organização; motor `matematica.ts`/`Palco.ts`, UI/controlador.

**Interfaces:** `CamadaSchema`, `camada.definir/remover`; `camada?: string | null` nas entidades. Índice puro de grupos/entidades/camadas calcula flags efetivas uma vez por documento para uso no palco e nos painéis. Escritas verificam origem e destino atuais. `elementos.organizar` é uma intenção atômica para até 20.000 IDs distintos; `camada.remover` pode transferir membros explicitamente e `grupo.remover` pode desagrupar. Assim, seleções grandes não exigem centenas de revisões nem contornam cadeados. O índice de escrita é atualizado durante o lote, inclusive após restauração.

- [x] Implementar dados, comandos, limites, vínculos e inversão. Testar cadeados próprios/herdados, trocas de camada/grupo, documentos antigos e ações atômicas recusadas. Nove testes do recorte; JSONB e undo confirmados no Postgres.
- [x] Criar índice e operações de agrupar, desagrupar, mover para grupo/camada e remover camada sem deixar referências inválidas. Excluir camada move seus membros para sem camada explicitamente, numa ação atômica; recusar membros bloqueados. Grupos não recebem transformação adicional ao agrupar: o mundo permanece no lugar. Organização de 600 objetos conferida em dois comandos e um undo.
- [x] Integrar flags ao palco, seleção, gestos, operações e interface, preservando APIs públicas existentes quando possível.

## 2. Painel de objetos e camadas

**Files:** UI `telas/{Oficina,Arvore,Camadas}.tsx` e CSS prefixado.

- [x] Botão abre o painel de organização no mesmo inspector. Árvore pesquisável, pastas recolhíveis, olho, cadeado, seleção, nome e grupos. Lista virtual de até 14 linhas no DOM, independente do total.
- [x] Reorganizar por arrasto e por controle acessível de destino; prevenção de ciclos, preservação de posição e comunicação de recusa. Escolher pasta seleciona seus objetos descendentes para composição, sem transformar a seleção global em outra estrutura.
- [x] Lista de camadas com criar/renomear/apagar, olho/cadeado e atribuição dos escolhidos. Estados herdados visíveis, sem destrancar o pai por acidente.
- [x] Teclado e toque: navegação da árvore, controles de 44 px, foco, estado vazio e busca sem resultado; claro/escuro e 390 px. Chrome em 1.440/1.024/390 px; árvore com mil objetos e foco no último item conferidos.

## 3. Seleção por retângulo e laço

**Files:** subcaminho `molda/palco`, motor `selecao-area.ts`, `Palco.ts`/`tipos.ts`; UI toolbar/overlay.

**Interfaces:** reutilizar `SceneAreaSelection` e `pointInSelection` do Molda; seleção projetada determinística no palco genérico. O traço é estado de sessão, limitado, sem gravação no documento.

- [x] Ferramentas retângulo/laço com overlay, soma por modificador ou botão Somar (também no toque) e cancelamento; enquadramentos normais, ocultos/bloqueados fora da captura. Reusa a captura de ponteiros limitada do Molda. Escape cancela o traço e volta à seleção por ponto.
- [x] Testar seleção em perspectivas e recortes válidos, limites do traço, arrastos por mouse e toque emulado, cancelar e regressão de órbita/transformação. Projeção unitária e Chrome claro/escuro/390 px, sem criar revisão autoral.

## 4. Copiar, recortar e colar

**Files:** core `fragmento.ts`, UI adaptador de clipboard/atalhos/toolbar, testes e ensaio.

**Interfaces:** fragmento validado contém origem do espaço, grupos/camadas necessários, referências de modelos/formas/texturas e instâncias, com limites de bytes/expansão/comandos. Apoios internos são remapeados; apoios externos são resolvidos em posição mundial na captura, para não criar vínculos quebrados. Colagem gera IDs novos e referências sem colisão; a origem nunca é alterada.

- [ ] Implementar captura e colagem determinísticas, seleção remapeada, ancoragem de colocação, grupos/camadas/referências e bloqueios. Usar IDs fornecidos, sem aleatoriedade escondida no núcleo.
- [ ] Integração com eventos reais de clipboard e controles explícitos. Colagem interna disponível se o clipboard do sistema estiver indisponível; deixar o resultado claro. Não interceptar edição em inputs/dialogs. Manter duplicação rápida como ação distinta.
- [ ] Recortar só atualiza a área de transferência quando a exclusão é aceita; recusar dependências externas inválidas sem apagar parcialmente. Outro espaço recusado; referências continuam sujeitas à confirmação do serviço.
- [ ] Testar mesma cena, outra cena do mesmo espaço, espaço diferente, referências repetidas/colidentes, formas, texturas, grupos, camadas e pilhas de apoio; undo/redo e reentrada.

## 5. Revisão e evidências

- [ ] Ensaiar os fluxos completos em 1.440/1.024/390 px, claro e escuro, com objetos de biblioteca e formas; capturas e vídeo de seleção/organização.
- [ ] Conferir testes, tipagem e build pertinentes; revisar contratos e recusas no histórico, regressões de composição, carregamento e recursos do palco.
- [ ] Registrar, commitar e enviar à staging. Marcar somente a parte 3.4; continuar a 3.5 dentro do lote 3, sem aprovação intermediária.
