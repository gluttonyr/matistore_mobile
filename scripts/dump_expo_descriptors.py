from __future__ import print_function
p='android/app/build/intermediates/dex/debug/mergeExtDexDebug/classes4.dex'
with open(p,'rb') as f:
    b=f.read()
res=set()
for i in range(len(b)):
    if b[i]==ord('L'):
        j=b.find(b';',i)
        if j!=-1:
            try:
                s=b[i+1:j].decode('utf-8',errors='ignore')
            except Exception:
                continue
            if 'expo' in s.lower():
                res.add(s)
for r in sorted(res):
    print(r)
print('TOTAL',len(res))
