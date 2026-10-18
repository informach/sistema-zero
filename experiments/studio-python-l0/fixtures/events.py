import json
import turtle

screen = turtle.Screen()
screen.tracer(0)
pen = turtle.Turtle()
trace = []


def tick():
    trace.append("timer")


screen.ontimer(tick, 0)
pen.forward(20)
trace.append("before-update")
screen.update()
trace.append("after-update")
print(json.dumps(trace))
screen.bye()
