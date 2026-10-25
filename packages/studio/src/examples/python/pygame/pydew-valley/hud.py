import pygame
import art
from settings import SCREEN_WIDTH, SCREEN_HEIGHT, ICONS, HUD_POSITIONS


class Hud:
    """The icons of the chosen tool and seed, in the bottom left corner."""

    def __init__(self, farmer):
        self.screen = pygame.display.get_surface()
        self.farmer = farmer
        self.icons = {}
        for name in ICONS:
            self.icons[name] = art.image(ICONS[name])

    def draw(self):
        self.draw_icon(self.farmer.tool, HUD_POSITIONS['tool'])
        self.draw_icon(self.farmer.seed, HUD_POSITIONS['seed'])

    def draw_icon(self, name, bottom):
        icon = self.icons[name]
        self.screen.blit(icon, icon.get_rect(midbottom=bottom))


class SleepFade:
    """While the farmer sleeps, the screen goes dark and comes back.

    When it is completely dark, `on_dark` starts the new day (nobody sees the world
    change); when it is bright again, `on_bright` wakes the farmer up.
    """

    def __init__(self, on_dark, on_bright):
        self.screen = pygame.display.get_surface()
        self.shade = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
        self.on_dark = on_dark
        self.on_bright = on_bright
        self.brightness = 255
        self.step = -2

    def draw(self):
        self.brightness += self.step
        if self.brightness <= 0:
            self.brightness = 0
            self.step = 2
            self.on_dark()
        if self.brightness > 255:
            self.brightness = 255
            self.step = -2
            self.on_bright()
        self.shade.fill((self.brightness, self.brightness, self.brightness))
        self.screen.blit(self.shade, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)
