import json
import turtle

screen = turtle.Screen()
screen.tracer(0)
pen = turtle.Turtle()
for _ in range(4):
    pen.forward(80)
    pen.right(90)
screen.update()
print(json.dumps({"closed": all(abs(value) < 1e-8 for value in pen.position()), "heading": pen.heading()}))
screen.bye()
