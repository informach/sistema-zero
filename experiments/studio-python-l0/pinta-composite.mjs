// Trusted conversion worker; never receives or executes student source.
addEventListener('message', async ({ data }) => {
  const { cols, rows, tile, cells, images } = data
  let canvas
  try {
    if (
      !Number.isInteger(cols) ||
      cols < 1 ||
      cols > 128 ||
      !Number.isInteger(rows) ||
      rows < 1 ||
      rows > 128 ||
      ![16, 32, 48].includes(tile) ||
      cols * rows * tile * tile > 8_000_000 ||
      !(cells instanceof Int16Array) ||
      cells.length !== cols * rows ||
      !Array.isArray(images) ||
      images.length > 64
    )
      throw new Error('Invalid conversion workload')
    const tiles = new Map(images)
    for (const [id, image] of tiles)
      if (
        !Number.isInteger(id) ||
        !(image instanceof ImageBitmap) ||
        image.width !== tile ||
        image.height !== tile
      )
        throw new Error('Invalid tile bitmap')
    canvas = new OffscreenCanvas(cols * tile, rows * tile)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Offscreen Canvas unavailable')
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const image = tiles.get(cells[row * cols + col])
        if (image) ctx.drawImage(image, col * tile, row * tile)
      }
      if (row % 32 === 0 || row === rows - 1)
        postMessage({ type: 'progress', completedRows: row + 1, totalRows: rows })
    }
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    postMessage({ ok: true, blob })
  } catch (error) {
    postMessage({ ok: false, error: String(error).slice(0, 1000) })
  } finally {
    if (Array.isArray(images))
      for (const entry of images)
        if (Array.isArray(entry) && entry[1] instanceof ImageBitmap) entry[1].close()
    if (canvas) canvas.width = canvas.height = 0
  }
})
