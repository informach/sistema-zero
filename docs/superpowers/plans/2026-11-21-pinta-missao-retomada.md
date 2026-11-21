# Pinta — execução da continuação aprovada

Base inicial: staging `30f6d22963ee57769c970a93c9c63d4492101bb5`.
Execução isolada em `pinta-missao-retomada-20261121`, sem alterar arquivos do Molda.
Este documento continua o plano da missão e o design de regiões de 20/11.

## Ordem e critérios de fechamento

- [x] 0. Fechar gravador 6 com produtor real, leitor anterior, erros de cliente
  antigo, CAS, recuperação offline e rollback B → A → B em staging.
- [ ] 1. Promover regiões somente após adaptar todos os consumidores, preservando
  IDs, metadados, recursos, snapshots e formatos antigos.
- [ ] 2. Completar os dois motores JavaScript e Python, atualização e publicação
  sem perder arquivos, blocos ou programação; investigar a divergência histórica de IR.
- [ ] 3. Adaptar todas as ferramentas existentes de terreno às regiões.
- [ ] 4. Integrar objetos, conjuntos vinculados, cópias e espalhamento.
- [ ] 5. Integrar geometria, caminhos, portas, animações e profundidade.
- [ ] 6. Completar câmera, minimapa, teclado/toque, cancelamento e mensagens na oficina atual.
- [ ] 7. Validar os novos contratos em Tiled, Phaser, Pygame e Godot reais.
- [ ] 8. Completar IO incremental, cache, autorregras multicamadas e projeções.
- [ ] 9. Executar os dez passos da Vila e Floresta, variantes e PyDew Valley;
  revisar, atualizar guias, registrar evidências e preparar PR, sem merge automático.

## Decisões aprovadas

Autorregras visuais próprias do Pinta, por exemplos de entrada/saída, com ordem
explícita, prévia determinística e uma entrada de histórico por confirmação.
Tetos: 64 regras, padrões 16×16, oito camadas de entrada/saída,
65.536 células alteradas e 1.048.576 comparações por aplicação.

Regiões 32×32, até 2.048 chunks, 32 camadas, 4 MiB de índices e extensão
de 10.000 células por eixo nos intervalos assinados do contrato existente.
Nativo 8 para regiões; nativo 9 para autorregras/projeções; físico local 3.
Cena 4/PNG 5 para regiões, cena 5/PNG 6 para projeções. Nuvem 7/8 somente
depois dos leitores. Receitas e formatos anteriores permanecem compatíveis.
Hexágonos usam codec de células 32 bits com transformações na própria célula;
o orçamento de 4 MiB permite até 1.024 chunks nesse codec. Não reutilizar
silenciosamente a diagonal quadrada para rotações de 60°/120°.

Alvos nesta máquina: quadro aquecido p95 ≤33,3 ms e feedback do gesto p95
≤100 ms, viewport 1024×768. Medir abertura fria, autosave, buffers e CPU 4×;
não apresentar emulação como outro aparelho físico. Cache de render: 32 MiB.

## Situação de partida comprovada

Leitura do Railway nesta retomada: Community e Kids ainda na fonte 85d16fcd9.
O código da staging já declara escrita 6; integração Git não prova ativação.
As provas anteriores de publicação e análise Python continuam históricas,
com suas versões e escopos. Nenhum rollout novo ocorreu nesta retomada.

Cada lote exige testes, ensaio funcional aplicável, revisão e commit.
Um teste HTTP local com repositório em memória não substitui IndexedDB real,
R2/Postgres, login ou rollback dos serviços publicados.

## Etapa 0 fechada: gravador 6 (21/11)

Produtor autenticado, recusas 4/5, CAS e recuperação offline já registrados foram
complementados pelo ciclo publicado B → A → B em frontend temporário de staging.
A reteve a edição local sem rebaixar a nuvem; B a sincronizou intacta na revisão 4.
Um contexto sem o IndexedDB anterior e o parser público sobre download R2 real
confirmaram os documentos completos. Serviço e regra CORS temporários removidos;
Community/Kids conservaram os deployments concorrentes. Provas e alcance em
`qa/rollback-publicado-2026-11-21/`, no diretório da missão. Isso não homologa a
atualização da cena no Estúdio, Python no domínio temporário ou o formato 8.

## Lote verificado: referências dos conjuntos (21/11)

Clonagem do grafo extraída para o núcleo, com escopos distintos de IDs de
camadas/objetos. Captura e separação religam propriedades de objetos nas versões
de arte incorporadas, versionando somente recursos alterados. Separar conserva
locks herdados; capturar recusa recortes inválidos antes de alocar. O remapeamento
interno preserva vínculos explícitos de regiões, mantendo o legado denso.
Relatório e resultados em `qa/referencias-de-conjuntos-2026-11-21/`, no diretório
da missão. Isso não fecha as etapas 1 ou 4: conjuntos nativos esparsos e seus
consumidores ainda precisam ser integrados.

## Lote verificado: conjuntos internos por regiões (21/11)

Contrato/codec de conjuntos 8, captura assinada por leitor comum, posicionamento
vinculado e separação atômica em chunks. A árvore de grupos, propriedades,
recursos e geometria fracionária são conservados; tetos globais e por gesto são
recusados antes de substituir a instância. Inserção/atualização de objetos usam
admissão estrita; o legado mantém sua normalização. A revisão corrigiu perda de
parallax na separação e a edição acima do teto efetivo do leitor. Provas em
`qa/conjuntos-por-regioes-2026-11-21/`, no diretório da missão. O formato 8 continua
interno: seleção/clipboard, templates, geometria/render, IO e adaptadores seguem
pendentes antes da promoção pública. As etapas 1 e 4 continuam abertas.

