from settings import *

class AllSprites(pygame.sprite.Group):
    def __init__(self):
        super().__init__()
        self.display_surface = pygame.display.get_surface()
        self.offset = pygame.Vector2()
        self.view = pygame.FRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT)

    def draw(self, target_pos):
        self.offset.x = -(target_pos[0] - WINDOW_WIDTH / 2)
        self.offset.y = -(target_pos[1] - WINDOW_HEIGHT / 2)

        # Only what the camera sees is drawn: the picture is the same, with much less work.
        self.view.topleft = -self.offset
        for sprite in self:
            if self.view.colliderect(sprite.rect):
                self.display_surface.blit(sprite.image, sprite.rect.topleft + self.offset)
