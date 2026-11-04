"""Build the clean PicGrades OS database workbook from a Wix export.
Re-runnable: python3 build_db.py <raw_export_dir> <output.xlsx>
Raw dir holds the JSON files exported from Wix (CompanyQuota, Orders, Packages,
Members_FullData). Run again after any Wix data correction and re-import."""
import json, math, sys, datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE

RAW, OUT = sys.argv[1].rstrip('/') + '/', sys.argv[2]
def L(n): return json.load(open(RAW + n + '.json'))
def clean(v):
    if isinstance(v, str): return ILLEGAL_CHARACTERS_RE.sub(' ', v).strip()
    return v
def wixdate(v):
    return v['$date'][:19].replace('T', ' ') if isinstance(v, dict) and '$date' in v else ''
def dmy_to_iso(s):
    try: return datetime.datetime.strptime((s or '').strip(), '%d/%m/%Y %H:%M:%S').strftime('%Y-%m-%d %H:%M:%S')
    except ValueError: return ''

MULT = {96: 1, 72: 1.25, 48: 1.5, 24: 2}
SETTINGS = [
    ('speedMultiplier.96', 1, 'Quota used per image at 96 hours'),
    ('speedMultiplier.72', 1.25, 'Quota used per image at 72 hours'),
    ('speedMultiplier.48', 1.5, 'Quota used per image at 48 hours'),
    ('speedMultiplier.24', 2, 'Quota used per image at 24 hours'),
    ('cullingExtraDays', 3, 'Extra delivery days for Culling + Color Correction'),
    ('cullingOnlyHours', 72, 'Culling-only orders are always this many hours'),
    ('busyShiftImages', 2000, 'If open orders reach this many images, new order starts after latest + busyShiftDays'),
    ('busyShiftDays', 2, 'Days added after the latest open order when busy'),
    ('lowQuotaWarning', 250, 'Show low-balance warning at or below this many images'),
    ('sampleQuota', 150, 'Free images for a new SAMPLE company'),
    ('creditBonusMinImages', 1500, 'Order size that earns bonus credits (CUSTOM + credits enabled)'),
    ('creditBonusPoints', 100, 'Bonus credits earned per qualifying order'),
    ('deleteWindowHours', 24, 'Client can delete an order within this many hours, before LR files'),
    ('adminNotifyEmail', 'adcmediaa@gmail.com', 'New-order emails go here'),
    ('emailFromName', 'PicGrades Alerts', 'Sender name on emails'),
    ('otpMinutes', 10, 'Login code is valid for this many minutes'),
    ('sessionDays', 30, 'Client stays logged in this many days'),
]

cq = L('CompanyQuota'); orders = L('Orders'); pk = L('Packages'); fd = L('Members_FullData')
byEmail = {m.get('loginEmail'): m for m in fd}
co_by_name = {c['companyName'].strip().lower(): c for c in cq}

F = Font(name='Arial', size=10); H = Font(name='Arial', size=10, bold=True, color='FFFFFF'); HF = PatternFill('solid', fgColor='1F1F1F')
wb = Workbook(); wb.remove(wb.active)
def tab(name, headers, rows):
    ws = wb.create_sheet(name); ws.append(headers)
    for r in rows: ws.append([clean(x) for x in r])
    for c in ws[1]: c.font = H; c.fill = HF
    for row in ws.iter_rows(min_row=2):
        for c in row: c.font = F
    ws.freeze_panes = 'A2'
    for i in range(1, len(headers) + 1): ws.column_dimensions[ws.cell(1, i).column_letter].width = 18
    return ws

tab('Settings', ['key', 'value', 'note'], SETTINGS)

comp_rows = []
for i, c in enumerate(sorted(cq, key=lambda c: c['companyName'].lower()), 1):
    m = byEmail.get(c.get('adminEmail'), {})
    comp_rows.append(['C%03d' % i, c['companyName'].strip(), c.get('adminEmail'),
        ((m.get('firstName') or '') + ' ' + (m.get('lastName') or '')).strip(), m.get('phone'),
        c.get('packageType') or '', c.get('currency') or 'INR', c.get('perImageCost') or 0, c.get('cullingCost') or 0,
        c.get('totalQuota') or 0, c.get('usedQuota') or 0, c.get('totalImagesCulled') or 0,
        bool(c.get('enableCredits')), c.get('credits') or 0, 'Active', wixdate(c.get('_createdDate')), c['_id']])
tab('Companies', ['companyId', 'companyName', 'adminEmail', 'contactName', 'phone', 'packageType', 'currency',
    'perImageRate', 'cullingRate', 'totalQuota', 'usedQuota', 'totalImagesCulled', 'creditsEnabled', 'credits',
    'status', 'createdAt', 'wixId'], comp_rows)

