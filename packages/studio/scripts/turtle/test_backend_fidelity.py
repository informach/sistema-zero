"""The browser Turtle backend reads what Tk reads (fonts, ontimer(f, 0)), no Tk needed."""

import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest


ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / "src/runtime/python/turtle"
package = types.ModuleType("_sz_turtle_runtime")
package.__path__ = [str(DIRECTORY)]
sys.modules[package.__name__] = package
from _sz_turtle_runtime import _sz_turtle_backend as backend

requests = []


def transport(raw):
    request = json.loads(raw)
    requests.append(request)
    query = request.get("query") or {}
    if query.get("type") == "viewport":
        return json.dumps({"events": [], "value": [800, 600]})
    if query.get("type") == "text-bounds":
        return json.dumps({"events": [], "value": {"right": 100}})
    return json.dumps({"events": [], "value": None})


backend.configure(transport, ROOT)


def fresh_turtle():
    spec = importlib.util.spec_from_file_location("_fidelity_turtle", DIRECTORY / "turtle.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def text_fonts():
    return [
        operation["font"]
        for request in requests
        for operation in request.get("operations", [])
        if operation.get("kind") == "text"
    ]


class Fonts(unittest.TestCase):
    def setUp(self):
        global turtle
        turtle = fresh_turtle()
        requests.clear()
        self.screen = turtle.Screen()
        self.screen.tracer(0)

    def tearDown(self):
        if not self.screen._closed:
            self.screen.bye()

    def test_every_font_tk_accepts_reaches_the_browser_as_family_size_and_style(self):
        pen = turtle.Turtle()
        for font in [
            ("Arial", 24),
            ("Arial",),
            "Arial 24 bold",
            "{Comic Sans MS} 20",
            ("Arial", "24", "bold"),
            ("Arial", 24, "bold", "italic"),
            ("Arial", 0, "normal"),
        ]:
            pen.write("oi", font=font)
        self.assertEqual(
            text_fonts(),
            [
                ["Arial", 24, "normal"],
                ["Arial", 8, "normal"],
                ["Arial", 24, "bold"],
                ["Comic Sans MS", 20, "normal"],
                ["Arial", 24, "bold"],
                ["Arial", 24, "bold italic"],
                ["Arial", 8, "normal"],
            ],
        )

    def test_a_fractional_size_is_refused_as_on_the_desktop(self):
        with self.assertRaises(ValueError):
            turtle.Turtle().write("oi", font=("Arial", 12.5))


class IdleTimers(unittest.TestCase):
    def test_a_timer_of_zero_that_schedules_itself_still_redraws_in_mainloop(self):
        global turtle
        turtle = fresh_turtle()
        requests.clear()
        screen = turtle.Screen()
        # Only mainloop's present sends the drawing: each forward alone sends nothing.
        screen.tracer(0)
        pen = turtle.Turtle()
        calls = []

        def step():
            calls.append(len(requests))
            pen.forward(1)
            if len(calls) == 20:
                screen.bye()
            else:
                screen.ontimer(step, 0)

        screen.ontimer(step, 0)
        screen.mainloop()
        # A request goes to the browser between one call and the next.
        self.assertEqual(len(calls), 20)
        self.assertTrue(all(after > before for before, after in zip(calls, calls[1:])))


class ModuleFunctions(unittest.TestCase):
    """What the desktop module offers at the top level is there too (turtle.screensize...)."""

    def setUp(self):
        global turtle
        turtle = fresh_turtle()
        requests.clear()

    def tearDown(self):
        screen = turtle.Turtle._screen
        if screen is not None and not screen._closed:
            screen.bye()

    def test_the_desktop_names_exist_at_module_level(self):
        for name in ['screensize', 'mode', 'textinput', 'numinput', 'no_animation', 'teleport',
                     'tilt', 'tiltangle', 'shapetransform', 'shearfactor', 'begin_poly',
                     'end_poly', 'get_poly', 'getturtle', 'resizemode', 'degrees', 'radians']:
            self.assertTrue(callable(getattr(turtle, name, None)), name)
        for name in ['Pen', 'RawTurtle', 'RawPen', 'TurtleScreen']:
            self.assertIn(name, turtle.__all__)

    def test_tilt_turns_the_shape_without_turning_the_heading(self):
        pen = turtle.Turtle()
        pen.screen.tracer(0)
        pen.shape('arrow')
        pen.tilt(90)
        self.assertEqual(pen.heading(), 0)
        self.assertAlmostEqual(pen.tiltangle(), 90)
        pen.tiltangle(30)
        self.assertAlmostEqual(pen.tiltangle(), 30)
        pen.shapetransform(2, 0, 0, 2)
        self.assertEqual(pen.shapetransform(), (2.0, 0.0, 0.0, 2.0))
        pen.shearfactor(0.5)
        self.assertAlmostEqual(pen.shearfactor(), 0.5)

    def test_module_level_functions_drive_the_default_turtle(self):
        turtle.tracer(0)
        turtle.screensize(600, 400)
        self.assertEqual(turtle.screensize(), (600, 400))
        turtle.teleport(10, 20)
        self.assertEqual(turtle.position(), (10, 20))
        with turtle.no_animation():
            turtle.forward(5)
        self.assertEqual(turtle.position(), (15, 20))
        turtle.begin_poly()
        turtle.forward(10)
        turtle.end_poly()
        self.assertEqual(len(turtle.get_poly()), 2)
        with self.assertRaises(NotImplementedError):
            turtle.textinput('Nome', 'Qual é o seu nome?')


if __name__ == "__main__":
    unittest.main()
