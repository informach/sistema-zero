from settings import *

class AllSprites(pygame.sprite.Group):
    def __init__(self):
        super().__init__()
        self.display_surface = pygame.display.get_surface()
        self.offset = pygame.Vector2()
        # The ground layer of the map (set by the game when it loads the map).
        self.ground = None

    def draw(self, target_pos):
        self.offset.x = -(target_pos[0] - WINDOW_WIDTH / 2)
        self.offset.y = -(target_pos[1] - WINDOW_HEIGHT / 2)

        # The map draws only the ground tiles that are on the screen.
        if self.ground:
            self.ground.desenhar(self.display_surface, self.offset)

        # Only the sprites the camera sees, sorted by height on the screen.
        view = pygame.FRect(-self.offset.x, -self.offset.y, WINDOW_WIDTH, WINDOW_HEIGHT)
        object_sprites = [sprite for sprite in self if view.colliderect(sprite.rect)]
        for sprite in sorted(object_sprites, key = lambda sprite: sprite.rect.centery):
            self.display_surface.blit(sprite.image, sprite.rect.topleft + self.offset)
