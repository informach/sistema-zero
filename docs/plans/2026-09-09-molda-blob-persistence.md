# Persistência local por conteúdo — Molda

Detalhamento da fase 2 do plano aprovado `2026-09-06-molda-evolution.md`, iniciado
no lote 215. Execução sequencial autorizada, com validação de produto ao final.
Não ativa formato público 2, nuvem, migração de produção ou importação entre apps.

## 1. Problema e exploração

Três explorações paralelas de leitura (armazenamento, nuvem e consumidores), mais
conferência direta pelo agente principal. Tipos/fontes atuais, não auditorias antigas.

| Responsabilidade | Fonte | Situação |
| --- | --- | --- |
| Documento autoral | `molda/src/scene/document.ts`, `readDocument.ts` | Pixels próprios por camada; geometria/clipes/skins canônicos |
| CAS local | `molda/src/state/scenePersistence.ts` | Documento inline, revisão própria, save/delete/restore atômicos |
| Custos | `sceneMetadata.ts`, `sceneQuota.ts` | Ledger já evita carregar outras cenas válidas no autosave |
| Originais | `promoteScene.ts` | Recibos brutos preservados, inclusive após exclusão |
| Studio local | `studio/src/state/persistence.ts` | Partições por categoria, sem blob-store por hash |
| Studio cloud | `community-kids/src/lib/studio-cloud.ts`, `creations-cloud.ts` | Manifesto e hash do JSON canônico completo de cada asset |
| Molda cloud | `community-kids/src/lib/molda-cloud-persistence.ts` | JSON completo v1, sem partes |
| Pinta | `pinta/src/state/persistence.ts` | Asset inline por perfil, não um serviço reutilizável de blobs |

Duplicação aparente: três formas de SHA-256 têm contratos distintos. Core/security
usa node:crypto, Studio/SRI produz base64 síncrono para CSP e Kids produz hex sobre
JSON UTF-8. Nenhuma é codec binário browser-safe do Molda. Não importar um host,
adicionar dependência Node no browser ou criar serviço compartilhado sem consumidor.

Centralizar manifesto, referências e digest binário em módulos internos do Molda.
CAS, namespace e contabilidade permanecem na sua persistência; cloud fica no host.
O padrão manifesto/partes é reaproveitado conceitualmente. O hash de pixels crus
NÃO pode virar CloudPart.hash, que identifica JSON. Nuvem limita 128 partes por
item; o documento permite 20 mil camadas agregadas. A ponte futura deve agrupar e
serializar explicitamente, não alterar silenciosamente o protocolo existente.

Baseline reproduzível em `scripts/bench-scene-persistence.ts`, resultados completos
em `.audits/molda-evolution/blob-persistence-l215.md`. No teto autoral de 32 MiB,
save só de metadata regrava 33.561.890 bytes contábeis de documento + 340 de resumo;
p50 47,776 ms no simulador. Não representa tamanho físico de disco ou latência de
browser. Perfil: structuredClone 73,6% self, incluindo simulador e harness.

## 2. Desenho e limites

```text
documento hidratado → validação/cópia própria → hash de pixels fora da transação
                                                  │
                                       manifesto + blobs preparados
                                                  │
                              CAS + quota + referências na transação IDB
                                                  │
                                        commit → notificação existente

leitura IDB consistente → manifesto + blobs próprios → integridade → leitor nativo
                                                                        │
                                                         editor / export / backup
```

- `formatVersion: 2` continua significando documento autoral; `storageVersion: 2`
  identifica a nova disposição física. Revisão CAS permanece separada dos dois.
- O envelope ocupa a MESMA chave canônica `molda:scene:<id>`. Nunca aparenta
  ausência para uma aba anterior, nunca permite fallback a um registro v1 antigo.
  O envelope tem formatVersion 2 para o guard v1 e campos fechados desconhecidos
  pelo leitor nativo inline anterior, que deve recusar leitura/mutação.
- Pixels autorais inteiros por camada são a primeira unidade de deduplicação.
  Não fazer compressão, reordenar canais, remover RGB sob alpha zero ou juntar
  camadas invisíveis. Uma pincelada ainda pode substituir até 4 MiB de uma camada;
  particionamento em blocos menores exige medição e contrato posterior próprio.
- Compartilhamento físico somente dentro do mesmo banco/store. Nunca entre
  perfis. Leituras entregam buffers independentes por camada e por documento.
- Sem WeakMap de hash por referência mutável, cache global de documento validado,
  transferência do buffer vivo ou trusts baseados apenas em mensagens/índice.
