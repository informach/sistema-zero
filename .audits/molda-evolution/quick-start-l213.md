# Lote 213 — começo rápido e navegação da oficina

Estado: implementado, revisado e verificado em 09/09/2026. Fase 3 segue sem aceite
global: integração pública e homologação visual/toque continuam pendentes.

## Intenção e direção visual (interface-design)

Pessoa: criança de 9+ que quer construir algo para seu jogo, voltando à criação
anterior ou começando uma ideia. Escolher, dar nome e entrar na bancada deve ser
curto e compreensível; sem exigir arquivo, versão, eixo ou formato antes de começar.
Sensação: bancada de peças acessível, com liberdade para mudar modelos e desfazer.

Domínio: peças, pintura, bancada, modelo pronto, criação guardada, voltar ao projeto.
Mundo de cores: azul de peças/ações, céu suave da comunidade, branco da bancada,
tinta navy dos rótulos; verde das árvores, vermelho dos carros e roxo dos cristais
nas próprias miniaturas. Não criar paleta paralela: superfícies/ações usam mld-*.
Assinatura: escolher uma construção real em miniatura isométrica sem abrir WebGL;
ela vira peças e pinturas independentes e editáveis na mesma oficina.

Defaults a evitar: painel de métricas → decisões de construir/retomar; ilustração
decorativa → miniatura das peças reais; criação automática de um demo fixo → nome
e ID próprios após ação explícita. A demo antiga deve permanecer retomável no índice.

Composição: topo curto com intenção de criar, escolha vazio/modelo, nome em passo
claro; projetos da oficina separados abaixo. Cards de modelos existentes reutilizados,
sem adicionar outra grade de catálogo semelhante. Recentes usam resumos, não carregam
documentos/pixels para listar. Paginação torna todos alcançáveis; não impor teto novo.

Paleta mld-bg/surface/accent/text/muted; profundidade por superfície e borda existente;
tipografia mld-display (Baloo do host) nos títulos e corpo herdado; espaçamento base
4 px, grupos 16/24 px, controles 44 px. Preservar tema por atributo local e foco.

## Contratos propostos dentro da fase 3 aprovada

- Construção vazia ou um dos seis modelos existentes; migrar em memória sem perda
  silenciosa, IDs/pixels próprios, nome explícito dentro do limite compartilhado.
- Criar só por gravação CAS com expectativa nula; não mudar guarda pública, chaves,
  originais ou versão de armazenamento. Colisão/falha não abre documento substituto.
- Ler lista somente do índice v2, com estados vazio/carregando/erro distintos;
  não prometer que inclui legado sem índice, itens excluídos ou toda a conta cloud.
- Abertura explícita mantém rejeição a futuro/corrupção/remoção e promoção existente.
  Cancelamento de uma abertura não pode instalar editor tardio ou perder ownership.
- Navegação deve aguardar salvamento, preservar edição diante de erro e nunca
  descartar mudanças implicitamente. Considerar poses e gestos pendentes, não só dirty.
- UI interna testável com persistência e viewport injetáveis, mantendo entrypoint
  público v1 e host de desenvolvimento separados. Começo rápido não é rollout.

## Verificação planejada

Todos os modelos geram documentos válidos, sem perdas e independentes; vazio real;
nome/erro/CAS/cancelamento; criar→editar→guardar→retomar→desfazer; lista sem leitura
de documentos; retorno com erro de save; StrictMode/ownership; teclado e foco.
Tipos/Biome/focal/integral/builds, nova crítica de composição e registro de limites
da validação visual. Browser oficial indisponível na tentativa do lote 209: não
substituir por bypass e não alegar homologação de toque/GPU/usabilidade infantil.

## Progresso parcial (não é fechamento)

- createSceneProject: entrada fechada vazio/template/nome, nome aparado nas bordas
  sem truncar/fallback, seis modelos próprios migrados sem aceitar issues ocultas.
  IDs de projetos/peças e pixels independentes. Erro do teste 899031 assumia array
  de vértices; domínio usa Record por ID. Mutação de isolamento corrigida para
  Object.values, cobrindo também primitivas e caminhos. d2cf3b: 8/0, 67 asserts.
- SceneStart/useSceneProjectList: seleção com SVG de peças reais, nome, trava de
  submissão dupla, cancelamento por ownership, foco de ida/volta, falhas sem perder
  nome/escolha; nove resumos por página, todos alcançáveis, sem ler documento/pixels.
  Data fora da faixa de Date aparece indisponível, sem alterar índice. Nome continua
  texto, inclusive sintaxe HTML. Falha de gravação não marca nome válido como inválido.
- Tipos 2b95bf/66f02c passaram para a primeira versão da tela (antes dos testes novos).
  Teste 01efa6 gerou saída excessiva ao inspecionar um DOM inteiro na asserção de
  espera por remoção; execução própria interrompida 5aa0ea. Não foram interrompidos
  processos do usuário. Mesma condição convertida em comparação booleana, sem mudar
  código de produção ou timeout: cc64bc passou em 738 ms. Diagnóstico era o custo
  de construir a mensagem de erro de um DOM amplo antes de ceder ao evento.
  95de7d: 10/0, 99 asserts/904 ms; a968bf: 20 repetições/0, 260 asserts/3,77 s.
