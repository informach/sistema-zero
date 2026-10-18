/** Shared QA F1: 2 turtles, 200 movement calls; setup is not counted as movement. */
export function turtleF1Source(color: 'red' | 'black') {
  return `import turtle
screen = turtle.Screen()
screen.setup(400, 300)
screen.bgcolor('white')
screen.tracer(0)
first = turtle.Turtle()
first.hideturtle()
first.pensize(6)
first.pencolor('${color}')
second = turtle.Turtle()
second.hideturtle()
second.pensize(6)
second.pencolor('blue')
second.penup()
second.goto(0, -40)
second.pendown()
for _ in range(100):
    first.forward(0.6)
    second.forward(0.6)
screen.update()
print('f1-ready', round(first.xcor(), 6), round(second.xcor(), 6))
screen.mainloop()
`
}
