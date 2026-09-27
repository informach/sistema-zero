# Compatibilidade para a evolução do documento Molda

Detalhamento técnico do plano aprovado em `2026-09-06-molda-evolution.md`, após os
lotes 1–18. Não ativa formato 2. Execução sequencial e decisões técnicas autorizadas
pelo usuário, com validação de produto ao final; sem novo checkpoint de aprovação.

## Problema e exploração

Quatro frentes de leitura: núcleo/editor (agente principal), export/geometria,
persistência/backend e runtime Studio. Arquivos principais conferidos diretamente.

| Responsabilidade | Fonte atual | Problema |
| --- | --- | --- |
| Versão nativa | `core/documentVersion.ts` | Uma constante controla leitura e etiqueta de escrita |
| Entrada de dados | `core/sanitize.ts` | Arredonda/repara v1 e elimina campos desconhecidos |
| JSON e metadata | `export/assetJson.ts`, adaptador Kids | Carimbam versão global, separadamente |
| Mutações locais | `state/guardedWrite.ts` | Escrita/CAS guardados; exclusão simples não verifica formato |
| Fallback | `state/memoryPersistence.ts` | Save/batch/delete não têm os mesmos guards do IDB |
| Ticket | Members → BFF → Kids | Não confirma a versão efetivamente reservada |
| Export/runtime | `model/build.ts`, `export/glb.ts`, Studio Avançado | Bake único versus árvore/clipes/skin já suportados no destino |

Não são cópias intercambiáveis: armazenamento de browser e repositório SQL têm
transações diferentes. Devem compartilhar contrato e testes de invariantes, não uma
abstração transacional fictícia. Capacidade de leitura não comprova rollout remoto.

## Decisões

- Preservar v1 e o comportamento de seus documentos válidos. Novo parser será
  separado do sanitize legado; snap/reparo serão comandos, não efeitos da leitura.
- Cada mutação compara capacidade/formato e estado na mesma transação/operação
  atômica. Exclusão simples também verifica a versão do registro corrente.
- Fallback memória é implementação real usada pelo host, não exceção de segurança
  para testes. Lotes validam e clonam tudo antes da primeira mutação.
- Reserva confirma formato; ausência é compatibilidade v1, nunca confirmação de v2.
  Nenhum PUT deve ocorrer quando versão solicitada e confirmada divergem.
- Escritor novo depende de rollout de todos os guards, inclusive exclusão, e de
  geração local que isole clientes já abertos incapazes de proteger exclusão futura.
- Núcleo continua TypeScript puro e estado Zustand. A skill de especificação contém
  convenções Effect de outro stack; não introduzir Effect/serviços/brands de outro
  projeto nem dependência runtime apenas para seguir exemplos dessa skill.

## Arquitetura e propriedade

```text
documento nativo → leitor por versão → domínio validado
       │                                  │
       │                            comandos + histórico
       │                                  │
       └─ recuperação bruta     serialização única (payload + versão)
                                          │
                          ┌───────────────┴───────────────┐
                          │                               │
                  transação IDB                 reserva Members + confirmação
                  doc/resumo/original                   │
                                                BFF verifica → PUT → commit
```

`core/documentVersion.ts` é dono da interpretação da etiqueta e do erro de versão
não suportada. `documentReader.ts` é dono do despacho para parsers. O guard não deve
chamar o sanitizer para decidir se uma versão futura pode ser excluída.

## Contratos públicos

APIs locais existentes permanecem compatíveis; seu comportamento é fortalecido:

```ts
interface MoldaPersistence {
  load(id: string): Promise<MoldaAsset | null>;
  read?(id: string): Promise<MoldaDocumentRead | null>;
  loadAll(): Promise<MoldaAsset[]>;
  listSummaries?(): Promise<MoldaAssetSummary[]>;
  getReadIssues?(): readonly MoldaReadIssue[];
  loadRecovery?(id: string): Promise<unknown>;
  save(asset: MoldaAsset): Promise<void>;
  saveMany(assets: readonly MoldaAsset[]): Promise<void>;
  saveIfUnchanged(asset: MoldaAsset, expectedUpdatedAt: number | null): Promise<boolean>;
  remove(id: string): Promise<void>;
  removeMany(ids: readonly string[]): Promise<void>;
  removeIfUnchanged(id: string, expectedUpdatedAt: number | null): Promise<boolean>;
  subscribe?(listener: (event: MoldaPersistenceEvent) => void): () => void;
  dispose?(): void;
}
```

Tipos acima são importados de suas fontes atuais, não redefinidos em código.
Ausência retorna null; inválido fica recuperável; futuro lança erro ao abrir/mutar
e retorna resultado discriminado ao inspecionar. Uma exclusão não pode apagar
parcialmente um lote que contenha formato não suportado. Dado inválido de formato
conhecido pode ser removido explicitamente; futuro não equivale a inválido/ausente.

Ticket Members terá `formatVersion: number` obrigatório no produtor atualizado.
Tipos de transição BFF/cliente aceitam `formatVersion?: number` para ler servidores
antigos. Versão solicitada = `input.formatVersion ?? 1`; confirmada ausente = 1.
Divergência produz erro 503 de incompatibilidade antes de assinar/subir bytes.
O campo vem da reserva validada, não de dados do commit ou do blob.

