# L1 — Documento, ambiente e compatibilidade

Executar após a aprovação técnica local de L0. A prova no segundo computador foi adiada pelo usuário até depois da implementação/validação local; não é dependência deste lote. Skill de execução já aplicada; reviews entre lotes e integração local foram autorizados.

## Contratos e mapa existente

- `packages/core/src/studio/project-format.ts`: formato2 e transporte de partes1, com papéis distintos.
- `packages/studio/src/core/project.ts`: Project atual pressupõe três arquivos web, IR JS e Pro opcional. Sanitização de assets permanece separada do tipo.
- `packages/studio/src/core/proProject.ts`: árvore por caminho e metadados Pro; não mover assistance/publication/origin para caminhos novos.
- `packages/studio/src/project-migrations/index.ts`: hoje todo formato anterior ao atual passa pela migração histórica JS. Separar1→2 e2→3 antes de mudar a versão corrente.
- `projectStorageRecords.ts`: projeções explícitas; campos novos precisam viajar no meta/program e na reconstrução, incluindo resumos/partes/drafts.
- `core/creations/content-fingerprint.ts`: preservar bytes de canonicalJson. Evoluir a versão da impressão Studio, mantendo leitura v1 e impressão Pinta inalterada.
- `core/studio/pro-revision.ts`: CAS de edição assistida; versão2 incorpora ambiente/entrypoint/lock/extensões, sem quebrar leitura histórica nem criar segundo histórico.

## L1.1 — Ambiente e compatibilidade puros

- [x] Adicionar `project-environment.ts`: linguagem, tipo/modo, seleção de release, dependências browser, schemas de identidade/hash/caminho; sem defaults que convertam entrada desconhecida em JavaScript.
- [x] Adicionar catálogo/contratos de perfil e release sem importar runtime, Blockly, Monaco, React ou Studio. Manifestos imutáveis; disponibilidade operacional separada. Não publicar botões/capacidades futuras.
- [x] Implementar resolver puro da interseção perfil/release/projeto/host/grants/curadoria, com motivo para checking/unavailable. Ausência de operação do host não concede recurso. Pro resolve somente código; clássico, blocos/Ponte.
- [x] Testes de fronteira: linguagem/perfil incompatíveis, release/hash diferentes, extensão não declarada/versão incompatível, host indisponível, grants ausentes, curadoria sem modo válido e JS como padrão somente na criação/migração.

## L1.2 — Envelope documental e migração

- [ ] Core define envelope e quatro variantes v3. Studio refina payloads de IR/blocks/assets sem duplicar identidade/ambiente. Python clássico tem main.py; Python Pro usa árvore/entrypoint. Nunca criar arquivos web fictícios em Python.
- [ ] Reaproveitar tipos comuns de árvore, extensão e metadados Pro, preservando exports existentes. Validar estrutura JSON com orçamento antes de percorrer recursivamente os payloads.
- [ ] Separar migração histórica JS1→2 da evolução2→3. JS2 não deve repetir transformação de código/blocos; legados conservam dados e metadados. Erros recuperáveis preservam fonte original.
- [ ] Factory JS recebe ambiente padrão explícito; factories Python ficam inacessíveis ao produto até os runtimes/modos correspondentes estarem implementados. O modelo não anuncia execução por existir.
- [ ] Testes usando fixtures atuais classic/Pro, legado1, formato2 e novo3: idempotência, fonte autoritativa da Ponte, extras/assets/metadados, formatos futuros e Python inválido rejeitado sem fallback.

## L1.3 — Persistência e revisão

- [ ] Projeções meta/files/state/blocks/assets e resumo incluem ambiente/entrypoint/lock sem mudar versão de partes sem necessidade. Nenhum await novo no caminho de digitação canônico.
- [x] Adicionar conteúdo à impressão Studio v2; aceitar v1 em transporte/leitura. Não alterar canonicalJson nem fingerprint Pinta. Ambiente/entrypoint/extensão mudados invalidam igualdade. Réguas diferentes são incomparáveis apenas para o critério de reenvio; não para deduplicação/concorrência.
- [ ] Revisão Pro v2 e alterações inversas incluem configuração; CAS rejeita base desatualizada mesmo com fonte igual. Leitura v1 continua explicitamente distinguida.
- [ ] Testes reais dos codecs de armazenamento/partes e export/import documental; não substituir persistência por mocks que apenas espelham os campos.

## Verificação e review

- [ ] Rodar testes afetados Core/Studio, typechecks dos consumidores e o baseline JS do lote.
- [ ] Inspecionar grafo/bundle do contrato server-safe; sem payload Python pesado no caminho JS.
- [ ] Review de requisitos e código do lote; registrar e corrigir achados antes de L2.

L1 não significa Studio Python disponível. L2 integra os consumidores JS; L3–L8 entregam runtime, modos, Pinta, aulas/sala, player/export/Zappy e qualificação. Migrações destrutivas, conversão automática de linguagem e push/deploy continuam fora do escopo autorizado.
