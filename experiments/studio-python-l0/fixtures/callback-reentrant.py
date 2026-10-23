import json
import turtle

screen = turtle.Screen()
screen.tracer(0)
pen = turtle.Turtle()
trace = ["before"]


def first():
    trace.append("first")
    pen.forward(7)
    screen.update()
    trace.append("first-after-update")


def second():
    trace.append("second")


screen.ontimer(first, 0)
screen.ontimer(second, 0)
screen.update()
trace.append("after")
print(json.dumps(trace))
screen.bye()