- WebCrypto indisponível falha antes de qualquer migração/escrita nova. Não
  regravar envelope como inline nem inventar hash fraco como fallback.

## 3. Novos arquivos e propriedade canônica

```text
packages/molda/src/state/
  sceneBlob.ts                 # identidade binária e validação de bytes/hash
  sceneStorageDocument.ts      # manifesto, preparação e hidratação, sem IO
  sceneStorageDocument.test.ts # roundtrip, integridade e ownership
  sceneBlob.test.ts            # vetores conhecidos e limites
  sceneBlobStorage.ts          # operações IDB do layout, após codec validado
  sceneBlobStorage.test.ts     # integração real com fake-indexeddb
packages/molda/scripts/
  bench-scene-persistence.ts   # baseline já executável no lote 215
```

`document.ts` e `readDocument.ts` continuam donos do domínio; não duplicar validação
de geometria/animação/skin no codec. `storageKeys.ts` é dono das novas chaves.
`sceneMetadata.ts` continua dono dos summaries/tombstones; `structuredBytes.ts`
continua dono da métrica contábil. Não redefinir os tipos da spec de compatibilidade
de 07/09 nem mudar as capacidades públicas descritas ali.

Refinamento no lote 216: `readDocument.ts` oferece readSceneImageStructure e
readSceneDocumentStructure, compartilhando campos tipados sem alegar integridade
de uma cena não hidratada. readSceneDocument continua a borda completa (índice,
relações e bounds). Tipos de armazenamento usam essas estruturas genéricas; tipos
autorais do editor e exports públicos não mudam. Evita duplicar validadores ou
alocar pixels fictícios para conferir metadata.

## 4. Contrato do codec interno

Interfaces abaixo são contratos novos; importar os tipos autorais existentes.
TypeScript puro, sem Effect-TS: mesmo ajuste de stack da spec de compatibilidade.

```ts
import type {
  MoldaSceneDocument, SceneImage, SceneImageLayer,
} from '../scene/document';

export interface ScenePixelReference {
  kind: 'scene-pixels';
  algorithm: 'sha256';
  hash: string; // exatamente 64 caracteres hex minúsculos
  byteLength: number;
}
export type SceneStoredImageLayer = Omit<SceneImageLayer, 'pixels'> & {
  pixels: ScenePixelReference;
};
export type SceneStoredImage = Omit<SceneImage, 'layers'> & {
  layers: SceneStoredImageLayer[];
};
export type SceneStoredDocument = Omit<MoldaSceneDocument, 'images'> & {
  images: SceneStoredImage[];
};
export interface SceneStorageManifest {
  formatVersion: 2;
  storageVersion: 2;
  kind: 'molda-scene-storage';
  id: string;
  document: SceneStoredDocument;
}
export interface PreparedSceneStorage {
  manifest: SceneStorageManifest;
  blobs: ReadonlyMap<string, Uint8Array>;
  logicalBytes: number;
}
export type SceneBlobFailure = 'invalid' | 'unsupported' | 'missing' | 'integrity' | 'budget';
export class SceneBlobError extends Error {
  readonly reason: SceneBlobFailure;
  constructor(reason: SceneBlobFailure, message: string);
}
export function prepareSceneStorage(
  source: MoldaSceneDocument, signal?: AbortSignal,
): Promise<PreparedSceneStorage>;
export function hydrateSceneStorage(
  raw: unknown, blobs: ReadonlyMap<string, unknown>, signal?: AbortSignal,
): Promise<MoldaSceneDocument>;
export function readSceneStorageManifest(raw: unknown): SceneStorageManifest;
```

`prepareSceneStorage` captura e valida o documento inteiro ANTES do primeiro await;
o digest usa aqueles bytes, nunca volta ao chamador. Preflight agregado antes de
copiar memória externa. Recusar SharedArrayBuffer/detached; views ordinárias devem
copiar só o intervalo escolhido. Hash sequencial, sem Promise.all de 20 mil camadas.
Blobs únicos na ordem da primeira referência. Colisão/dados divergentes com mesmo
hash não podem substituir conteúdo existente; erro explícito. Retorno é próprio.

`readSceneStorageManifest` valida envelope fechado, versões, identidade, estrutura
de imagens, referências, dimensões, encoding e limites agregados antes de qualquer
alocação de pixels. Ele NÃO prova geometria/clipes/skin válidos, nem concede CAS.
O manifesto nunca é um `MoldaSceneDocument` parcial.

