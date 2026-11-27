# Produção das bases do Construtor

> Atualizado pela [revisão de 27/11/2026](revisao-2026-11-27.md): arte do Blender com quatro variações, revisão didática e verificação no navegador.

Autoria de 24/11/2026, feita a partir dos jogos aprovados e do padrão dos cursos do Faísca. Este pacote contém os cursos completos em fonte e em materiais de produção. Os áudios e vídeos ainda serão produzidos; o cadastro e a publicação na plataforma não foram executados.

## Escopo entregue

| Material | Nave Contra Asteroides · 2D | Patrulha Espacial · 3D |
|---|---:|---:|
| Aulas / partes | 9 / 53 | 5 / 25 |
| Módulos editoriais | 3 | 1 |
| Projetos progressivos importáveis | 26 | 19 |
| Experiências com cenas nativas | 15 | 2 |
| Revisões em quiz | 3 | 2 |
| Entregas de projeto | 9 | 5 |
| Tipos de blocos liberados | 48 | 46 |
| Imagens ou modelos incorporados | 12 imagens SVG | 3 modelos GLB |
| Capa e Passo a passo visual | Incluídos · PDF de 94 páginas | Incluídos · PDF de 45 páginas |

As etapas incluem o projeto inicial e a referência final. Os arquivos `projeto-inicial.szproject.json` e `projeto-final.szproject.json` são cópias convenientes dessas etapas, não projetos adicionais na contagem. Partes de entrega também podem terminar uma montagem. Os quizzes não recebem um vídeo artificial só para preencher a estrutura.

## Decisões pedagógicas aplicadas

**Faísca → Construtor → Inventor.** O Faísca fornece um projeto bastante pronto e introduz poucas mudanças. O Construtor mantém uma estrutura de apoio, mas a criança constrói os sistemas centrais da partida. A reautoria futura do Inventor deverá começar sem blocos e ensinar a montagem completa.

**Telas e fluxo de partida.** Abertura, estado inicial, comando para começar, telas de resultado e mecanismo de reinício já vêm preparados. O aluno usa a condição conhecida de `jogando` nas regras novas, monta pontos e vidas, escreve as condições de vitória/derrota e confere uma nova partida. A arquitetura de telas e estados não foi introduzida como um segundo sistema para construir neste posto.

**Uma conquista de cada vez.** As etapas intermediárias retiram o que ainda não foi ensinado. Um primeiro laser fica parado antes de ganhar origem e voo; o contato existe antes do placar; o contador é distinguido do número que aparece na tela. Os critérios e os testes acompanham a conquista de cada parte, inclusive a ausência das regras futuras.

**Ordem 2D → 3D.** A Patrulha sucede a Nave, conforme a [Jornada do Criador](../../jornada-do-criador.md). Reaplica as ideias já vivenciadas em 2D e ensina a montagem de seus blocos 3D. As duas experiências espaciais retomam cenas reais da Ilha do Farol para investigar direções e contato; não apresentam uma bancada inexistente da Patrulha.

**Personalização de aparência.** As duas bases oferecem quatro opções de cada elemento (nave, cenário, asteroide e laser), feitas no Blender na revisão de 27/11/2026 ([revisao-2026-11-27.md](revisao-2026-11-27.md)). As escolhas não mudam meta, vidas, velocidade, intervalo, dano ou dimensões de contato.

## Revisão de continuidade e aderência à didática

A retomada leu integralmente a [proposta do PR](proposta-cursos-base-2026-11-24.md) e os guias dos dois protótipos antes de revisar as fontes recuperadas. A aprovação dos jogos foi mantida. A revisão corrigiu diferenças entre a intenção documentada e o pacote inicialmente recuperado:

