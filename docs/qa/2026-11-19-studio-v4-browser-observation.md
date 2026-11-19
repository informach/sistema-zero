# Qualificação v4: observação nativa e leitores históricos

## Escopo

Continuação do laboratório `c81c607c9`, separado da PR 273. Esta entrega corrige a instrumentação de testes para o namespace atual; não altera a execução, a interface ou o armazenamento do produto. Não declara a ativação v4 qualificada globalmente.

O run [44516772433](https://github.com/informach/sistema-zero/actions/runs/44516772433) revelou observadores que ainda liam literalmente `sz:v3` depois da ativação v4. Isso afetava a saída oculta, a migração, o horário de atualização e a gravação do histórico Pensa. A lista de projetos também conferia chaves v3 ao validar a releitura incremental.

## Contrato dos observadores

`e2e/projectStorageInspection.ts` lê o IndexedDB nativo em transação somente de leitura, espera `oncomplete`, fecha a conexão e decodifica o transporte no processo do teste. Não chama o adaptador de persistência nem promove journals. As assertivas de arquivos, blocos, integridade e datas permanecem; somente a identificação da versão e a decodificação passam a usar os contratos vigentes.

A prova da aba oculta mantém seu prazo de dez segundos e confere tanto o estado confirmado quanto a recuperação nativa validada, sem tornar a página visível antes de observar a gravação. Não basta encontrar uma chave de journal: chave, proprietário e conteúdo precisam corresponder ao documento esperado.

## Dois clientes históricos reais

A fixture anterior criava o projeto no cliente atual e exigia que um cliente v3 abrisse um namespace v4. Agora o checkout histórico cria o projeto e mantém sua própria revisão em memória antes da migração pelo cliente atual.

A recusa dos novos dados Pinta é testada diretamente com o documento atual no validador histórico, independentemente da barreira de armazenamento. Quando os namespaces diferem, o cliente antigo pode salvar sua edição v3: a migração conserva essa edição em uma cópia recuperada e mantém intactos nome, arquivos, PNG e hash do mundo v4. No caso de clientes com o mesmo namespace, continua sendo exigido `ProjectWriteConflict`.

## Evidências locais

- Seis fluxos Chromium de migração, reabertura em Blocos/Ponte e histórico Pensa: **6 passaram, 43,7 s**, sem retries.
- Saída oculta, recarga imediata de imagem de 1,5 MB, importação dos três arquivos Molda e Rodar/salvar: rodada anterior desta correção **7 passaram, 1,6 min**, Chromium/WebKit.
- Fluxos de comportamento e CSS que falharam no CI: **2 passaram, 18,2 s** na reprodução Chromium sem alterações nesses fluxos. Os traces remotos mostram menu do Blockly persistindo após clicar em Colar e menu da barra persistindo após clicar em Mostrar o jogo, respectivamente; nenhuma exceção JavaScript foi registrada nesses traces. Causa ainda não demonstrada.
- Dois casos de cenas/mundos com cada checkout congelado (`0218a11a3` e `f44648d9b`): **2 + 2 passaram**, incluindo edição offline e recuperação da edição antiga. Nenhum checkout histórico foi modificado.
- Lista de projetos isolada: **17 passaram, 106 asserções**; sincronização pessoal isolada: **88 passaram, 417 asserções**. A proteção contra leitura de thumbnails usa agora o prefixo da versão atual.
- Grupo de preview: **103 passaram, 496 asserções**. Grupo completo de componentes: **598 passaram, 3.231 asserções, 55,75 s**.
- O teste da marca de execução passou também em oito processos isolados adicionais. A falha Linux do CI ainda não foi reproduzida localmente; nenhuma mudança especulativa no ciclo de execução foi aplicada.
- Typecheck completo aprovado; Biome dos nove arquivos alterados passou após organização de imports e formatação. A qualificação remota da revisão final permanece obrigatória.

## CI e limites

A integração principal `76c2a2d54`, ainda v3, terminou com **12/12 jobs aprovados** no [run 44515314703](https://github.com/informach/sistema-zero/actions/runs/44515314703). Isso não qualifica o laboratório v4.

No laboratório c81, os cinco percursos protegidos das aulas e os cinco cenários hostis do Windows passaram; o job Windows reprovou exclusivamente no observador da aba oculta ainda preso ao v3. O job de medição de isolamento falhou antes dos testes por divergência de tamanho no espelho APT; foi solicitada uma repetição somente desse job após o término do run, sem desabilitar verificação de pacotes.

Continuam pendentes a revisão remota exata, as falhas intermitentes de colagem/marca, a integração dos commits mais recentes da branch principal e a missão global. Os números acima são de laboratório/CI e não comprovam hardware físico de entrada, metas universais de FPS ou homologação completa de todos os recursos.

## Instrumentação da próxima reprodução

Os testes de comportamento/CSS agora capturam um histórico limitado a cem eventos de ponteiro, foco e carregamento do iframe. O anexo `menu-interactions.json` é produzido somente em falha. Não há eventos sintéticos, mudança de foco, retry de clique, alteração de prazo ou listener no produto. A captura usa somente fixtures de laboratório e não inclui conteúdo dos arquivos do projeto.

O teste da marca conserva todas as asserções e encaminha as operações reais de localStorage. Em falha, registra até vinte operações da própria marca, suas pilhas e o estado de execução; as funções originais são restauradas em `finally`. Essa evidência deve distinguir armação tardia, remoção inesperada e interferência de outro ciclo de preview antes de escolher uma correção.

Com a captura ativa, os dois fluxos Chromium passaram novamente (**17,7 s**) e os **29 testes de PreviewIframe passaram**. Isso valida a execução local da captura, não resolve nem explica por si só as falhas remotas.


## Barreira de persistência e captura entre frames

A seleção dos blocos considera apenas o canvas do workspace principal, excluindo os blocos do flyout. Depois da colagem pelo menu real, o teste exige que os novos IDs do Blockly estejam na partição confirmada do projeto e depois confere Salvo. Não depende de observar o estado transitório Alterações não salvas, que pode terminar antes de o teste voltar a executar. Permanecem os prazos de cinco segundos para a operação e quinze para a confirmação visual; não foram adicionados cliques forçados ou retries.

A captura atual mantém um buffer limitado no processo do teste e recebe eventos do editor e dos frames de prévia. Descreve identidades de nós e atributos, sem medir layout, alterar foco ou interceptar os eventos. O anexo continua exclusivo das falhas. A instrumentação não entra nos testes de isolamento de segurança nem no produto.

Evidência local sobre o build cdc489d4b, sem retries:

- 23 casos de comportamento, Canvas 3D, HTML/CSS/Canvas, colagem e reabertura: passaram, 2,9 min.
- 12 casos adicionais de portais, acessibilidade, nomes de cenas e desfazer/refazer: passaram, 1,2 min.
- Repetição do caso Canvas 3D com captura entre frames: 10/10 passaram, 2,1 min.
- Tipos completos do Estúdio: saída 0. Biome: quatro arquivos sem erros.

Uma rodada anterior sem essa captura reproduziu o menu persistente em 1/10 repetições. O histórico do editor não recebeu o clique esquerdo embora a automação tenha completado a chamada; houve foco do iframe durante seu carregamento. Isso é indício, não causa demonstrada. As rodadas atuais não declaram a falha corrigida e não justificam alterar o menu sem uma reprodução causal. A opção STUDIO_MENU_REPRO_CPU desacelera somente a interação já pronta, é desativada por padrão e restaura o fator original em finally; não representa um aparelho físico.
