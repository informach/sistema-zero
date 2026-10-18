# PRD — Jornada Kids configurável

Complemento de preservação aprovado pelo root: configurar gates de curso exige guardar também 21 direitos limitados de entrada/expansão/recompensa por tier, além de posto/ferramentas. Crianças sem XP e arquivadas entram no baseline inicial. Novos perfis têm admissão durável pending→Members materializa→Auth ready; pending não autoriza sessão, conta quota e retoma com mesmo ID. Isso é ciclo de identidade, sem segundo motor de jornada ou lock entre databases. Rollout inicial preserva perfis existentes ready e retira criadores antigos antes da captura. Detalhes/provas estão na techspec e no plano de testes.

## Problema

Hoje uma mudança na quantidade de aventuras necessárias ou no posto que libera uma ferramenta exige alterar código em várias superfícies. A jornada fixa exige 49 posições mesmo quando o catálogo ainda não contém todos esses cursos. O horizonte da interface evita promessas falsas, mas não permite ao responsável pedagógico ajustar o percurso.

Precisamos configurar requisitos e ferramentas sem descaracterizar a experiência infantil, misturar matrículas com conquistas ou dar ao professor de uma aula autoridade global sobre Pro e IA.

## Resultado esperado

O administrador pedagógico vê os oito postos atuais, escolhe o que cada avanço exige e quando capacidades abrem, simula o efeito e publica uma revisão com autoria. A criança continua usando o mesmo mapa e encontra pendências coerentes com a política efetiva. Uma revisão posterior pode mudar os próximos passos, mas não remove posto ou capacidade já conquistados. A posse do produto continua necessária para uso.

Orientação explícita do usuário em 18/10/2026: **um modelo novo, uma política persistida e publicada, todos os consumidores Kids migrados**. Seed inicial reproduz exatamente as regras atuais; nenhum caminho Kids normal executa o motor anterior ou fallback. A referência anterior Kids fica nas provas; helpers ainda usados legitimamente por Adult permanecem no ramo Adult, após inventário/teste, sem alimentar Kids. Maior posto atual informado é Construtor; isso não reduz cobertura oito/49 nem preservação de 100% das conquistas. Staging precede produção.

## Pessoas e permissões

- `admin` e `superadmin`: ler, simular, preparar, publicar e consultar histórico da política global. Usar esses papéis existentes evita criar um papel nominal sem RBAC real.
- `staff`: configura aulas/oficinas conforme as permissões atuais; não publica política global. Pode continuar com o passe de equipe para testar ferramentas, sem transformar esse passe em conquista persistida.
- Criança: recebe somente sua visão de percurso/capacidades, sem políticas de outros perfis ou histórico administrativo.
- Responsável: recebe visão autorizada dos filhos, com posto, próximas pendências e ferramentas; suas matrículas não fazem um filho herdar conquistas do irmão.

## Escopo necessário

