# Derivado de código MIT de TheWannabeCoder (2025), commit 2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103.
# Labirinto das Luzes — Sistema Zero. Consulte LICENSE e NOTICE.md.

"""Desenhos do labirinto: polígonos, paredes, luzes e painel.

As nove formas geométricas são próprias do Sistema Zero.
Créditos do código e licença em NOTICE.md e LICENSE.
"""

import turtle
from mazes import calculate_maze_data, maze_level_1
from constants import CELL_SIZE, SCREEN_HEIGHT, SCREEN_WIDTH


def register_editorial_shapes(screen):
    """Nove nomes próprios, sem GIF, imagem, fonte ou sprite externo.

    O polígono direcional gira com heading da API Turtle; não pré-rotacionamos
    as variantes para evitar aplicar a direção duas vezes.
    """
    arrow = ((0, 14), (-11, 3), (-5, 3), (-5, -11),
             (5, -11), (5, 3), (11, 3))
    shapes = {
        "light-rest": ((0, 12), (-10, 6), (-10, -6),
                       (0, -12), (10, -6), (10, 6)),
        "light-right": arrow,
        "light-left": arrow,
        "light-up": arrow,
        "light-down": arrow,
        "light-hex": ((0, 13), (-11, 6), (-11, -6),
                      (0, -13), (11, -6), (11, 6)),
        "light-diamond": ((0, 14), (-12, 0), (0, -14), (12, 0)),
        "light-star": ((0, 14), (-4, 5), (-13, 5), (-6, -2),
                       (-9, -12), (0, -6), (9, -12), (6, -2),
                       (13, 5), (4, 5)),
        "light-wall": ((-14, -14), (-14, 14), (14, 14), (14, -14)),
    }
    for name, polygon in shapes.items():
        screen.register_shape(name, polygon)


class Pen(turtle.Turtle):

    def __init__(self):
        super().__init__()
        self.hideturtle()
        self.penup()
        self.color("silver")
        self.speed(0)
        # Get all coordinates from the maze level
        self.walls, self.pellets, self.power_pellets = calculate_maze_data(
            maze_level_1)



class Wall(Pen):

    def __init__(self):
        super().__init__()
        self.shape("light-wall")
        self.color("#3b82a0", "#16304b")

    def draw(self):
        "Draw the wall on screen"
        for x, y in self.walls:
            self.goto(x, y)
            self.stamp()


class Pellet(Pen):

    def __init__(self):
        super().__init__()
        self.shape("circle")
        self.shapesize(0.35, 0.35)
        self.pencolor("white")
        self.fillcolor("gold")
        self.stamps = {}

    def draw(self):
        "Draw the pellet on screen"
        for x, y in self.pellets:
            self.goto(x, y)
            # stamp the pellet and save the stamp id of the coordinate in a variable
            stamp_id = self.stamp()
            # Add the coordinate to the dictionary and map it to the saved stamp_id
            self.stamps[(x, y)] = stamp_id


class PowerPellet(Pen):

    def __init__(self):
        super().__init__()
        self.shape("circle")
        self.shapesize(0.8, 0.8)
        self.pencolor("white")
        self.fillcolor("chartreuse")
        self.stamps = {}

    def draw(self):
        "Draw the pellet on screen"
        for x, y in self.power_pellets:
            self.goto(x, y)
            # stamp the power pellet and save the stamp id of the coordinate in a variable
            stamp_id = self.stamp()
            # Add the coordinate to the dictionary and map it to the saved stamp_id
            self.stamps[(x, y)] = stamp_id


class UiPen(Pen):

    def __init__(self):
        super().__init__()
        self.font = ("Courier", 30, "normal")

    def draw_ui_area(self):
        "Draw the user interface border"
        self.pensize(2)
        x = 0.9 * SCREEN_WIDTH / 2
        top_y = 0.98 * SCREEN_HEIGHT / 2
        bottom_y = top_y - 1.5 * CELL_SIZE
        self.goto(x, top_y)
        self.pendown()
        self.goto(-x, top_y)
        self.goto(-x, bottom_y)
        self.goto(x, bottom_y)
        self.goto(x, top_y)


    def write_score(self, score, lives, pellet_stamps, power_stamps):
        "Write score on screen"
        self.clear()
        msg = f"Pontos: {score}"
        self.goto(-0.7 * SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 2 * CELL_SIZE)
        self.write(msg, False, "left", self.font)
        # Game over
        if lives <= 0:
            self.clear()
            self.color("red")
            self.write(
                f"Fim de jogo!     Pontos: {score}", False, "left", self.font)
        # Game won
        if len(pellet_stamps) == 0 and len(power_stamps) == 0:
            self.clear()
            self.color("yellow")
            self.write(
                f"Você venceu!     Pontos: {score}", False, "left", self.font)


    def write_lives(self, lives, pellet_stamps, power_stamps):
        "Write lives on screen"
        self.clear()
        msg = f"Vidas: {lives}"
        self.goto(0.7 * SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 2 * CELL_SIZE)
        self.write(msg, False, "right", self.font)
        if lives == 0 or (len(pellet_stamps) == 0 and len(power_stamps) == 0):
            self.clear()
            self.hideturtle()
