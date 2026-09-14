# Jogo 2D — relatório de implementação e revisão

Implementação da proposta autorizada em 13/09/2026, em worktree separado. O [registro por fase](2026-09-13-jogo-2d-atual.md) conserva os achados e as verificações intermediárias. Produção não foi alterada.

**Estado em 14/09/2026:** implementação integrada e implantada em staging, com reviews por fase, revisão final, aplicação, recuperação, recuperação repetida e reaplicação verificadas. A homologação autenticada com perfil de teste e a atualização das mídias dos cursos permanecem pendentes.

## Editor e motor

- Organizada a extensão em 14 famílias com subseções: Jogo e telas, Sprites, Movimento, Controles, Colisões, Grupos, Vida e placar, Som, Desenho e efeitos, Tempo, Sorteios, Cenários, Inimigos e Kits prontos. O catálogo tem 283 definições visíveis e nenhuma oculta na extensão Jogo 2D.
- Consolidados sete efeitos sonoros em um seletor. Placar usa variáveis; perguntas de colisão podem ser compostas com os blocos do núcleo. Parar música explicita o alcance. Rótulos, ajuda, busca, manual e tutor seguem a mesma organização.
- Acrescentadas pergunta de colisão circular sem consumir estado, ação com recarga e destruição permanente de sprite, com limpeza de grupos, eventos, imagem pendente e HUD acessível. Sprites de texto e números continuam disponíveis para listas, laços, quiz e jogos de coletar/clicar.
- “Blocos deste jogo” retém as ferramentas usadas, mesmo após apagar a última instância e reabrir o projeto. A oferta continua respeitando o modo e as extensões liberadas.

## Limpeza e conversão

Foram excluídas as 18 definições substituídas ou históricas do Jogo 2D, quatro cápsulas antigas do núcleo, cinco entradas de migração dentro do Blockly e o leitor de snapshots que podia descartar conteúdo. Saíram as assinaturas históricas substituídas, o reparo automático de laços dos exemplos e o reinício por recarga da página.

O documento atual tem formato 2. O motor executa somente o contrato atual; não seleciona um motor antigo pela versão da extensão. Funções úteis do contrato atual, como câmera global em Código, continuam disponíveis. Esta entrega não remove indiscriminadamente compatibilidades de outros produtos do monorepositório.

Há duas peças separadas:

1. `packages/studio/src/project-migrations`: leitor histórico carregado sob demanda ao abrir/importar documentos antigos. Converte uma cópia, valida o resultado e conserva a possibilidade de recuperação. Projetos já atuais não carregam esse leitor.
2. `packages/studio/scripts/project-migrations`: ferramenta operacional de inventário, planejamento, simulação, aplicação e recuperação. Não participa do editor nem do loop do jogo. Seu [manual](../../packages/studio/scripts/project-migrations/README.md) explica a operação e a retirada futura.

O script pode ser arquivado depois da homologação e do período de recuperação. Remover também o leitor histórico exige tratar arquivos exportados, perfis offline e outras cópias externas: o banco convertido não elimina essas origens. Versão de formato, validação, comparação de revisão e recusa de escritores antigos permanecem como contrato de integridade.

JavaScript manual é transformado por AST, com preservação de comentários, escopo e ordem de avaliação. A edição da Ponte prevalece sobre derivados antigos. Mapas, câmera, corações, sons e temporizadores têm regras explícitas; uma construção ambígua produz diagnóstico e impede a promoção, em vez de inventar equivalência.

## Persistência, mural e cursos

Abertura, importação, nuvem, publicação, player e remix usam a preparação do documento atual. O ID de uma cópia nasce depois da validação. Arquivos, áudio, assets, árvore Pro, metadados e ferramentas retidas acompanham o documento. Arquivos locais incompletos permanecem recuperáveis e não impedem listar os demais.

As gravações recusam escritores anteriores ao formato atual. O commit cruza o manifesto validado com as partes reservadas dentro da transação. O lote conserva IDs, autoria, links, entregas anteriores, rascunhos e progresso; atualiza bases de rascunho alinhadas e conserva conflitos que já existiam. Critérios convertidos mantêm aprovações e datas por perfil, aula e seção.

