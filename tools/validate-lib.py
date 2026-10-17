#!/usr/bin/env python3
"""Validate library content JSON files: verse keys exist, refs match books.json, format correct."""
import json, sys, os

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
books = json.load(open(f'{APP}/data/books.json', encoding='utf-8'))
bmap = {b['id']: b for b in books}
errors = []

def check_key(key, where):
    try:
        bid, c, v = key.split(':')
        c, v = int(c), int(v)
    except Exception:
        errors.append(f'{where}: bad key format {key!r}'); return
    b = bmap.get(bid)
    if not b:
        errors.append(f'{where}: unknown book {bid!r}'); return
    if not (1 <= c <= len(b['nc'])):
        errors.append(f'{where}: chapter {c} out of range for {bid}'); return
    bd = json.load(open(f'{APP}/data/bible/{bid}.json', encoding='utf-8'))
    nc_v = len(bd['ch'][c-1])
    if not (1 <= v <= nc_v):
        errors.append(f'{where}: verse {v} out of range for {bid} {c} (max {nc_v})')

def check_verse_obj(vo, where):
    if not isinstance(vo, dict) or 'key' not in vo:
        errors.append(f'{where}: verse obj missing key'); return
    check_key(vo['key'], where)

def topics_like(data, name):
    assert isinstance(data, list), f'{name}: not a list'
    for t in data:
        assert 'id' in t and 'title' in t, f'{name}: missing id/title'
        for vo in t.get('verses', []):
            check_verse_obj(vo, f'{name}/{t["id"]}')

def load(name):
    return json.load(open(f'{APP}/data/{name}', encoding='utf-8'))

def main():
    which = sys.argv[1:]
    for name in which:
        try:
            d = load(name)
        except Exception as e:
            errors.append(f'{name}: load failed: {e}'); continue
        if name in ('prayers.json', 'parables.json', 'names.json'):
            topics_like(d, name)
        elif name == 'nhanvat.json':
            assert isinstance(d, list)
            for p in d:
                assert 'id' in p and 'name' in p and 'bio' in p, f'nhanvat: missing fields {p.get("id")}'
                for vo in p.get('verses', []):
                    check_verse_obj(vo, f'nhanvat/{p["id"]}')
        elif name == 'prophecies.json':
            assert isinstance(d, list)
            for it in d:
                assert 'ot' in it and 'nt' in it, f'prophecies: missing ot/nt {it.get("id")}'
                check_key(it['ot']['key'], f'prophecies/{it["id"]}/ot')
                check_key(it['nt']['key'], f'prophecies/{it["id"]}/nt')
        elif name == 'giaoly.json':
            assert isinstance(d, list) and len(d) == 107, f'giaoly: expected 107, got {len(d) if isinstance(d, list) else "?"}'
            for it in d:
                assert 'n' in it and 'q' in it and 'a' in it, f'giaoly: missing fields n={it.get("n")}'
                for r in it.get('refs', []):
                    check_key(r['key'], f'giaoly/q{it["n"]}')
        elif name == 'glossary.json':
            assert isinstance(d, list) and len(d) >= 190, f'glossary: expected ~200, got {len(d) if isinstance(d, list) else "?"}'
            for t in d:
                assert 'term' in t and 'def' in t, 'glossary: missing term/def'
                for r in t.get('verses', []):
                    check_key(r['key'], f'glossary/{t["term"]}')
        elif name == 'creeds.json':
            assert isinstance(d, list)
            for c in d:
                assert 'id' in c and 'title' in c and 'articles' in c, 'creeds: missing fields'
        elif name == 'notes3.json':
            assert isinstance(d, dict)
            for k, n in d.items():
                assert all(f in n for f in ('context', 'exegesis', 'application', 'prayer', 'source')), f'notes3: missing fields {k}'
        print(f'{name}: checked')
    if errors:
        print(f'\n{len(errors)} ERRORS:')
        for e in errors[:60]:
            print(' -', e)
        sys.exit(1)
    print('\nALL VALID ✓')

if __name__ == '__main__':
    main()