| Referência da proposta | Aplicação consolidada |
|---|---|
| Seções 3.1 e 8.1: construir desde a primeira aula | A primeira aula 2D termina com nave pilotável e limitada à tela. O caderno permanece somente na Parte 2. |
| Seções 3.1, 8 e 9: uma ideia por parte e revisão depois da experiência | O tiro foi dividido entre nascimento/origem e voo/retirada. O quiz de tiros e intervalo vem depois dos asteroides, na aula 4. |
| Seções 3.2 e 10: objetivos cumulativos e comportamento real | Os critérios preservam as conquistas anteriores. Há regressões que removem sistemas ou alteram regras e precisam ser recusadas, preservando escolhas de aparência válidas. |
| Seções 7 e 11: apoios e montagem reais no 3D | Os objetivos 3D observam valores escalares pelo contrato oficial. Não usam scripts que tentariam serializar os objetos circulares de Three.js. |
| Seção 12: manter a identidade dos cursos | As nove identidades 2D e cinco 3D permanecem. O cadastro registra a nova distribuição das três primeiras aulas 2D antes da importação. |
| Seção 12: uma autoria para as ofertas correspondentes | A Patrulha passou a integrar o registro de cursos comuns. A projeção da autoria para a oferta adulta foi validada nas cinco aulas pelo mesmo contrato usado pelo Admin. |

O ensaio determinístico da progressão usa o motor oficial, o codec e o julgador de observações, com as diferenças de ambiente descritas nos relatórios. Uma tentativa adicional de executar o Chromium oficial foi bloqueada antes de abrir a página por restrição de sockets; a elevação de permissões foi rejeitada automaticamente pelo ambiente. O [relatório do executor](../../aulas-interativas-tecnico/qa/relatorios/construtor-base-executor-nativo.json) registra os pedidos preparados e esse bloqueio, sem declarar aprovação no navegador. A conferência visual no Estúdio e no palco de gravação continua na produção das mídias.

## Como encontrar cada material

| Arquivo no diretório do curso | Finalidade |
|---|---|
| `README.md` | Entrada do pacote e guia de produção |
| `modulos.md` | Cadastro do curso, público, slugs, apresentação, pré-requisitos, módulos, aulas e estimativas |
| `mapa-de-aulas.md` | Todas as partes, na ordem, com suas conquistas e etapas |
| `<curso>-<aula>.md` | Orientações e conteúdo autoral da aula |
| `<curso>-<aula>.manifesto.json` | Manifesto v5: blocos, partes, experiências, quizzes, exemplos, critérios e continuidade |
| `<curso>-<aula>.roteiro.md` | Roteiro integral, com fala, Na tela, gestos e montagem |
| `<curso>-<aula>.elevenlabs.txt` | Master integral da professora, com interpretação e divisões de clipes |
| `<curso>-<aula>.debinha.elevenlabs.txt` ou `.dede.elevenlabs.txt` | Falas completas do personagem da aula |
| `<curso>-<aula>.edicao.json` | Substituições de voz com âncoras literais, ocorrência e identificação do clipe |
| `passo-a-passo.md` e `passo-a-passo-do-projeto.pdf` | Guia textual e caderno visual com passos, encaixes e testes |
| `capa.jpg` | Capa composta com as artes reais do jogo |
| `blocos.json` e `blocos-usados.md/json` | Liberação técnica e inventário legível, distinguindo montagem e apoio fornecido |
| `projetos/*.szproject.json` | Todas as versões de entrada e solução da progressão |
| `zappy-etapas.json` | Configuração e falas internas das experiências, com objetivos de descoberta |
| `curso-autoria.json` e `validacao-autoria.json` | Derivado editorial e conferência do pacote |

As fontes editáveis estão em `docs/aulas-interativas-tecnico/qa/`, começando por [construtor-2d.ts](../../aulas-interativas-tecnico/qa/construtor-2d.ts) e [construtor-3d.ts](../../aulas-interativas-tecnico/qa/construtor-3d.ts). Não alterar apenas um TXT, um manifesto ou um PDF: corrigir a fonte e regenerar seus derivados.

### Vozes e edição