Foram revisadas as 27 aulas atuais em `docs/aulas-interativas/*-v6`, incluindo roteiros, manifestos, montagem, critérios, configurações, geradores e projetos QA. As fontes e narrações históricas estão identificadas como referência. Os novos arquivos incluem núcleo e pré-requisitos:

| Curso | Aulas | Tipos usados | Lista nova |
| --- | ---: | ---: | --- |
| Corre Dino | 13 | 44 | [JSON](../aulas-interativas/corre-dino-v6/blocos-corre-dino.json) |
| Desafio do Primeiro Jogo | 6 | 45 | [JSON](../aulas-interativas/desafio-primeiro-jogo-v6/blocos-desafio-primeiro-jogo.json) |
| O Jogo do Meu Jeito | 8 | 49 | [JSON](../aulas-interativas/o-jogo-do-meu-jeito-v6/blocos-o-jogo-do-meu-jeito.json) |

Cada curso também tem `blocos-por-aula.json`, com localização, descrição e primeira utilização. A [orientação de atualização dos cursos](../aulas-interativas/ATUALIZACAO-JOGO-2D.md) distingue uso completo de concessão adicional e identifica as capturas que precisam ser regravadas.

## Achados corrigidos nos reviews

- Perda potencial de arquivos, áudio e metadados na publicação; reconstrução indevida a partir de IR defasada; sombras com IDs repetidos; flag antiga de desativação ignorada pelo Blockly atual.
- Mudança de ordem ou de avaliação de argumentos em mapas e temporizadores; promoção indevida de condições para laços; início de RPG antes do registro dos mapas.
- Ferramentas desaparecendo depois de apagar blocos; notificações de gravação ligadas ao perfil errado; backup substituído numa repetição; arquivo inválido impedindo abrir a galeria.
- Partes do manifesto sem cruzamento com a reserva na transação; snapshots de entregas da galeria fora do inventário; base publicada de rascunhos desatualizada; risco de invalidar verificações parciais de aulas.
- Critérios de sons que não distinguiam o efeito escolhido; instruções do tutor que ainda apresentavam a assinatura retirada de desenho de mapa.
- Falha de isolamento no teste do Molda: uma liberação atrasada de download entrava na contagem da imagem de apoio. A reprodução falhou antes do ajuste; a correção conserva a detecção de liberações duplicadas e não muda o produto.
- Recuperação de uma aplicação interrompida entre arquivos e banco: o inventário de comparação agora distingue linhas efetivamente promovidas das que continuam na origem antiga. A reprodução falhou antes do ajuste e a simulação cobre a recuperação repetida desse ponto de interrupção.
- Invasores do Espaço tinha um nome de imagem que seria reescrito na abertura; o exemplo agora nasce com nome válido. A auditoria dos 155 exemplos passou a validar o documento completo. O conversor declara o atributo de tipo JSON exigido pelo Node, e as fixtures do Kids usam o contrato atual com expressões em posições válidas.
- Áreas antigas sem marcador estavam ativando rascunhos durante a conversão. Agora a delimitação original do programa é preservada. Configurações que estavam em um encaixe inválido dentro de um rascunho são conservadas como rascunhos separados, com IDs e valores. Versões desconhecidas de área e registros de mapa ambíguos são recusados com diagnóstico.
- O ensaio remoto encontrou uma falha no transporte operacional: pacotes separados no meio de um caractere UTF-8 corrompiam o texto do comando. A leitura agora reúne os bytes antes de decodificar e recusa UTF-8 inválido antes da execução. A divergência de um objetivo de aula foi detectada pela comparação posterior, preservada em backup e corrigida com comparação integral do inventário. Os 63 registros e os 205 objetos passaram na captura independente seguinte.

## Evidências locais

