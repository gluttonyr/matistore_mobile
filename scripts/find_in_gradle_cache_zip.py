import os
import sys
import zipfile

needle = b'LazyKType'
home = os.path.expanduser('~')
root = os.path.join(home, '.gradle', 'caches', 'modules-2', 'files-2.1')
found = []
if not os.path.isdir(root):
    print('Gradle cache not found at', root)
    sys.exit(2)

for dirpath, dirs, files in os.walk(root):
    for fn in files:
        if fn.lower().endswith(('.aar', '.jar', '.zip')):
            path = os.path.join(dirpath, fn)
            try:
                with zipfile.ZipFile(path, 'r') as z:
                    for info in z.infolist():
                        if info.filename.endswith(('.dex', '.class', '.jar')):
                            try:
                                data = z.read(info)
                                if needle in data:
                                    found.append((path, info.filename))
                                    print('FOUND in', path, 'entry', info.filename)
                                    raise StopIteration
                            except Exception:
                                pass
            except StopIteration:
                pass
            except Exception:
                pass

print('TOTAL_FOUND:', len(found))
for p, e in found:
    print(p, '::', e)

if len(found)==0:
    sys.exit(2)
