"""Actual Tk text layout reference; no screenshot/font equality is inferred."""
import json
import tkinter as tk
import tkinter.font

root = tk.Tk()
root.withdraw()
canvas = tk.Canvas(root)
font = tk.font.Font(root=root, family='Arial', size=12)
records = []
for text in ['A', 'A\nB', 'AAAA\nB', 'A\n', '', 'A\tB']:
    for anchor in ['sw', 's', 'se']:
        item = canvas.create_text(-1, 0, text=text, anchor=anchor, font=font)
        records.append({'text': text, 'anchor': anchor, 'bbox': canvas.bbox(item),
                        'measure': font.measure(text), 'metrics': font.metrics()})
print(json.dumps(records, indent=2))
root.destroy()
