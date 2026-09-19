import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { LessonPlayerProvider } from '../src/components/lesson-player-context'
import { MaterialsBlockView } from '../src/components/materials-block'
import type { MaterialItem, MaterialsBlock } from '../src/lib/types'

/**
 * **Materiais complementares.** O que este arquivo protege, em ordem de gravidade:
 *
 * 1. ⚠️⚠️ O item de ARQUIVO nunca desenha a localização real (`r2priv:<key>`). Ele guarda só o id
 *    do anexo, e o download sai pela rota autenticada — que é quem resolve o bucket privado e
 *    aplica a marca d'água por aluno. Um dia em que alguém "simplifique" pondo a URL no content, a
 *    chave do bucket vai para o HTML de toda criança.
 * 2. ⚠️ O vídeo só vira iframe nos dois hosts que a CSP libera; o resto vira link. Iframe
 *    bloqueado pela CSP não avisa nada — a criança ficaria olhando um retângulo branco.
 * 3. A ordem desenhada é a ordem que a autora montou (é o motivo de o bloco existir).
 */
const player = {
  lessonId: '11111111-1111-4111-8111-111111111111',
  courseSlug: 'corre-dino',
  viewerId: 'v',
  viewerWatermark: null,
  initialPositionSeconds: null,
} as never

const render = (items: MaterialItem[], title?: string) =>
  renderToStaticMarkup(
    <LessonPlayerProvider value={player}>
      <MaterialsBlockView content={{ kind: 'materials', title, items } as MaterialsBlock} />
    </LessonPlayerProvider>,
  )

const arquivo: MaterialItem = {
  id: 'i1',
  kind: 'file',
  attachmentId: 'a-1',
  label: 'dino.pinta.json',
  fileType: 'application/json',
  sizeBytes: 12_288,
}

describe('o bloco de materiais complementares', () => {
  test('⚠️⚠️ o item de arquivo NÃO leva a localização real ao navegador', () => {
    const html = render([{ ...arquivo, attachmentId: 'r2priv:creations/segredo.json' }])
    expect(html).not.toContain('r2priv:')
    expect(html).not.toContain('creations/segredo.json')
    // O que existe é o nome que a autora deu e a rota de anexo, que é quem resolve o arquivo.
    expect(html).toContain('dino.pinta.json')
  })

  test('o arquivo mostra tipo e tamanho, que vêm resolvidos do anexo', () => {
    const html = render([arquivo])
    expect(html).toContain('JSON')
    expect(html).toContain('12 KB')
  })

  test('a ordem desenhada é a ordem que a autora montou', () => {
    const html = render([
      { id: 'i1', kind: 'text', markdown: 'primeiro' },
      { id: 'i2', kind: 'link', url: 'https://exemplo.com', label: 'segundo' },
      { id: 'i3', kind: 'text', markdown: 'terceiro' },
    ])
    expect(html.indexOf('primeiro')).toBeLessThan(html.indexOf('segundo'))
    expect(html.indexOf('segundo')).toBeLessThan(html.indexOf('terceiro'))
  })

  test('⚠️ vídeo do Vimeo embute; provedor que a CSP não libera vira LINK', () => {
    const vimeo = render([{ id: 'v1', kind: 'video', url: 'https://vimeo.com/123456789' }])
    expect(vimeo).toContain('<iframe')
    expect(vimeo).toContain('https://player.vimeo.com/video/123456789')

    const outro = render([
      { id: 'v2', kind: 'video', url: 'https://drive.google.com/file/d/x/view', label: 'A aula' },
    ])
    expect(outro).not.toContain('<iframe')
    expect(outro).toContain('target="_blank"')
    expect(outro).toContain('A aula')
  })

  test('link externo abre em outra aba SEM levar o referrer da aula', () => {
    const html = render([{ id: 'l1', kind: 'link', url: 'https://exemplo.com', label: 'Paleta' }])
    expect(html).toContain('rel="noopener noreferrer"')
  })

  test('o nome do bloco aparece quando a autora escreve um, e some quando não', () => {
    expect(render([arquivo], 'Arquivos do Pinta')).toContain('Arquivos do Pinta')
    expect(render([arquivo])).not.toContain('sz-lesson-materials-title')
  })

  test('⚠️ na PRÉVIA de autoria (sem player) o arquivo aparece, mas o botão não é clique mudo', () => {
    // O ensaio do admin monta o bloco FORA da aula, então não há rota de anexo para chamar. A
    // autora precisa conferir a lista, mas um botão que não faz nada lê como defeito.
    const html = renderToStaticMarkup(
      <MaterialsBlockView content={{ kind: 'materials', items: [arquivo] } as MaterialsBlock} />,
    )
    expect(html).toContain('dino.pinta.json')
    expect(html).toContain('disabled=""')
    expect(html).toContain('baixa na aula')
  })

  test('lista vazia não desenha moldura nenhuma', () => {
    expect(render([])).toBe('')
  })

  test('os ganchos de CSS são o contrato com os dois apps', () => {
    // ⚠️ Renomear um destes apaga o desenho no kids E no adulto, em silêncio: nenhum teste de CSS
    // existe para pegar isso, e a regra do app simplesmente para de casar.
    const html = render([arquivo, { id: 'i2', kind: 'text', markdown: 'oi' }])
    for (const gancho of [
      'sz-lesson-materials',
      'sz-lesson-materials-list',
      'sz-lesson-material',
      'sz-lesson-material-action',
      'data-material="file"',
      'data-material="text"',
    ])
      expect(html).toContain(gancho)
  })
})
