# Inspeção e validação Python da revisão exata

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Reviewers may use independent agents; implementation remains in the existing worktree.

**Goal:** Criar a prova CPython que será compartilhada pelo Construir e pelas atividades Python, sem executar código autoral no BFF e sem aceitar resultados do cliente como estrutura verificada no servidor.

**Architecture:** O serviço isolado existente usa os artefatos imutáveis da distribuição Python aprovada. Uma fase de inspeção compila os arquivos Python com CPython WASM correspondente, sem executar imports ou o programa. Uma fase separada executa o candidato no player protegido e produz evidência vinculada à mesma revisão. Contratos e validação da identidade são compartilhados; o coordenador de jobs, créditos, leases e autorização continuam os existentes.

**Tech Stack:** TypeScript/Zod, CPython3.14.2/Pyodide314.0.7 já fixados, protocolo de análise e execução existentes, Playwright no container de preview existente.

**Spec:** `docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md`, seções9/12/13; `2026-10-17-studio-python-zappy.md` e `2026-10-17-studio-python-web-export.md` nesta pasta.

## Restrições globais

- JavaScript permanece padrão e conserva seus contratos, limites, validadores e provas atuais.
- Linguagem/runtime/entrypoint/lock/extensões e bytes do snapshot pertencem à mesma revisão; URLs e concessões não vêm do documento.
- Compilar não é executar, comprovar tipos/imports ou aprovar a jogabilidade. Cada evidência diz exatamente o que verificou.
- AST Python nunca passa pelo normalizador SZIR JavaScript. Fonte com sintaxe opaca continua preservada.
- A evidência de estrutura só é marcada servidor quando recalculada pelo serviço a partir do snapshot submetido, com autorização atual. Resultados de execução reportados pelo cliente continuam identificados como cliente.
- Instalação arbitrária PyPI, pygame-ce/Zero/Raylib e Pensa Python permanecem fora desta etapa.
- Limites/timeout/cancelamento encerram a operação sem aprovação parcial e sem apagar arquivos. Nenhuma sessão de verificação sobrevive ao seu job/contexto.
- Não fazer push, deploy ou commit intermediário; commit e merge local somente depois do escopo completo, revisão final e correções.

## Escolha técnica

Usar CPython da própria distribuição no navegador isolado mantém a mesma gramática e bibliotecas do aluno e reaproveita o container de preview já existente. Um segundo interpretador nativo instalado na imagem exigiria uma pinagem e uma qualificação adicionais; não é necessário para esta primeira implementação. Um parse ou relatório calculado apenas no navegador do aluno não atende à recomputação servidor e não será essa prova.

## Lote A — compilação independente e contrato de resultado

**Estado:** implementado e revisado nos recortes068–070/078. Há provas nativas CPython e Chrome/Edge, incluindo bytes originais, estrutura, módulos vazios e erros que fazem parse mas não compilam. A ligação dos consumidores e as provas do novo coordenador durável pertencem aos lotes seguintes e continuam pendentes.

Arquivos novos: `packages/core/src/studio/python-inspection.ts` e teste; `packages/studio/src/runtime/python/inspection.ts` e teste; `packages/studio/src/runtime/python/inspectStandalone.ts`.
Modificar: `packages/studio/scripts/build-python-runtime.ts`; provas em `packages/studio/e2e-python-editor/web-export.spec.ts` ou cenário dedicado na mesma infraestrutura.

