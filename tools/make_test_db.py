"""Make the test database (tests/fixtures/db.json) from a real export, with every client detail replaced.

Usage: python3 tools/make_test_db.py <real-db.json> tests/fixtures/db.json

Studio names, emails, people's names, phone numbers, catalog names, links and notes are replaced by made-up ones,
so the repository never holds client details. Numbers (quotas, rates, images) stay, so the order rules are tested on
realistic data. The admin account (PicGrades' own) is kept.
"""
import json, sys

src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
KEEP_ADMIN = 'adcmediaa@gmail.com'
FIXED_CO = {'35mmcandids': 'Studio Alpha', 'Sandbox Studios': 'Studio Beta', 'OVIGRAPHY': 'Studio Gamma', 'AD Creative Mediaa': 'AD Creative Mediaa'}
FIXED_EMAIL = {'team@35mmcandids.com': 'alpha@example.com', 'mithil@sandboxstudios.in': 'beta@example.com',
               'ovigraphy7@gmail.com': 'gamma@example.com', 'jordanwixspecialist@gmail.com': 'blocked@example.com', KEEP_ADMIN: KEEP_ADMIN}
co, em, people = dict(FIXED_CO), dict(FIXED_EMAIL), {}

def company(n):
    if not n: return n
    if n not in co: co[n] = 'Studio %02d' % (len(co) + 1)
    return co[n]
def email(e):
    if not e: return e
    e = str(e).strip().lower()
    if e not in em: em[e] = 'user%02d@example.com' % (len(em) + 1)
    return em[e]
def person(n):
    if not n: return n
    if n not in people: people[n] = 'Client %02d' % (len(people) + 1)
    return people[n]

def tab(name, fix):
    rows = d.get(name)
    if not rows: return
    head = rows[0]
    for r in rows[1:]:
        for i, h in enumerate(head):
            if i < len(r) and h in fix: r[i] = fix[h](r[i], r, head)

blank = lambda v, r, h: ''
tab('Companies', {'companyName': lambda v, r, h: company(v), 'adminEmail': lambda v, r, h: email(v), 'contactName': lambda v, r, h: person(v), 'phone': blank})
tab('Users', {'email': lambda v, r, h: email(v), 'name': lambda v, r, h: person(v), 'companyName': lambda v, r, h: company(v), 'phone': blank, 'wixMemberId': blank})
n = [0]
def catalog(v, r, h): n[0] += 1; return 'Wedding %03d' % n[0]
tab('Orders', {'companyName': lambda v, r, h: company(v), 'email': lambda v, r, h: email(v), 'fullName': lambda v, r, h: person(v), 'mobile': blank,
               'catalogName': catalog, 'catalogLink': lambda v, r, h: 'https://drive.google.com/drive/folders/test' if v else v,
               'referenceLinks': blank, 'comments': blank, 'lrFilesLink': lambda v, r, h: 'https://drive.google.com/drive/folders/testlr' if v else v})
tab('CreditLog', {'companyName': lambda v, r, h: company(v), 'title': lambda v, r, h: 'Credit'})
tab('Payments', {'companyName': lambda v, r, h: company(v), 'note': blank, 'recordedBy': lambda v, r, h: email(v)})
json.dump(d, open(out, 'w'))
print('test database written:', out, '| studios:', len(co), '| emails:', len(em))
