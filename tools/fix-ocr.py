#!/usr/bin/env python3
"""Fix systematic OCR artifacts in the 1934 Bible text. Dry-run by default; --apply to write."""
import json, re, glob, sys

DRY = '--apply' not in sys.argv

def load(p):
    return json.load(open(p, encoding='utf-8'))

fixes = []  # (description, pattern, replacement_fn) — ORDER MATTERS

# 0. all-caps inscriptions first (before vowel+ù mangles them)
fixes.append(('inscription act17:23', re.compile(r'THù CHúA KHÔNG BIôT'),
              lambda m: 'THỜ CHÚA KHÔNG BIẾT'))
fixes.append(('inscription joh19:19', re.compile(r'JÊSUS NGƯùI NA-XA-RẵT'),
              lambda m: 'JÊSUS NGƯỜI NA-XA-RÉT'))
# stray space inside Abraham (before vowel+ù)
fixes.append(('Aùp-ra- ham -> Áp-ra-ham', re.compile(r'Aùp-ra- ham'),
              lambda m: 'Áp-ra-ham'))

# 1. vowel + ù (U+00F9) -> accented vowel (OCR split Á into A+ù etc.)
ACC = {'A': 'Á', 'E': 'É', 'O': 'Ó', 'U': 'Ú', 'I': 'Í', 'Y': 'Ý'}
fixes.append(('vowel+ù -> Á/É/Ó/Ú/Í/Ý', re.compile(r'([AEOIUY])ù'),
              lambda m: ACC[m.group(1)]))
fixes.append(('Ưù -> Ờ', re.compile(r'Ưù'), lambda m: 'Ờ'))

# 2. ỳ misread as " (U+201D)
fixes.append(('k" -> kỳ', re.compile(r'k\u201d(?![A-Za-zÀ-ỹ])'), lambda m: 'kỳ'))
fixes.append(('K" -> Kỳ', re.compile(r'K\u201d(?![A-Za-zÀ-ỹ])'), lambda m: 'Kỳ'))
fixes.append(('hu"nh -> huỳnh', re.compile(r'hu\u201dnh'), lambda m: 'huỳnh'))

# 3. standalone ỳ/Ỳ -> ở/Ở (OCR misread Ở as Ỳ); capitalize at verse start
def fix_y_grave(m):
    return 'Ở' if m.start() == 0 else 'ở'
fixes.append(('ỳ/Ỳ -> ở/Ở', re.compile(r'(?<![A-Za-zÀ-ỹ])[ỳỲ](?![A-Za-zÀ-ỹ])'), fix_y_grave))

# 4. ỗ at word start -> Í/í (OCR misread Í as ỗ)
def fix_o_tilde(m):
    word = m.group(0)
    if word.startswith('ỗch'):
        return 'Í' + word[1:]  # proper noun Ích-ma-ên
    prev = m.string[max(0, m.start()-2):m.start()]
    sentence_start = (m.start() == 0) or prev.endswith(('. ', '? ', '! ', ': ', '."', '("'))
    return ('Í' if sentence_start else 'í') + word[1:]
fixes.append(('ỗ -> Í/í', re.compile(r'\bỗ\w*'), fix_o_tilde))

# 5. misc
fixes.append(('giữu -> giữa', re.compile(r'giữu'), lambda m: 'giữa'))

# 6. punctuation
fixes.append((',; -> ;', re.compile(r',;'), lambda m: ';'))
fixes.append((' ,! -> !', re.compile(r',!'), lambda m: '!'))
fixes.append(('...,, -> ,', re.compile(r'\.\.\.,'), lambda m: ','))
fixes.append(('4+ dots -> ...', re.compile(r'\.{4,}'), lambda m: '...'))
fixes.append(('?. at end -> ?', re.compile(r'\?\.$'), lambda m: '?'))

# 7. truncated verse
fixes.append(('mar16:20 v????', re.compile(r'v\?{4,}$'), lambda m: 'vững đạo.'))

report = {d: 0 for d, _, _ in fixes}
changed_files = set()
examples = {}

for f in sorted(glob.glob('data/bible/*.json')):
    d = load(f)
    dirty = False
    for ch in d['ch']:
        for vi, v in enumerate(ch):
            nv = v
            for desc, pat, fn in fixes:
                nv2, n = pat.subn(fn, nv)
                if n:
                    report[desc] += n
                    if desc not in examples:
                        examples[desc] = (v[:70], nv2[:70])
                    nv = nv2
            if nv != v:
                ch[vi] = nv
                dirty = True
    if dirty:
        changed_files.add(f.split('/')[-1])
        if not DRY:
            json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

print('DRY RUN' if DRY else 'APPLIED')
for desc, c in report.items():
    print(f'  {c:5d}  {desc}')
print(f'{len(changed_files)} files changed')
if DRY:
    print('\nExamples:')
    for desc, (o, n) in examples.items():
        print(f'  [{desc}]\n    - {o}\n    + {n}')