`hydrateSceneStorage` captura entrada e recursos antes do await, lê somente hashes
referenciados e rejeita ausente/tamanho/hash inválido. Repetir referência não reduz
orçamento autoral de pixels. Confere todo o lote antes de copiar/hashear, rejeita
backing compartilhado e preserva intervalos próprios. Reutiliza verificação do
mesmo blob na chamada, mas o leitor nativo final entrega bytes próprios por camada.
Ordem de arrays/keys, números e campos opcionais são preservados pelo contrato do
leitor nativo existente. Nunca preencher camada faltante com zeros ou reparar fonte.

Cancelamento antes da captura não trabalha; entre hashes interrompe sem IO. Um
digest já iniciado pode concluir, mas resultado cancelado não é publicado. Sem
promessa de zero trabalho síncrono: cópia e validação ainda têm custo e serão medidas.

## 5. Persistência, quota e compatibilidade

Layout de blob proposto: `molda:scene-blob:<sha256>` guarda bytes binários próprios.
O hash tem domínio de pixels crus, não dados de nuvem. Manifesto descreve tamanho;
o blob não contém nome de projeto, material ou encoding (interpretados pelo documento).

Summary v2 mantém todos os campos de `SceneStoredSummary`, inclusive `bytes` lógico
hidratado, thumb, timestamps, revision e originalsBytes. Acrescenta `storedBytes`
para o manifesto e uma lista fechada de referências únicas `{ hash, byteLength }`.
`storageVersion` é união 1/2 no leitor; escritor do layout novo produz 2. Tombstone
conserva id, formatVersion, storageVersion, revision e originalsBytes; não retém
automaticamente a cena apagada. Não fingir que há lixeira de projeto completo.

A quota soma cada registro físico uma vez: manifestos + blobs + metadata + originais
+ dados opacos/órfãos de todas as gerações Molda. A métrica é `structuredBytes`,
não `navigator.storage.estimate`. Deduplicação não aumenta nenhum limite autoral.
Resumo só estima custo quando consistente; metadata desconhecida não vale zero.
Nenhum refcount sozinho autoriza apagar conteúdo.

Toda mutação continua com revisão do alvo, dados correntes válidos, orçamento e
alterações na mesma transação. Hashes não são calculados com await dentro do IDB.
Se integridade exigir validação assíncrona de um snapshot anterior, o commit deve
recomparar os registros/dependências efetivamente lidos; mera igualdade da revisão
ou do hash declarado não prova que bytes não mudaram. Divergência produz conflito
sem escrita. Preparação não é autorização para apagar/sobrescrever estado inválido.
Primeira integração pode custar mais leitura; medir antes de otimizar essa fronteira.

GC libera somente referências comprovadamente não alcançadas por todos os
manifestos/recibos suportados, na mesma transação da atualização. Não depender de
fila por aba, Web Locks, evento de storage ou refcount corrompido. Se o grafo tiver
origem opaca/incompatível, preserva candidatos e contabiliza espaço retido; não faz
varredura destrutiva tentando adivinhar referências. Essa retenção conservadora
deve ser diagnosticável, não mascarada como economia. Originais v1 permanecem
inline e exatos: não deduplicar nem reserializar recibos arbitrários/cíclicos.

`guardedWrite` público deve passar a contar prefixos Molda desconhecidos antes de
qualquer coexistência. Clientes v1 JÁ abertos não ganham essa correção; o layout
novo fica no banco separado da oficina. Ativação no namespace público depende do
gate de rollout/abas reais. Não disfarçar blobs como documentos/originais só para
enganar um leitor anterior. Testar que os writers antigos recusam o alvo canônico.

## 6. O que muda e o que permanece

| Fonte | Mudança futura | Preservado |
| --- | --- | --- |
| `scenePersistence.ts` | Preparação/hidratação e writer de manifesto | API, CAS, rollback, notificações após commit |
| `sceneMetadata.ts`, `sceneQuota.ts` | Leitura 1/2; custos lógicos/físicos separados | Custo de opacos, tombstones/originais |
| `promoteScene.ts` | Entender cena já materializada por blobs | Migração v1 e recibos brutos atômicos |
| `storageKeys.ts` | Prefixo de blob | Precedência canônica e isolamento de gerações |
| `guardedWrite.ts` | Cobrar raw Molda desconhecido | Writer v1 e guards de formato/revisão |
| `sceneIndexRevision.ts`, lista | Entender metadata nova via leitor comum | Listagem sem pixels, índice não concede token |
| Editor/workers/exports | Nenhuma API de blob | Documento completo próprio, histórico e codec portátil |

