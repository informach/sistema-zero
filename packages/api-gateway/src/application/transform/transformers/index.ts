import type { TransformerRegistry } from '../transformer.port'
import { headerInjectTransformer } from './header-inject.transformer'
import { headerStripTransformer } from './header-strip.transformer'
import { pathRewriteTransformer } from './path-rewrite.transformer'
import { redactionTransformer } from './redaction.transformer'
import { responseEnvelopeTransformer } from './response-envelope.transformer'
import { verifyWebhookTransformer } from './verify-webhook.transformer'

/** Transformers embutidos disponíveis para uso na config (por `type`). */
export const defaultTransformerRegistry: TransformerRegistry = {
  'header-inject': headerInjectTransformer,
  'header-strip': headerStripTransformer,
  'path-rewrite': pathRewriteTransformer,
  redaction: redactionTransformer,
  'response-envelope': responseEnvelopeTransformer,
  'verify-webhook': verifyWebhookTransformer,
}
