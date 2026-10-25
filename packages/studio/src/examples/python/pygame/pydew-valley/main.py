import sys

import pygame
from settings import SCREEN_WIDTH, SCREEN_HEIGHT
from farm import Farm

pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('PyDew Valley')
clock = pygame.time.Clock()
farm = Farm()

while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    # dt: the seconds since the last frame. Everything that moves is multiplied by it,
    # so the game runs at the same speed on a fast or a slow computer.
    dt = clock.tick() / 1000
    farm.run(dt)
    pygame.display.update()
