import { expect, type Page, test } from '@playwright/test'
import { pasteBlocklyBlocks } from './helpers/blockly'

async function createProject(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await expect(page).toHaveURL(/\/editor\//)
}

interface PastedBlock {
  type: string
  fields?: Record<string, string | number>
  inputs?: Record<string, unknown>
  next?: { block: PastedBlock }
}

const text = (value: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: value } } })
const number = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
/** O soquete de quem USA um nome: nasce com o bloco-lista, como na paleta. */
const pick = (kind: 'layer' | 'track' | 'object', name: string) => ({
  shadow: { type: `sz_g2d_scene_${kind}_name`, fields: { NAME: name } },
})

function chain(blocks: PastedBlock[]): PastedBlock {
  const [first, ...rest] = blocks
  if (!first) throw new Error('cadeia vazia')
  return rest.length > 0 ? { ...first, next: { block: chain(rest) } } : first
}

const layer = (name: string): PastedBlock => ({
  type: 'sz_g2d_create_scene_layer',
  fields: { IMAGE: '', PASS: 'back' },
  inputs: { NAME: text(name) },
})
const track = (name: string): PastedBlock => ({
  type: 'sz_g2d_create_track',
  inputs: {
    TRACK: text(name),
    HORIZON: number(28),
    FOCAL: number(300),
    HEIGHT: number(160),
    FOLLOW: number(120),
  },
})
const object = (onTrack: string, name: string): PastedBlock => ({
  type: 'sz_g2d_place_track_object',
  fields: { IMAGE: '' },
  inputs: {
    TRACK: pick('track', onTrack),
    OBJECT: text(name),
    X: number(0),
    Z: number(600),
    WIDTH: number(40),
    HEIGHT: number(80),
  },
})

test('camada, pista e objeto são escolhidos numa lista com os nomes já criados', async ({
  page,
}) => {
  await createProject(page)
  await pasteBlocklyBlocks(
    page,
    {
      type: 'sz_frame_start',
      inputs: {
        CHILDREN: {
          block: chain([
            layer('ceu'),
            layer('montanhas'),
            track('pista'),
            track('rio'),
            object('pista', 'bandeira'),
            object('rio', 'pedra'),
            {
              type: 'sz_g2d_transform_scene_layer',
              inputs: {
                NAME: pick('layer', 'montanhas'),
                X: number(0),
                Y: number(0),
                SCALE: number(1),
                OPACITY: number(1),
              },
            },
            {
              type: 'sz_g2d_move_track_object',
              inputs: {
                TRACK: pick('track', 'rio'),
                OBJECT: pick('object', 'bandeira'),
                X: number(0),
                Z: number(600),
              },
            },
          ]),
        },
      },
    },
    ['game-2d'],
  )

  const options = page.locator('.sz-name-picker__option')
  // Cada linha é [ícone][nome]: o ícone é enfeite, o que se confere é o nome.
  const names = options.locator('span:nth-of-type(2)')
  const transform = page.locator('.blocklyBlockCanvas .sz_g2d_transform_scene_layer').first()
  const move = page.locator('.blocklyBlockCanvas .sz_g2d_move_track_object').first()

  // Camada: a lista mostra as duas criadas, e escolher troca o nome no bloco.
  await transform.getByText('montanhas', { exact: true }).click()
  await expect(names).toHaveText(['ceu', 'montanhas'])
  await options.filter({ hasText: 'ceu' }).click()
  await expect(transform.getByText('ceu', { exact: true })).toBeVisible()
  await expect(transform.getByText('montanhas', { exact: true })).toHaveCount(0)

  // Objeto: pertence a uma pista, então a lista segue a pista do MESMO bloco.
  await move.getByText('bandeira', { exact: true }).click()
  await expect(names).toHaveText(['pedra'])
  await page.keyboard.press('Escape')

  // Pista: trocar a pista do bloco troca os objetos oferecidos.
  await move.getByText('rio', { exact: true }).click()
  await expect(names).toHaveText(['pista', 'rio'])
  await options.filter({ hasText: 'pista' }).click()
  await move.getByText('bandeira', { exact: true }).click()
  await expect(names).toHaveText(['bandeira'])

  // E o nome continua podendo ser digitado, para o que ainda vai ser criado.
  const input = page.locator('.sz-name-picker__input')
  await input.fill('estrela')
  await page.getByRole('button', { name: 'Usar nome do objeto' }).click()
  await expect(move.getByText('estrela', { exact: true })).toBeVisible()
})
