# P0: exemplos por parte e diagnóstico coerente da autoria

Estado: desenho técnico para review, sem alterações de produção. Complementa [proposal.md](proposal.md). A implementação deverá ocorrer em lote próprio, depois da janela de testes Python, com review entre contrato, UI e piloto de conteúdo.

## 1. Problemas comprovados no código

1. `admin/src/lib/objectives-test.ts:testSectionObjectives` transforma cada obrigatório já verdadeiro no inicial em problema. `studio/src/blockly/projectCheckAuthoring.ts:studioSectionCompletionIssues` repete isso e devolve erro de publicação. Misturar um pré-requisito já pronto com uma intenção nova ainda incompleta deixa de ser publicável, apesar de não permitir cumprir a prática inteira sem trabalhar nela.
2. A autoria conserva um `content.solutionProject` único por bloco. O gabarito é aplicado contra os critérios de todas as partes que reutilizam o bloco. Em Dino A10, `ligar-raio-x`/`ajustar-area` exigem `sz_g2d_draw_hitbox`, enquanto `retirar-contorno`/`entrega` exigem o mesmo tipo com `count:0`. Um único snapshot não pode provar ambos. Não é uma exceção acidental do Dino: uma aula pode ensinar um diagnóstico provisório e depois retirá-lo.
3. `sectionCompletionView` faz `const {projectChecks,...rest}` e retorna `...rest`. Guardar exemplos ou respostas em `completion` vazaria esses campos para a criança. `isSectionCompletion` também não é um filtro de campos desconhecidos. A segurança não pode depender de o DTO remover acidentalmente um campo.
4. `LessonDraftChange.structure` envia as seções inteiras; seu contrato atual explicita que mover uma ferramenta não retransmite o projeto. Guardar projetos completos na própria seção quebra essa propriedade.
5. O inicial do bloco é a base canônica para ideias de código, para tipo/modelo de execução e para vínculos duráveis Python. Um checkpoint de autoria não pode virar, por conveniência, o novo baseline da execução infantil.

Os pontos1–4 precisam ser resolvidos antes de acrescentar gabaritos em massa. O ponto5 impede uma solução aparentemente simples de alterar a semântica de quem já está criando.

## 2. Invariantes do desenho

- Uma única lista de objetivos por parte, com as regras atuais de obrigatórios/extras. Não voltar à atividade com nota, nem criar `isNew`/`legacy`/`pedagogicalMode`.
- Um único caminho canônico para exemplos da equipe, por parte. O campo global antigo será migrado e retirado; não haverá `section.solution ?? block.solution` permanente.
- A solução exemplifica; não define cor, espécie, magnitude ou aparência obrigatória.
- Checkpoint e solução são autoria privada. A criança nunca recebe documentos, caminhos de resposta, regras ou motivo técnico do executor por esses campos.
- Um checkpoint de parte é referência de teste da equipe. Não reinicia o projeto da criança, não substitui seu rascunho, não muda o `initialProject` que define ambiente/baseline e não concede progresso.
- Editar exemplos não invalida progresso, XP, certificados, envios ou projetos salvos. Editar uma regra pode exigir nova verificação de parte ainda não concluída, conforme contrato vigente; partes/aulas já concluídas continuam preservadas.
- Troca de seção/modelo/revisão invalida requisições de Testar agora em voo e os leases do editor correspondente. Resultado velho não autoriza resultado novo.
- Nenhum aumento dos tetos de execução para compensar testes frágeis.

## 3. Dono canônico recomendado

Os documentos continuam no bloco Studio, ao lado do projeto inicial, em um registro de exemplos privado da equipe. Cada parte aponta, dentro desse registro, para seu checkpoint e solução. A UI apresenta esses exemplos na edição daquela parte; não há um segundo gabarito global na UI do bloco.

Forma conceitual, a formalizar com os tipos de documento já existentes em Core:

```text
StudioBlock.projectExamples
  version: 1
  examples: coleção exampleId -> StudioProjectDocument
  sections: coleção sectionId -> { entryExampleId?, solutionExampleId? }
```

`exampleId` é uma identidade interna própria do snapshot de autoria, independente de `StudioProject.id`. Dois checkpoints do mesmo projeto podem ter o mesmo ID de projeto e conteúdos diferentes: não podem ocupar a mesma chave por isso. A referência é local ao bloco da aula, sem URL remota, resolução entre contas ou busca por projeto de criança. Uma solução final pode servir a várias partes; uma solução transitória tem seu próprio `exampleId`. As duas partes de Dino A10 resolvem documentos diferentes.

