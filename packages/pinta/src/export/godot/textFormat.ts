/**
 * Conferência pequena dos arquivos de texto de um projeto Godot (`project.godot`, `.tscn`,
 * `.tres`) e das peças que o `pinta.gd` vai pedir ao atlas. NÃO é o Godot: não compila GDScript
 * nem abre a cena. Pega o que dá para pegar lendo o texto: seção malformada, recurso citado e
 * não declarado, arquivo `res://` que não veio no pacote e peça fora da folha.
 */
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { cellTile } from '../../tiles/cell'

export interface GodotSection {
  /** `application`, `gd_scene`, `ext_resource`, `node`… */
  tag: string
  /** Os atributos do cabeçalho: `[ext_resource type="Script" path="res://x.gd" id="1"]`. */
  attributes: Record<string, string>
  /** As linhas `chave = valor` da seção. */
  values: Record<string, string>
}

/** Lê as seções de um arquivo de texto do Godot. Linha que não é seção nem `chave=valor` é erro. */
export function parseGodotText(text: string): { sections: GodotSection[]; problems: string[] } {
  const sections: GodotSection[] = [{ tag: '', attributes: {}, values: {} }],
    problems: string[] = []
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.trim()
    if (!line || line.startsWith(';')) continue
    if (line.startsWith('[')) {
      const header = line.match(
        /^\[([A-Za-z_][\w]*)((?:\s+[A-Za-z_][\w/]*=(?:"[^"]*"|[^\s\]"]+))*)\s*\]$/,
      )
      if (!header) {
        problems.push(`linha ${index + 1}: cabeçalho de seção malformado: ${line}`)
        continue
      }
      const attributes: Record<string, string> = {}
      for (const [, key, quoted, bare] of header[2]!.matchAll(
        /([A-Za-z_][\w/]*)=(?:"([^"]*)"|([^\s\]"]+))/g,
      ))
        attributes[key!] = quoted ?? bare ?? ''
      sections.push({ tag: header[1]!, attributes, values: {} })
      continue
    }
    const pair = line.match(/^([A-Za-z_][\w/.]*)\s*=\s*(.+)$/)
    if (!pair) {
      problems.push(`linha ${index + 1}: esperava "chave=valor": ${line}`)
      continue
    }
    if ((pair[2]!.match(/"/g)?.length ?? 0) % 2)
      problems.push(`linha ${index + 1}: aspas sem fechar: ${line}`)
    sections.at(-1)!.values[pair[1]!] = pair[2]!
  }
  return { sections, problems }
}

/** Os problemas dos arquivos de texto de um projeto Godot (`files` = o pacote inteiro). */
export function validateGodotProject(files: Record<string, string | Uint8Array>): string[] {
  const problems: string[] = []
  const text = (name: string): string | null =>
    typeof files[name] === 'string' ? (files[name] as string) : null
  const exists = (path: string, where: string) => {
    if (!path.startsWith('res://')) problems.push(`${where}: caminho fora do projeto: ${path}`)
    else if (!(path.slice(6) in files)) problems.push(`${where}: falta o arquivo ${path}`)
  }
  const project = text('project.godot')
  if (project === null) return ['falta o project.godot']
  const parsed = parseGodotText(project)
  problems.push(...parsed.problems.map((p) => `project.godot: ${p}`))
  if (parsed.sections[0]?.values.config_version !== '5')
    problems.push('project.godot: config_version precisa ser 5 (Godot 4).')
  const main = parsed.sections.find((s) => s.tag === 'application')?.values['run/main_scene']
  if (!main) problems.push('project.godot: falta run/main_scene.')
  else exists(main.replaceAll('"', ''), 'project.godot')
  for (const name of Object.keys(files).filter((n) => /\.(tscn|tres)$/.test(n))) {
    const source = text(name)
    if (source === null) {
      problems.push(`${name}: não é texto`)
      continue
    }
    const scene = parseGodotText(source)
    problems.push(...scene.problems.map((p) => `${name}: ${p}`))
    const head = scene.sections[1]
    if (head?.tag !== (name.endsWith('.tscn') ? 'gd_scene' : 'gd_resource'))
      problems.push(`${name}: a primeira seção precisa ser gd_scene ou gd_resource.`)
    if (head?.attributes.format !== '3') problems.push(`${name}: format precisa ser 3 (Godot 4).`)
    const external = new Set<string>(),
      internal = new Set<string>()
    for (const section of scene.sections) {
      if (section.tag !== 'ext_resource' && section.tag !== 'sub_resource') continue
      const id = section.attributes.id,
        ids = section.tag === 'ext_resource' ? external : internal
      if (!id) problems.push(`${name}: ${section.tag} sem id.`)
      else if (ids.has(id)) problems.push(`${name}: ${section.tag} com id repetido: ${id}`)
      else ids.add(id)
      if (section.tag === 'ext_resource') exists(section.attributes.path ?? '', name)
    }
    const steps = Number(head?.attributes.load_steps ?? 1)
    if (steps !== external.size + internal.size + 1)
      problems.push(
        `${name}: load_steps=${steps}, mas há ${external.size + internal.size} recursos (esperado ${external.size + internal.size + 1}).`,
      )
    for (const [, kind, id] of source.matchAll(/\b(Ext|Sub)Resource\(\s*"([^"]*)"\s*\)/g))
      if (!(kind === 'Ext' ? external : internal).has(id!))
        problems.push(`${name}: ${kind}Resource("${id}") não foi declarado.`)
    if (name.endsWith('.tscn') && !scene.sections.some((s) => s.tag === 'node'))
      problems.push(`${name}: a cena não tem nenhum nó.`)
  }
  for (const [name, content] of Object.entries(files))
    if (typeof content === 'string' && /\.(gd|tscn|tres|godot)$/.test(name))
      for (const [, path] of content.matchAll(/"(res:\/\/[^"]+)"/g))
        if (!path!.endsWith('/')) exists(path!, name)
  return [...new Set(problems)]
}

/** Largura e altura de um PNG, lidas do cabeçalho IHDR. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

/**
 * O `pinta.gd` pede ao atlas a peça `(tile % columns, tile / columns)` de cada célula. Aqui a
 * mesma conta é conferida contra a folha: a coordenada tem que existir nas colunas e linhas da
 * folha e caber na imagem PNG gravada no pacote.
 */
export function validateAtlasCoordinates(
  scenes: Record<string, PintaScene>,
  files: Record<string, string | Uint8Array>,
): string[] {
  const problems: string[] = []
  for (const [name, scene] of Object.entries(scenes)) {
    const sheets = new Map(
      scene.tilesets.map((ts) => {
        const file = files[ts.image],
          size = file instanceof Uint8Array ? pngSize(file) : null
        if (!size) problems.push(`${name}: a folha ${ts.name} não tem um PNG em ${ts.image}`)
        return [ts.id, { ts, size }] as const
      }),
    )
    const check = (tile: number, tilesetId: string, where: string) => {
      const sheet = sheets.get(tilesetId)
      if (!sheet) {
        problems.push(`${name}: ${where} usa uma folha que não existe (${tilesetId})`)
        return
      }
      const { ts, size } = sheet,
        x = tile % ts.columns,
        y = Math.floor(tile / ts.columns),
        rows = Math.ceil(ts.count / ts.columns)
      if (tile < 0 || tile >= ts.count || y >= rows)
        problems.push(`${name}: ${where} pede a peça ${tile}, fora da folha ${ts.name}`)
      else if (
        size &&
        ((x + 1) * scene.tileSize > size.width || (y + 1) * scene.tileSize > size.height)
      )
        problems.push(
          `${name}: ${where} pede a peça ${tile} em (${x}, ${y}), fora da imagem de ${size.width} × ${size.height}`,
        )
    }
    for (const group of [scene, ...(scene.sets ?? [])])
      for (const layer of group.layers) {
        if (layer.kind === 'tiles')
          for (const cell of new Set(layer.cells))
            if (cell >= 0) check(cellTile(cell), layer.tilesetId, `a camada ${layer.name}`)
        if (layer.kind === 'objects')
          for (const o of layer.objects)
            if (o.art && sheets.has(o.art.assetId))
              check(o.art.tile ?? 0, o.art.assetId, `o objeto ${o.name || o.id}`)
      }
    for (const ts of scene.tilesets)
      for (const [tile, frames] of Object.entries(ts.animations ?? {}))
        for (const f of [{ tile: Number(tile) }, ...frames])
          check(f.tile, ts.id, `a animação da peça ${tile}`)
    for (const a of scene.art ?? [])
      if (!(files[a.image] instanceof Uint8Array))
        problems.push(`${name}: o desenho ${a.id} não tem um PNG em ${a.image}`)
  }
  return problems
}
