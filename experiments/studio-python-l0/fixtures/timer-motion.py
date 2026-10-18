import json
import turtle

screen = turtle.Screen()
screen.tracer(0)
pen = turtle.Turtle()
screen.tracer(1, 1)
trace = ["before"]
moving = True


def stop_motion():
    global moving
    trace.append("timer")
    moving = False


screen.ontimer(stop_motion, 0)
steps = 0
while moving and steps < 1000:
    pen.forward(1)
    steps += 1
assert not moving and steps > 0
trace.append("after")
print(json.dumps(trace))
screen.bye()
