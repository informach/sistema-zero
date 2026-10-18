# Plano de testes — Jornada Kids configurável

Status: cenários planejados. Nenhum teste produtivo/SQL/browser foi executado nesta fase de documentação. Executar em janela coordenada para não competir com a validação Python no PC de 16 GB.

## Provas de domínio e default

| ID | Preparação/ação | Resultado exigido |
|---|---|---|
| D01 | Sem registro de política, sem marcos | noob, sem ferramentas globais; aula continua pelo próprio contexto. |
| D02 | Curso de entrada completo sem showcase / com ambos | Sem ambos continua noob; com ambos coder, livre/Pinta e mesmas recompensas atuais. |
| D03 | Cada fronteira cumulativa 1,9,17,25,33,41,49 slots qualificados | coder,hacker,explorer,elite,architect,champion,god respectivamente; 1 e 8 por etapa, não 48 no total. |
| D04 | Remover cada slot obrigatório, com todos os demais presentes | Nunca pular avanço incompleto; igualdade com `computeJourneyLevelSlug` legado. |
| D05 | Complete A e showcase B, ambos com mesmo slot histórico | Não combinar marcos de cursos distintos. |
| D06 | Curso re-nivelado/apagado depois dos dois marcos | Snapshot preserva slot/posto; precedência showcase→complete→fallback conforme legado. |
| D07 | Base publicada / base ausente, posições 2+ e reward | Mesmo future-tier/foundation-first/tier-reward/fail-open do legado, em listagem e URL direta. |
| D08 | Extra com e sem matrícula; curso lenda; combinação de tier inválida | Extra sem trava de jornada, matrícula permanece; lenda/par fora da escada sem gate pedagógico novo. |
| D09 | Curso ao vivo concluído, mesma conta com chave-mestra | Não conta posto nem paleta; vaga por aula continua a fonte de acesso. |
| D10 | Default em cada posto | Livre/Pinta coder, IA/Pensa hacker, Molda explorer, faixa intermediária architect, Ponte champion, Pro/profissional god. |
| D11 | Política custom muda curso X de showcase para complete | Conclusão basta para avanço; fundação usa critério configurado; paleta posicionada continua pendente de Mural e a UI explica. |
| D12 | Curso explícito extra de etapa alcançável / curso reward que depende do próprio avanço | Primeiro permitido com licença; segundo gera diagnóstico de ciclo e não publica. |
| D13 | Curso futuro, adulto, live, inexistente ou com vitrine impossível | Tipo/audiência inválida rejeitados; futuro circular aponta curso/avanço; showcase sem vitrine é indisponível, sem prometer avanço pronto. |
| D14 | Policy configured malformada, passo repetido/fora de ordem, vazio, slot 9 | Não normalizar silenciosamente, não subir por requisito vazio. |
| D15 | Arrays de capacidades vazios / modo paused | Vazio não libera tudo; paused conserva conquistas e interrompe ganhos. Ausente é legado. |
| D16 | pro sem studio; bridge sem studio; pensa sem ai; Molda profissional sem intermediário | Rejeitar dependência cumulativa inválida. Pro+studio sem bridge é tecnicamente permitido. |
| D17 | Mover capacidade para depois/remover na revisão seguinte | Quem conquistou conserva; novo perfil depende da regra atual, mesmo se outro perfil da família conquistou. |
| D18 | Piso conquistado architect, novos requisitos anteriores faltantes | Não rebaixar nem pedir refazer etapas anteriores; avaliar próximo avanço a partir do piso. |
| D19 | Política mais fácil concede capacidade a posto já conquistado | Torna elegível pela regra ativa; baseline da próxima troca protege também quem não visitou. |
| D20 | XP alto/coins/badges sem marcos | Não substituem curso/slot; calcular jornada não muda valores nem ledger. |

Oráculos existentes: `packages/core/tests/journey.test.ts`, `journey-state.test.ts`; `packages/members/tests/unit/levels.test.ts`, `journey-migration-contract.test.ts`; `packages/community-kids/tests/journey-conformance.test.ts` e `journey-rewards-conformance.test.ts`. Acrescentar fixtures de curso apagado e legado sem snapshot sem apagar expectativas atuais.

## Provas SQL obrigatórias de baseline/CAS

Usar Postgres real com barreiras de duas conexões/transações. Um fake que reimplementa o algoritmo não prova isolamento/lock/CAS. Não usar `created_at` como fronteira de commit e não usar sleeps para coordenar o cenário.