- [x] Definir relatório estrito versionado com revisão, runtime, versão Python, arquivos/hash e status/diagnósticos. Validador compara com os arquivos Python reais do snapshot, sem omissões, duplicatas, caminhos externos ou identidade trocada; relatório não concede autoridade.
- [x] Reusar `loadPythonWebPayload` e `preparePythonAnalysisSession`. Pedir `compileBytes` dos bytes originais (incluindo BOM/cookie PEP263), verificar ACK explícito e versões efetivas do CPython/Pyodide; não inferir compilação de um AST Unicode. O parse/render visual permanece separado. Nenhum programa/import autoral é executado nesta fase. Diagnósticos podem omitir range quando não há mapeamento Unicode seguro.
- [x] Hash de cada fonte é o dos bytes verificados do snapshot. Inspeção sequencial usa um worker descartável; cancelamento/erro/timeout limpa frame/port/worker. Limites visuais existentes não serão aumentados silenciosamente; resultado excedido é falha explicada.
- [x] Incluir o inspector como artefato versionado adicional, sem torná-lo obrigatório para releases antigas. O inspector é entrada exclusiva do validador/ensaio, sem carregar Monaco/Blockly/React na página de jogar.
- [x] Provar código válido, erro de sintaxe, código que faz parse mas não compila (`return`/`yield` fora de função), múltiplos arquivos, arquivo vazio, cancelamento e resultado com hash/revisão trocados. Prova real em Chrome/Edge além dos testes unitários.
- [x] Revisão independente e correção dos achados antes do lote B.

## Lote B — serviço isolado e evidência aplicável

### Transporte interno e limites de memória

O transporte interno será separado do JSON do Builder JavaScript. Um projeto Python pode ter até 32MiB de arquivos, predominantemente imagens/áudio. Converter esse volume inteiro em base64 dentro de um único JSON no Worker adiciona cópias e pode exceder sua memória; não será o contrato de inspeção/build.

O BFF autorizado abrirá um input temporário com metadata estrita da revisão, execução e hashes. Os arquivos serão transferidos individualmente como bytes por chamadas S2S autenticadas, para armazenamento privado temporário com checksum SHA256, limite real de streaming e prazo de validade. O comando de inspeção recebe somente o identificador emitido pelo serviço; não recebe URLs, caminhos de bucket, token contextual ou distribuição escolhida pelo aluno. O serviço deriva as chaves do input e dos hashes registrados e resolve o runtime pela configuração aprovada. A inspeção confere novamente tamanho/hash antes de fornecer cada arquivo ao contêiner.

Uploads incompletos, divergentes, expirados ou de outra execução são recusados. O endpoint de upload não publica arquivos nem concede capacidade de execução. Reserva/rate limit ocorre ao abrir o input; os arquivos permanecem restritos ao conjunto e à cota registrados. Repetir um arquivo é idempotente e não permite substituir bytes por outros. Uploads pendentes e inputs encerrados precisam de retenção/limpeza explícitas, com chaves separadas dos runtimes compartilhados e das publicações permanentes. Configuração ausente mantém a funcionalidade indisponível, sem fallback para JSON gigante.

O cliente de atividades/Builder conserva a revalidação de contexto antes e depois de cada operação e na aceitação/aplicação final. A resposta de compilação é uma prova técnica da revisão, nunca um grant. O playtest e o artefato usam exatamente o mesmo input, sem baixar assets de URLs fornecidas pelo código do aluno.

Arquivos: `packages/studio-runtime/src/index.ts`, contratos Python em módulo separado; scripts de validação Python em `runtime/`, Dockerfile e testes do serviço. Reusar o store/servidor de distribuições aprovadas e os limites por perfil.

- [x] Resolver a distribuição aprovada no serviço e conferir bytes/hashes antes de fornecê-la ao container. Factory e bindings explícitos no código, ausência de configuração falha; prova local R2/DO/SDK real. Isso não indica configuração ou deploy remoto efetuado.
- [x] Rodar inspeção no container sem rede externa, com recursos servidos somente do mapa fechado de artefatos verificados. O serviço lê e valida o relatório da revisão exata. Código autoral não escreve o relatório da fase de inspeção.
- [x] Rodar smoke test em outro frame/worker protegido, usando a mesma configuração/snapshot. Verificar console/erros, primeiro desenho ou saída útil, entrada, parar e captura quando gráfica. Programas interativos não precisam encerrar para ter prova de execução, mas precisam demonstrar funcionamento dentro do prazo. Provas locais SDK console6084/Turtle3aef e preview405789f3, com limites registrados no checkpoint.
- [x] Separar referências de runtime compartilhado do artefato do projeto. Não embutir WASM a cada build nem aumentar as cotas JavaScript. Artefato/captura/relatório/retention precisam permanecer vinculados à revisão/runtime. Core/R2/DO/GC e provas de navegador revisados085/086; preview temporário tem launcher fixo, prefixos/cotas próprios e retirada persistida.
- [ ] Revalidar contexto na aceitação e na aplicação; cancelar destrói somente o container daquele job. Provar Linux/Docker real, não apenas mocks de Sandbox ou Playwright local.
- [x] Revisão independente antes da integração com os consumidores. Recortes083–086 resolvidos, SDK405789f3 e browserf8049f64 conferidos independentemente. Consumidores e autorização/aplicação final próprios continuam no loteC.