Por que um registro em vez de snapshots repetidos em cada seção:

| Modelo | Vantagem | Problema | Decisão |
| --- | --- | --- | --- |
| `completion.solutionProject` | Mudança curta | Vazamento pelo spread e mistura com critério; altera revisão pedagógica | Rejeitado |
| `LessonSection.solutionProject` completo | Leitura direta | Reorder reenvia projetos; repete assets; aumenta payload de toda estrutura | Rejeitado |
| `StudioBlock.sectionExamples` com documentos repetidos | Mantém estrutura leve | Mesmo final/assets repetidos dez vezes e migração pode multiplicar volume | Aceitável só com volumes pequenos comprovados, mas não é recomendação final |
| Registro privado de projetos no bloco, referenciado por parte | Um dono, reutilização explícita e estrutura leve | Validador e mapeamento de referências precisam ser completos | Recomendado |

Não é um gerenciador geral de arquivos nem um novo produto. O registro só contém exemplos desta aula. **Cada exemplo salvo é um snapshot imutável.** Editar uma solução cria um novo exampleId e troca apenas o vínculo da parte/papel em edição; outras partes que reutilizam o snapshot antigo continuam iguais. Associar um exemplo existente reutiliza o snapshot sem modificá-lo. Isso dispensa uma atualização global silenciosa ou uma confirmação de alcance em cada salvamento. Remover referência poda documento sem uso na mesma mutação, preservando documentos ainda usados. Não implementar coleta global nem reaproveitar criações infantis.

O registro pode estar ausente: isso significa exemplos ainda não preparados. Referência presente com documento faltante é erro, não ausência normal. Não capturar esse erro e fazer fallback. Solução passa a ser obrigatória onde o contrato já a exige (objetivos de execução); não exigir retrospectivamente exemplos completos para publicar qualquer aula sem objetivo de projeto. Para o piloto, preparar soluções de todas as intenções revisadas.

A comparação de simplicidade também importa: um mapa direto por parte exige menos resolvedores, mas repete os documentos. No inventário atual, serializar compactamente os 27 iniciais embutidos soma cerca de 761 KB; repetir o mesmo inicial por cada uso de workspace sobe para cerca de 2,58 MB no conjunto dos cursos. No Farol D3, o snapshot de entrada tem cerca de 162 KB e há seis partes com workspace: uma referência de entrada e uma solução completas por parte, sem reutilização, chegariam a cerca de 1,94 MB só de exemplos, antes do inicial e dos demais campos. É uma estimativa a partir dos iniciais reais, não uma medição de request de soluções futuras. Ela justifica deduplicação explícita no curso mais carregado do piloto, sem alegar que toda aula estouraria o limite.

Não implementar deduplicação automática por igualdade de `StudioProject.id`, normalização arbitrária ou timestamp. Para reutilizar, a autora/gerador referencia o mesmo `exampleId`; para snapshots diferentes, usa IDs diferentes. Hash de conteúdo só entra se já houver um contrato canônico adequado e prova de preservação; não é necessário para este P0.

### 3.1 Validação e limites

Um resolvedor puro recebe seção, bloco e registro já validado; devolve `entry | absent` e `solution | absent`, com diagnóstico de autoria. Todo caminho de escrita valida:

- bloco Studio embutido, nunca galeria/Pinta/ferramenta externa;
- seção existente que usa esse mesmo `workspaceBlockId`;
- `exampleId` e associações únicos, referências existentes, documento no formato atual; igualdade de `StudioProject.id` não funde checkpoints;
- linguagem, tipo e perfil/modelo compatíveis com o `initialProject` canônico;
- projetos dentro do limite atual de 1.500.000 caracteres e dos limites de bytes do transporte; as duas unidades não são equivalentes com Unicode;
- limite finito de referências derivado do máximo de 60 seções, dois papéis por seção; documentos sem uso não podem inflar o registro;
- nenhuma referência entre aulas ou a seção removida;
- limites agregados de autoria/documento avaliados explicitamente antes de salvar, com erro compreensível; não elevar o limite de transporte sem decisão medida.

Para não reenviar o registro inteiro a cada gesto, adicionar comando de autoria dirigido a uma referência/documento, sob o mesmo `expectedRevision`/`operationId` e lock da aula: salvar exemplo da parte, associar exemplo existente, remover referência. O pedido carrega no máximo um documento. O servidor aplica a alteração no JSON do bloco e devolve a nova revisão. Reorder continua transportando apenas estrutura. Não criar uma rota que salve sem CAS só por o campo ser privado.