## 7. Superfície e exemplo de consumidor

Nenhum export adicionado à raiz, assets ou studio-library em package.json.
APIs de codec são exports de módulos internos. `createScenePersistence` mantém
assinaturas atuais; o consumidor não escolhe formato físico nem carrega hashes.

```ts
const persistence = createScenePersistence(store);
const current = await persistence.read(id);
if (current.status === 'active') {
  await persistence.save(editedDocument, current.summary.revision);
  // editedDocument continua hidratado; backup usa sceneToJson normalmente.
}
```

Antes: editor → persistência → documento inline. Depois: editor → mesma persistência
→ codec/transaction → manifesto + blobs. Não criar provider/plugin configurável sem
necessidade nem transportar chaves IDB para workers de export.

## 8. Testes e prova de equivalência

- Vetores SHA-256 independentes; bytes iguais/diferentes, colisão inconsistente,
  SharedArrayBuffer, view parcial, alteração do chamador durante hash, abort.
- Documento real com indexed/RGBA, layers ocultas, RGB transparente, opacity,
  flipbook, clipes e skin: prepare→hydrate→sceneToJson idêntico ao codec anterior.
- Ref repetida entre imagens/encodings válidos conserva limites e não compartilha
  buffers editáveis. Sem RNG/tempo novo; ordem e todos os números permanecem iguais.
- Manifesto fechado: futuro, missing, ref malformada, orçamento antes de alocação,
  hash/tamanho trocados, geometria inválida apesar de metadata plausível.
- IDB real simulado: duas gravações concorrentes, hashing em voo, conflito/rollback,
  falta/corrupção após preparo, revisão igual com raw alterado, delete/restore,
  migração inline/hash mista, originais/unknown preservados, quota exata e GC seguro.
- Lista não lê blobs; salvar metadata não grava pixels já presentes e íntegros.
- Não substituir testes legados: ampliar CAS/promote/old tabs/namespace e UI real.
- Benchmark antes/depois com os MESMOS goldens, fixtures e ambiente: tamanho
  contábil, requisições/bytes escritos, p50/p95/p99, throughput e RAM amostrada.
  Perfil separado dos tempos. Medição de browser/disk/GPU continua outro gate.

## 9. Ordem e migração

| Lote | Entrega | Depende de | Paralelizável |
| --- | --- | --- | --- |
| 215 | Exploração, contrato, baseline e goldens | Plano aprovado | Leitura entre pacotes apenas |
| 216 | Codec binário/manifesto íntegro, sem IO | 215 | Testes e implementação sequenciais |
| 217–218 | Guardas de quota futura e reader de layout verificados | Codec verificado | Não com validação em execução |
| 219 | Writer/CAS, referências/GC e migração interna verificados | Reader, guards e provas | Transação como unidade |
| 219–220 | Perfis/comparação exata/preflight de metadata e revisão verificados | Integração | Validadores sequenciais |
| Gate público | Homologação real e rollout coordenado | Aceites de todas as fronteiras | Não automático |

Primeiro coexistem inline e envelope sob leitores novos. Writer de blobs só entra
após reader/guards e testes. Conversão é lazy no próximo save autorizado, nunca
reescrita automática ao listar. Falha antes/durante commit deixa original inline
intacto; após sucesso, o documento antigo foi substituído por representação exata,
não por um backup descartável. Recibos anteriores não são removidos. Não manter
uma segunda cópia inline eterna como workaround para migração insegura.

Rollback de UI não autoriza downgrade de dados: cliente anterior recusa envelope.
Recuperação/export exige leitor novo. Nenhum reset/drop database/apagamento em massa.

## 10. Não muda

| Responsabilidade | Motivo |
| --- | --- |
| Documento/JSON público v1 e capacidades | Não houve rollout nativo público |
| Wire de nuvem, BFF, Members, SQL/R2 | Hash local não é parte remota; release separado |
| Pinta e persistência Studio | Contratos próprios, sem dependência entre bibliotecas irmãs |
| Histórico, seleção, câmera, GPU/atlas | Estado autoral/sessão/derivado não é layout físico |
| Originais opacos e autoria | Não há autorização para descarte ou serialização com perda |
| Compressão e chunking subcamada | Uma alavanca por vez; dependem de perfil e novo contrato |

Referências de API consultadas via Context7: [IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
e [SubtleCrypto.digest](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest).
Não usar Promise de digest como mecanismo para manter transação ativa.