| ID | Requisito e aceitação |
|---|---|
| K01 | Preservar slugs, nomes, arte, ordem e identidade visual dos oito postos. Não criar ou reordenar postos nesta entrega. |
| K02 | Bootstrap materializa e publica um seed exato: 49 posições, marcos, capacidades e acesso por posto/etapa/base atuais, inclusive catálogo incompleto e base ausente. Não usar somente IDs dos cursos existentes. Leitores normais usam exclusivamente a política publicada; ausência/corrupção não ativa regra antiga ou seed em memória. |
| K03 | Configurar requisitos por avanço: curso Kids gravado com `complete` ou `showcase` (showcase sempre também exige complete). O editor começa pelos requisitos legados e permite substituí-los por cursos explícitos. Placeholders de posições ainda não preenchidas continuam representáveis. |
| K04 | Configurar capacidades por posto: Estúdio livre, Pinta, Molda/faixas, Ponte, Pro, Zappy/IA e Pensa. Requisitos estruturais impedem combinações impossíveis; não exigir curso avançado para IA Kids, pois isso romperia o default. |
| K05 | Blocos e extensões livres continuam vindo dos cursos e grants existentes, independentemente do marco escolhido para subir de posto. `complete` no posto não muda automaticamente um curso posicionado para entregar sua paleta sem Mural. A simulação/editor precisa explicar essa diferença. |
| K06 | Sem regressão de posto, capacidades e direitos pedagógicos conquistados, inclusive sem visita durante a revisão anterior. Baseline preserva também entry/expanded/reward diante de novos thresholds/base. Curso apagado/retaggeado conserva evidência real de snapshots; não inventar marcos anteriores à gamificação. |
| K07 | Simulação sem escrita: mostrar diferenças de requisitos/capacidades, pendências e percurso impossível; perfil autorizado opcional. Não congelar grants, atribuir XP, gastar IA nem criar progresso no preview. |
| K08 | Política versionada com CAS, histórico imutável, autor autenticado, data do servidor, motivo curto e resumo de alterações. Conflito mantém o rascunho e pede recarregar/comparar. |
| K09 | Preparação de baseline com progresso retomável e publicação atômica somente quando pronta; interface informa que a regra atual continua ativa até a publicação. Falha/retry não perde conquistas nem publica metade da mudança. |
| K10 | Listagem e acesso direto usam a mesma política para cursos e ferramentas. Pensa verifica cada participante; Molda recebe famílias resolvidas; remix verifica requisitos do snapshot. |
| K11 | Toda operação mantém checagem comercial, conta/perfil/audiência e regras de exclusão. Revogação/expiração pode impedir uso do produto, mas não apaga a conquista. |
| K12 | Pausa mantém configuração/acesso/base, congela novos postos/app capabilities e conserva conquistas. Concluir realmente a base pode ampliar acesso às aulas pela regra retida e posto congelado; congelar também esse direito. Ausência/registro inválido/erro é indisponível, nunca liberado/reset silencioso. |
| K13 | JS e Python compartilham a política de capacidades, mas linguagem/ambiente da aula continua no contrato de autoria conciliado. Não adicionar Python aos grants de todos nem remover JS para liberar Pro. |
| K14 | Nenhuma promessa fixa de recompensa ou de domínio de habilidade pode contradizer a configuração. Default mantém a copy atual; custom usa recompensas derivadas e, quando necessário, frases neutras de conquista. |
| K15 | Retirar do runtime as regras e caminhos antigos da jornada Kids depois de substituir seus consumidores e provar paridade. Não criar ABI/modo legado permanente. Preservar projetos JSv2, Adult, ownership, snapshots/paletas curriculares, runtime/catalog e migrations: são outros contratos. |
| K16 | Bootstrap idempotente e auditável como sistema, com baseline real antes de expor a primeira política publicada. Não fabricar autor humano/preparação vazia, sobrescrever edição administrativa em deploy ou reiniciar versão silenciosamente após falha. |

## Jornada de quem configura

1. Abrir `Professor → Jornada Kids`, com versão ativa, modo e autoria mais recente.
2. Revisar oito cartões na ordem atual; cada avanço mostra requisitos, marco e capacidades cumulativas. Requisitos legados não preenchidos mostram posição/etapa, sem sugerir que existe curso.
3. Selecionar cursos Kids gravados; ver curso fora de alcance, recompensa circular ou vitrine ausente junto do requisito correspondente.
4. Simular: comparar com a versão ativa e, opcionalmente, visualizar um perfil autorizado. O relatório distingue mudança de regra, conquista preservada e licença necessária.
5. Preparar a publicação. A preparação congela o que os perfis já conquistaram na política ativa, em lotes retomáveis.
6. Publicar a revisão preparada. O servidor revalida dependências, versão e catálogo; um conflito preserva o trabalho local. Histórico permite abrir revisão antiga e usá-la como novo rascunho, sempre gerando outra versão.

Não pedir uma confirmação adicional genérica em cada edição. A publicação já é uma ação concreta e explícita, com resumo revisável. Problemas que tornam a configuração estruturalmente inválida impedem publicar; falta de catálogo herdada do legado aparece como aviso, pois o default atual é incompleto por construção.

## Regras de produto detalhadas

### Requisitos e acesso às aventuras

A organização por etapa/posição permanece. Uma política custom pode reduzir/substituir o que conta para o posto, mas não torna um curso futuro acessível por só referenciá-lo. A validação detecta ciclos com a trava pedagógica e aponta o curso/avanço envolvido.