### 3.2 IDs, comandos e política de escrita

Recomendação de IDs: `exampleId` UUID independente, criado para a referência de autoria; `sectionId`/`blockId` continuam os UUIDs da aula; `StudioProject.id` conserva sua semântica de documento/execução. Uma referência do manifesto usa `sectionKey`, não UUID de origem. `exampleId` pode viajar sem remapeamento porque seu namespace é local ao bloco e ele não é credencial; colisão dentro do registro é erro. Dois exemplos podem guardar snapshots com o mesmo `StudioProject.id` sem fusão de conteúdo.

Contrato conceitual de comandos, a incorporar à união compartilhada `LessonDraftChange`:

| Comando | Campos específicos | Efeito sob CAS |
| --- | --- | --- |
| Salvar exemplo | `blockId`, `sectionId`, papel `entry`/`solution`, novo `exampleId`, documento | Insere UM snapshot imutável e troca apenas esse vínculo; exampleId existente com conteúdo diferente é conflito |
| Associar exemplo existente | `blockId`, `sectionId`, papel, `exampleId` | Só muda associação; exemplo precisa existir no mesmo bloco |
| Remover associação | `blockId`, `sectionId`, papel | Retira o vínculo; poda exemplos sem referência na versão resultante |

Todos carregam os `expectedRevision`/`operationId` já existentes. Repetir o mesmo operationId/corpo retorna a mesma operação; reutilizar com corpo diferente é conflito. Mutação atrasada de uma seção removida ou de um workspace trocado é recusada, sem recriar seção/mapa. Dois autores na mesma revisão: apenas um ganha, o outro recarrega/reconcilia. Não escolher silenciosamente “última gravação vence”.

O novo exampleId e o operationId ficam estáveis durante retries da mesma edição. Não gerar outro ID em cada tentativa HTTP. Chaves devem passar pela validação de UUID e pelo acesso a propriedades próprias do registro; não consultar protótipo para resolver referência. Título da parte, posição na lista e StudioProject.id nunca substituem a chave de identidade.

Abrir snapshots do mesmo projeto em dois editores ainda exige identidades/handles de execução separados. O exampleId não é automaticamente um id válido do runtime: reutilizar o mecanismo de cópia de trabalho independente já usado pelo editor de gabarito, mantendo a identidade da instância estável enquanto montada. Não compartilhar worker, lease ou sessão de análise só porque os documentos guardam o mesmo StudioProject.id. Não reescrever o snapshot armazenado só por abrir a prévia.

A cópia de trabalho tem identidade estável por instância da seção/papel. Novo exampleId salvo não vira React key nem novo project.id a cada autosave/tecla; salvar snapshot não reidrata o editor. Mudar de parte/papel ou adotar intencionalmente outro exemplo faz a troca de documento. Uma draftRevision realmente nova continua exigindo renovação da autorização conforme o contrato vigente, mas não gera uma identidade de editor nova para cada caractere ainda no buffer. Não ampliar o purpose de autoria para contornar essa renovação; runtime, curadoria e ambiente continuam vinculados ao bloco canônico e ao contexto real.

Edição comum de bloco e reorder não têm autoridade implícita para apagar exemplos por omissão. O comando genérico de conteúdo preserva o registro atual do servidor; substituição/remoção explícitas usam o comando próprio ou a importação revisada. Isso é separação de responsabilidades do domínio, não fallback de cliente antigo. Campos privados inesperados ou `solutionProject` global na escrita comum são recusados com instrução para atualizar/converter; não deixá-los serem apagados em silêncio pelo normalize.

### 3.3 Tetos propostos e transporte

Manter 1.500.000 caracteres por projeto, no máximo 60 associações de seção por aula e dois papéis por seção; portanto até 120 exemplos distintos realmente referenciados no pior caso. Usar **2 MiB agregados de JSON UTF-8 dos exemplos por aula** como teto inicial de recurso, compartilhado entre todos os blocos, não 2 MiB por seção/bloco. É um limite técnico proposto para a autoria, não uma faixa pedagógica. Exemplos reutilizados contam uma vez no registro; cada documento e o envelope do comando também precisam caber no limite real de transporte. O erro informa o total e sugere reutilizar checkpoint/solução, sem truncar ou apagar projeto.

O limite agregado não substitui os limites por rota. `members/interfaces/http/server.ts` admite 2 MiB nas rotas de draft/import/teste e o gateway também configura 2 MiB para draft/import, apesar do limite global do gateway ser maior. Novo comando deve usar essa rota já dimensionada ou receber a mesma régua explícita em todas as bordas. Contar bytes do JSON serializado, não `string.length`.