## Lote C — Construir e atividades

### Autorização e cancelamento na integração dos consumidores

Antes de habilitar a inspeção na correção, tornar o cliente S2S compartilhável pelo Members e pelo BFF, preservando o marcador server-only no wrapper do Next. O módulo compartilhado recebe URL/token pelas opções do servidor, não consulta ambiente no browser, não importa Next/React/SDK e conserva o authorize obrigatório e a validação final da revisão. Members deriva owner/execução/nonce e reconstrói o snapshot dos bytes do projeto validado; não aceita um relatório estrutural enviado pelo aluno como prova servidor.

Não depender apenas da desconexão HTTP para parar o contêiner. A prova local Linux demonstrou Request.signal em streaming, mas não cancelamento imediato durante uma resposta ainda pendente. Implementar controle explícito do job por identidade imutável do input/geração/nonce, com estado de admissão e encerramento persistido: cancelar antes de iniciar impede início tardio; duas inspeções simultâneas não compartilham um contêiner; encerrar um job não afeta outro. A requisição de cancelamento deve alcançar o proprietário do trabalho, e não manipular AbortController/I/O pertencente a outra requisição de um Worker comum.

Usar um coordenador Durable Object específico para essa propriedade, sem sobrescrever os alarmes/lifecycle internos do SDK Sandbox. O coordenador possui a operação, mantém prazo independente e confirma a destruição; o BFF envia cancelamento explícito na retirada do input. Validar com RPC/SDK/Docker reais as corridas de admissão, cancelamento antes/durante execução, repetição, término simultâneo, reinicialização do coordenador e respostas tardias. Só então ligar os consumidores. Preservar a configuração JavaScript e exigir configuração Python explícita; configuração ausente não aceita uma prova falsa.

### Fatos estruturais Python das atividades

Não inferir estrutura a partir de texto, expressões regulares, blocos salvos ou do relatório visual enviado pelo aluno. A fonte original verificada (inclusive BOM/cookie de encoding) entra no CPython aprovado; a árvore canônica é calculada sem imports/execução. Compilação e estrutura são evidências distintas. A checagem de estrutura deve exigir um resultado completo de todos os módulos fonte da mesma revisão; ausência de capacidade na distribuição antiga ou limite excedido não vira lista vazia que possa aprovar uma regra negativa.

O contrato canônico deve representar presença de laços/condicionais, nomes atribuídos, funções definidas e chamadas com alvo sintático identificável. Especificar que comprehensions são laços, async for/async def são reconhecidos, comentários/strings não contam, e chamadas são nomes/atributos sintáticos: `t.forward` não prova automaticamente `turtle.forward` nem que a chamada foi executada. Imports não são executados nem resolvidos para simular aliases. Lambdas sem nome, acesso por índice e alvos dinâmicos não são falsas funções nomeadas. Regras de blocos JavaScript, DOM e áreas do SZIR não são reaproveitadas como se fossem regras Python.