O master da professora conserva a explicação inteira. Na edição Kids, Debinha participa das aulas ímpares e Dedé das pares. Os arquivos dos personagens repetem exatamente os parágrafos que substituem; os índices de edição indicam o trecho e o contexto antes/depois. Assim é possível produzir a edição adulta com o master integral e a Kids com as trocas de voz, sem perder instruções.

Não há duração falsa de áudio, timecode inventado ou arquivo TXT apresentado como gravação. As estimativas nos cadastros servem ao planejamento; a duração final será medida depois da edição.

### Materiais no cadastro

O caderno aparece uma única vez, na **Aula 1, Parte 2**, com `bookPreview: true`. O bloco nativo `materiais` já traz os links de Como Fazer. Anexar o PDF correspondente e a capa pelos campos reais do Admin ao preparar o rascunho; os IDs de arquivos dependem desse envio e não foram inventados no manifesto.

| Curso | Slug Kids | Slug adulto correlato | Anexos |
|---|---|---|---|
| Nave Contra Asteroides | `nave-contra-asteroides` | `nave-contra-asteroides-adulto` | [Capa](nave-contra-asteroides/capa.jpg) · [PDF](nave-contra-asteroides/passo-a-passo-do-projeto.pdf) |
| Patrulha Espacial | `jornada-construtor-base-3d` | `jornada-construtor-base-3d-adulto` | [Capa](patrulha-espacial/capa.jpg) · [PDF](patrulha-espacial/passo-a-passo-do-projeto.pdf) |

## Continuidade com o acervo e a Jornada

O Nave preserva as nove identidades de aula existentes: `primeira-nave`, `dia-1`, `dia-2`, `chuva-de-asteroides`, `dia-3`, `pontos`, `dia-4`, `comecar-partida` e `dia-5`. A Patrulha usa as cinco identidades reservadas: `aula-1` a `aula-5`. Os cadastros completos explicam a reconciliação dos módulos e dos públicos. Não foram criados UUIDs fictícios.

O currículo recebe referências explícitas para esta autoria e a fronteira aprovada de Construtor/Inventor. As 14 listas históricas de planejamento permanecem intactas, porque participam da identidade e do hash do seed. Missões, Poderes, extras e requisitos de promoção continuam preservados. A autoria das duas bases não declara pronta a missão nem altera a quantidade de Poderes exigida.

O gerador antigo do Nave passa a encaminhar para esta autoria. A antiga base de projetos ainda consumida por outro curso e por testes permanece como fixture histórica identificada; não é novamente publicada como o Nave atual. Os [seis protótipos aprovados](prototipos-base/README.md) ficam preservados como referência de comparação.

O final 3D conserva o jogo aprovado. No final 2D, a abertura conserva o texto literal fornecido no inicial, com a mesma meta fixa de vinte; a regra e a apresentação do objetivo são equivalentes às aprovadas. A personalização pode mudar imagens e cores sem ser recusada pelo verificador por diferir da solução de exemplo.

## Conferência executada

O [relatório consolidado](../../aulas-interativas-tecnico/qa/relatorios/construtor-base-validacao.json) registra os contratos de autoria e de funcionamento, os hashes dos derivados e os limites dos ensaios.