O corpo de importação completo continua precisando caber em 2 MiB: `JSON.stringify({document,mode,expectedFingerprint,operationId})`, incluindo inicial, exemplos, vídeos planejados, metadados e envelope. Um arquivo de manifesto com exatamente 2 MiB já passa desse teto quando embrulhado no pedido. O cálculo usa as strings/IDs reais ou representantes com os mesmos formatos/comprimentos máximos validados pela rota; não reserva uma folga arbitrária que pode estar errada.

Adicionar/salvar exemplos deve fazer preflight de tamanho por uma **projeção portátil pura e tolerante a rascunho incompleto**, compartilhável com o servidor. Não chamar o `buildLessonManifest` atual como pré-condição de salvar: ele recusa falta de completion e outros estados WIP legítimos. Separar projeção/serialização para contagem de bytes da validação final do manifesto. Quando a aula ficar válida, o exportador usa a mesma projeção e aplica a validação de publicação/exportação; um campo adicionado depois passa de novo pelo gate de tamanho. A validação de tamanho ocorre também no servidor; o cliente não é autoridade. A soma agregada e a portabilidade são gates distintos, com mensagens distintas. Não elevar limite de gateway para contornar o erro.

Não confundir os limites das rotas: draft/import têm 2.097.152 bytes nas bordas verificadas; a rota BFF de authoring-runtime usa 2.000.000 bytes. Uma abertura de exemplo no runtime precisa respeitar o menor limite de seu próprio trajeto, sem assumir que o teto de salvar/importar autoriza um payload maior no executor. A implantação deve testar essas fronteiras separadamente, inclusive Unicode.

Na migração de autoria existente, um documento que não caiba não é cortado: dry-run marca para revisão individual ou revisão de armazenamento antes da conversão. Não avançar o cursor/recibo como se ele tivesse sido convertido. IDs e dados originais ficam no backup até a qualificação.

As respostas da autoria também precisam de medição: um documento de aula cheio de exemplos pode ficar grande mesmo com pedidos pequenos. A implementação deve registrar tamanho real dos pilotos e usar carregamento sob demanda se o tamanho justificar, sem que o DTO público carregue o registro. Não declarar desempenho resolvido só por deduplicar o gabarito.

## 4. Inicial, checkpoint, preservação e resultados inconclusivos

O diagnóstico da autoria passa a tratar o conjunto de obrigatórios, não acusar cada item verdadeiro isoladamente.

Referências mostradas separadamente:

1. **Inicial da aula:** sempre é o documento real do bloco, e permanece baseline das ideias de código.
2. **Antes desta parte:** checkpoint opcional explícito do registro. Se ausente, mostrar “checkpoint não preparado”; não chamar o inicial da aula de checkpoint da parte.
3. **Solução desta parte:** exemplo resolvido pelo registro.

Ao avaliar um checkpoint ou solução, a base de ideias de código continua sendo o inicial do bloco. O teste de um checkpoint não é uma autorização para alterá-lo nem uma substituição do inicial.

| Obrigatórios no documento de entrada | Diagnóstico correto | Publicação |
| --- | --- | --- |
| Um ou mais `false`, outros `true` | Há algo ainda não cumprido; os itens verdadeiros já estavam preparados/preservados | Não recusar cada `true` |
| Todos conclusivamente `true` | “Este projeto já cumpre todos os objetivos obrigatórios”; não há alteração exigida por esses objetivos | Aviso de autoria para revisão da intenção; não afirmar que a parte inteira já conclui |
| Nenhum `false`, algum `pending/error/inconclusive` | Não foi possível concluir se os objetivos já estavam satisfeitos | Não dizer que falta trabalho nem que pode avançar; pedir teste conclusivo |
| Nenhum obrigatório, apenas extras | Objetivos não trancam a parte | Critério geral continua exigir vídeo/quiz/entrega/ação real, como hoje |
| Sem objetivos de projeto | Não há diagnóstico de novidade de projeto | Não inventar necessidade de gabarito |

Uma regra genérica não sabe se “já cumprido” é preservação legítima, revisão, personalização opcional ou prática nova mal desenhada. Portanto a recomendação é **não transformar esse diagnóstico, sozinho, em recusa automática de publicação**. A publicação continua recusando solução obrigatória estrutural que falha, referência inválida, configuração impossível e falta de solução para execução. A autoria vê um aviso destacado de não discriminação para revisar antes de publicar. Isso usa os fatos já existentes, sem uma flag pedagógica inventada.

