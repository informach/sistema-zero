# Jornada do Criador

Contrato implementado em 25/10/2026 para Kids e adultos. A política publicada continua sendo a autoridade; este documento não afirma que houve deploy ou ativação em produção.

A proposta editorial aprovada está em [currículo completo](../packages/members/src/infrastructure/config/creator-journey-curriculum.json). Os comandos, os vínculos dos cursos e os cuidados de ativação estão em [seed e publicação](jornada-criador-seed.md).

## Como o aluno avança

Cada posto ensina um tipo de jogo em duas dimensões. Primeiro vem a base 2D, depois a base 3D. Ao concluir o par, missão, Poderes e extras abrem juntos. O aluno escolhe a ordem dessas três frentes.

| Posto | Jogo-base | Missão em outro contexto | Poderes distintos para avançar |
|---|---|---|---|
| Faísca | Chave e porta: Farol / Ilha 3D | Jardim Secreto | 1 |
| Construtor(a) | Tiro espacial: Nave / Patrulha 3D | Estação de Reciclagem | 2 |
| Inventor(a) | Corrida infinita: Dino / Runner 3D | Entregador na Tempestade | 2 |
| Explorador(a) de Mundos | Acerte o Alvo / Galeria 3D, em Python | Vagalumes | 2 |
| Mestre dos Jogos | Plataforma por fases: Mina / Ilhas Suspensas | Entrega nos Telhados | 2 |
| Arquiteto(a) de Mundos | Defesa por ondas: Guardiões do Cristal, JavaScript | Resgate na Estação | 2 |
| Gênio da Criação | Construção e gestão: Ilha que Floresce, JavaScript | Base na Lua | 2 |
| Lenda | Especialização, projetos e participação voluntária | Maestrias por área | Sem dívida adicional |

Promoção = ambas as bases concluídas + missão completa nas partes 2D e 3D + quantidade mínima de Poderes aplicados. Duas versões da mesma mecânica contam como um Poder. O curso de Poder inclui sua aplicação ao jogo-base; assistir não substitui os objetivos da parte. A missão usa as lógicas das bases, sem exigir um Poder ou extra específico.

Extras, XP, sequência de dias e publicação no Mural são opcionais para a promoção. Não existe projeto autoral adicional obrigatório para chegar à Lenda. Um mesmo projeto pode reunir evidências de cursos e Maestrias.

Cada curso concluído concede seus blocos ao Estúdio, sem esperar Mural ou promoção. Isso inclui cursos arquivados que continuam acessíveis ao aluno; rascunhos não geram novas concessões. Blocos já conquistados permanecem no ledger. A aula pode oferecer blocos curados antes do desbloqueio global. Licença comercial, capacidade global da ferramenta, linguagem/runtime e repertório de blocos continuam verificações distintas.

## Cursos existentes e direitos comerciais

O seed resolve slug, público e modalidade para manter o UUID real de cada curso. Preserva aulas, versões, conclusões, XP, entregas e concessões. Nunca substitui um curso existente por uma cópia de mesmo título.

| Curso | Destino no novo currículo |
|---|---|
| A Chave do Farol (`desafio-primeiro-jogo`, com variante adulta) | Base 2D do Faísca |
| Cadê Todo Mundo? | Extra do Faísca |
| Nave Contra Asteroides | Base 2D do Construtor |
| Corre, Dino! | Base 2D do Inventor |
| O Jogo do Meu Jeito | Extra do Construtor |

Farol e Cadê comprados separadamente abrem durante a validade da concessão específica, mesmo sem assinatura e sem completar o par. A matrícula originada de assinatura não cria essa exceção. Um presente explicitamente concedido também mantém a promessa e o prazo originais. A exceção abre somente o produto concedido.

O resolvedor procura o direito independente mesmo quando existe uma assinatura mais forte. Catálogo, Meus cursos, detalhe e autorização usam o mesmo resultado. Expiração e revogação continuam sendo respeitadas.

## Maestrias

Seis áreas, todas voltadas à produção de jogos:

- Jogos em Python 2D e Jogos em Python 3D: entrada após o par do Explorador.
- Jogos em JavaScript 2D e Arte 2D para Jogos: após o par do Construtor.
- Jogos em JavaScript 3D e Modelagem e Animação 3D para Jogos: após o par do Inventor.

A Lenda torna todas as entradas elegíveis, sem conceder selos automaticamente. Não é preciso concluir uma linguagem ou dimensão irmã. Blocos, Ponte e Pro são modos dentro da área. Converter o projeto, por si só, não comprova domínio de escrita manual.

Cada área tem três níveis: ampliar uma referência; integrar sistemas; criar, testar e revisar um jogo autoral. Cada nível exige um núcleo, duas oficinas diferentes entre três e uma entrega aprovada em todos os critérios essenciais. II exige I, e III exige II. Núcleo e oficinas podem receber créditos validados, com evidência e justificativa registradas.

A entrega aponta para uma evidência do próprio aluno e da mesma comunidade. O servidor captura projeto, revisão e rubrica; a equipe avalia essa versão, com devolutiva por critério. Para reenviar após ajustes, o aluno salva outra versão do projeto na aula e seleciona essa nova evidência. Repetir o mesmo envio é idempotente: não cria outra fila de avaliação. Duas revisões simultâneas não podem sobrescrever uma à outra. O carimbo antigo de projeto conferido continua sem valor de aprovação pedagógica.