| Verificação | Evidência e alcance |
|---|---|
| Projetos nativos | [45 conversões no Blockly real](../../aulas-interativas-tecnico/qa/relatorios/construtor-base-roundtrip.json), schema e equivalência dos arquivos gerados; sem JavaScript cru |
| Progressão 2D | [26 etapas e 176 grupos de verificações](../../aulas-interativas-tecnico/qa/relatorios/construtor-base-runtime-2d.json), motor oficial e Canvas2D real; [147 objetivos cumulativos](../../aulas-interativas-tecnico/qa/relatorios/construtor-base-objetivos-2d.json) com observações escalares, checkpoints e codec oficial |
| Progressão 3D | [19 etapas e 84 objetivos de execução](patrulha-espacial/qa-runtime-progressao.json), runtime oficial, GLTFLoader, geometria Three.js e Canvas2D; desenho WebGL substituído no adaptador |
| Experiências 2D | [Quinze bancadas e suas 39 metas](../../aulas-interativas-tecnico/qa/relatorios/construtor-2d-experiencias.json), todas abertas sem descobertas prévias e concluídas pelas ações oficiais |
| Experiências 3D | [Duas bancadas e suas cinco metas](patrulha-espacial/qa-experiencias.json), ações e avaliador oficiais |
| Critérios e derivados | Schemas, entradas/soluções, cadeia contínua, alvos de etapa, vozes e revisão dos gestos nos relatórios de autoria e QA |
| Aparência 2D | As 81 combinações dos quatro conjuntos de três imagens mantêm os critérios; mudanças indevidas de regras são recusadas |
| Cadernos | Medição de todas as páginas, fontes incorporadas, cores oficiais, limite de margem/rodapé e inspeção visual das páginas renderizadas |
| QA editorial completa | 872 testes passaram nos 42 arquivos da pasta técnica; 56 manifestos válidos e 332 clipes auditados em 68 aulas do acervo, sem erros |
| Regressão e integração | 186 testes do core e 20 testes HTTP de importação/reimportação passaram; total de 1.078 testes, sem contar repetições |

Os presets nativos usados pelas experiências foram adaptados com compatibilidade: a experiência de pontuação admite a meta vinte e a de geração admite intervalo em segundos, incluindo 1,5. Os padrões anteriores continuam disponíveis. O pedido falado do Zappy recebe o mesmo preset da bancada. O salvamento e a restauração preservam a meta e a altura das pedras; os testes cobrem também os snapshots antigos.

Os ensaios locais usam os módulos oficiais com adaptadores descritos nos relatórios. A integração HTTP passou em 20 casos: as 14 aulas Kids destas bases, as cinco aulas adultas da Patrulha e a regressão do Farol. Ela usa a aplicação real com repositórios em memória e confere importação e reimportação no rascunho, preservação de identidades e anexos e ausência de alteração no conteúdo publicado.

Ainda não foram executados o teste visual no Estúdio publicado, a validação completa de alvos pelo palco de gravação e a suíte de todo o monorepo. A conferência HTTP local não importa aulas no banco da plataforma. A limitação do navegador e a substituição do desenho WebGL no adaptador permanecem registradas no relatório.

## Regeneração

No checkout completo, com as dependências do repositório instaladas:

```sh
bun docs/aulas-interativas-tecnico/qa/gerar-construtor-bases.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-inventario-blocos.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-base/montar-conteudo.ts nave-contra-asteroides
bun docs/aulas-interativas-tecnico/recursos/construtor-base/montar-conteudo.ts patrulha-espacial
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py construtor-nave --paginate
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py construtor-patrulha --paginate
```

As dependências de impressão e as conferências estão no [guia do pipeline](../../aulas-interativas-tecnico/recursos/construtor-base/README.md). Depois de mudar texto ou etapas, repetir a revisão dos gestos e a inspeção visual dos PDFs. Regenerar as capas e miniaturas somente quando seus assets mudarem.

## Próxima etapa de produção

1. Gerar as vozes dos masters e dos personagens, revisar a pronúncia e editar pelas âncoras fornecidas.
2. Conferir os planos no palco de gravação, resolver os alvos reais da interface, gravar e editar as demonstrações.
3. Reconciliar os cadastros existentes como rascunho, anexar capas/PDFs e substituir cada `plannedVideo` pela mídia revisada.
4. Importar os projetos pela interface, fazer a revisão visual e percorrer as aulas com os anexos e vídeos definitivos antes da publicação.

As artes do Blender já estão integradas (revisão de 27/11/2026). Para mudar uma peça, gere de novo no Blender, publique com `publicar-construtor-modelos.ts` e regenere os cursos; a caixa comum de cada categoria mantém tamanho, centro e área de toque.
