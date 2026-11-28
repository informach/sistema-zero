import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'
import type { PintaRegionalMarker } from '../src/core/pintaRegionalMaterial'
import { createEmptyProject, type ProjectAsset } from '../src/core/project'
import { gameTwoDManifest } from '../src/official-extensions/game-2d/manifest'
import { gameKitManifest } from '../src/official-extensions/game-2d-advanced/manifest'
import { pngWorld } from '../src/official-extensions/map-2d/__tests__/regionFixture'

const { createCanvas } = createRequire(new URL('../../pinta/package.json', import.meta.url))(
  '@napi-rs/canvas',
)

async function material(
  id: string,
  cabinX: number,
  atlas?: string,
): Promise<ProjectAsset & { regional: PintaRegionalMarker }> {
  const { rootId, maps } = await pngWorld(cabinX, atlas)
  const root = maps.get(rootId)
  if (!root) throw new Error('PNG sem raiz.')
  const { png, width, height } = root
  return {
    id,
    name: id,
    kind: 'image',
    source: 'library',
    libId: `personal:${rootId}`,
    libOrigin: 'pinta',
    proPath: `public/desenhos/${id}.png`,
    width,
    height,
    dataUrl: `data:image/png;base64,${Buffer.from(png).toString('base64')}`,
    regional: {
      dataVersion: 5,
      sourceId: rootId,
      sha256: createHash('sha256').update(png).digest('hex'),
    },
  }
}

for (const extension of [gameTwoDManifest, gameKitManifest]) {
  for (const pro of [false, true]) {
    test(`public ${extension.id} ${pro ? 'Pro' : 'Classic'} reads stored PNG5 worlds and updates the same program`, async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      const canvas = createCanvas(64, 16)
      const context = canvas.getContext('2d')
      context.fillStyle = 'rgb(225,33,44)'
      context.fillRect(0, 0, 64, 16)
      const atlas = `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`
      const [original, other, edited] = await Promise.all([
        material('meu-desenho', -474),
        material('segundo-desenho', -466),
        material('meu-desenho', -462, atlas),
      ])
      const basic = extension === gameTwoDManifest
      const script = `
(async () => {
  const jogo = ${basic ? 'SZGame2D' : 'SZGameKit'};
  ${basic ? "jogo.setupStage(64,64,'#000');" : 'jogo.setup({width:64,height:64});jogo.start();'}
  jogo.createMapScene('principal','meu-desenho');
  const x = jogo.mapSpawn('principal','x'), y = jogo.mapSpawn('principal','y');
  const largura = jogo.mapSize('principal','width'), altura = jogo.mapSize('principal','height');
  ${
    basic
      ? 'const heroi=jogo.createSprite({x,y,w:4,h:4});'
      : 'const heroi=jogo.createCharacter({w:4,h:4});jogo.placeCharacter(heroi,x,y);'
  }
  jogo.cameraFollow(heroi,largura,altura);
  const bmp = new Image(); bmp.src = jogo.mapResourceImage('principal','chao'); await bmp.decode();
  jogo.drawMapScene('principal','back');
  const desenho = document.querySelector('canvas');
  const pixel = Array.from(desenho.getContext('2d').getImageData(desenho.width/16,desenho.height/16,1,1).data);
  const a = {x:-478,y:-510,w:4,h:4}, b = {...a};
  jogo.createMapScene('anexo','segundo-desenho');
  jogo.useMapDoor('principal',a,jogo.mapObjectById('principal','door'));
  jogo.useMapDoor('anexo',b,jogo.mapObjectById('anexo','door'));
  document.body.setAttribute('data-prova',JSON.stringify({primeira:a.x,segunda:b.x,pixel}));
})();`
      const project = {
        ...createEmptyProject(`qa-${extension.id}-${pro}`, 'Meu mapa'),
        installedExtensions: [{ id: extension.id, version: extension.version, installedAt: 1 }],
        assets: [original, other],
        files: {
          'index.html': '<main>Meu programa</main>',
          'style.css': 'body{margin:0}',
          'script.js': script,
        },
      }
      await page.goto('/provider')
      await page.waitForFunction(() => !!globalThis.providerProbe)
      const first = await page.evaluate(
        ({ project, pro }) =>
          globalThis.providerProbe.showPintaJavaScriptProject(project, { seed: true, pro }),
        { project, pro },
      )
      const proof = page.frameLocator('iframe[title="Projeto PNG5 público"]').locator('body')
      await expect(proof).toHaveAttribute('data-prova', /"primeira":-474,"segunda":-466/)
      const marker = edited.regional
      if (!marker || !edited.width || !edited.height) throw new Error('PNG editado sem identidade.')
      const replace = {
        id: edited.id,
        capture: {
          dataUrl: edited.dataUrl,
          width: edited.width,
          height: edited.height,
          regional: marker,
        },
      }
      const corrupt = {
        ...replace,
        capture: { ...replace.capture, regional: { ...marker, sha256: '0'.repeat(64) } },
      }
      await expect(
        page.evaluate(
          ({ project, corrupt }) =>
            globalThis.providerProbe.showPintaJavaScriptProject(project, { replace: corrupt }),
          { project, corrupt },
        ),
      ).rejects.toThrow('A versão original foi preservada')
      await expect(proof).toHaveAttribute('data-prova', /"primeira":-474,"segunda":-466/)
      const second = await page.evaluate(
        ({ project, replace }) =>
          globalThis.providerProbe.showPintaJavaScriptProject(project, { replace }),
        { project, replace },
      )
      await expect(proof).toHaveAttribute(
        'data-prova',
        '{"primeira":-462,"segunda":-466,"pixel":[225,33,44,255]}',
      )
      expect(second.files).toEqual(first.files)
      expect(second.tree).toEqual(first.tree)
      expect(second.blocksState).toEqual(first.blocksState)
      expect(second.materials).toEqual(
        first.materials.map((asset) =>
          asset.id === edited.id ? { ...asset, regional: marker } : asset,
        ),
      )
      expect(errors).toEqual([])
    })
  }
}

