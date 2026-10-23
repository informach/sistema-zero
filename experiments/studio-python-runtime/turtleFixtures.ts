import { TURTLE_EXTENSION } from '../../packages/studio/src/runtime/python/turtle/contract'

export const turtleFixtures: Record<string, string> = {
  turtleCapture: `import turtle
s = turtle.Screen()
s.setup(1024, 768)
s.tracer(0)
s.update()
print('capture-ready')
s.mainloop()
`,
  turtleImageInput: `import turtle, time
s = turtle.Screen()
s.setup(400,300)
s.onkeypress(lambda: print('image-key'), 'Right')
s.listen()
s.update()
print('image-input-ready')
time.sleep(1)
try:
    s.register_shape('corrupt.png')
except Exception as error:
    print('caught', type(error).__name__)
s.update()
print('continued')
`,
  turtleInvalidImage: `import turtle
s = turtle.Screen()
s.setup(400,300)
try:
    s.register_shape('corrupt.png')
except Exception as error:
    print('caught', type(error).__name__)
else:
    raise AssertionError('corrupt image accepted')
s.register_shape('pixel.gif')
t = turtle.Turtle('pixel.gif')
s.update()
print('continued')
`,
  turtleOverlap: `import turtle
s = turtle.Screen()
s.setup(400, 300)
s.tracer(0)
bottom = turtle.Turtle('square')
bottom.shapesize(3)
bottom.onclick(lambda x,y: print('bottom'))
top = turtle.Turtle('square')
top.shapesize(3)
top.color('blue')
def uncover():
    top.hideturtle()
    s.update()
def outline():
    top.fillcolor('')
    top.showturtle()
    top.onclick(lambda x,y: print('outline'))
    s.update()
s.onkeypress(uncover, 'u')
s.onkeypress(outline, 'o')
s.onclick(lambda x,y: print('screen'))
s.listen()
s.update()
print('overlap-ready')
s.mainloop()
`,
  turtleText: `import turtle
s = turtle.Screen()
s.setup(400, 300)
s.tracer(0)
t = turtle.Turtle()
t.hideturtle()
t.penup()
t.write('AAAA\\nB', move=True, align='right', font=('Arial', 12, 'normal'))
print('text-right', round(t.xcor()))
s.update()
`,
  turtleIdle: `import turtle
s = turtle.Screen()
s.setup(400, 300)
s.tracer(0)
t = turtle.Turtle()
t.hideturtle()
def key():
    print('idle-key')
    s.ontimer(lambda: (print('idle-timer'), s.bye()), 80)
s.onkeypress(key, 'Right')
s.listen()
s.update()
print('idle-ready')
s.mainloop()
print('idle-done')
`,
  turtleReopen: `import turtle
s = turtle.Screen()
s.setup(400, 300)
s.bye()
s = turtle.Screen()
s.setup(400, 300)
s.bgcolor('red')
s.update()
print('reopened')
`,
  turtleDrawing: `import turtle
s = turtle.Screen()
s.setup(400, 300)
s.bgcolor('dodger blue')
s.tracer(0)
t = turtle.Turtle()
t.hideturtle()
t.speed(0)
t.pencolor('red')
t.pensize(6)
t.forward(100)
t.left(90)
t.forward(80)
s.update()
print('drawing-ready', t.position(), t.heading())
`,
  turtleDot: `import turtle
s = turtle.Screen()
s.setup(400, 300)
s.bgcolor('white')
s.tracer(0)
t = turtle.Turtle()
t.hideturtle()
t.penup()
t.goto(-100, 0)
t.dot(40, 'red')
t.goto(100, 0)
t.pensize(30)
t.pencolor('blue')
t.dot()
s.update()
print('dot-ready')
`,
  turtleEvents: `import turtle
s = turtle.Screen()
s.setup(400, 300)
s.tracer(0)
t = turtle.Turtle()
t.shape('square')
t.shapesize(3, 3)
t.color('red')
t.penup()
def key():
    t.forward(10)
    s.update()
    print('key', t.xcor())
def click(x,y):
    print('turtle-click', round(x), round(y))
t.onclick(click)
s.onclick(lambda x,y: print('screen-click', round(x), round(y)))
s.onkeypress(key, 'Right')
s.listen()
s.update()
print('events-ready')
s.mainloop()
`,
  turtleImage: `import turtle
s = turtle.Screen()
s.setup(400, 300)
s.tracer(0)
s.bgcolor('blue')
s.register_shape('pixel.gif')
t = turtle.Turtle('pixel.gif')
t.penup()
t.goto(20,30)
t.right(90)
s.update()
print('image-ready', t.position(), t.heading())
`,
  turtleNamespace: `import turtle
print(turtle.AUTHOR)
`,
}
export { TURTLE_EXTENSION }
