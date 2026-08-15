/**
 * O `members` conhece os MESMOS 7 tipos de desenho que este pacote.
 *
 * ⚠️ Ele NÃO pode importar o pinta: é um serviço Bun sem React, e mesmo com o subpath puro a
 * dependência arrastaria `lucide-react` e o peer de React para a imagem dele. Então a lista está
 * COPIADA lá — e uma cópia sem guarda drifa. O teste mora AQUI (o pinta alcança o domínio do
 * members por caminho relativo; o inverso não vale), mesmo precedente do `badge-conformance` do
 * community-kids.
 *
 * O que quebra se drifar: tipo novo no Pinta que o members não conhece = bloco recusado na
 * autoria com 400; tipo removido = bloco salvo cujo tipo o resto do sistema não consegue ler.
 */
import { describe, expect, it } from 'bun:test'
import { PINTA_ASSET_KINDS as MEMBERS_KINDS } from '../../../members/src/domain/course/lesson-block'
import { PINTA_ASSET_KINDS } from '../core/project'

describe('conformidade pinta × members', () => {
  it('🚨 as duas listas de tipos de desenho batem', () => {
    expect([...MEMBERS_KINDS].sort()).toEqual([...PINTA_ASSET_KINDS].sort())
  })

  it('a leitura é de verdade (anti-vácuo: os 7 chegaram dos dois lados)', () => {
    expect(PINTA_ASSET_KINDS).toHaveLength(7)
    expect(MEMBERS_KINDS).toHaveLength(7)
  })
})