Se o produto exigir bloqueio para “projeto inicial já aprova”, é necessária uma decisão explícita e verificável sobre qual prática exige modificação, inclusive nas partes de preservação/personalização. Não se deve inferir essa obrigação de uma palavra no título nem tratar `application` como sinônimo universal de alterar código. Um bloqueio sem esse contrato repetiria o defeito atual. Essa escolha precisa do review do responsável antes da implementação; não de um novo pedido de permissão ao usuário para cada curso.

Mesmo com todos os objetivos verdadeiros, vídeo, experiência, quiz, entrega, envio em dia ou ação obrigatória podem continuar faltando. O diagnóstico deve dizer “objetivos do projeto”, sem prometer “parte já concluída”. Na solução, pendência de execução ou indisponibilidade não produz sucesso geral; no inicial/checkpoint, tampouco é `false` pedagógico.

### 4.1 Testes de causalidade mínimos

| Caso | Antes (defeito) | Depois esperado |
| --- | --- | --- |
| Cadê A2: inicial revela, mas não soma | Recusa `revelar-ao-toque` já pronto | Preservação verdadeira + contagem faltante; autoria válida |
| Farol D2: inicial anda, mas não coleta | Recusa movimento/borda já prontos | Pré-requisitos preservados, coleta nova faltante |
| Inicial satisfaz os dois obrigatórios | Cada linha vira erro sem visão do conjunto | Um diagnóstico claro do conjunto; nunca confundir com conclusão da parte |
| Um estrutural pronto + comportamento pendente | Pode recusar o estrutural mesmo sem conhecer conjunto | Diagnóstico global inconclusivo |
| Solução falha um obrigatório | Recusa correta | Continua recusando, vinculando à parte e solução exatas |
| Extras todos verdadeiros | Pode parecer “projeto pronto” | Extras não trancam; nota informativa, sem alterar critérios gerais |
| Dino A10 com dois exemplos | Um snapshot não satisfaz presença e ausência do contorno | Solução transitória passa primeiras partes, solução final passa retirada/entrega |

As duas primeiras classes de defeito já têm reprodução pequena: [p0-causal-proof.ts](p0-causal-proof.ts) e [p0-causal-receipt.json](p0-causal-receipt.json). O script chama o avaliador real do Studio e o guard real de publicação; não usa cópia do algoritmo, mocks, browser ou banco. Execução em18/10/2026 encerrou em0,787s, avaliação13ms, exit0 porque o diagnóstico confirmou os defeitos esperados. Isso NÃO é aprovação funcional do modelo atual nem GREEN de uma correção.

Resultado Cadê A2: `revelar-ao-toque=true`, `somar-achado=false`, `passed=false`, mas o guard recusa a preservação já pronta. Resultado Dino A10 nos dois snapshots estruturais: sem contorno `[false,true]`, com contorno `[true,false]`; os dois objetivos opostos não passam juntos. O snapshot com contorno foi construído apenas para a avaliação estrutural de `blocksState`; não foi apresentado como jogo gerado/executável. O recibo registraSHA-256 de seis fontes. As demais linhas da matriz continuam como testes planejados, sem alegação de sucesso.

## 5. Mapa de alteração e risco por fronteira