Limitar nós visitados, quantidade/tamanho de nomes e bytes de evidência, com recusa explícita de resultado parcial. Compartilhar schema/avaliador entre Studio, Admin e Members; manter o extrator Python ligado à distribuição/versionamento de CPython. O cache visual serve somente ao feedback formativo; Members precisa obter fatos de seu próprio serviço isolado, autenticado e com contexto atual, a partir do snapshot submetido. O compilador continua aceitando a operação legada de compilação sem exigir fatos para quem só precisa verificar sintaxe.

Primeiro provar semanticamente o extrator: atribuições compostas/desestruturação/walrus, for/while/comprehensions, funções aninhadas/async, chamadas simples/atributos, strings/comentários, fonte com BOM/PEP263, erro de compilação que faz parse, limites e arquivo vazio. Depois alterar juntos contrato de atividade/DTO/autoria, runner e submissão/progressão. Revisão independente desse sublote antes de ligar os consumidores. A evidência estática não comprova stdout, retorno de função nem movimento Turtle; esses continuam sendo casos separados do executor protegido.

### Player compartilhado para execução e preview

A entrada standalone já é um artefato da distribuição aprovada. O player deve resolver `frame.html` a partir do diretório de seu módulo versionado e conferir que o hash desse diretório corresponde ao snapshot. A exportação web continua com runtime/hash local; a validação e o preview podem carregar esse mesmo módulo em /v1/runtimes/hash, sem copiar WASM para cada candidato. A URL vem do módulo confiável, nunca da fonte do projeto.

Separar bootstrap do módulo e montagem do player permite testar lifecycle/BFCache sem fingir uma URL de módulo em arquivos nativos Bun. Preservar todos os controles, stdout, input, captura, parar/reiniciar e os fences de geração existentes. A mudança precisa passar novamente pelo navegador na exportação web e por revisão antes da prova de execução remota. O manifesto/artefato de preview continuará distinto do runtime compartilhado e vinculado à mesma revisão; compilação isolada sozinha ainda não produz aprovação de jogabilidade.

- [ ] Construir: reusar ProRevisionv2, coordenador e ferramentas Python já implementadas; ligar elegibilidade, compilação, diagnóstico, execução isolada e preview da mesma revisão. Preservar diff/apply/undo/recovery/voz/histórico/créditos e negar mudanças não autorizadas de runtime/pacotes/escopo.
- [ ] Atividades: contrato por linguagem/perfil com leitura JS legada; DTO, autoria, player, envio, correção Members e progressão atualizados juntos. Compartilhar o avaliador estrutural Python derivado da análise CPython, sem confiar no cache visual do aluno.
- [ ] Acrescentar stdout, chamadas de funções e estado Turtle observável no executor protegido; manter DOM e asserções JS apenas nas atividades JS. Inspeção estática não será apresentada como prova dessas verificações de comportamento.
- [ ] Vincular rodada e envio à revisão/runtime, proteger mudanças de perfil/projeto/epoch e respostas tardias. Preservar o peso mínimo de estrutura servidor nos gates e a distinção `verifiedBy` atual.
- [ ] Provar JavaScript sem regressão e Python nos quatro hosts (livre, aula, authoring, live); cenários revogados/expirados/curadoria e candidato inválido antes da reserva/aplicação.

### Execução e preview — contrato do próximo sublote

Estado atualizado em18/10: produtores/contratos de execução e preview implementados e revisados em083–086. Operação completa S2S/DO/R2/SDK passou console, Turtle/PNG/input/tecla/clique, cancelamento e recuperação. Preview405789f3 preservou disponibilidade após reset/limpeza do input e negou após retirada explícita/reset; manifesto e onze arquivos conferidos independentemente, incluindo PNG real. Browserf8049f64 passou controles e negativas CSP/CORS em Chrome/Edge; disponibilidade controlada e fingerprint QA sentinela nessa prova, SDK/DO qualificados separadamente. Consumidores seguem pendentes. Novo sublote atividades18/10: contrato A revisado0872/2/0 resolvido; executor B em implementação. As novas alterações tornam d22 uma baseline histórica até regeneração e requalificação dos caminhos afetados.