for (const extension of [gameTwoDManifest, gameKitManifest]) {
  for (const pro of [false, true]) {
    for (const projection of ['isometric', 'hexagonal'] as const) {
      test(`public ${extension.id} ${pro ? 'Pro' : 'Classic'} reads stored PNG6 ${projection} and updates the same program`, async ({
        page,
      }) => {
        const { nativeNineGallery } = await import('../../pinta/src/testing/nativeNineFixtures')
        const { exportPintaProjectedScene } = await import('../../pinta/src/export/projectedScene')
        const { embedPintaRegionImage } = await import('../../pinta/src/export/regionImage')
        const { sheet, hex, iso } = await nativeNineGallery()
        const map = projection === 'hexagonal' ? hex : iso
        async function capture(color: string) {
          const canvas = createCanvas(64, 16),
            context = canvas.getContext('2d')
          context.fillStyle = color
          context.fillRect(0, 0, 64, 16)
          const png = new Uint8Array(canvas.toBuffer('image/png'))
          const url = `data:image/png;base64,${Buffer.from(png).toString('base64')}`
          const exported = await exportPintaProjectedScene(
            map,
            (id) => (id === sheet.id ? sheet : null),
            async () => url,
          )
          const embedded = await embedPintaRegionImage(png, exported.json)
          return {
            dataUrl: `data:image/png;base64,${Buffer.from(embedded.png).toString('base64')}`,
            width: 64,
            height: 16,
            regional: {
              dataVersion: 6 as const,
              sourceId: map.id,
              sha256: createHash('sha256').update(embedded.png).digest('hex'),
            },
          }
        }
        const original = await capture('#1122cc'),
          edited = await capture('#dd212c')
        const basic = extension === gameTwoDManifest
        const script = `(async () => {
          const jogo = ${basic ? 'SZGame2D' : 'SZGameKit'};
          ${basic ? "jogo.setupStage(128,128,'#000');" : 'jogo.setup({width:128,height:128});jogo.start();'}
          jogo.createMapScene('principal','meu-desenho');
          const bmp = new Image(); bmp.src = jogo.mapResourceImage('principal', ${JSON.stringify(sheet.id)}); await bmp.decode();
          jogo.drawMapScene('principal','back');
          const probe = document.createElement('canvas'); probe.width = 1; probe.height = 1;
          const ctx = probe.getContext('2d'); ctx.drawImage(bmp,0,0);
          document.body.setAttribute('data-prova', JSON.stringify({width:jogo.mapSize('principal','width'),height:jogo.mapSize('principal','height'),pixel:Array.from(ctx.getImageData(0,0,1,1).data)}));
        })();`
        const asset: ProjectAsset = {
          id: 'meu-desenho',
          name: 'meu-desenho',
          kind: 'image',
          source: 'library',
          libId: `personal:${map.id}`,
          libOrigin: 'pinta',
          proPath: 'public/desenhos/meu-desenho.png',
          ...original,
        }
        const project = {
          ...createEmptyProject(`qa-lg05-${extension.id}-${pro}-${projection}`, 'Minha projeção'),
          installedExtensions: [{ id: extension.id, version: extension.version, installedAt: 1 }],
          assets: [asset],
          files: {
            'index.html': '<main>Minha projeção</main>',
            'style.css': 'body{margin:0}',
            'script.js': script,
          },
        }
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto('/provider')
        await page.waitForFunction(() => !!globalThis.providerProbe)
        const first = await page.evaluate(
          ({ project, pro }) =>
            globalThis.providerProbe.showPintaJavaScriptProject(project, { seed: true, pro }),
          { project, pro },
        )
        const proof = page.frameLocator('iframe[title="Projeto PNG5 público"]').locator('body')
        await expect(proof).toHaveAttribute('data-prova', /"pixel":\[17,34,204,255\]/)
        const published = !pro
          ? await page.evaluate(
              (projectId) =>
                globalThis.providerProbe.publishPintaJavaScriptProject(
                  projectId,
                  crypto.randomUUID(),
                ),
              project.id,
            )
          : null
        if (published) expect(published.assets?.[0]?.regional).toEqual(original.regional)
        const dimensions = JSON.parse((await proof.getAttribute('data-prova'))!)
        expect(dimensions.width).toBeGreaterThan(0)
        expect(dimensions.height).toBeGreaterThan(0)
        const replace = { id: asset.id, capture: edited }
        const corrupt = {
          ...replace,
          capture: { ...edited, regional: { ...edited.regional, sha256: '0'.repeat(64) } },
        }
        await expect(
          page.evaluate(
            ({ project, corrupt }) =>
              globalThis.providerProbe.showPintaJavaScriptProject(project, { replace: corrupt }),
            { project, corrupt },
          ),
        ).rejects.toThrow('A versão original foi preservada')
        await expect(proof).toHaveAttribute('data-prova', /"pixel":\[17,34,204,255\]/)
        const second = await page.evaluate(
          ({ project, replace }) =>
            globalThis.providerProbe.showPintaJavaScriptProject(project, { replace }),
          { project, replace },
        )
        await expect(proof).toHaveAttribute('data-prova', /"pixel":\[221,33,44,255\]/)
        expect(second.files).toEqual(first.files)
        expect(second.tree).toEqual(first.tree)
        expect(second.blocksState).toEqual(first.blocksState)
        if (published) {
          const updated = await page.evaluate(
            (projectId) =>
              globalThis.providerProbe.publishPintaJavaScriptProject(
                projectId,
                crypto.randomUUID(),
              ),
            project.id,
          )
          expect(updated.updated).toBe(true)
          expect(updated.playUrl).toBe(published.playUrl)
          expect(updated.publicationId).toBe(published.publicationId)
          expect(updated.assets?.[0]?.dataUrl).toBe(edited.dataUrl)
          expect(updated.assets?.[0]?.regional).toEqual(edited.regional)
          expect(updated.assets?.[0]?.libId).toBeUndefined()
          await expect(
            page.frameLocator('iframe[title="Projeto PNG6 publicado"]').locator('body'),
          ).toHaveAttribute('data-prova', /"pixel":\[221,33,44,255\]/)
        }
        expect(second.materials).toEqual(
          first.materials.map((material) => ({ ...material, regional: edited.regional })),
        )
        await page.reload()
        await page.waitForFunction(() => !!globalThis.providerProbe)
        await page.evaluate(
          (project) => globalThis.providerProbe.showPintaJavaScriptProject(project),
          project,
        )
        await expect(proof).toHaveAttribute('data-prova', /"pixel":\[221,33,44,255\]/)
        expect(errors).toEqual([])
      })
    }
  }
}