| Fronteira | Fonte atual | Alteração necessária/prova |
| --- | --- | --- |
| Contrato do documento | `core/studio/project-document.ts`; `members/domain/course/lesson-block.ts` | Tipo privado de registro, usando documento canônico; sem `unknown` não validado na persistência |
| Seções e conclusão | `core/learning/index.ts`, `section-progression.ts` | Referências não entram em `completion`; visão pública montada por allowlist explícita dos campos permitidos |
| Autoria pura | `studio/blockly/projectCheckAuthoring.ts`; `admin/lib/objectives-test.ts` | Resolver exemplo pela seção; remover erro por linha inicial verdadeira; triestado/conjunto coerente; não duplicar algoritmo |
| DTO publicado/admin | `members/interfaces/http/dtos.ts`, `learning.dtos.ts`, `lesson-draft.dtos.ts` | Declarar campos/comandos para Elysia não apagá-los; validar strings/IDs/docs e limites; distinguir privado de público |
| Comandos/CAS | `core/learning/authoring.ts`; `members/.../lesson-draft.repository.ts` | Comando dirigido a exemplo, idempotência e conflito; remoção de bloco/seção limpa referências |
| UI do exemplo | `studio-solution-field.tsx`, `lesson-editor-client.tsx`, `lesson-section-authoring.tsx` | Retirar gabarito global, mostrar entrada/solução da parte; IDs/handles independentes; cancelar pendências ao trocar |
| Testar agora | `section-completion-editor.tsx`, `admin/lib/objectives-test.ts`; BFF/`ProjectChecksTestBody`; `SectionProgressionService.testObjectives` | Capturar seção/revisão/checks/entry/solution exatos; executar contra mesmo baseline/tipo/modelo; resultado velho não reaparece |
| Publicação | `lesson-draft.repository.ts:validate/publish`; `studioSectionCompletionIssues` | Resolver por parte e validar exemplos certos; execução permanece fora da TX e não é declarada comprovada sem teste |
| Importação | `learning-import.service.ts` | Manifesto por `sectionKey` → registro persistido por sectionId; preserve/replace e remoções explícitos |
| Exportação | `admin/lib/lesson-manifest-export.ts` | Pré-computar chaves de seção antes de exportar blocos; registro portátil não leva UUID de seção da origem como referência do destino |
| Validador de conteúdo | `qa/validar-manifestos.ts`, `isLearningManifest` | Validar registro e referências de modo coerente com importação; não apenas JSON bem formado |
| Public view | `domain/course/lesson-block.ts` sanitizador; `GetLessonService`; `sectionCompletionView` | Retirar registro inteiro e antigo campo; JSON público não contém IDs/documentos de solução; não depender da tipagem apenas |
| Revisões pedagógicas | `block-revision.ts`; `SectionProgressionService.revision` | Ignorar registro privado no fingerprint de bloco; só trocar exemplo não altera revisão da parte |
| Revisões da autoria | `published-lesson-revisions.ts`, `lesson-draft-revision-rebase.ts`, hashes/CAS de draft | Continuar incluindo exemplos para detectar sobrescrita concorrente; não usar hash pedagógico como hash de autoria |
| Persistência | `lesson_structures.sections` JSONB, `lesson_blocks.content`, draft/previousDocument | Registro continua no JSON do bloco; migrar todos os documentos operacionais relevantes, sem apagar desfazer/restauração |
| Runtime infantil | `checkProject`, port executor, caches | Não lê exemplo para definir sucesso da criança; usa regras canônicas e seu snapshot. Cache continua vinculado a projeto+regras, não ao gabarito |
| Ao vivo | Oficinas têm `LiveLearningStep` interativo, não o mesmo registro de seções gravadas; cursos ao vivo usam autoria de aula | Não inventar um segundo formato de objetivos na sala. Auditar superfícies de prévia docente/pública que recebam StudioBlock; preservar snapshot e acesso reais |

O contrato de oficina reutilizável não deve receber exemplos de curso gravado por espalhamento de objetos. A lista do aluno precisa ser verificada em qualquer serialização existente, mesmo se o tipo TS disser que o campo não existe.

## 6. Importação/exportação e migração sem dois caminhos permanentes

### 6.1 Manifesto novo

O registro portátil dentro do bloco usa `sectionKey` nas associações. Projetos são documentos portáteis normais. Exportar da origem continua usando chaves derivadas dos IDs da origem, como já existe; não criar chaves por posição. Importar valida a seção, seu `workspaceKey` e só então resolve a associação para o ID determinista do destino.

Não reaproveitar `completion.blockIds` como lugar de guardar exemplos. Não usar IDs de seção de origem como se fossem do destino. Reordenar partes não troca qual solução pertence a qual objetivo.

### 6.1.1 Versão e arquivo antigo

Recomendação de menor escopo: manter o envelope atual de manifesto `version:5`, que já admite conteúdo de autoria opcional; o registro novo tem `projectExamples.version:1`. Um manifesto v5 sem exemplos continua válido, inclusive os37atuais. Uma versão desconhecida do registro é recusada, não tratada como ausência.

O formato antigo v5 que contém `content.solutionProject` global não entra como segundo caminho na publicação/runtime. Fornecer conversor explícito de arquivo/migração **v5 com solução global → v5 com registro v1**, com relatório das associações por sectionKey e dos conflitos transitórios. O importador normal recusa o campo antigo com orientação concreta para converter; não aceitá-lo e depois descartá-lo. Arquivo que declare o registro novo e o campo antigo ao mesmo tempo é ambíguo e recusado. O conversor não altera regras, mídia, IDs ou projetos infantis e não declara que a solução antiga serve a todas as partes.