## Lote verificado: seleção, clipboard e templates

- [x] Acrescentar edição atômica de vários objetos em `tiles/mapObjects.ts`,
  compartilhando a normalização da edição única; alinhar/distribuir deve calcular
  todos os destinos antes de criar um novo valor de histórico.
- [x] Reutilizar o grafo de `core/mapClone.ts` para copiar objetos e versões de arte
  juntos, sem representar um fragmento como mapa persistível. Em regiões, preservar
  deltas assinados/fracionários; o caminho denso mantém sua política de coordenadas.
- [x] Integrar a admissão e a mescla de recursos no núcleo de `pasteObjects`;
  retirar a mescla duplicada de `MapObjectSelectionPanel.tsx`. Referências de objeto
  nas peças incorporadas devem apontar para as cópias corretas.
- [x] Adaptar `tiles/objectTemplate.ts` ao contrato interno de conjuntos 8,
  com base neutra por chunks, recorte orçado e conservação da geometria completa.
- [x] Reproduzir as perdas antes da correção, executar testes direcionados,
  suíte/tipos e ensaios reais de colagem/modelo; revisar, registrar provas e commitar.

Esse lote segue o design de regiões aprovado em 20/11. Não altera a exposição
pública do formato nem o estilo da oficina.

Revisão e recibos em `qa/objetos-por-regioes-2026-11-21/`, no diretório da missão.
Clipboard 3 protege coordenadas assinadas; os bytes 1/2 continuam iguais ao módulo
histórico. A colagem religa dependências indiretas das versões imutáveis. Os testes
de oficina usam o formato público denso; o teste entre abas de regiões usa apenas
os módulos reais do clipboard em uma página de QA. Nenhuma ativação pública 8.

## Lote verificado: espalhamento de objetos por regiões

- [x] Adaptar `tiles/objectScatter.ts` ao mapa autoral comum, com limites assinados
  e geometria fracionária, preservando a saída densa e a ordem/semente existentes.
- [x] Admitir amostras antes de acumular/sortear, com teto de gesto de 65.536 casas,
  e recusar excedentes atomicamente. Evitar coleções proporcionais ao mundo lógico.
- [x] Conservar grupos, offsets, vínculos vivos, autorreferências e versões de arte;
  a repetição da prévia precisa gerar exatamente o mesmo documento.
- [x] Validar travas, posições, bordas, cancelamento e orçamentos; executar regressão
  da oficina por mouse/toque e revisar antes do commit. Render/IO seguem no lote seguinte.

Provas e revisão em `qa/espalhamento-de-objetos-por-regioes-2026-11-21/`, no diretório da missão.
Incluem 48 comparações idênticas com o núcleo denso anterior e a correção da arte
privada ausente na prévia. O hook de CPU dos ensaios de recursos foi corrigido;
o relatório anterior identifica os quatro casos que não aplicaram o fator.
As etapas 1/4 continuam abertas até o formato público e seus consumidores.

## Próximos lotes: consumidores visuais e renderização

1. [x] Adaptar `tiles/chunks.ts` ao leitor comum, com chunks assinados, recorte dos
   chunks ocupados e orçamento constante do viewport/cache. Comparar pixels do
   legado e regiões deslocadas, transformações, offsets e animações reais.
2. Adaptar renderizadores de miniatura/imagem e minimapa com dimensões limitadas,
   sem achatar a extensão lógica numa matriz ou canvas gigante. Conservar o
   comportamento visual legado, recursos e múltiplas folhas.
3. Completar ferramentas (`mapBrush`, formas, seleção/movimento e recursos) com
   admissão antes de alocar, coordenadas assinadas e mensagens explícitas de recusa.
   Integrar câmera, viewports e navegação aos mesmos contratos de coordenadas.
4. Medir e perfilar o caminho de renderização estabilizado; otimizar uma causa por
   commit, conservando os pixels. Medir quadro aquecido, primeira pintura e gesto
   separadamente, com o cache de 32 MiB. Não confundir a redução anterior de 60%
   com aprovação dos alvos de fluidez.

Cada item será um lote revisado e verificado. A promoção pública e o IO 3 seguem
condicionados à integração de todos os consumidores e às provas dos adaptadores.

O primeiro item foi verificado em `qa/renderizacao-por-regioes-2026-11-21/`, no
diretório da missão: 84 testes focados, suíte completa, 168 comparações de imagens
e 12 ensaios da oficina. A referência conserva os mesmos chunks globais e o mesmo
orçamento. Isso não fecha os demais consumidores visuais nem o formato público.

### Lote imediato da revisão: composição com opacidade

- [ ] Corrigir a condição de equivalência do caminho direto sob pressão quando
  há opacidade de camada, sem alterar o caminho rápido nas condições qualificadas.
- [ ] Reproduzir o achado no renderer anterior, isolar fonte/camada e conservar
  os recibos; comparar contra o cache canônico no Chromium, além do motor nativo.
- [ ] Acrescentar provas de caminho rápido com opacidade total e de fallback com
  opacidade composta, sem retirar a comparação rigorosa de pixels.
- [ ] Repetir suíte, navegador e revisão; registrar o custo/limites da guarda e
  commitar separadamente antes de prosseguir às miniaturas e ao minimapa.

A reprodução densa de `8d40b4b1b` já confirmou 36.061 canais diferentes (delta
máximo 2) na escala 1. Fonte opaca não bastou; camadas opacas eliminaram a
diferença nos quatro zooms ensaiados. A correção fica em commit próprio para
separar mudança de armazenamento e condição de composição.
