/**
 * A casca da prévia do Clássico em outro site (etapa 4 da missão do Estúdio), pela porta do
 * member-shell: o app adulto não depende do `@sistemazero/studio` direto (o Estúdio chega a ele
 * pelas telas daqui), então o contexto que o layout raiz monta vem por este reexporte. É o MESMO
 * módulo do Estúdio, então o editor lê o valor que o app pôs.
 */
export {
  StudioPreviewShellProvider,
  useStudioPreviewShellUrl,
} from '@sistemazero/studio/preview-shell'