| Verificação | Resultado registrado |
| --- | --- |
| Studio, suíte completa mais recente | 8.249 testes aprovados; 130.540 asserções |
| Members, suíte completa | 1.071 aprovados; 39 condicionais sem banco nessa execução |
| Kids / Member Shell | 781 / 496 aprovados |
| Molda, suíte completa | 3.064 aprovados; correção de isolamento conferida em mais 9 testes focados |
| PostgreSQL descartável | Publicação/migração das 27 aulas executadas; 51 testes adicionais de criações e autoria aprovados |
| Typecheck | Studio, Members, Kids, Shell, Admin e Molda aprovados |
| Lint | 6.451 arquivos verificados sem erros; ajustes posteriores também conferidos |
| Chromium | 26 testes de texto, números, quiz, toque, colisões, reinício e persistência; mais 3 de importação, retenção e recuperação |
| Cursos | 27 manifestos, 111 seções, 145 clipes planejados e 35 objetivos conferidos |
| Orçamento de carregamento | Aprovado, sem aumentar os tetos |
| Lote em memória | Interrupção, retomada, repetição, segundo plano vazio e recuperação repetida aprovados com os bytes reais |
| Recuperação antes da transação | 11 testes do lote aprovados; corpus real recuperado repetidamente sem mudar o banco antigo |
| Inspeção visual | Build atual aberto no Chromium; quiz em execução e 14 famílias conferidas na paleta |
| WebKit local | Três provas de gravação ao recarregar/esconder a aba aprovadas |
| Kids no Chromium | 16 testes de navegador aprovados após a atualização das fixtures |
| Migração no Chromium | Quatro testes aprovados, incluindo importar, editar, salvar e reabrir rascunhos sem ativá-los |
| Editabilidade do corpus | 46 documentos com blocos restaurados e recompilados usando o verificador do editor; zero IDs perdidos, avisos ou IR inválida |
| Exemplos e catálogo | 232 testes aprovados após validar os documentos completos dos 155 exemplos |
| Transporte operacional | Duas reproduções falharam antes da correção; transporte e lote passaram em 13 testes, 57 asserções |

A rodada local do Firefox teve quatro aprovações e um timeout antes de editar o script, ao aguardar a aba da Ponte. O caso passou nas três execuções de diagnóstico com rastreamento (9,0 s, 10,9 s e 14,9 s), sem alteração de código ou limites. A rodada completa do CI continua sendo a referência integrada; não se atribuiu ao motor uma causa que o diagnóstico não demonstrou.

As contagens pertencem às execuções identificadas no registro por fase; não devem ser somadas como se fossem casos distintos.

## CI e implantação

