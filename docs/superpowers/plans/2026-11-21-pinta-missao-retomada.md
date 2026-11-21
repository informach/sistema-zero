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

- [x] Corrigir a condição de equivalência do caminho direto sob pressão quando
  há opacidade de camada, sem alterar o caminho rápido nas condições qualificadas.
- [x] Reproduzir o achado no renderer anterior, isolar fonte/camada e conservar
  os recibos; comparar contra o cache canônico no Chromium, além do motor nativo.
- [x] Acrescentar provas de caminho rápido com opacidade total e de fallback com
  opacidade composta, sem retirar a comparação rigorosa de pixels.
- [x] Repetir suíte, navegador e revisão; registrar o custo/limites da guarda e
  commitar separadamente antes de prosseguir às miniaturas e ao minimapa.

A reprodução densa de `8d40b4b1b` já confirmou 36.061 canais diferentes (delta
máximo 2) na escala 1. Fonte opaca não bastou; camadas opacas eliminaram a
diferença nos quatro zooms ensaiados. A correção fica em commit próprio para
separar mudança de armazenamento e condição de composição.

Fechado em `qa/precisao-de-opacidade-2026-11-21/`, no diretório da missão. A guarda
exige opacidade composta total para o caminho direto; os demais casos conservam
o cache canônico. A reprodução anterior e as 24 variantes passaram a zero canais
diferentes. As 192 comparações de imagens e os 12 ensaios da oficina passaram,
sem ampliar memória ou mudar estilos. Os alvos de latência seguem não qualificados.
O trabalho volta ao item 2 dos consumidores visuais: miniaturas e minimapa.

### Lote do item 2: visão geral e navegação pelo minimapa

- [x] Tornar a resolução de folhas/versões independente do armazenamento das
  células. Em regiões, referência padrão ausente não deve escolher uma arte
  diferente; o fallback de folha única dos mapas legados permanece compatível.
- [x] Centralizar o cache de cores dominantes no núcleo, sem montar um mapa
  autoral fictício para calcular a cor de cada peça. Conservar a API antiga.
- [x] Criar visão geral com no máximo 256 × 256 pixels. Em regiões, visitar
  células armazenadas; não alocar `cols × rows`. Respeitar ordem, visibilidade,
  offsets, recorte lógico e fontes compatíveis. Ela continua sendo representação
  aproximada em cores, não exportação visual nem documento autoral.
- [x] Quando várias casas ocupadas caírem no mesmo pixel, desempatar pela ordem
  global linha/coluna dentro de cada camada, independentemente da ordem dos chunks.
  Peças transparentes não devem apagar a paisagem da camada inferior nessa visão.
- [x] Integrar o painel existente, teclado, toque e retângulo de navegação. Aplicar
  a origem lógica nos destinos e contar buffers efetivamente guardados no orçamento.
  Preservar componentes, estilos e comportamento das visões densas existentes.
- [x] Verificar mundo 10.000 × 10.000, origens negativas, fontes privadas/múltiplas,
  regressão do legado e memória/resolução limitadas. Exercitar o componente real
  em página isolada de QA e a oficina pública, revisar e commitar.

Não promover o documento público 8 neste lote. As miniaturas/imagens completas
seguem no próximo sublote do mesmo item 2, com orçamento próprio de rasterização.

Provas e revisão em `qa/minimapa-por-regioes-2026-11-21/`, no diretório da missão.
A API bruta antiga conserva recomputação; o cache por identidade é compartilhado
pelos consumidores imutáveis. O componente real foi exercitado em host de QA,
e a oficina pública continuou usando mapas densos. O item 2 permanece aberto.

### Lote verificado do item 2: imagens de peças por regiões

- [x] Acrescentar visita opcional em ordem global linha/coluna ao leitor comum,
  sem visitar lacunas do mundo e sem mudar a ordem padrão dos consumidores atuais.
  Isso conserva a composição das imagens quando chunks são deslocados/reordenados.
- [x] Adaptar PNG/miniatura pixel ao mesmo leitor, subtraindo a origem lógica
  apenas na imagem de saída. Folhas privadas e múltiplas passam pelo resolvedor comum.
- [x] Adaptar SVG e raster vetorial, sem achatamento ou arrays de uma entrada por
  casa do mundo. Reutilizar símbolos, máscaras, gradientes, transformações e fontes.
  Conservar os bytes dos SVGs densos existentes no subconjunto verificado.
- [x] Admitir as novas imagens antes de criar canvas/carregar fontes: até 8.192
  pixels por lado e 16.777.216 pixels por imagem, mantendo o orçamento de área da
  imagem de cena já existente. Miniaturas até 512 pixels; SVG por regiões até
  8 Mi de unidades UTF-16, com recusa inteira. Não aumentar limites de destinos.