| ID | Corrida/falha | Invariante |
|---|---|---|
| B01 | Aluno já coder no legado, nunca leu a jornada; preparar custom mais restritivo | Baseline materializa coder e capacidades legadas antes do CAS; mantém após ativação. |
| B02 | V1 liberaliza para studio em posto já conquistado; perfil não visita nem ganha marco; preparar V2 restrita | Varredura da política V1 preserva studio. Não depender do GET. |
| B03 | Award conclui último requisito enquanto baseline lê o mesmo perfil | Resultado final tem conquista sob uma versão coerente; nenhum marco confirmado elegível é perdido na troca. |
| B04 | Award começou antes de publish, commit depois / aguardando lock de policy | Ordem efetiva é definida pelos locks e versão, sem grants atribuídos à política errada. Provar os dois lados da barreira. |
| B05 | Novo perfil com UUID menor que cursor durante preparação | Hook do marco protege; paginação não causa perda de conquista. |
| B06 | Retry da mesma página após conexão cair antes/depois de commit | UPSERT e cursor idempotentes; sem capacidade perdida/duplicada; sem XP novo. |
| B07 | Dois operadores preparam/publicam expectedVersion igual | Só um CAS ativa; outro recebe 409 mantendo draft; histórico sem duas versões iguais. |
| B08 | Crash depois de freeze e antes de ready / antes do commit final | Regra ativa permanece V; retoma e publica integralmente, sem estado parcialmente ativo. |
| B09 | Curso retaggeado, arquivado, vitrine removida ou fallback alterado durante preparação | Hash/validação final detectam mudança relevante; preparação stale exige refazer; conquistas já congeladas permanecem. |
| B10 | Purge da conta concorre com baseline/GET/award | Fence vence persistência tardia; replay não recria dados do perfil; sem deadlock por ordem invertida. |
| B11 | Linha legada com snapshot parcial/owner ausente na coorte | Regra explícita de fallback/auditoria; não marcar preparação pronta com perfil silenciosamente descartado. Dados reais determinam se caso existe. |
| B12 | Batch/getMany/publish concorrentes com grant de capacidade e avanço | Maior posto e união sempre monotônicos; getMany usa versão coerente e não vira N+1; Adult não recebe grant Kids. |
| B13 | Primeira publicação v0 com linha de policy ainda ausente e award em voo | Lock estável protege v0; SELECT FOR SHARE em resultado vazio não é considerado proteção. Só um primeiro CAS ativa e nenhum ganho legado confirmado é perdido. |

Também verificar migration aditiva em banco novo, execução conjunta com purge nas duas ordens e que todos os DB tests foram executados, sem `describe.skipIf` por conexão ausente. Inspecionar índices para paginação por perfil/coorte; medir custo por batch e preview. Não atribuir limite de escala sem medição.

## HTTP, segurança de escopo e acesso efetivo

| ID | Caso | Resultado |
|---|---|---|
| H01 | Customer/staff/sem origem interna em policy/preview/prepare/publish/history | Recusa conforme autenticação/RBAC; esconder menu não é a proteção. |
| H02 | Admin/superadmin autenticado | Pode operar política; autor/data derivados do servidor; campos spoofados não gravam. |
| H03 | Perfil de irmão/outra conta em consulta, preview ou participante Pensa | Autorização atual aplicada; nunca herda capacidades por matrícula da família. |
| H04 | Preview repetido e depois comparar tabelas/ledger | Nenhum grant, baseline, XP, progresso, consumo de IA ou auditoria de publicação criada. |
| H05 | Product grant revogado/expirado com conquista permanente | Conquista permanece; uso pago/armazenamento/operação exige acesso ativo atual. |
| H06 | Falha de policy/milestone/catalog | 503/estado indisponível recuperável, sem fallback liberador ou resete de posto. |
| H07 | Members novo/BFF antigo durante deploy | Custom permanece desativado; novo campo aditivo não quebra Adult. Após ativar custom, campo ausente não aplica regra fixa silenciosamente. |
| H08 | Curso/base complete-only na UI vs URL direta | A mesma trava decide; pendência de paleta/Mural explicitada separadamente. |
| H09 | Endpoint interno da journey / header role fabricado pelo cliente | Gateway não expõe internos; identidade/role vem de cadeia autenticada. |
| H10 | Restore de revisão antiga | Nova versão/CAS/histórico; não reescreve passado nem remove grants. |

## Estúdio, Pensa, Molda, Mural, aula e voz

