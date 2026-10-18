import json
import turtle

screen = turtle.Screen()
screen.tracer(0)
trace = ["before"]


def broken():
    trace.append("broken")
    raise ValueError("callback-canary")


def survivor():
    trace.append("survived")


screen.ontimer(broken, 0)
screen.ontimer(survivor, 0)
screen.update()
trace.append("after")
print(json.dumps(trace))
screen.bye()
