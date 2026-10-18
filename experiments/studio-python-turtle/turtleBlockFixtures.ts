export const TURTLE_BLOCK_FIXTURES = [
  {
    id: 'turtle_alias_instances',
    execute: false,
    expected: [
      'sz_py_turtle_module_Turtle',
      'sz_py_turtle_module_Screen',
      'sz_py_turtle_turtle_fd',
      'sz_py_turtle_screen_bgcolor',
      'sz_py_turtle_module_done',
    ],
    source:
      'import turtle as desenho\njanela = desenho.Screen()\nartista = desenho.Turtle()\njanela.bgcolor("white")\nartista.fd(40)\nartista.right(90)\ndesenho.done()\n',
  },
  {
    id: 'turtle_from_aliases',
    execute: false,
    expected: [
      'sz_py_turtle_module_Turtle',
      'sz_py_turtle_turtle_forward',
      'sz_py_turtle_module_forward',
    ],
    source:
      'from turtle import Turtle as Artista, forward as andar\nt = Artista()\nt.forward(12)\nandar(20)\n',
  },
  {
    id: 'turtle_callbacks',
    execute: false,
    expected: [
      'sz_py_turtle_module_onkeypress',
      'sz_py_turtle_module_ontimer',
      'sz_py_turtle_module_forward',
    ],
    source:
      'import turtle\ndef andar():\n    turtle.forward(10)\nturtle.onkeypress(andar, "Right")\nturtle.ontimer(andar, t=100)\nturtle.listen()\n',
  },
  {
    id: 'turtle_rebound',
    execute: false,
    expected: [],
    excluded: ['sz_py_turtle_turtle_forward'],
    source: 'import turtle\nt = turtle.Turtle()\nt = OutraClasse()\nt.forward(10)\n',
  },
  {
    id: 'turtle_other_import',
    execute: false,
    expected: [],
    excluded: [
      'sz_py_turtle_module_forward',
      'sz_py_turtle_module_Turtle',
      'sz_py_turtle_turtle_forward',
    ],
    source:
      'import meu_desenho as turtle\nt = turtle.Turtle()\nt.forward(10)\nturtle.forward(20)\n',
  },
  {
    id: 'turtle_modified_method',
    execute: false,
    expected: [],
    excluded: [
      'sz_py_turtle_module_forward',
      'sz_py_turtle_module_Turtle',
      'sz_py_turtle_turtle_forward',
    ],
    source:
      'import turtle\ndef custom(x):\n    return x\nturtle.forward = custom\nturtle.forward(3)\nt = turtle.Turtle()\nt.forward(10)\n',
  },
]