A versão final `41c983f233b351182ea7459493578eace86335c1`, incluindo a correção do transporte operacional, passou pelo [CI completo e pela implantação de staging](https://github.com/informach/sistema-zero/actions/runs/34799331668). Members e Kids confirmaram esse mesmo SHA na instância em execução. O lote começou com a candidata anterior `2aee84eb`, também aprovada pelo CI; a alteração posterior ficou na ferramenta operacional e em seus testes.

- Studio: 8.251 testes; Chromium: 267, sem repetição; Firefox: 5; WebKit: 3.
- Kids: 781 testes e 16 provas de navegador; Member Shell: 496; Molda: 3.065.
- Lint, typechecks, testes dos demais serviços e etapas com PostgreSQL real passaram.
- Antes do lote, as seis APIs já entregavam documentos válidos de formato 2 pela conversão na leitura. Depois da reaplicação e da implantação final, as seis APIs preservaram conteúdo canônico, identidade e assets; os seis links públicos responderam com HTTP 200 e abriram sem erros no navegador.

Nenhum teste, limite de desempenho ou timeout foi dispensado para a implantação.

## Ensaio de staging

O primeiro corpus completo contém 57 documentos de projetos/entregas/publicações, 154 assets e 205 objetos de backup. O plano inicial altera 63 registros e prepara 51 objetos. Projetos iniciais dentro de cursos e rascunhos também são tratados. Dados privados ficam em `.cache/jogo-2d`, ignorada pelo Git, e nos backups privados do ambiente.

Uma nova conferência, antes de qualquer aplicação, encontrou edição concorrente de rascunho e recusou o plano anterior. Depois da revisão de editabilidade, foi capturado outro inventário sob hash `e8f49083d7c8c66e5fc9d508d0d82ffcf9e413829d27d441f0afbc57944ec243`, com a mesma cobertura; simulação e comparação SQL passaram novamente. O lote exige origem intacta, ETags, revisões crescentes, backup imutável, comparação integral do inventário sob transação breve e conferência dos bytes gravados.

A comparação em Chromium materializou os mesmos assets dos 51 documentos R2 antes e depois da conversão. Os 50 documentos atuais sem falha abriram e receberam uma sequência curta de início/teclado. Os dois RPGs que falhavam antes chegaram aos mapas convertidos. Um projeto 3D apresentou o mesmo erro de carregamento de textura nas duas versões: bytes preservados e PNG interno decodificado com sucesso; não foi identificado como regressão do conversor. Isso é uma verificação de abertura e comandos, não uma certificação de todas as regras de cada jogo.

Antes da implantação, as seis APIs públicas e as seis páginas de jogar em staging responderam com sucesso; o navegador não registrou erros nas seis páginas. Os links e IDs servem de referência para a conferência posterior.

Os dois documentos que revelaram o problema de rascunhos foram conferidos no Chromium tanto com o código convertido salvo quanto com o código reconstruído dos blocos. A abertura e a sequência curta de comandos passaram nas duas representações. Os cinco documentos sem estado autoral de blocos não entram na prova de restauração do Blockly.

Na primeira aplicação, a comparação posterior detectou o incidente de transporte descrito acima. Após concluir a gravação prevista do único registro divergente, uma captura independente conferiu os 51 objetos gravados, os 154 recursos preservados e os registros de todas as tabelas inventariadas. O novo plano ficou vazio: nenhuma alteração nem pendência. O incidente não foi ocultado por flexibilização da comparação.

A recuperação remota concluiu e foi conferida por outra captura: os 51 documentos voltaram ao conteúdo original sob novas revisões, os 154 recursos permaneceram intactos e as linhas coincidiram com o diário. Este staging não tinha registros de progresso por seção nem snapshots de migração de critérios; a preservação de progresso pelo lote tem provas automatizadas com dois perfis, mas não foi exercitada com esses registros reais no ambiente.

A recuperação repetida também passou e outra captura confirmou que ela não alterou conteúdo nem revisões. A aplicação definitiva usou um plano novo, sob hash `09ee4615855c828cb735ca3fbdbefe67fec87600d96e76e8f82c77de8e2908ab`, após nova simulação e comparação SQL.

A reaplicação concluiu sem divergências nem reparos adicionais. A captura final, sob hash `70a4968c9586f43cd191f666c6741f4d557a1105961cadddd4105394e989a86a`, conferiu os 51 objetos escritos, os 154 recursos preservados e todas as linhas esperadas. O plano final ficou com **zero registros a alterar, zero objetos a converter e zero falhas**.

Os backups dos dois lotes, os diários de recuperação e o registro do incidente de transporte foram conservados no armazenamento privado. Não houve exclusão de revisões antigas. Os dados de staging terminaram no formato atual.

## Pendências e limites

- Regravar e conferir os trechos de Studio identificados nos roteiros; preencher timecodes a partir das mídias reais e publicar as aulas revisadas.
- Validar clareza e ritmo com crianças e conferir as atividades com perfil de aluno. Testes automatizados não substituem essa avaliação pedagógica.
- Homologar a sessão autenticada de staging com uma conta de testes, incluindo a sequência completa de mural, versão própria e versão da cópia. Falta identificar uma conta/perfil reservado para esse ensaio; a solicitação feita durante o trabalho não recebeu resposta. Os testes locais e públicos usaram Playwright, pois o navegador integrado não estava disponível.
- Investigar separadamente a falha de carregamento da textura de um projeto 3D de staging, reproduzida também com o código anterior à reforma. O arquivo original foi conservado.
- Preparar a promoção de produção somente depois de avaliar o ensaio de staging. Os nove alunos de produção não foram migrados nesta entrega.