| ID | Caso | Resultado |
|---|---|---|
| C01 | Mesmo rank, duas configurações diferentes de studio/bridge/pro/ai | Gate segue capacidade/view; comparação de rank sozinha não autoriza. |
| C02 | studio concedido, paleta [] ou só IDs desconhecidos | Clássico bloqueado com motivo de currículo; não passar allowBlocks vazio ao editor liberado. |
| C03 | pro+studio concedidos, sem paleta | Pro abre conforme contrato existente, sem inventar kit de blocos ou requisito Ponte. |
| C04 | Grant curricular antigo após remover bloco/despublicar/apagar curso | Paleta preservada pelo sistema atual; política Kids não limpa studio_block_grants. |
| C05 | Instalar extensão com um bloco conquistado / importar jogo com extensão não conquistada | Extensões derivadas do catálogo de blocos; importar não burla portão. |
| C06 | Dois participantes Pensa com capacidades diferentes | Recursos pertencem a cada pessoa; programação/artes/tutor/Molda coerentes com sua licença e grants. |
| C07 | Falha de view Molda ou faixa movida/removida após conquista | Indisponibilidade não retorna undefined liberador; capacidade congelada continua família disponível com posse. |
| C08 | Remix Pro/extension não coberto, card antigo sem studioMeta | Snapshot autoritativo no clique; recusa antes de criar versão/award; publicado continua jogável. |
| C09 | Aula/oficina permite bloco/ambiente ainda não global | Aula funciona pelo contexto; não grava conquista global nem abre editor livre. |
| C10 | Mesmos casos com JS e Python no checkpoint conciliado | Linguagem/contexto e capacidade global separados; conteúdo incompatível diagnosticado pelo contrato real, sem habilitar tudo. |
| C11 | Transcrição Kids com opção dos pais ligada/desligada, noob/hacker | Opção/contexto e limites atuais governam; jornada não adiciona requisito de IA. |
| C12 | Narração privada Pensa/Zappy sem capacidade ou produto / com acesso | Recusa/permite coerentemente com recurso; áudio gravado de aula e professor não ganham gate global. |

Suítes a reutilizar: `member-shell/tests/studio-tier.test.ts`, `studio-unlocks.test.ts`, `creative-apps-access.test.ts`, `pensa-capabilities.test.ts`, `pensa-routes.test.ts`, `voice-transcribe.test.ts`, `private-voice.test.ts`; `community-kids/tests/studio-gate.test.ts`, `pensa-capabilities.test.ts`, testes de journey/map/horizon; regressões Adult de Members e DB.

## UI e revisão humana

| ID | Fluxo | O que conferir |
|---|---|---|
| U01 | Editor inicial | Oito postos atuais; placeholders honestos; filtro Kids gravados; campos sem reorder artificial. |
| U02 | Escolher complete/showcase | Explicação clara de avanço, fundação e paleta; aviso de vitrine/ciclo no requisito correspondente. |
| U03 | Preview | Diff por avanço/capacidade, direitos preservados, requisitos removidos e indisponíveis; nenhum número populacional inventado. |
| U04 | Conflito/versionamento | Draft não desaparece; reload/comparação explícitos; sem save v0 sobrescrevendo v1. |
| U05 | Preparação interrompida | Progresso/erro/retomar; regra atual identificada; publicar desabilitado até ready; retorno antigo não troca draft novo. |
| U06 | Mapa/horizonte custom | Posto conquistado sempre visível, curso inexistente não gera falsa contagem para avanço; catálogo falhando ≠ vazio. |
| U07 | Bônus novo em trilha vencida | Contador da trilha pode regredir; posto no perfil e ferramentas conquistadas permanecem. |
| U08 | Recompensas/blurbs custom | Nome/arte preservados; ferramentas reais e dependências explícitas; não afirmar publicou/domina 3D quando requisito não prova. |
| U09 | Loading/error/empty | Erro não se converte em zero, “não comprado” ou “nenhum requisito”; retry claro. |
| U10 | Mobile/teclado/conta sem passe | Seleção, avisos, preview e publicação alcançáveis; bypass de equipe não mascara gates do aluno. |

## Execução e registro

1. Rodar primeiro testes puros focados (T1) e HTTP/unidade, sem global suite repetida.
2. Coordenar Postgres e provas B01–B12 com root; banco isolado, sem usar produção nem subir Docker por iniciativa própria.
3. Depois das mudanças completas, rodar `bun run typecheck`, `bun test`, `bun run check` nos packages alterados conforme seus contratos. Builds/browser somente na janela acordada.
4. Registrar commit, ambiente, comando, tempo, contagens pass/fail/skip e resultado de UX. Um resultado de fake/skip não preenche a prova SQL.

Checklist de liberação:

- [ ] Default exato e testes de fronteira passam.
- [ ] Baseline offline/concorrência/purge provado em Postgres real.
- [ ] Todos os consumidores de posto/capacidade migrados e batch preservado.
- [ ] Preview comprovadamente sem escrita.
- [ ] JS/Python e Adult sem regressão.
- [ ] UI conferida como aluno sem passe, admin e staff.
- [ ] Tempo/carga de baseline e preview registrados em dados representativos.
- [ ] Schema/readers/hooks implantados antes da ativação custom; rollback preserva grants/histórico.
- [ ] Root revisou evidências e autorizou o próximo passo de publicação no fluxo principal.
