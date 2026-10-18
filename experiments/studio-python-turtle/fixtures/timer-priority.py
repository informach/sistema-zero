import json
import time
import turtle

screen = turtle.Screen()
screen.tracer(0)
events = []
def first():
    events.append('first')
    screen.ontimer(lambda: events.append('second'), 0)
screen.ontimer(first, 0)
screen.update()
screen.ontimer(lambda: events.append('idle'), 0)
screen.ontimer(lambda: events.append('due'), 1)
time.sleep(0.03)
screen.update()
def idle_first():
    events.append('idle-first')
    time.sleep(0.08)
screen.ontimer(idle_first, 0)
screen.ontimer(lambda: events.append('idle-second'), 0)
screen.ontimer(lambda: events.append('positive'), 40)
screen.update()
t = turtle.Turtle()
screen.clear()
t.speed(0)
t.forward(10)
try:
    t.onclick(lambda x,y: None)
except Exception as error:
    binding_error = [type(error).__name__, str(error)]
else:
    binding_error = None
print(json.dumps({'events': events, 'after_clear': list(t.position()), 'binding_error': binding_error}))
screen.bye()
