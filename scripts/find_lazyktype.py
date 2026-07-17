import os
import sys

root = os.path.abspath(os.getcwd())
needle = b'LazyKType'
found = []
for dirpath, dirs, files in os.walk(root):
    for fn in files:
        if fn.lower().endswith(('.aar', '.jar', '.dex')):
            path = os.path.join(dirpath, fn)
            try:
                with open(path, 'rb') as f:
                    data = f.read()
                if needle in data:
                    found.append(path)
            except Exception as e:
                # ignore unreadable files
                pass

print('ROOT:', root)
print('FOUND:', len(found))
for p in found:
    print(p)

# Optionally, print containing package coordinates by looking for nearby pom or maven metadata
for p in found:
    # walk up to find a package.json or build.gradle or pom.xml nearby
    cur = os.path.dirname(p)
    meta = None
    for _ in range(6):
        candidates = ['package.json', 'build.gradle', 'pom.xml', 'ivy.xml']
        for c in candidates:
            cp = os.path.join(cur, c)
            if os.path.exists(cp):
                meta = cp
                break
        if meta:
            break
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        cur = parent
    print('METADATA for', p, '->', meta)

if len(found) == 0:
    sys.exit(2)
