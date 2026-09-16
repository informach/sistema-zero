/** Vocabulário de busca. Estes sinônimos oferecem apenas blocos atuais. */
export const GAME_TWO_D_SEARCH_TERMS: Readonly<Record<string, readonly string[]>> = {
  sz_g2d_set_velocity: ['Mudar a velocidade do sprite para vx vy'],
  sz_g2d_touches: ['Guardar em se sprite colide com sprite'],
  sz_js_var_create: ['Criar pontuação começando em'],
  sz_g2d_game_over: ['Mostrar fim de jogo com o texto'],
  sz_g2d_set_gravity: ['Botar a gravidade do mundo em'],
  sz_g2d_circle_touches: ['círculo circular redondo colisão contato encostando'],
  sz_g2d_play_fx: [
    'Tocar efeito',
    'Tocar som de tiro',
    'Tocar som de explosão',
    'Tocar som de pulo',
    'Tocar som de dano',
    'Tocar som de coletar',
    'Tocar som de banana caindo',
    'Tocar som de explosão',
    'som tiro explosão pulo dano coletar apito',
  ],
  sz_g2d_stop_track: ['Parar a música de fundo'],
  sz_g2d_set_volume: ['Pôr o volume em'],
  sz_g2d_set_opacity: [
    'Mudar a transparência do sprite para %',
    'opacidade transparência invisível visível',
  ],
  // ⚠️ Os dois moram em Movimento › Posição e tamanho, e quem monta uma placa
  // está em Sprites › Texto e números: sem estes termos, a criança procura por
  // "tamanho da placa" e não acha o bloco que resolve.
  sz_g2d_set_size: [
    'Mudar o tamanho do sprite para largura altura',
    'tamanho da placa botão balão maior menor redimensionar',
  ],
  sz_g2d_scale_sprite: [
    'Multiplicar o tamanho do sprite por',
    'aumentar diminuir dobrar encolher a placa o botão',
  ],
  sz_g2d_update_group: ['Atualizar (mover) o grupo'],
  sz_g2d_set_scene: ['Ir para a tela'],
  sz_g2d_scene_is: ['a tela atual é ?'],
  sz_g2d_create_text_sprite: ['texto número resposta pergunta letras educativo'],
  sz_g2d_set_text_image: ['placa botão balão moldura fundo imagem atrás do texto'],
  sz_g2d_scale_text_size: [
    'Multiplicar o tamanho do texto do sprite por',
    'letra maior menor dobrar encolher texto junto com a placa',
  ],
  sz_g2d_with_cooldown: ['recarga intervalo esperar ataque atirar cooldown'],
  sz_g2d_destroy_sprite: ['apagar excluir destruir sprite remover completamente'],
}
