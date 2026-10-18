export const PYTHON_BLOCK_FIXTURES = [
  {
    id: 'shadow_global',
    execute: true,
    source:
      'def custom(value):\n    return 999\ndef replace():\n    global print\n    print = custom\nreplace()\nresult = print(2)\n',
  },
  {
    id: 'shadow_nonlocal',
    execute: true,
    source:
      'class Custom:\n    def sqrt(self, value):\n        return 999\ndef outer():\n    import math\n    def replace():\n        nonlocal math\n        math = Custom()\n    replace()\n    return math.sqrt(4)\nprint(outer())\n',
  },
  {
    id: 'arithmetic',
    execute: true,
    source:
      'a = 9\nb = 2\na += b\nprint(a, 9/2, 9//2, 9%2, 2**4, abs(-2), round(2.5), min(1, 2), max(1, 2))\nprint(1 < a <= 20, a != b, a is not None, a > 0 and b or 0)\n',
  },
  {
    id: 'floats',
    execute: true,
    source:
      'print(0.0, 5e-324, 2.2250738585072014e-308, 1.7976931348623157e308, 0.1, 2.5, 1e-200, -0.0, 90071992547409931234567890)\n',
  },
  {
    id: 'collections',
    execute: true,
    source:
      'lista = [1, 2]\nlista.append(3)\nlista[0] = 5\nlista.remove(2)\nlista.pop()\ndel lista[0]\ntupla = (4, 5)\ndados = {"a": 1, "b": 2}\ndados["c"] = 3\ndel dados["b"]\nconjunto = {1, 2}\nconjunto.add(3)\nconjunto.remove(1)\nvazio = set()\nprint(lista, tupla[0], len(dados), 2 in conjunto, 4 not in conjunto, len(vazio))\nfor k, v in dados.items():\n    print(k, v)\n',
  },
  {
    id: 'text',
    execute: true,
    source:
      'nome = "ação 🐢"\nprint(f"Olá, {nome}! {2+3}")\nprint(nome.upper(), nome.lower(), " a ".strip(), "a,b".split(","), "-".join(["a", "b"]), nome.replace("ação", "turma"), str(3) + "!")\n',
  },
  {
    id: 'loops',
    execute: true,
    source:
      'for i in range(4):\n    if i == 0:\n        continue\n    elif i == 3:\n        break\n    else:\n        print(i)\nelse:\n    print("não chega")\nx = 0\nwhile x < 2:\n    x += 1\nelse:\n    print(x)\n',
  },
  {
    id: 'functions',
    execute: true,
    source:
      'def soma(a, b=2):\n    return a + b\ndef vazio():\n    return\nprint(soma(3), soma(b=4, a=1), vazio())\n',
  },
  {
    id: 'classes',
    execute: true,
    source:
      'class Placar:\n    def __init__(self, pontos=0):\n        self.pontos = pontos\n    def somar(self, valor):\n        self.pontos += valor\n        return self.pontos\np = Placar(pontos=2)\nprint(p.somar(3), p.pontos)\n',
  },
  {
    id: 'errors',
    execute: true,
    source:
      'try:\n    raise ValueError("opa")\nexcept ValueError as erro:\n    print(str(erro))\nelse:\n    print("não chega")\nfinally:\n    print("fim")\ntry:\n    pass\nfinally:\n    print("sempre")\n',
  },
  {
    id: 'imports',
    execute: true,
    source:
      'import math\nimport random\nfrom math import sqrt as raiz\nprint(math.sqrt(9), math.floor(2.5), math.ceil(2.5), math.pi, raiz(16), random.randint(1, 1), random.choice([2]))\n',
  },
  {
    id: 'shadowed',
    execute: true,
    source:
      'def print(valor):\n    return valor + 1\nx = print(2)\nimport math as matematica\nmath = 3\nx = matematica.sqrt(4)\n',
  },
  {
    id: 'opaque',
    execute: true,
    source:
      'valores = [x*x for x in range(3)]\na = b = 2\nmatch a:\n    case 2:\n        print(valores)\n    case _:\n        pass\n',
  },
  {
    id: 'comment_unicode',
    execute: true,
    source:
      '# inteiro\r\nnome = "🐢 ação" # comentário\r\nif True:\r\n    # dentro\r\n    print(nome)\r\n',
  },
  {
    id: 'input',
    execute: false,
    source: 'idade = int(input("Idade? "))\nprint(idade, sep=",", end="!")\n',
  },
  {
    id: 'starred',
    execute: true,
    source:
      'first, *rest = [1, 2, 3]\nprint(first, rest)\nfor first, *rest in [[4, 5, 6]]:\n    print(first, rest)\n',
  },
  {
    id: 'shadow_match',
    execute: true,
    source:
      'def custom(value):\n    return value\nmatch custom:\n    case print:\n        pass\nx = print(3)\n',
  },
  {
    id: 'shadow_walrus',
    execute: true,
    source:
      'def custom(value):\n    return value\nvalues = [(print := custom) for _ in range(1)]\nx = print(3)\n',
  },
  {
    id: 'shadow_methods',
    execute: true,
    source:
      'class Box:\n    def append(self, value):\n        return value + 1\n    def upper(self):\n        return 42\nb = Box()\nprint(b.append(2), b.upper())\n',
  },
  {
    id: 'shadow_module',
    execute: false,
    source:
      'import math\ndef custom(value):\n    return 999\nmath.sqrt = custom\nx = math.sqrt(4)\n',
  },
  {
    id: 'shadow_nested_class',
    execute: true,
    source:
      'class Custom:\n    def sqrt(self, value):\n        return 999\nmath = Custom()\nclass Outer:\n    import math\n    class Inner:\n        x = math.sqrt(4)\n        def f(self):\n            return math.sqrt(9)\nprint(Outer.Inner.x, Outer.Inner().f())\n',
  },
]
