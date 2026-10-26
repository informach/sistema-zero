/** Games made with an extension use that engine's visual tools. */
export const GAME_EXTENSION_VISUAL_GUIDANCE =
  'Nos jogos com extensão, use os blocos da extensão para desenho, telas e interface, ' +
  'com Programação para as regras. HTML, CSS e Canvas diretos pertencem à etapa sem extensão. ' +
  'Não substitua esses recursos por JavaScript cru.'

export function isGameExtensionId(id: string): boolean {
  return ['game-2d', 'game-2d-advanced', 'game-3d', 'game-3d-advanced', 'world-3d'].includes(id)
}

export function isGameExtensionBlock(type: string): boolean {
  return /^sz_(?:g2d|gk|g3d|g3k|w3d)_/.test(type)
}

/** Pure policy shared by the palette and the catalog's progression checks. */
const MANUAL_VISUAL_TYPES: ReadonlySet<string> = new Set([
  'sz_js_get_element_by_id',
  'sz_val_get_element',
  'sz_val_query_select',
  'sz_js_query_selector',
  'sz_js_query_selector_all',
  'sz_js_set_property_text',
  'sz_js_set_property',
  'sz_js_set_property_var',
  'sz_js_set_property_calc',
  'sz_js_get_property',
  'sz_js_set_style',
  'sz_js_set_style_text',
  'sz_js_set_attribute',
  'sz_js_get_attribute',
  'sz_js_set_text',
  'sz_js_class_op',
  'sz_js_set_dataset',
  'sz_js_create_element',
  'sz_js_create_element_ns',
  'sz_js_append_child',
  'sz_js_element_onclick',
  'sz_val_image',
  'sz_js_new_image',
  'sz_js_image_onload',
  'sz_js_image_onerror',
  'sz_input_key_pressed',
  'sz_input_pointer_x',
  'sz_input_pointer_y',
  'sz_input_pointer_down',
  'sz_val_canvas_width',
  'sz_val_canvas_height',
])

export function isManualGameVisualBlock(type: string): boolean {
  return (
    MANUAL_VISUAL_TYPES.has(type) ||
    /^sz_(?:html_|css_|svg_|canvas_|t3d_|adv_raw_(?:html|css|js)$)/.test(type)
  )
}

export function isManualGameVisualCategory(name: string): boolean {
  return ['HTML', 'CSS', 'SVG', 'Canvas', 'Canvas 3D', 'Avançado'].includes(name)
}