- [x] Usar a visão geral limitada na miniatura de cores da galeria, conservando
  estilos e o contrato público atual; o caminho 8 só entra após os demais consumidores.
- [x] Reproduzir falhas em mapas pequenos antes das correções; validar mundos
  esparsos grandes após admissão, fontes privadas, múltiplas folhas, offsets,
  transparência, máscaras/gradientes e transforms no Chromium. Comparar resultados
  densos históricos, revisar, executar suíte/tipos e registrar antes do commit.

Estes renderizadores de peças mantêm o seu escopo anterior. A imagem de cena com
objetos/conjuntos usa `sceneDrawing.ts` e depende do futuro adaptador Scene 4;
não substituir esse compositor por um segundo sistema, nem declarar o item 2
inteiro pronto apenas por adaptar as imagens de peças. Nada muda no escritor 7/8.

Provas em `qa/imagens-por-regioes-2026-11-21/`, no diretório da missão: suíte
2.449 aprovada, 121 testes focados, 12 ensaios de navegador e três controles
Pygame reais. As 168 comparações de imagens conservam pixels; SVGs legados
conservam hashes. O decoder recebe SVG com dimensões raster limitadas, pelo
helper extraído do compositor portátil. Imagem achatada antiga e composição
completa são contratos distintos, qualificados com referências correspondentes.
O restante do item 2 depende de Scene 4. O trabalho segue ao item 3 das ferramentas.

### Lote verificado do item 3: admissão e pincéis na oficina

- [x] Expor o resultado detalhado do escritor comum de células, mantendo o
  wrapper que devolve o mesmo mapa ao recusar. Reutilizar as operações atuais de
  terreno, espalhamento e carimbo, sem segundo escritor ou perda de flags.
- [x] Admitir linha/retângulo antes de gerar pontos e trabalhar com origem
  assinada. Limitar cada coleção a 65.536 casas; não recortar a linha alterando
  a fase de Bresenham. Recusar coordenadas inválidas e retângulos excessivos.
- [x] Expandir carimbos por blocos distintos, sem repetir o mesmo bloco para
  cada casa do trajeto. Admitir o trabalho antes da alocação e conservar a ordem
  da primeira visita, a ancoragem, os buracos e a saída visual anterior.
- [x] Adaptar `mapBrush.ts` ao mapa autoral comum. Propagar recusa do balde,
  terreno e armazenamento, distinguindo-a de um gesto vazio ou sem mudanças.
- [x] Integrar coletores/resultados ao ponteiro e teclado da oficina atual,
  com mensagens curtas pelo Toast existente. Uma recusa durante o traço deve
  cancelar o gesto inteiro; prévia/teclado não devem gravar um pedaço recusado.
- [x] Contar destinos distintos acumulados do traço livre, sem cobrar revisitas,
  com teto explícito de 65.536. Cada gesto usa o snapshot do pincel do começo.
  Conservar
  a revisão produzida pelo próprio gesto. Cancelar/recusar não pode restaurar
  a base por cima de outra revisão, inclusive quando ela conserva o mesmo ID.
- [x] Reproduzir falhas de origem, duplicação e recusa em fixtures pequenas;
  provar atomicidade, limite anterior à leitura/alocação, cancelamento, histórico
  e conservação de documentos legados. Exercitar a oficina no Chromium com
  mouse/toque, executar suíte/tipos, revisar e registrar antes do commit.

Esse lote não promove o formato 8. Câmera/seleção/movimento, editor de recursos,
IO e adaptadores continuam no restante dos itens 1–3 e no plano principal.

Provas em `qa/pinceis-por-regioes-2026-11-21/`, no diretório da missão. Escrita
condicional em RAM retém a revisão produzida pelo próprio gesto, inclusive na
fachada de conjuntos; não substitui o CAS da autoridade local. O módulo anterior
do controlador falha nos cinco cenários corrigidos em três perfis; o controle
positivo continua passando. Versão atual: 51 ensaios de navegador aprovados,
101 testes focados, suíte 2.469 + três controles Pygame reais e tipos/lint.

### Continuação do item 3

- [ ] Revisar os demais gestos de objetos, transformações e controles contínuos
  de camada/recursos, adotando a escrita condicional com sua revisão de origem.
  Reproduzir cancelamento/admissão tardios com o mesmo ID e com conjuntos.
- [ ] Completar geometria, seleção, movimento e edição de versões em coordenadas
  assinadas; integrar câmera, palco, viewport e navegação antes da promoção 8.
- [ ] Prosseguir ao perfil de render estabilizado e aos adaptadores/IO, conforme
  os itens anteriores. O contrato público e as etapas macro continuam abertos.
