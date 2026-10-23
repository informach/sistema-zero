import json
import turtle

screen = turtle.Screen()
screen.tracer(0)
trace = []


def tick():
    trace.append(len(trace) + 1)
    if len(trace) == 3:
        screen.bye()
    else:
        screen.ontimer(tick, 10)


screen.ontimer(tick, 10)
screen.mainloop()
print(json.dumps(trace))