O helper de página HTML/CSS é compartilhado com a exportação; o player permite observadores fornecidos exclusivamente pelo código confiável do runtime. Os observadores acompanham sessão, eventos e descarte da geração atual, sem aceitar callbacks ou URLs do documento do aluno. O módulo comum de recursos do contêiner confere caminhos reais, tamanhos e SHA antes de servir bytes e mantém GET/HEAD apenas, mapa fechado e WebSocket bloqueado. Essas fundações não significam que o produtor de playtest já exista.

Implementar uma entrada de playtest versionada na distribuição, usando o mesmo player e supervisor. O programa autoral executa somente no worker CPython protegido; o processo Node não importa nem executa seus arquivos. Um coletor no parent confiável registra identidade/revisão/runtime, estados, stdout/stderr limitados, diagnósticos, apresentações, entradas solicitadas/enviadas e descarte. A coleta ignora eventos de gerações retiradas e falha com erro observável se seu próprio código falhar. Captura pertence à mesma identidade e a um frame efetivamente apresentado.

A receita de observação terá schema estrito, versionado e limitado: duração, linhas de entrada, teclas e cliques permitidos, além da exigência opcional de saída gráfica. O host escolhe a receita dentro da autorização atual. Ela nunca recebe JavaScript para avaliar, seletor arbitrário, endereço de rede ou caminho do contêiner. O relatório registra a receita efetiva e diferencia tecla enviada, resposta observada e desenho capturado; enviar uma tecla sozinho não comprova que o jogo respondeu a ela. Compilação, início de execução e funcionamento dos controles continuam sendo provas distintas.

O relatório de execução conterá a identidade da sessão, a revisão, o runtime, a versão Python, observações limitadas, falhas e confirmação de parada. Imagem é um arquivo separado com hash/tamanho/dimensões/contador de apresentação; não é um data URL gigante no JSON S2S. O serviço confere relatório e imagem a partir de seus próprios arquivos. Sucesso exige executar a revisão esperada, atender à receita e confirmar encerramento, sem diagnósticos técnicos pendentes. Uma sessão interrompida não gera artefato aprovado.

Uma validação completa será uma operação imutável com duas fases: inspeção e execução protegida. As duas usam os mesmos bytes verificados no sandbox exclusivo daquele job; o navegador/worker de inspeção é encerrado antes de iniciar o worker autoral. O encerramento e a confirmação de destruição pertencem ao coordenador externo, depois de todas as fases. Extrair o preparo/transferência/lifecycle comuns do coordenador atual, sem duplicar sua máquina de estados nem fingir que uma destruição intermediária aconteceu. A operação de inspeção isolada mantém seu contrato legado e também encerra seu próprio sandbox.

O input/geração/nonce continua identificando um único job, com modalidade e receita capturadas na admissão. Uma tentativa repetida com outra modalidade/receita é recusada; não reutilizar um coordenador terminal ou sandbox já destruído para iniciar uma segunda validação. Cancelar antes da admissão deixa uma fence que impede qualquer modalidade de iniciar. Compilação e execução possuem relatórios distintos, mas compartilham o mesmo prazo e proprietário. Revalidar geração/lease/autoridade e o input após as operações assíncronas e antes de aceitar ou armazenar qualquer resultado.

O preview Python terá contrato/limites próprios e referência explícita ao runtime aprovado. O limite JavaScript de arquivos compilados permanece intacto; os bytes Python/material podem usar o perfil de projeto Python. Persistir somente fontes, materiais, metadata e launcher pequenos, sem copiar WASM a cada build. Guardar o commit marker por último; erro ou cancelamento limpa apenas o prefixo daquele preview. O preview temporário expira independentemente do input e não é uma publicação do Mural.

#### Política do launcher e cadeia de frames — qualificar antes de integrar a UI