orders.sort(key=lambda o: wixdate(o.get('_createdDate')))
ord_rows = []
for i, o in enumerate(orders, 1):
    opts = o.get('editingOptions') or []
    n = int(o.get('numberOfImages') or 0); hrs = int(o.get('hours') or 96)
    cull_only = len(opts) == 1 and opts[0] == 'Culling'
    q = 0 if cull_only else math.ceil(n * MULT.get(hrs, 1))
    q -= int(o.get('creditsRedeemed') or 0)
    st = o.get('status') or ''
    ord_rows.append(['PG%05d' % i, dmy_to_iso(o.get('timestamp')) or wixdate(o.get('_createdDate')), dmy_to_iso(o.get('tat')),
        hrs, st, (o.get('yourCompanyName') or '').strip(), o.get('email'), o.get('fullName'), str(o.get('mobileNumber') or ''),
        o.get('catalogName'), n, int(o.get('cullingImages') or 0), ', '.join(opts), o.get('blackWhitePercentage'),
        int(o.get('creditsRedeemed') or 0), max(0, q), o.get('perImagePrice'), o.get('cullingPrice'),
        o.get('weTransferSmashDropboxSendgbAnyCatalogLinks'), o.get('referenceImagesLinks'), o.get('additionalComments'),
        o.get('lrFiles'), wixdate(o.get('_updatedDate')) if 'completed' in st.lower() else '', 'wix', o['_id']])
tab('Orders', ['orderId', 'placedAt', 'deliveryDue', 'hours', 'status', 'companyName', 'email', 'fullName', 'mobile',
    'catalogName', 'numberOfImages', 'cullingImages', 'editingOptions', 'bwPercent', 'creditsRedeemed', 'quotaUsed',
    'perImageRate', 'cullingRate', 'catalogLink', 'referenceLinks', 'comments', 'lrFilesLink', 'completedAt',
    'source', 'wixId'], ord_rows)

tab('Payments', ['paymentId', 'date', 'companyName', 'amount', 'currency', 'method', 'ratePerImage', 'imagesAdded',
    'note', 'recordedBy'], [])

cl_rows = []
for c in cq:
    for e in (c.get('creditLogs') or []):
        md = e.get('metaData') or {}
        cl_rows.append([e.get('date'), c['companyName'].strip(), e.get('type'), e.get('points'), e.get('title'),
            md.get('method'), md.get('relatedOrderId')])
tab('CreditLog', ['date', 'companyName', 'type', 'points', 'title', 'method', 'relatedWixOrderId'], cl_rows)

tab('Packages', ['planCode', 'title', 'countryCode', 'totalImages', 'editingOptions', 'wixId'],
    [[p.get('planCode'), p.get('title'), p.get('countryCode'), p.get('totalImages'), ', '.join(p.get('services') or []), p['_id']] for p in pk])

# Admin logins (confirmed by Deepak 2026-11-04). Old Wix admin emails are renamed or dropped.
ADMIN_EMAILS = ['adcmediaa@gmail.com', 'deepakjaz@gmail.com', 'deepak@picgrades.com', 'ashish@picgrades.com']
RENAME = {'deepak@adcmediaa.com': 'deepak@picgrades.com', 'ashish@adcmediaa.com': 'ashish@picgrades.com'}
DROP = {'ashishjazz.joshi@gmail.com'}
user_rows = []
for m in fd:
    email = (m.get('loginEmail') or '').lower()
    if email in DROP: continue
    m = dict(m, loginEmail=RENAME.get(email, email))
    comp = (m.get('customfields_contact_company') or '').strip()
    role = 'admin' if m['loginEmail'] in ADMIN_EMAILS else 'client'
    status = 'Blocked' if m.get('status') == 'BLOCKED' else 'Active'
    user_rows.append([(m.get('loginEmail') or '').lower(), ((m.get('firstName') or '') + ' ' + (m.get('lastName') or '')).strip(),
        comp, role, m.get('custom_profession'), m.get('phone'), status, wixdate(m.get('_createdDate')), m['_id']])
tab('Users', ['email', 'name', 'companyName', 'role', 'profession', 'phone', 'status', 'joinedAt', 'wixMemberId'], user_rows)

tab('Sessions', ['token', 'email', 'type', 'codeHash', 'createdAt', 'expiresAt', 'used'], [])
tab('EmailLog', ['sentAt', 'to', 'subject', 'kind', 'relatedId', 'result'], [])
wb.save(OUT)
print('Companies', len(comp_rows), 'Orders', len(ord_rows), 'CreditLog', len(cl_rows), 'Packages', len(pk), 'Users', len(user_rows))
