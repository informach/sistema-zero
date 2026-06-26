/**
 * Id ESTÁVEL do rascunho local do Estúdio de uma aula, **por bloco E por perfil/usuário**. É a
 * chave do IndexedDB do editor (autosave do `<StudioLesson persistence="local">`) E do
 * `createLocalPersistenceAdapter().load(...)`. Os dois lados DEVEM usar esta função (um único
 * formato), senão o load não acha o que o autosave gravou.
 *
 * **`viewerId` (id da sessão) isola por PERFIL:** no kids, irmãos no MESMO navegador têm cada um o
 * SEU rascunho — sem ele, o trabalho de um sobrescreveria o do outro (perfis dividem o navegador).
 * No adulto é o id da conta. Ausente (fora do player) → formato legado sem o segmento (sem isolamento).
 *
 * ⚠️ SÓ caracteres do charset que o Studio aceita no id (`/^[A-Za-z0-9_-]+$/`): um id com `:` (ou
 * char fora dele) é REJEITADO ao hidratar o `initialProject` (`sanitizeProjectForHost` →
 * `boundProjectIdFromBody`) e trocado por um ULID ALEATÓRIO → o autosave grava sob o ULID e o
 * `load(<este id>)` nunca acha o rascunho (perde tudo no refresh — bug do `:` colado). `blockId` e
 * `viewerId` são UUIDs, então o id todo fica no charset seguro.
 */
export function lessonStudioProjectId(blockId: string, viewerId?: string | null): string {
  const who = viewerId ? `${viewerId}-` : ''
  return `sz-lesson-studio-${who}${blockId}`
}