Isso não exige reescrever os37manifestos só para mudar um número de versão. Geradores dos pilotos passam a emitir registro v1 quando seus exemplos forem preparados; os demais mantêm v5 sem campo privado até serem revisados. Um futuro manifesto v6 só deve ser criado se houver outra quebra de contrato que justifique migrar o envelope completo.

### 6.2 Reimportação

| Manifesto | Preservar | Substituir |
| --- | --- | --- |
| Registro ausente | Preservar exemplos feitos no Admin das seções ainda presentes e com workspace compatível; prévia informa | Remover registro da autoria substituída; prévia informa |
| Registro presente | O registro declarado substitui o anterior daquele bloco; prévia lista associações administrativas que saem | Registro declarado substitui o anterior |
| Registro presente vazio | Limpa os exemplos daquele bloco; prévia informa a remoção | Limpa os exemplos daquele bloco |
| Seção removida ou muda de workspace | Não manter associação órfã ou mover para outro bloco por aproximação; prévia informa remoção | Igual |
| Chave/ID duplicado, referência fora da aula | Recusar com mensagem por parte | Igual |

Regra única recomendada: ausência do registro inteiro preserva no modo preservar; **registro presente é fonte da verdade de suas associações por bloco e substitui esse registro inteiro**. Isso evita misturar seções por heurística. A prévia precisa dar o delta concreto antes da confirmação da importação. Não interpretar lista vazia como ausência.

### 6.3 Dados antigos

Ferramenta de migração de formato com dry-run, backup e recibo:

1. Inventariar blocos com `solutionProject`, sua revisão, seções que usam o bloco, tamanho e formato. Os37manifestos locais têm zero; isso não prova zero no banco.
2. Converter o gabarito global em um único exemplo com `exampleId` próprio e associá-lo às partes pertinentes como ponto de partida de autoria. Não declarar que ele cumpre objetivos transitórios; executar o relatório por parte e listar as pendências reais.
3. Migrar publicado, draft e documento de desfazer/restauração que contenham o campo, com as cercas e hashes exatos da autoria. Não alterar entregas infantis nem seus snapshots.
4. Preservar `contentRevision` pedagógica quando só mover o campo privado; atualizar hashes operacionais de autoria de modo preciso, sem permissividade de conflito.
5. Verificar contagens/IDs/hash antes/depois, nenhum registro órfão, nenhuma solução perdida, visão pública limpa e avanço anterior preservado.
6. Retirar leitor/escritor do global e seu editor, import/export e validadores antigos. Não deixar fallback de execução.

Como se trata de propriedade dentro de JSON, o desenho não pressupõe nova tabela ou DDL. A migração é operacional de dados, sob a cerca existente da aula, com classificação precisa dos hashes. Caso a implementação descubra necessidade de schema, ela deve seguir migrations geradas e review próprio; este documento não autoriza SQL ad hoc em remoto.

Restaurar um bloco publicado cujo registro cita uma seção que já saiu do draft exige reconciliação explícita: restaurar a associação só quando a seção correspondente também existir e usar o bloco; referências sem destino são mostradas no preview e não são reaproveitadas em outra parte pelo título. O documento publicado e a versão de desfazer conservam seus próprios registros; a poda afeta apenas o documento resultante atual. Assim a limpeza não destrói os exemplos necessários ao undo. Validar o resultado de restore/undo antes do commit, como qualquer outra escrita.

Se a liberação ocorrer antes de qualquer autoria remota usar o global, o inventário pode provar ausência e reduzir a migração. Isso precisa ser fato registrado, não suposição. Manifestos antigos com o campo podem ser convertidos por ferramenta de importação versionada/explicada, mas não se tornam um segundo formato runtime eterno.

## 7. Privacidade, autorização e execução

- `StudioBlock` público precisa de um mapeador explícito que nunca copie `projectExamples`, `solutionProject` antigo ou outros campos de autoria. Tests devem procurar sentinelas profundas em respostas JSON, não só verificar uma chave no topo.
- `sectionCompletionView` deve montar a lista conhecida de campos; adicionar um campo privado ao critério por erro futuro não pode vazar pelo spread. Isso é endurecimento diretamente relacionado ao novo dono de autoria.
- Preview de equipe pode carregar exemplo apenas com permissão da aula/contexto; `privileged` não significa que a rota da criança pode devolver documento privado.
- `Testar agora` continua sem gravar progresso/XP/envio. Tipo/modelo derivam do inicial canônico, regras são validadas, orçamento é o mesmo do aluno.
- IDs de projetos de referência não são credenciais. Abrir editor Python ainda exige autorização/runtime real; trocar parte ou revisão invalida o contexto anterior. Não permitir que um registro privado contorne o catálogo/perfil de runtime.
- Gabarito não entra no iframe da criança nem na chave do cache de verificação. O runtime recebe só o projeto testado e objetivos autorizados, com respostas esperadas protegidas como hoje.
- Registro não autoriza carregar bibliotecas da internet, ampliar CSP, escrever dados externos, usar servidor Python de correção ainda não qualificado ou inspecionar projeto de outra conta.