O acesso por etapa/posto, a abertura de recompensas e o marco da base são explícitos na mesma política. Omitir a base dos requisitos de avanço não inventa um gate por código. Seed usa complete+showcase para a base, com o comportamento atual de base ausente; o editor e a simulação mostram qualquer diferença entre concluir avanço, abrir as outras aventuras e ganhar paleta. O ganho curricular segue K05.

Um curso `reward` que só abre depois do avanço não pode ser requisito desse mesmo avanço. Curso `extra` continua por matrícula e pode ser escolhido como requisito se for alcançável. `lenda` não entra nos avanços anteriores porque o próprio mapa só o oferece no topo; nesta fase permanece conteúdo de formatura. Uma revisão que mudou classificação de curso pode deixar um requisito antigo indisponível; conserva-se a conquista e sinaliza-se reparo ao operador.

### Recompensas e dependências

Capacidades são pedagógicas e cumulativas; não são produto comprado. Ponte e Pro dependem de Estúdio livre; Pro não precisa da Ponte como requisito técnico. Faixa Molda intermediária/profissional depende das anteriores e de Molda básico. Pensa depende de IA. Zappy dentro do Estúdio exige IA e o acesso efetivo ao Estúdio; não exigir Pinta/Molda de todo planejador Pensa.

Escolha recomendada para o primeiro escopo, ainda sujeita à revisão de produto: o editor conserva Faísca com criação em aula e customiza os avanços seguintes. O default obrigatoriamente mantém Faísca sem capacidades globais. A modelagem separa capacidades iniciais de conquistas por avanço, permitindo evolução explícita depois; não se deve esconder um toggle de liberar tudo nem inventar que zero requisitos significa estudar um curso. Liberar capacidades globais sem marco exige definir preservação dos perfis sem atividade no Members e não é necessário para esta primeira entrega.

### Estados vazios e falhas

Ausência de configuração não é modo de jornada. Provisionamento explícito persiste seed, prepara conquistas e publica V1; leitores normais exigem política publicada válida. Pausa retém requisitos/gates e congela posto/app capabilities. Conclusão real da base pode expandir aulas sob posto congelado, sem trocar complete por showcase, promover posto ou abrir recompensas por promoção fictícia. Arrays vazios de capacidades não concedem nada; requisito vazio não conclui avanço. Editor exige requisito por avanço ou pausa explícita.

Busca de estado indisponível preserva o último dado válido para apresentação e oferece nova tentativa. Operações que gastam recursos exigem verificação atual e falham de maneira recuperável. Não tratar erro como ausência de compra, zero conquistas ou catálogo vazio.

### Voz e aprendizagem ao vivo

A transcrição Kids é uma opção do perfil autorizada pelos pais e pelos contextos existentes; não adicionar gate de IA/posto a essa função nesta mudança. Narração gerada de Pensa/Zappy acompanha a capacidade do recurso de origem. Áudio pré-gravado, fala do professor e ferramenta incorporada à aula/oficina continuam no contexto de aprendizagem.

## Fora do primeiro escopo

Novos postos, múltiplas jornadas por turma/organização, teste A/B, agendamento de políticas, publicação automática, edição global de blocos por posto, mudança dos valores de XP/moedas, mudança do papel comercial dos produtos, concessão automática de linguagem, reforma visual do mapa, analytics populacionais completos e substituição da jornada Adult.

O preview inicial fornece diff de regras, análise de alcançabilidade do catálogo e um perfil autorizado. Não promete número total de crianças afetadas: isso exige uma consulta populacional medida e um contrato de dados próprio. O baseline publica contagens operacionais de processados/falhas, não um dashboard de impacto.

## Critérios para liberar implementação e ativação

O checkpoint conciliado foi incorporado e a persistência intermediária tem provas SQL. Antes de T3: rebase ao remoto informado pelo root e revisão do payload canônico/seed, retirando os modos/fallbacks do protótipo T1/T2. Antes de liberar: bootstrap/baseline completos em SQL, todos os consumidores migrados, caminhos antigos de jornada removidos, teste sem passe de equipe e staging validado. Produção/deploy/push não estão autorizados nesta frente.