- SceneExitControl em implementação: confirmação explícita antes de cancelar prévias;
  await flush e verificação do snapshot salvo, cancelamento de intenção em voo,
  ownership por editor/callback e recuperação/backup em falha. Não basta ligar
  “descartar” a unmount que chama flush: host deve respeitar a escolha e pular essa
  escrita. Integração ao host, testes de saída/ownership e validação geral pendentes.

## Integração e revisão em andamento

O playground agora usa SceneWorkshopHost: nenhum projeto é criado apenas por abrir
a página, nem por um link ausente/inválido/futuro/excluído. ID novo só depois da
gravação CAS; a URL interna acompanha criação/retomada/saída via replaceState. Não
implementa interceptação do botão Voltar do navegador nem saída do host público.
Demo antiga permanece no índice. Namespace é ownership de lista, rascunho, página,
abertura e navegação; commit de criação já concluído permanece recuperável na lista
antiga após cancelamento, sem abrir na nova. Nenhuma exclusão/rollback implícito.

Saída tem confirmação antes de cancelar prévias/poses/gestos, flush drenado até o
snapshot atual, erro preservando edição/histórico e cópia de segurança. Esc/Ficar
cancela a intenção de navegar durante a gravação, não desfaz escrita já autorizada.
Descartar só fica disponível após erro e exige ação explícita; cleanup do host não
repete uma gravação rejeitada pelo usuário. Callback/editor/unmount invalidam finais
atrasados. Foco vai ao título da tela após navegação e retorna ao acionador após
cancelar; escolha de modelo devolve foco sem timer. Consulta primária React via
Context7 /reactjs/react.dev: cleanup, StrictMode e foco antes do paint.

Testes novos usam IDB real em fake-indexeddb, componentes reais e porta contratual
sem GPU, não substituem editor/persistência por mocks. Gates de I/O verificam
respostas fora de ordem; canal real cobre mudanças no índice. Lista lê só resumos,
coalesce 100 avisos em no máximo uma leitura corrente + uma pendente, retém lista
própria em erro e fecha conexões atrasadas/StrictMode. Paginação e rascunho não vazam
entre namespaces; seis templates, saída/cancelamento/backup/falhas e abrir→editar→
guardar→retomar→desfazer cobertos. c31c9f: saída 3/0, 33 asserts; e183d5: host 4/0,
57 asserts; 36a3df: focal conjunto 20/0, 220 asserts, 2,95 s.

Tipos 9d56e1/b773ea detectaram ReturnType genérico do helper de teste inferindo
unknown em vez de void; especialização explícita corrigida, sem casts. Tipos
95b6a9/db5074 passaram. Biome 25f330 encontrou só quebra de linha desse ajuste;
formatado, c488be passou (1.108 arquivos). Integral 698720 em execução encontrou
name ausente no campo novo; corrigir a produção após terminar o processo e repetir
o contrato e a integral. Resultado final registrado abaixo.

## Fechamento e evidência fresca

- Integral inicial 698720/8e31c5: 2.674 passes/1 falha, 357 arquivos, 168,95 s.
  Corrigido name="sceneProjectName" na produção, com asserção no teste da tela;
  contrato de acessibilidade preservado. Focal 5b399b: 23/0, 532 asserts, 3,04 s.
- Tipos 8e8906/bdf6d1: exit 0. Biome 348fdb: 1.108 arquivos, sem erros.
- Integral final 438210/94024c: **2.675 passes, zero falhas, 8.346.732 asserts,
  357 arquivos, 169,70 s**. Sete logs de contexto WebGL indisponível no teste antigo
  de MoldaApp; nenhum novo aviso act. Isso não fecha a pendência histórica do 203.
- Vite 0131a2: exit 0, 1,32 s. ScenePlayground 189,26→200,28 kB, index
  361,24→362,94 kB (COPY compartilhada), CSS 53,20→53,64 kB (nova interface).
  Workers bbmodel 214,41/glTF 183,09/OBJ 157,62 kB inalterados. Three 579,29 kB
  ainda avisa >500 kB; não aumentamos limite/silenciamos aviso. Não é medição de FPS.
- Kids ebe3a1/2415d3: exit 0, compilação 6,6 s, tipos 13,7 s, 59 páginas/577 ms.
- Diff 94bd4b: exit 0; três avisos CRLF pré-existentes, sem alteração de política.

Crítica de UI/código: escolhas ligadas a construções reais, sem painel decorativo;
catálogo único e fonte visual compartilhada, sem dependência nova. Superfícies/cores,
tema e botões 44px reutilizados. Estado de sessão separado do documento e da revisão
CAS; IDs não vêm do formulário; índice não certifica documento. Lista não cria
viewport nem lê pinturas. Erro não apaga nome/edição/arquivo. Recursos assíncronos
têm dono e cancelamento. Nenhum handler público/exportador v1 foi ativado.

Limitado a verificação de código/DOM/IDB/contratos e builds. Sem navegador oficial
disponível, não afirmar qualidade de layout em hardware, toque, GPU ou usabilidade
9–11 homologados. Cópia nativa já pode ser baixada pela bancada; trazê-la de volta
pela tela inicial é o próximo incremento, separado desta entrega.
