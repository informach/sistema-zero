import pygame
import pinta
from settings import SCREEN_WIDTH, SCREEN_HEIGHT, SALE_PRICES, PURCHASE_PRICES, ITEM_NAMES
from timer import Timer


class Shop:
    """The trader's shop: arrows choose a line, Space sells or buys, Esc closes."""

    def __init__(self, farmer, close):
        self.farmer = farmer
        self.close = close
        self.screen = pygame.display.get_surface()
        self.font = pinta.fonte('fredoka', 30)
        self.width = 400
        self.gap = 10
        self.padding = 8

        # One line for each thing the farmer can sell, then one for each seed to buy.
        self.lines = []
        for item in farmer.items:
            self.lines.append(('sell', item))
        for seed in farmer.seeds:
            self.lines.append(('buy', seed))
        self.names = []
        for action, name in self.lines:
            self.names.append(self.write(ITEM_NAMES[name]))
        self.words = {'sell': self.write('vender'), 'buy': self.write('comprar')}

        self.line_height = self.names[0].get_height() + self.padding * 2
        height = len(self.lines) * self.line_height + (len(self.lines) - 1) * self.gap
        left = SCREEN_WIDTH / 2 - self.width / 2
        self.box = pygame.Rect(left, SCREEN_HEIGHT / 2 - height / 2, self.width, height)

        self.index = 0
        # Holding a key does not race down the list: one step every 200 ms.
        self.timer = Timer(200)

    def write(self, text):
        return self.font.render(text, False, 'black')

    def update(self):
        self.read_keys()
        self.draw_money()
        for index in range(len(self.lines)):
            self.draw_line(index)

    def read_keys(self):
        keys = pygame.key.get_pressed()
        self.timer.update()
        if keys[pygame.K_ESCAPE]:
            self.close()
        if not self.timer.active:
            if keys[pygame.K_UP]:
                self.index -= 1
                self.timer.start()
            if keys[pygame.K_DOWN]:
                self.index += 1
                self.timer.start()
            # Going up from the first line leads to the last one, and the other way round.
            self.index = self.index % len(self.lines)
            if keys[pygame.K_SPACE]:
                self.timer.start()
                self.trade()

    def trade(self):
        action, name = self.lines[self.index]
        if action == 'sell':
            if self.farmer.items[name] > 0:
                self.farmer.items[name] -= 1
                self.farmer.money += SALE_PRICES[name]
        else:
            price = PURCHASE_PRICES[name]
            if self.farmer.money >= price:
                self.farmer.seeds[name] += 1
                self.farmer.money -= price

    def draw_money(self):
        text = self.write(f'${self.farmer.money}')
        rect = text.get_rect(midbottom=(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 20))
        pygame.draw.rect(self.screen, 'white', rect.inflate(10, 10), 0, 4)
        self.screen.blit(text, rect)

    def draw_line(self, index):
        action, name = self.lines[index]
        if action == 'sell':
            amount = self.farmer.items[name]
        else:
            amount = self.farmer.seeds[name]
        top = self.box.top + index * (self.line_height + self.gap)
        background = pygame.Rect(self.box.left, top, self.width, self.line_height)
        pygame.draw.rect(self.screen, 'white', background, 0, 4)

        name_image = self.names[index]
        self.screen.blit(name_image, name_image.get_rect(midleft=(self.box.left + 20, background.centery)))
        amount_image = self.write(str(amount))
        self.screen.blit(amount_image, amount_image.get_rect(midright=(self.box.right - 20, background.centery)))

        if index == self.index:
            pygame.draw.rect(self.screen, 'black', background, 4, 4)
            word = self.words[action]
            self.screen.blit(word, word.get_rect(midleft=(self.box.left + 150, background.centery)))
