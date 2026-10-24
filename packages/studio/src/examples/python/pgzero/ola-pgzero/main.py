import pgzrun

WIDTH = 640
HEIGHT = 480
TITLE = 'Olá, Pygame Zero'

nave = Actor('nave')
nave.pos = (WIDTH / 2, HEIGHT / 2)


def draw():
    screen.fill((20, 24, 60))
    screen.draw.text('Olá, Pygame Zero!', center=(WIDTH / 2, 60), fontsize=56, color='yellow')
    screen.draw.text('Use as setas para pilotar a nave', center=(WIDTH / 2, 440), fontsize=28, color='white')
    nave.draw()


def update():
    if keyboard.left and nave.left > 0:
        nave.x = nave.x - 4
    if keyboard.right and nave.right < WIDTH:
        nave.x = nave.x + 4
    if keyboard.up and nave.top > 0:
        nave.y = nave.y - 4
    if keyboard.down and nave.bottom < HEIGHT:
        nave.y = nave.y + 4


pgzrun.go()
