import json

print("ready-for-input", flush=True)
name = input()
count = int(input())
print(json.dumps({"name": name, "count": count}, ensure_ascii=False))
