/**
 * O portão por nível de carreira, do lado da interface: um contexto só, lido por quem desenha
 * um controle que CRIA ou MUDA algo de uma família trancável.
 *
 * O valor vem de `MoldaHostAdapter.toolAccess` e atravessa a árvore por contexto, então a
 * oficina carregada sob demanda (`DeferredModule`) enxerga o mesmo portão sem ganhar prop.
 * Sem provedor, tudo liberado: o playground `?oficina=nova`, os testes e outros hosts.
 *
 * ⚠️ Trancado NÃO é renderizado, nunca fica `disabled`: desligado diz "agora não, mas você
 * pode", e a criança não pode. As abas nunca somem; o que é portado é o conteúdo delas.
 * ⚠️ Só a interface importa este módulo. `scene/`, `state/`, `export/`, `import/`, `viewport/` e
 * `workers/` não conhecem o portão (há teste por texto): leitura, nuvem, exportação e a ponte
 * com o Estúdio tratam toda criação igual, use ela a família que usar.
 */
import { createContext, type JSX, type ReactNode, useContext, useMemo } from 'react'
import {
  type MoldaToolAccess,
  type MoldaToolAccessReader,
  type MoldaToolFamilyId,
  readMoldaToolAccess,
} from '../core/toolFamilies'

const MoldaToolAccessContext = createContext<MoldaToolAccessReader>(readMoldaToolAccess(undefined))

export function MoldaToolAccessProvider({
  access,
  children,
}: {
  access: MoldaToolAccess | undefined
  children: ReactNode
}): JSX.Element {
  const reader = useMemo(() => readMoldaToolAccess(access), [access])
  return (
    <MoldaToolAccessContext.Provider value={reader}>{children}</MoldaToolAccessContext.Provider>
  )
}

export function useMoldaToolAccess(): MoldaToolAccessReader {
  return useContext(MoldaToolAccessContext)
}

/** Desenha o bloco só com a família liberada. Fica dentro do componente-folha, para viajar junto. */
export function RequiresTool({
  family,
  children,
}: {
  family: MoldaToolFamilyId
  children: ReactNode
}): ReactNode {
  return useMoldaToolAccess().can(family) ? children : null
}
