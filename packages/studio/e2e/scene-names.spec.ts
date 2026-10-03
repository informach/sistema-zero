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
const pick = (kind: 'layer' | 'track', name: string) => ({
  shadow: { type: `sz_g2d_scene_${kind}_name`, fields: { NAME: name } },
})

function chain(blocks: PastedBlock[]): PastedBlock {
  const [first, ...rest] = blocks
  if (!first) throw new Error('cadeia vazia')
  return rest.length > 0 ? { ...first, next: { block: chain(rest) } } : first
}

const layer = (name: string): PastedBlock => ({
  type: 'sz_g2d_add_scene_backdrop',
  fields: { IMAGE: '', PLANE: 'back' },
  inputs: { NAME: text(name) },
})
const track = (name: string): PastedBlock => ({
  type: 'sz_g2d_create_sprite_track',
  inputs: {
    TRACK: text(name),
  },
})

test('cenário e pista são escolhidos numa lista com os nomes já criados', async ({ page }) => {
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
            {
              type: 'sz_g2d_scene_backdrop_motion',
              inputs: {
                NAME: pick('layer', 'montanhas'),
                AMOUNT: number(40),
              },
            },
            {
              type: 'sz_g2d_track_travel',
              fields: { SPEED: '320' },
              inputs: {
                TRACK: pick('track', 'rio'),
                FINISH: number(6600),
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
  const transform = page.locator('.blocklyBlockCanvas .sz_g2d_scene_backdrop_motion').first()
  const move = page.locator('.blocklyBlockCanvas .sz_g2d_track_travel').first()

  // Camada: a lista mostra as duas criadas, e escolher troca o nome no bloco.
  await transform.getByText('montanhas', { exact: true }).click()
  await expect(names).toHaveText(['ceu', 'montanhas'])
  await options.filter({ hasText: 'ceu' }).click()
  await expect(transform.getByText('ceu', { exact: true })).toBeVisible()
  await expect(transform.getByText('montanhas', { exact: true })).toHaveCount(0)

  await move.getByText('rio', { exact: true }).click()
  await expect(names).toHaveText(['pista', 'rio'])
  await options.filter({ hasText: 'pista' }).click()
  await expect(move.getByText('pista', { exact: true })).toBeVisible()
})

test('encontro por molde oferece o personagem local nas ações do evento', async ({ page }) => {
  await createProject(page)
  await pasteBlocklyBlocks(
    page,
    {
      type: 'sz_frame_events',
      inputs: {
        CHILDREN: {
          block: {
            type: 'sz_gk_on_track_mold_encounter',
            fields: { MOLD: 'asteroide', PARAM: 'encontrado' },
            inputs: {
              TRACK: text('pista'),
              BODY: {
                block: {
                  type: 'sz_gk_set_health',
                  fields: { WHO: 'heroi' },
                  inputs: { LIVES: number(2) },
                },
              },
            },
          },
        },
      },
    },
    ['game-2d-advanced'],
  )
  const action = page.locator('.blocklyBlockCanvas .sz_gk_set_health').first()
  await action.getByText('heroi', { exact: true }).click()
  const found = page.locator('.sz-name-picker__option').filter({ hasText: 'encontrado' })
  await expect(found).toBeVisible()
  await found.click()
  await expect(action.getByText('encontrado', { exact: true })).toBeVisible()
})
