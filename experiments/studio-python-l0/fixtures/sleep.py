import json
import time
import turtle

screen = turtle.Screen()
screen.tracer(0)
trace = []
screen.ontimer(lambda: trace.append("timer"), 0)
trace.append("before-sleep")
time.sleep(0.05)
trace.append("after-sleep")
screen.update()
trace.append("after-update")
print(json.dumps(trace))
screen.bye()
