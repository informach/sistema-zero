/**
 * Os blocos do Jogo 2D que DECLARAM um nome (sprite ou grupo): só dados, sem dependência. Os
 * seletores de sprite e de grupo dos blocos (`FieldSpritePicker`, `FieldNamePicker`) e a aba
 * "Meus testes" (as listas de nomes do formulário) leem daqui. Módulo à parte de propósito: a aba
 * é baixada sob demanda, e importar a tabela de dentro de um seletor separava o seletor num
 * arquivo próprio no build (mais um arquivo na abertura do modo Blocos, que tem teto de 20).
 */

/**
 * Blocos que CRIAM um sprite nomeado (a fonte da lista do dropdown), e em qual
 * campo está a cor/imagem para a miniatura. Inclui os criadores genéricos E os dos
 * KITS (nave, dino, gorila) — senão a criança cria um sprite com "Criar nave" e o
 * seletor diz, ERRADO, que não há sprite nenhum. Quase todos guardam o nome no
 * campo `NAME`; quem usa outro campo informa em `nameField`. ⚠️ Bloco novo que
 * cria sprite nomeado? Adicione aqui.
 */
export const SPRITE_DECL_BLOCKS: Record<
  string,
  { color?: string; image?: string; nameField?: string }
> = {
  sz_g2d_create_sprite: { color: 'COLOR' },
  sz_g2d_create_text_sprite: {},
  sz_g2d_spawn_text_in_group: {},
  sz_g2d_create_image_sprite: { image: 'IMAGE' },
  sz_g2d_create_shape_sprite: { nameField: 'SPRITE' }, // criar sprite com figura (v0.23) — nome no campo SPRITE
  // Criar NO GRUPO com nome (opcional): o sprite nasce durante o jogo e o nome
  // é a alça p/ animar/mexer nele em seguida. Campo vazio = `collectSprites`
  // ignora. ⚠️ a lista é global (sem escopo): usar o nome fora do trecho onde
  // ele nasce é pego pela validação da IR, com recado claro.
  sz_g2d_spawn_in_group: { color: 'COLOR' },
  sz_g2d_spawn_image_in_group: { image: 'IMAGE' },
  // Soltar um inimigo "chamado ⟨X⟩": mesma régua dos dois de cima. É o que
  // deixa a barra de vida do chefão apontar para ELE, sem laço.
  sz_g2d_spawn_enemy: {},
  sz_g2d_create_ship: { color: 'BODY' }, // criar nave (Kit espaço)
  sz_g2d_create_dino: { color: 'COLOR' }, // criar dinossauro (Kit dino)
  sz_g2d_place_thrower: { color: 'COLOR' }, // pôr o gorila (Kit gorilas)
  sz_g2d_stickhero_sprite: { color: 'COLOR' }, // criar equilibrista (Kit equilibrista v2)
  sz_g2d_balloon_sprite: { color: 'BODY' }, // criar balão (Kit balão v2)
}

/**
 * Blocos que DECLARAM um grupo de sprites nomeado (Jogo 2D). O TIPO de inimigo
 * também entra aqui: ele É um grupo estendido (tem .items) — os blocos de grupo
 * (para cada / contar / colisões / tirar) funcionam direto no tipo.
 */
export const GROUP_DECL_BLOCKS: Record<string, string[]> = {
  sz_g2d_create_group: ['NAME'],
  sz_g2d_all_enemies_group: ['NAME'],
  sz_g2d_define_enemy_type: ['NAME'],
  sz_g2d_define_enemy_smart: ['NAME'],
}