Uma aprovação pode preceder a conclusão de núcleo/oficinas. O selo só nasce quando todas as condições são atendidas, com uma única entrega aprovada como testemunha; não se juntam critérios ou créditos de projetos diferentes para fabricar uma aprovação. Uma mudança editorial posterior não troca os requisitos de quem já enviou nem fecha o nível iniciado. Essa preservação não antecipa outros níveis ou áreas. O recibo de conquista e suas capacidades são duráveis; uma assinatura expirada não apaga o selo, mas impede novas entregas e acesso ao conteúdo licenciado.

Arte e modelagem trabalham sobre jogos funcionais com assets provisórios. O objetivo é criar, integrar e testar os assets no jogo. As referências, roteiros e critérios por nível estão no currículo editorial.

## Autoridade, preservação e publicação

O contrato compartilhado é `CreatorJourneyCurriculum`, dentro das políticas Kids e adulta já versionadas. Sua presença seleciona a nova regra. A ausência preserva a interpretação de uma política histórica publicada; não há seed automático nem currículo fictício como fallback de leitura.

Postos são identificados por `JourneyLevelSlug`; cursos por UUID. Os tiers antigos continuam sendo dados técnicos e históricos, sem representar os novos postos. A projeção pura do core determina progresso, requisitos e bloqueios; as interfaces apresentam essa projeção.

Posição alcançada, ferramentas adquiridas e acesso pedagógico já aberto são preservados. O ledger `creator_journey_course_grants` conserva os UUIDs abertos, inclusive no posto atual antes de promover. Preservar acesso pedagógico não concede uma licença comercial.

A publicação Kids mantém preparação, captura da coorte, hashes de catálogo/coorte e CAS. A publicação adulta captura a regra que está saindo em páginas de 250 pessoas, dentro de uma transação consistente, antes da troca da versão. A memória é limitada por lote; o tempo do bloqueio cresce com a coorte e deve ser medido no ensaio de subida. Quem nunca abriu a tela de progresso também entra na preservação.

A pausa operacional Kids congela novas promoções, capacidades e selos. O estudo no posto atual, a expansão pela conclusão do par, o envio e a revisão de Maestrias seguem possíveis. A gravação do selo confere a versão da política dentro da transação: uma pausa concorrente não concede uma conquista nova. Direitos já adquiridos permanecem, sujeitos à licença. Ao retomar, requisitos satisfeitos são reconciliados.

## Telas e operação

Kids conserva seus postos, cores e linguagem. Adultos usam o visual Estúdio à noite: descoberta no palco escuro, requisitos e revisão na bancada clara. Cursos, posto, home e progresso apontam para o próximo passo real. Maestrias têm hub, níveis, critérios, seleção de evidência e devolutiva. O Admin edita os vínculos do currículo e usa a fila de Maestrias, na seção Turma, para registrar avaliações.

O revisor abre o projeto preservado no Estúdio ou no Pinta. Envios da galeria carregam a cópia daquela entrega e seus materiais, mesmo que a galeria pessoal mude depois. Projetos Python usam autorização própria da revisão para executar e representar o código em blocos, vinculada ao conteúdo integral entregue e à conta da equipe. Essa inspeção não concede edição, LSP ou REPL. Alterar a lente Kids/adultos descarta respostas pendentes da fila anterior.

O seed completo cadastra o planejamento como rascunho: 294 cursos entre os dois públicos, incluindo os dez vínculos conhecidos de cursos existentes, e os roteiros dos conteúdos novos. Essa contagem não significa 294 gravações prontas. Cursos novos e suas aulas ficam não publicados até autoria e revisão pedagógica reais.

Os novos cursos guardam os IDs das aulas planejadas. Publicar exige todas essas aulas publicadas. Suas identidades não podem ser excluídas, mesmo em rascunho; a autoria revisa título, conteúdo e ordem mantendo a aula. Para despublicar uma parte obrigatória, despublique o curso primeiro. Assim uma missão não fica disponível apenas com a metade 2D e a edição não deixa referências órfãs. A guarda assegura cobertura do planejamento; cada aula ainda precisa de conteúdo e critérios pedagógicos reais. O seed aponta os campos de encerramento de Farol/Cadê que precisam de conferência editorial, sem sobrescrever aulas existentes.

A migration `0139_creator_journey_masteries` adiciona o ledger de cursos e as tabelas de entregas, revisões e conquistas. A `0140_adult_molda_curriculum_bands` amplia o CHECK das capacidades adultas para preservar também as faixas intermediária e profissional do Molda. As duas precedem a ativação e não alteram o conteúdo existente. Exclusão da conta remove as novas evidências e respeita a cerca de gravação da plataforma.

Antes de ativar: aplicar migrations, ensaiar o seed em banco local/staging, revisar o plano e os UUIDs, cadastrar rascunhos, produzir/publicar as bases necessárias e publicar as políticas pelo protocolo documentado. Não ativar uma etapa anunciando um curso que ainda não está pronto.

Reverter a aplicação exige uma versão compatível com o campo `curriculum`. Preserve as tabelas de concessões e evidências; não apague conquistas para reverter uma configuração. Prefira publicar uma política corretiva pelo fluxo versionado ou pausar a progressão enquanto o ajuste é preparado.

## Referência histórica

O [modelo anterior e seu bootstrap](jornada-do-criador-legado.md) documentam as 49 posições, `tierAccess` e marcos de publicação das políticas sem `curriculum`. Essas regras não governam o currículo novo.
