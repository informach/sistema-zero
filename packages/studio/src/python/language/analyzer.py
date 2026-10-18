"""CPython syntax service. Source is data; no learner imports or code are executed."""
import ast
import base64
import binascii
import io
import json
import re
import tokenize
import types
import typing
import warnings
from array import array


class AnalysisLimitError(ValueError):
    pass


class PythonLanguageService:
    def __init__(self, limits_json):
        self.limits = json.loads(limits_json)
        self.classes = {
            name: value for name, value in vars(ast).items()
            if isinstance(value, type) and issubclass(value, ast.AST)
            and hasattr(value, "_field_types")
        }

    def request(self, request_json):
        if len(request_json.encode("utf-8")) > self.limits["requestBytes"]:
            raise AnalysisLimitError("A solicitação de análise excede o limite.")
        request = json.loads(request_json)
        try:
            if request["operation"] == "parse":
                result = self.parse(request["source"], request["path"], request.get("compilable", False))
            elif request["operation"] == "compile":
                result = self.compile_bytes(request["bytesBase64"], request["path"])
            elif request["operation"] == "structure":
                result = self.compile_bytes(request["bytesBase64"], request["path"], structure=True)
            elif request["operation"] == "render":
                result = self.render(request["node"])
            else:
                raise ValueError("Operação de análise desconhecida.")
        except (ValueError, TypeError, SyntaxError, RecursionError, OverflowError, MemoryError) as error:
            result = {"ok": False, "message": str(error)[:2000]}
        encoded = json.dumps(result, ensure_ascii=True, allow_nan=False, separators=(",", ":"))
        if len(encoded) > self.limits["responseBytes"]:
            return json.dumps({"ok": False, "message": "O resultado da análise excede o limite."})
        return encoded

    def compile_bytes(self, encoded, path, structure=False):
        if not isinstance(path, str) or len(path) > 512:
            raise ValueError("Caminho inválido.")
        if not isinstance(encoded, str) or len(encoded) > ((self.limits["sourceBytes"] + 2) // 3) * 4:
            raise AnalysisLimitError("O arquivo excede o limite de compilação.")
        try:
            source = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error):
            raise ValueError("Bytes Python inválidos.") from None
        if len(source) > self.limits["sourceBytes"]:
            raise AnalysisLimitError("O arquivo excede o limite de compilação.")
        diagnostics = []
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", SyntaxWarning)
                # Use the exact bytes passed to the executor, including BOM and PEP 263.
                # The code object is discarded; learner imports/code are never executed.
                compile(source, path, "exec", dont_inherit=True, optimize=0)
        except (SyntaxError, ValueError) as error:
            diagnostics = [{"kind": "syntax", "message": str(error)[:2000]}]
        result = {"ok": True, "compiledBytes": True, "diagnostics": diagnostics}
        if structure and not diagnostics:
            # This second compile produces an AST from the SAME bytes, after
            # symbol-table validation. Neither pass imports or executes learner code.
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", SyntaxWarning)
                tree = compile(source, path, "exec", flags=ast.PyCF_ONLY_AST,
                               dont_inherit=True, optimize=0)
            result["structure"] = self.structure_facts(tree)
        return result

    def structure_facts(self, tree):
        limits = self.limits.get("structure")
        if not isinstance(limits, dict):
            raise ValueError("Esta distribuição não oferece fatos estruturais Python.")
        assigned, functions, calls = set(), set(), set()
        names_count = 0

        def add(target, value, maximum):
            nonlocal names_count
            if value in target:
                return
            if not isinstance(value, str) or not value or len(value.encode("utf-16-le")) // 2 > maximum:
                raise AnalysisLimitError("Um nome excede o limite estrutural Python.")
            if len(target) >= limits["namesPerCategory"] or names_count >= limits["names"]:
                raise AnalysisLimitError("Há nomes demais na estrutura Python.")
            target.add(value)
            names_count += 1

        def target_name(value):
            parts = []
            while isinstance(value, ast.Attribute):
                parts.append(value.attr)
                if len(parts) > limits["depth"]:
                    raise AnalysisLimitError("Uma chamada excede a profundidade estrutural Python.")
                value = value.value
            if not isinstance(value, ast.Name):
                return None
            parts.append(value.id)
            return ".".join(reversed(parts))

        count, uses_loop, uses_conditional = 0, False, False
        # Iterator stack bounds memory by depth; no recursive visitor or full AST encoding.
        stack = [iter((tree,))]
        while stack:
            try:
                node = next(stack[-1])
            except StopIteration:
                stack.pop()
                continue
            count += 1
            if count > limits["nodes"]:
                raise AnalysisLimitError("Há nós demais na estrutura Python.")
            if isinstance(node, (ast.For, ast.AsyncFor, ast.While, ast.comprehension)):
                uses_loop = True
            if isinstance(node, (ast.If, ast.IfExp, ast.Match)) or (
                isinstance(node, ast.comprehension) and node.ifs
            ):
                uses_conditional = True
            binding = None
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                binding = node.id
            elif isinstance(node, ast.arg):
                binding = node.arg
            elif isinstance(node, (ast.TypeVar, ast.ParamSpec, ast.TypeVarTuple)):
                binding = node.name
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                binding = node.name
                if not isinstance(node, ast.ClassDef):
                    add(functions, node.name, limits["nameChars"])
            elif isinstance(node, (ast.ExceptHandler, ast.MatchAs, ast.MatchStar)):
                binding = node.name
            elif isinstance(node, ast.MatchMapping):
                binding = node.rest
            if binding:
                add(assigned, binding, limits["nameChars"])
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                for alias in node.names:
                    if alias.name != "*":
                        add(assigned, alias.asname or (
                            alias.name.split(".")[0] if isinstance(node, ast.Import) else alias.name
                        ), limits["nameChars"])
            if isinstance(node, ast.Call):
                name = target_name(node.func)
                if name:
                    add(calls, name, limits["callTargetChars"])
            if len(stack) >= limits["depth"]:
                raise AnalysisLimitError("A estrutura Python excede a profundidade permitida.")
            stack.append(ast.iter_child_nodes(node))
        result = {
            "version": 1, "nodesVisited": count,
            "usesLoop": uses_loop, "usesConditional": uses_conditional,
            "assignedNames": sorted(assigned), "definedFunctions": sorted(functions),
            "callTargets": sorted(calls),
        }
        if len(json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode("utf-8")) > limits["evidenceBytes"]:
            raise AnalysisLimitError("A evidência estrutural Python excede o limite.")
        return result

    def parse(self, source, path, compilable=False):
        if not isinstance(compilable, bool):
            raise ValueError("Modo de validação inválido.")
        if not isinstance(source, str) or len(source.encode("utf-8")) > self.limits["sourceBytes"]:
            raise AnalysisLimitError("O arquivo excede o limite de análise visual.")
        if not isinstance(path, str) or len(path) > 512:
            raise ValueError("Caminho inválido.")
        # Do not normalize the source: CRLF, comments and all opaque syntax survive.
        lines = re.findall(r"[^\r\n]*(?:\r\n|\r|\n|$)", source)
        if not lines:
            lines = [""]
        offsets = [0]
        for line in lines:
            offsets.append(offsets[-1] + len(line.encode("utf-16-le")) // 2)
        utf16_source = source.encode("utf-16-le")
        column_maps = {}

        def columns(line):
            if line not in column_maps:
                codepoints = array('I', [0])
                utf8 = array('I', [0])
                units = 0
                for character in lines[line - 1]:
                    code = ord(character)
                    width = 1 if code <= 0x7f else 2 if code <= 0x7ff else 3 if code <= 0xffff else 4
                    units += 1 if code <= 0xffff else 2
                    codepoints.append(units)
                    for _ in range(width - 1):
                        utf8.append(0xffffffff)  # Not a valid UTF-8 boundary.
                    utf8.append(units)
                column_maps[line] = (codepoints, utf8)
            return column_maps[line]

        def position(line, column, byte_column=False):
            if line < 1:
                return 0
            if line > len(lines):
                return offsets[-1]
            text = lines[line - 1]
            # tokenize and SyntaxError use the universal-newline view. A column
            # after its single LF must advance over both original CRLF units.
            if not byte_column and text.endswith("\r\n") and column > len(text) - 2:
                column += 1
            codepoints, utf8 = columns(line)
            mapping = utf8 if byte_column else codepoints
            result = mapping[min(column, len(mapping) - 1)]
            if result == 0xffffffff:
                raise ValueError("O parser devolveu uma posição UTF-8 inválida.")
            return offsets[line - 1] + result

        def span(start_line, start_column, end_line, end_column, byte_column=False):
            start = position(start_line, start_column, byte_column)
            return {"start": start, "end": max(start, position(end_line, end_column, byte_column))}

        tokens = []
        try:
            normalized = source.replace("\r\n", "\n").replace("\r", "\n")
            for token in tokenize.generate_tokens(io.StringIO(normalized).readline):
                if len(tokens) >= self.limits["tokens"]:
                    raise AnalysisLimitError("O arquivo excede o limite de tokens.")
                token_range = span(*token.start, *token.end)
                token_text = utf16_source[token_range["start"] * 2:token_range["end"] * 2].decode("utf-16-le")
                tokens.append({"kind": tokenize.tok_name[token.type],
                               "text": token_text, "range": token_range})
        except (tokenize.TokenError, IndentationError, SyntaxError):
            # ast.parse below supplies the canonical syntax diagnostic. Partial
            # tokens are useful for highlighting but never replace a valid tree.
            pass
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", SyntaxWarning)
                tree = ast.parse(source, filename=path, type_comments=True, optimize=0)
                if compilable:
                    # Compilation checks symbol tables (duplicate parameters/global/nonlocal).
                    # The code object is discarded. No imports, annotations or learner code run.
                    compile(tree, path, "exec", dont_inherit=True, optimize=0)
        except (SyntaxError, ValueError) as error:
            line = getattr(error, "lineno", None) or 1
            column = max(0, (getattr(error, "offset", None) or 1) - 1)
            end_line = getattr(error, "end_lineno", None) or line
            end_column = max(column, (getattr(error, "end_offset", None) or column + 1) - 1)
            return {"ok": True, "tree": None, "tokens": tokens, "diagnostics": [{
                "kind": "syntax", "message": getattr(error, "msg", str(error))[:2000],
                "range": span(line, column, end_line, end_column),
            }]}

        count = 0

        def encode(value, depth=0):
            nonlocal count
            if depth > self.limits["depth"]:
                raise AnalysisLimitError("A estrutura Python excede a profundidade visual.")
            if isinstance(value, ast.AST):
                count += 1
                if count > self.limits["nodes"]:
                    raise AnalysisLimitError("O arquivo excede o limite de nós visuais.")
                node = {"kind": type(value).__name__, "id": str(count), "fields": {}}
                if getattr(value, "end_lineno", None) is not None:
                    node["range"] = span(value.lineno, value.col_offset,
                                         value.end_lineno, value.end_col_offset, True)
                node["fields"] = {key: encode(item, depth + 1) for key, item in ast.iter_fields(value)}
                return node
            if isinstance(value, list):
                return [encode(item, depth + 1) for item in value]
            if value is Ellipsis:
                return {"literal": "ellipsis", "value": ""}
            if isinstance(value, bytes):
                return {"literal": "bytes", "value": value.hex()}
            if isinstance(value, bool) or value is None or isinstance(value, str):
                return value
            if isinstance(value, int):
                return {"literal": "int", "value": str(value)}
            if isinstance(value, float):
                return {"literal": "float", "value": value.hex()}
            if isinstance(value, complex):
                return {"literal": "complex", "value": [value.real.hex(), value.imag.hex()]}
            raise TypeError("Valor AST não suportado.")

        result = {"ok": True, "tree": encode(tree), "tokens": tokens, "diagnostics": []}
        if compilable:
            result["compilable"] = True
        return result

    def render(self, encoded_node):
        count = 0

        def matches(value, expected):
            origin = typing.get_origin(expected)
            if origin in (types.UnionType, typing.Union):
                return any(matches(value, item) for item in typing.get_args(expected))
            if origin is list:
                return isinstance(value, list) and all(matches(item, typing.get_args(expected)[0]) for item in value)
            if expected is int:
                return type(value) is int
            return isinstance(value, expected)

        def decode(value, depth=0):
            nonlocal count
            if depth > self.limits["depth"]:
                raise AnalysisLimitError("A estrutura Python excede a profundidade visual.")
            if isinstance(value, list):
                if len(value) > self.limits["nodes"]:
                    raise AnalysisLimitError("Há itens demais na estrutura Python.")
                return [decode(item, depth + 1) for item in value]
            if isinstance(value, dict):
                if "literal" in value:
                    tag, raw = value["literal"], value["value"]
                    if tag == "int" and isinstance(raw, str):
                        return int(raw)
                    if tag == "float" and isinstance(raw, str):
                        return float.fromhex(raw)
                    if tag == "complex" and isinstance(raw, list) and len(raw) == 2:
                        return complex(float.fromhex(raw[0]), float.fromhex(raw[1]))
                    if tag == "bytes" and isinstance(raw, str):
                        return bytes.fromhex(raw)
                    if tag == "ellipsis" and raw == "":
                        return Ellipsis
                    raise ValueError("Literal Python inválido.")
                count += 1
                if count > self.limits["nodes"]:
                    raise AnalysisLimitError("Há nós demais na estrutura Python.")
                cls = self.classes.get(value.get("kind"))
                fields = value.get("fields")
                if cls is None or not isinstance(fields, dict) or set(fields) != set(cls._fields):
                    raise ValueError("Nó Python inválido.")
                decoded = {key: decode(item, depth + 1) for key, item in fields.items()}
                for key, item in decoded.items():
                    if not matches(item, cls._field_types[key]):
                        raise ValueError("Campo Python inválido: " + key)
                return cls(**decoded)
            if value is None or isinstance(value, (str, bool)):
                return value
            raise ValueError("Valor Python inválido.")

        tree = decode(encoded_node)
        if not isinstance(tree, (ast.mod, ast.stmt, ast.expr)):
            raise ValueError("A geração precisa de módulo, comando ou expressão.")
        source = ast.unparse(ast.fix_missing_locations(tree))
        if len(source.encode("utf-8")) > self.limits["sourceBytes"]:
            raise AnalysisLimitError("A fonte gerada excede o limite.")
        # Rendering malformed identifiers must not inject extra statements. Compare
        # normalized syntax after parsing; this never evaluates or imports it.
        mode = "eval" if isinstance(tree, ast.expr) else "exec"
        reparsed = ast.parse(source, mode=mode, type_comments=True, optimize=0)
        original = tree
        if isinstance(tree, ast.expr):
            original = ast.Expression(body=tree)
        elif isinstance(tree, ast.stmt):
            original = ast.Module(body=[tree], type_ignores=[])
        if ast.dump(original, include_attributes=False) != ast.dump(reparsed, include_attributes=False):
            raise ValueError("A estrutura não pode ser gerada sem alterar seu significado.")
        return {"ok": True, "source": source}


PythonLanguageService