## 8. Provas de saída do P0

### Contrato e privacidade

- Registro válido de duas partes com soluções opostas passa; referência faltante, seção errada, galeria/Pinta, tipo/modelo/linguagem incompatíveis falham.
- Campo passa inteiro por DTO draft, gravação, leitura admin e export/import. Um teste negativo com campo truncado/normalizado demonstra que a rota não o descarta silenciosamente.
- Criança/autenticação comum, pública e payload de aula ao vivo não contêm sentinela de exemplo ou regra. Prévia docente autorizada contém apenas o que deve.
- Parte sem exemplos continua legível; objetivo de execução sem solução própria não publica; solução estrutural inválida é atribuída à parte certa.
- Dois snapshots com o mesmo StudioProject.id e exampleId diferentes continuam diferentes; conflito de exampleId com conteúdos divergentes não é fundido.

### Autoria e progresso

- Cadê A2 preservação+novo: RED com guard atual; GREEN com diagnóstico agregado.
- Dino A10: RED com um único final; GREEN com duas soluções resolvidas por parte.
- Só editar solução/checkpoint não muda `contentRevision`, resultados/progresso da criança, XP, certificado e impressão do rascunho/envio. O draftRevision/CAS da autoria muda e conflito concorrente continua recusado.
- Editar objetivo invalida resultado de teste da autoria, e uma resposta da seção anterior não é aplicada à atual. Editar exemplo compartilhado cria novo snapshot só para a parte/papel atual; outros vínculos não mudam.
- Testar agora captura sectionId, workspaceBlockId, draftRevision, regras e IDs/conteúdo dos exemplos. Ao trocar qualquer um, aborta o pedido onde o transporte permitir e invalida seu serial local; mesmo se o servidor terminar depois, a resposta é ignorada. Abort de UI não é prova de cancelamento do executor; o trabalho continua limitado por seus prazos e não grava progresso.
- Reordenar partes mantém referências; remover workspace/seção limpa órfãos. Restore/undo preservam os exemplos correspondentes sem voltar ao campo global.

### Transporte e operação

- Um pedido de salvar exemplo cabe nos limites de bytes; múltiplas partes reutilizam um documento sem duplicar assets no JSON.
- Um manifesto de exatamente 2 MiB, cujo envelope exceda o limite, é recusado no preflight; a medição usa o corpo completo. Um draft sem completion ainda pode salvar seu checkpoint quando formato/referências/tamanho estão válidos.
- Reorder não retransmite os projetos. Leitura de autoria e autosave têm tamanho/latência medidos com o curso mais pesado do piloto.
- Importar preserve/replace, exportar e reimportar no destino preservam identidade de cada parte; mídia e certificado não são apagados; segunda geração/exportação não altera IDs por posição.
- Arquivo v5 sem exemplos importa normalmente; v5 com global exige conversão explícita; registro v1 ausente/presente vazio/presente completo tem os efeitos distintos descritos; versão desconhecida/duplo formato são recusados.
- Falha/timeout/ocupado do executor é inconclusivo. Nenhum resultado de progresso ou prêmio é escrito pela simulação.

Esses são critérios de validação futura. Só as reproduções dos defeitos existentes descritas na seção4.1 foram executadas; não há implementação P0 nem teste de correção aprovado.

## 9. Sequência recomendada para implementar

1. Review deste contrato, especialmente o diagnóstico global e o registro por parte. Resolver a política de importação presente/ausente numa única regra, como recomendado acima.
2. Provas causais pequenas com avaliadores reais antes de alterar produção; preservar o RED.
3. Contrato/resolvedor puro, DTOs e mapeadores públicos; testes de referência e vazamento.
4. Persistência/comandos CAS, hashes e migração do campo global; provas SQL na janela de teste combinada, sem escrever banco remoto.
5. UI de parte e Testar agora, removendo editor global. Validar cancelamento/identidade e transporte no navegador real.
6. Piloto Cadê e Farol, com matrizes de liberdade coerente. Não converter os37manifestos de uma vez.
7. Review completo do P0, corrigir achados e só depois promover a frente de cursos longos.
