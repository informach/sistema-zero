import inspect
import json
import math
import turtle

screen = turtle.Screen()
screen.tracer(0)
screen.colormode(255)
screen.bgcolor('dodger blue')
t = turtle.Turtle()
t.speed(0)
t.pencolor(12, 34, 56)
t.fillcolor('gold')
t.pensize(3)
t.forward(100)
t.left(90)
t.back(25)
t.goto((12.5, -6.25))
t.setx(14)
t.sety(-5)
t.setheading(135)
t.circle(40, 120, 12)
t.begin_fill()
for angle in [120, 120, 120]:
    t.fd(18)
    t.rt(angle)
filling = t.filling()
t.end_fill()
t.dot(8, 'blue')
t.penup()
t.shapesize(2, 3, 4)
t.shape('turtle')
t.hideturtle()
copy = t.clone()
copy.showturtle()
copy.forward(7)
stamp = t.stamp()
t.clearstamp(stamp)
stamps = [t.stamp() for _ in range(3)]
t.clearstamps(1)
t.clearstamps(-1)
t.clearstamps()

class Enemy(turtle.Turtle):
    def __init__(self):
        super().__init__()
        self.life = 7
        self.penup()
        self.goto(33, 44)
    def step(self):
        self.backward(5)

enemy = Enemy()
enemy.step()
def state(item):
    return {
        'position': list(item.position()), 'heading': item.heading(), 'down': item.isdown(),
        'color': item.color(), 'size': item.pensize(), 'visible': item.isvisible(),
        'shape': item.shape(), 'stretch': item.shapesize(), 'speed': item.speed(),
    }
errors = []
for method, args in [('goto', (1,)), ('pencolor', ('not-a-color',)),
                     ('pencolor', (300, 0, 0)), ('shape', ('missing-shape',)),
                     ('shapesize', (0, 1))]:
    try:
        getattr(t, method)(*args)
    except Exception as error:
        errors.append([method, type(error).__name__, str(error)])
screen.register_shape('diamond', ((0, 10), (10, 0), (0, -10), (-10, 0)))
enemy.shape('diamond')
before_clear = state(t)
t.clear()
after_clear = state(t)
copy.reset()
screen.update()
print(json.dumps({
    'turtle': before_clear, 'clear_preserves_state': before_clear == after_clear,
    'copy_reset': state(copy), 'enemy': state(enemy), 'enemy_life': enemy.life,
    'distance': t.distance(enemy), 'towards': t.towards(enemy),
    'filling': filling, 'filled': t.filling(), 'errors': errors,
    'background': screen.bgcolor(), 'shapes': screen.getshapes(),
    'number_of_turtles': len(screen.turtles()), 'same_screen': enemy.getscreen() is screen,
}, sort_keys=True))
screen.bye()