Para exclusão remota, o cliente informa capacidade/versão pelo contrato de mutation,
com ausência igual a 1. Repositório compara com formato confirmado/reservado sob o
lock já existente. Revisão e versão são condições distintas; não substituir CAS.

## O que muda onde

| Arquivo/fronteira | Alteração | Permanece |
| --- | --- | --- |
| `guardedWrite.ts` | Guard de versão na exclusão simples e em lote | Transação, tombstones, CAS, rollback |
| `memoryPersistence.ts` | Guardas e recuperação equivalentes; preparar lote antes de escrever | Clone e API de eventos |
| `creations.service.ts` | Confirmar versão reservada e passar capacidade de exclusão | Quota/identidade/account isolation |
| `creations.repository.ts` | Recusar delete incompatível sob lock | Revisão e storage cleanup |
| BFF creations | Conferir confirmação antes de presign; encaminhar capacidade | Viewer/session gate e assinatura |
| Kids creations cloud | Conferir ticket antes de PUT; metadata coerente | Fila, parts, retries e conflitos |

Novos arquivos deste recorte: testes de contrato da memória e esta especificação.
Não criar módulo genérico de serviços nem export público extra sem consumidor.

## Integração e exemplos de comportamento

```ts
await persistence.removeMany(ids); // tudo ou nada; futuro recusa o lote
await persistence.saveIfUnchanged(asset, savedAt); // false não escreve
const result = await persistence.read?.(id); // futuro permanece recuperável
```

No rollout misto, request v1/ticket antigo continua funcionando; request v2/ticket
antigo falha antes do PUT. Request v2/ticket v2 não comprova implantação de todos
os servidores: a liberação do novo escritor continua uma decisão de rollout.

## Documento seguinte: limites de responsabilidade já identificados

Nós terão um único vínculo de pai e transformação local canônica. Geometria não
guardará outro giro editável. UV de malha pertence ao canto da face, permitindo
costuras; pixels pertencem a imagens/camadas. Atlas GPU é derivado, não um segundo
bitmap autoral. Números canônicos permanecem arrays/objetos até que contabilidade,
codec e histórico suportem explicitamente outros TypedArrays.

Reparent preservando mundo precisa representar shear ou recusar a operação com
explicação; nunca decompor com perda silenciosa. A migração deve preservar o vínculo
editável entre paleta/cor base e índice zero da pintura, não só assar a aparência.

O runtime Avançado do Studio já mantém árvore, clipes e esqueletos independentes.
Exportação deve preservar domínios de movimento e consolidar geometria estática
sem exceder 48 malhas. Destinos estáticos precisam bake de pose explícito e relatório
de perdas. Não reimplementar mixers, pooling ou sistema de entidades no Molda.

## Verificação

- Local real `fake-indexeddb`: remoção futura em cada geração; lote misto; transação
  concorrente altera formato antes do delete; falha no último write; tombstones intactos.
- Contrato de memória: entrada futura, overwrite, lote parcialmente inválido, CAS,
  leitura/recuperação, clones independentes e nenhuma mutação antes de validar o lote.
- Backend/SQL: formato confirmado/pendente, stale revision, exclusão antiga concorrente.
- BFF/Kids: ticket ausente/divergente/correto, nenhum presign/PUT no erro, compat v1.
- Futuro documento: migração e roundtrip matemático/visual, materiais/UV, duplicação
  de grafo, história limitada; GLTFLoader independente e validator.
- Browser/rollout: duas abas de cada geração, dois perfis, storage indisponível,
  produção/staging com todos os guards. Testes locais não substituem esses gates.

## Ordem de implementação e migração

1. Exclusão local e paridade da memória, com revisão e testes (lote 19).
2. Confirmação de reserva (lote 20) e capacidade de exclusão remota (lote 21),
   com testes BFF/SQL/Kids. Exclusão repetida cancela restauro compatível pendente.
3. Política separada de leitura/escrita e serialização tipada (lote 22); registro de
   leitura exaustivo e domínio/codec interno seguinte (lotes 23–24). Capacidade pública 1.
4. Migração unidirecional em memória (lote 24); promoção transacional interna em nova
   geração isolada (lote 25). Preserva todos os registros/originais retirados. Nenhum
   dado real migrado nem acionamento automático na aplicação pública.
5. Domínio/editores/exportadores do documento novo, exercitados em ambiente de desenvolvimento.
6. Guardas backend implantados e homologados → leitores compatíveis → novos escritores.

Implementação permanece sequencial. Exploração/revisão pode ser paralela quando
solicitada pela skill, respeitando o limite de agentes. Nenhum deploy ou migration
de produção é autorizado por este documento.

## O que não se move

Autenticação, sessão/perfil, assinatura R2 e política de publicação ficam no host/
backend. Three, WebGL e caches derivados ficam no viewport/runtime. Transações
IndexedDB ficam na persistência. Histórico genérico/gestos existentes são reutilizados.
Este recorte não habilita formato 2 nem declara as nove fases concluídas.