O launcher HTML/CSS do preview é código fixo confiável; somente o worker CPython recebe o programa do aluno. O frame JavaScript legado continua opaco. Para reutilizar o player standalone em um preview aninhado, provar um frame externo confiável no origin do serviço, diferente do origin da aplicação, com allow-scripts/allow-same-origin; o frame/worker interno Python mantém sua origem opaca e as restrições atuais. Não aplicar esse atributo ao HTML/JavaScript autoral. A UI só aceita esse tratamento para referência Python validada, com URL do serviço configurado e rota exata; falha de origem ou contrato recusa o preview.

A política frame-ancestors do runtime precisa permitir o launcher de seu próprio origin e todos os hosts da aplicação aprovados, pois o navegador verifica a cadeia inteira. Não tentar corrigir isso com wildcard nem retirar a política. A composição será provada em Chrome/Edge com app e serviço em origins distintos, incluindo recusa de ancestor estranho e frame externo opaco. A regra do navegador e a diferença entre iframe opaco e allow-same-origin estão descritas na [CSP3, seção6.4.2](https://w3c.github.io/webappsec-csp/#directive-frame-ancestors) e na [documentação do iframe da Mozilla](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox); a decisão acima é de arquitetura e ainda exige prova local.

Somente index.html e player.css gerados têm seus tipos executáveis. payload/relatório são JSON estritos; projeto, imagens e demais materiais usam bytes de dados, nos caminhos previstos, com nosniff e política que impede interpretação como documento/script quando abertos isoladamente. A política de script do launcher permite somente a pasta imutável da distribuição, e a de conexão somente o prefixo do próprio preview. Não incluir fontes/material em script-src, não usar eval/inline script e não aceitar HTML/CSS ou URLs gerados pelo aluno como launcher. Testar arquivos autorais .html/.js/.svg, navegação direta, fetch de outro preview e escape de caminho, além dos recursos Turtle usuais.

O manifesto temporário registra identidade/revisão/runtime/versão Python, validade, ancestor aprovado, fingerprint da validação e descritores de cada arquivo. O relatório completo e a captura ficam em arquivos separados com SHA/tamanho; marker do manifesto é escrito por último. O serviço exige validação passed da mesma revisão antes de publicar o marker, confere cada transferência, revalida autorização/input após todos os awaits e limpa apenas seus próprios objetos ao falhar. A leitura exige marker íntegro/não expirado e checksums/tamanhos dos objetos. A coleta tem prefixo próprio, cursor, limite e prazo; jamais alcança runtimes compartilhados, inputs privados ou publicações do Mural. Cotas Python somam fontes/materiais32MiB, metadata2MiB, relatório3MiB, captura limitada pelo contrato atual e launchers pequenos; não reutilizar o teto JavaScript2,5MB nem colocar WASM neste total.

Servir Python pelo caminho e pela política desse contrato, preservando a leitura dos artefatos JavaScript existentes. O launcher só pode carregar o módulo e o frame da distribuição aprovada; payload e arquivos ficam no prefixo imutável daquele preview. Fontes e materiais autorais não podem tornar-se scripts HTML/JavaScript executáveis no origin do serviço. Os ancestrais permitidos e a origem de runtime vêm da configuração do host, sem ampliar a política usando valores do projeto. Publicação/remix continuam vinculados ao snapshot permanente, sem depender da retenção do preview.

Provar antes de ligar consumidores: programa de console, erro de import em execução, Turtle com PNG/teclado/input/captura/parada, módulos auxiliares, fonte vazia, revisão/receita/imagem trocadas, arquivos alterados e rede externa bloqueada. Repetir cancelamento antes/durante execução, término simultâneo e recuperação do coordenador com SDK/R2/Docker reais. Depois usar esse produtor no Construir e no runner de atividades, conservando a distinção entre estrutura recalculada pelo Members e comportamento reportado pelo cliente.

## Fechamento

- [ ] Checks pertinentes, revisão final integrada e correções.
- [ ] Medições de desempenho separadas: quatro amostras funcionais da exportação web não substituem as trinta amostras e o cenário com vídeo do anexo.
- [ ] Atualizar o checkpoint sem marcar o restante do escopo como concluído; prosseguir até a entrega integral autorizada.
