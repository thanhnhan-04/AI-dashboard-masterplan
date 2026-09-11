#!/usr/bin/env python3
"""Fetch public observations, validate, retain last good data, publish a local JS bundle.
A daily polling schedule is independent of a provider's publication cadence.
No API credentials or network access from the dashboard browser are required.
"""
from __future__ import annotations
import fcntl
import argparse, concurrent.futures, datetime as dt, hashlib, json, math, os, sys, tempfile, time, subprocess, urllib.parse, urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
import xlrd
import io, csv, zipfile, re, calendar
import openpyxl
ROOT=Path(__file__).resolve().parents[1]
UTC=dt.timezone.utc
EIA={
 'brent':('RBRTE','Dollars per Barrel',1,'daily', '2026-09-01'),
 'wti':('RWTC','Dollars per Barrel',1,'daily', '2026-09-01'),
 'gasoline':('EER_EPMRU_PF4_RGC_DPG','Dollars per Gallon',1,'daily', '2026-09-01'),
 'diesel':('EER_EPD2DXL0_PF4_RGC_DPG','Dollars per Gallon',1,'daily', '2026-09-01'),
 'crude_stock':('WCESTUS1','Thousand Barrels',.001,'weekly', '2026-08-28'),
 'gasoline_stock':('WGTSTUS1','Thousand Barrels',.001,'weekly', '2026-08-28'),
 'distillate_stock':('WDISTUS1','Thousand Barrels',.001,'weekly', '2026-08-28'),
 'cushing':('W_EPC0_SAX_YCUOK_MBBL','Thousand Barrels',.001,'weekly', '2026-08-28'),
 'us_production':('WCRFPUS2','Thousand Barrels per Day',.001,'weekly', '2026-08-28'),
}
PORTWATCH='https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query'

def fetch(url):
    # curl uses the OS trust store; TLS verification remains enabled.
    result=subprocess.run(['curl','--fail','--location','--silent','--show-error',
        '--max-time','35','--retry','2','--retry-delay','1',
        '--user-agent','FinSuccessDashboard/2.0 (public data research)',url],capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr.decode(errors='replace')[:250])
    if len(result.stdout)>30_000_000: raise ValueError('Response exceeds 30 MB')
    return result.stdout

def normalize(records, fields, today=None):
    today=today or dt.datetime.now(UTC).date()
    out={}
    for r in records:
        date=dt.date.fromisoformat(r['date'])
        if date>today: raise ValueError('Future observation')
        if date.isoformat() in out: raise ValueError('Duplicate observation date')
        for field in fields:
            v=r[field]
            if not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v): raise ValueError('Invalid value')
        out[date.isoformat()]=r
    if not out: raise ValueError('Empty series')
    return [out[k] for k in sorted(out)]

def parse_eia(data, code, unit, scale):
    w=xlrd.open_workbook(file_contents=data)
    sheet=w.sheet_by_index(1)
    if str(sheet.cell_value(1,1)).upper()!=code.upper(): raise ValueError('EIA series identity mismatch')
    if unit.lower() not in str(sheet.cell_value(2,1)).lower(): raise ValueError('EIA unit mismatch')
    records=[]
    for i in range(3,sheet.nrows):
        date,value=sheet.cell_value(i,0),sheet.cell_value(i,1)
        if not isinstance(date,(int,float)) or not isinstance(value,(int,float)):continue
        date=xlrd.xldate_as_datetime(date,w.datemode).date().isoformat()
        if date<'2010-01-01':continue
        if value<0 and code!='RWTC':raise ValueError('Negative source value')
        records.append({'date':date,'value':round(value*scale,6)})
    rows=normalize(records,['value'])
    if len(rows)<100: raise ValueError('Unexpectedly short EIA history')
    return rows

def load_eia(key, spec):
    code,unit,scale,frequency,_=spec
    url=f'https://www.eia.gov/dnav/pet/hist_xls/{code}{"d" if frequency=="daily" else "w"}.xls'
    raw=fetch(url)
    rows=parse_eia(raw,code,unit,scale)
    return {'source_url':url,'source_name':'EIA','observation_frequency':frequency,'publication_frequency':'weekly','unit':unit if scale==1 else ('million barrels/day' if key=='us_production' else 'million barrels'),'records':rows,'raw_sha256':hashlib.sha256(raw).hexdigest()},raw

def parse_portwatch(features):
    rows=[]
    for f in features:
        a=f['attributes']
        if a.get('portid')!='chokepoint6':raise ValueError('Wrong chokepoint')
        date=a['date']
        if isinstance(date,(int,float)):date=dt.datetime.fromtimestamp(date/1000,UTC).date().isoformat()
        else:date=str(date)[:10]
        tanker,total=a['n_tanker'],a['n_total']
        if tanker is None or total is None:raise ValueError('Null transit count; not zero')
        if tanker<0 or total<tanker:raise ValueError('Invalid tanker/total counts')
        rows.append({'date':date,'tanker':tanker,'total':total})
    return normalize(rows,['tanker','total'])

def load_portwatch():
    features=[];raw_pages=[];offset=0
    while True:
        query={'where':"portid='chokepoint6' AND date >= DATE '2023-01-01'",'outFields':'date,portid,n_tanker,n_total','orderByFields':'date ASC','resultOffset':offset,'resultRecordCount':1000,'f':'json'}
        raw=fetch(PORTWATCH+'?'+urllib.parse.urlencode(query));page=json.loads(raw)
        if 'error' in page:raise ValueError('PortWatch: '+str(page['error']))
        batch=page.get('features',[]);features.extend(batch);raw_pages.append(page)
        if not page.get('exceededTransferLimit'):break
        if not batch or offset>=20000:raise ValueError('Invalid pagination')
        offset+=len(batch)
    rows=parse_portwatch(features)
    if len(rows)<180:raise ValueError('Incomplete Hormuz history')
    raw=json.dumps(raw_pages).encode()
    return {'source_url':PORTWATCH,'source_name':'IMF PortWatch','observation_frequency':'daily','publication_frequency':'weekly','unit':'transit calls/day','records':rows,'raw_sha256':hashlib.sha256(raw).hexdigest()},raw

def align_curve(contracts, today):
    # Prefer the latest COMPLETE trading day common to every requested maturity.
    common=set.intersection(*(set(c['closes']) for c in contracts))
    common={day for day in common if 0 < (today-dt.date.fromisoformat(day)).days <= 10}
    if not common:raise ValueError('No recent completed trading day common to all WTI maturities')
    day=max(common)
    return [{'date':day,'maturity':c['maturity'],'symbol':c['symbol'],
             'value':c['closes'][day],'quote_type':'daily close (not settlement)'} for c in contracts]

def load_curve():
    now=dt.datetime.now(ZoneInfo('America/New_York'));months='FGHJKMNQUVXZ';start=now.year*12+now.month
    def contract(offset):
        year,month=divmod(start+offset,12);symbol=f'CL{months[month]}{year%100:02d}.NYM'
        url='https://query1.finance.yahoo.com/v8/finance/chart/'+urllib.parse.quote(symbol)+'?interval=1d&range=1mo'
        data=json.loads(fetch(url));result=data.get('chart',{}).get('result')
        if not result:raise ValueError('Yahoo quote unavailable')
        r=result[0];meta=r['meta']
        if meta.get('currency')!='USD' or meta.get('symbol')!=symbol:raise ValueError('Quote identity/currency mismatch')
        zone=ZoneInfo(meta.get('exchangeTimezoneName','America/New_York'))
        closes={}
        for stamp,value in zip(r.get('timestamp',[]),r['indicators']['quote'][0]['close']):
            if value is None:continue
            if not isinstance(value,(int,float)) or not math.isfinite(value) or value<=0:raise ValueError('Invalid futures price')
            date=dt.datetime.fromtimestamp(stamp,zone).date().isoformat()
            closes[date]=round(value,2)
        if not closes:raise ValueError('No futures close')
        return {'maturity':f'{year}-{month+1:02d}','symbol':symbol,'closes':closes,'source_url':url}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:contracts=list(ex.map(contract,range(18)))
    records=align_curve(contracts,now.date())
    raw=json.dumps(contracts).encode()
    return {'source_url':'https://finance.yahoo.com/quote/CL%3DF/futures/','source_name':'Yahoo Finance (unofficial)',
            'observation_frequency':'daily','publication_frequency':'daily','unit':'USD/barrel','records':records,
            'raw_sha256':hashlib.sha256(raw).hexdigest()},raw

WB_MONTHLY='https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx'
PSD_SUGAR='https://apps.fas.usda.gov/psdonline/downloads/psd_sugar_csv.zip'

def parse_daily_futures(result, symbol, today=None):
    meta=result['meta']
    if meta.get('symbol')!=symbol or meta.get('currency')!=('USX' if symbol=='SB=F' else 'USD') or meta.get('instrumentType')!='FUTURE':
        raise ValueError('Futures identity/unit mismatch')
    zone=ZoneInfo(meta['exchangeTimezoneName']);today=today or dt.datetime.now(zone).date()
    records=[]
    for stamp,value in zip(result.get('timestamp',[]),result['indicators']['quote'][0]['close']):
        date=dt.datetime.fromtimestamp(stamp,zone).date()
        if date>=today or value is None:continue
        if not isinstance(value,(int,float)) or value<=0:raise ValueError('Invalid futures close')
        records.append({'date':date.isoformat(),'value':round(value,4)})
    rows=normalize(records,['value'],today)
    if len(rows)<100:raise ValueError('Incomplete futures history')
    if (today-dt.date.fromisoformat(rows[-1]['date'])).days>10:raise ValueError('Futures feed is stale')
    return rows

def load_daily_futures(symbol,unit):
    url='https://query1.finance.yahoo.com/v8/finance/chart/'+urllib.parse.quote(symbol)+'?interval=1d&range=2y'
    raw=fetch(url);result=json.loads(raw)['chart']['result'][0]
    rows=parse_daily_futures(result,symbol)
    return {'source_url':'https://finance.yahoo.com/quote/'+urllib.parse.quote(symbol)+'/',
        'source_name':'Yahoo Finance (unofficial)','symbol':symbol,'instrument':'continuous front futures',
        'observation_frequency':'daily','publication_frequency':'daily','unit':unit,'records':rows,
        'raw_sha256':hashlib.sha256(raw).hexdigest()},raw

def load_wb_sugar():
    raw=fetch(WB_MONTHLY);w=openpyxl.load_workbook(io.BytesIO(raw),read_only=True,data_only=True)
    data=list(w['Monthly Prices'].values);head=next(i for i,r in enumerate(data) if 'Sugar, world' in r)
    col=data[head].index('Sugar, world')
    if data[head+1][col]!='($/kg)':raise ValueError('World Bank sugar unit mismatch')
    records=[]
    for row in data[head+2:]:
        if not isinstance(row[0],str) or not re.fullmatch(r'\d{4}M\d{2}',row[0]):continue
        year,month=map(int,row[0].split('M'));v=row[col]
        if year<2010:continue
        if not isinstance(v,(int,float)) or v<=0:raise ValueError('Missing/invalid sugar month')
        records.append({'date':dt.date(year,month,calendar.monthrange(year,month)[1]).isoformat(),'value':v})
    return {'source_url':WB_MONTHLY,'source_name':'World Bank Pink Sheet','observation_frequency':'monthly',
        'publication_frequency':'monthly','unit':'USD/kg','records':normalize(records,['value']),
        'raw_sha256':hashlib.sha256(raw).hexdigest()},raw

def load_sugar_producers():
    raw=fetch(PSD_SUGAR);z=zipfile.ZipFile(io.BytesIO(raw))
    if sum(i.file_size for i in z.infolist())>60_000_000:raise ValueError('PSD archive exceeds limit')
    countries={'Brazil':'brazil','India':'india','Thailand':'thailand','European Union':'eu'}
    grouped={}
    for r in csv.DictReader(io.TextIOWrapper(z.open('psd_sugar.csv'),encoding='utf-8-sig')):
        if r['Country_Name'] not in countries or r['Attribute_Description']!='Production' or int(r['Market_Year'])<2010:continue
        if r['Commodity_Code']!='0612000' or r['Unit_Description']!='(1000 MT)':raise ValueError('PSD identity/unit mismatch')
        year=int(r['Market_Year']);key=countries[r['Country_Name']]
        row=grouped.setdefault(year,{'date':f'{year}-01-01','market_year':year})
        if key in row:raise ValueError('Duplicate PSD country/year')
        row[key]=float(r['Value'])/1000
    records=normalize(list(grouped.values()),list(countries.values()))
    return {'source_url':PSD_SUGAR,'source_name':'USDA FAS PSD','observation_frequency':'marketing year',
        'publication_frequency':'semiannual','unit':'million tonnes raw value','records':records,
        'raw_sha256':hashlib.sha256(raw).hexdigest()},raw

def merge_good(old, fresh, floor):
    latest=max(r['date'] for r in fresh['records'])
    previous=old.get('latest_observation') or floor
    if latest<previous:raise ValueError(f'Source regressed: {latest} < {previous}')
    if old.get('records') and len(fresh['records'])<len(old['records'])*.8:raise ValueError('History unexpectedly truncated')
    fresh['latest_observation']=latest
    fresh['data_hash']=hashlib.sha256(json.dumps(fresh['records'],sort_keys=True).encode()).hexdigest()
    return fresh

def atomic(path, text):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.'+path.name)
    try:
        with os.fdopen(fd,'w') as f:f.write(text)
        os.chmod(tmp,0o644)
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output-dir',type=Path,default=ROOT/'data');parser.add_argument('--sources',nargs='*');args=parser.parse_args()
    out=args.output_dir;out.mkdir(parents=True,exist_ok=True)
    # OS lock is released automatically even if the process is interrupted.
    lock=out/'.update.lock';lock_file=lock.open('a')
    try:fcntl.flock(lock_file,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:
        lock_file.close();print('Another update holds '+str(lock),file=sys.stderr);return 2
    try:
        cache=out/'daily.json';bundle=json.loads(cache.read_text()) if cache.exists() else {'schema_version':1,'sources':{}}
        tasks={k:(lambda k=k,s=s:load_eia(k,s)) for k,s in EIA.items()}
        tasks.update(hormuz=load_portwatch,wti_curve=load_curve,brent_futures=lambda:load_daily_futures("BZ=F","USD/barrel"),sugar_futures=lambda:load_daily_futures("SB=F","US cents/lb"),sugar_monthly=load_wb_sugar,sugar_producers=load_sugar_producers)
        selected=args.sources or list(tasks)
        if any(k not in tasks for k in selected):raise ValueError('Unknown source')
        errors=0;run_at=dt.datetime.now(UTC).isoformat()
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
            futures={ex.submit(tasks[k]):k for k in selected}
            for future in concurrent.futures.as_completed(futures):
                key=futures[future];old=bundle['sources'].get(key,{})
                try:
                    fresh,raw=future.result();floor=EIA[key][4] if key in EIA else {'hormuz':'2026-08-30','wti_curve':'2026-09-03','sugar_monthly':'2026-07-31'}.get(key,'2010-01-01')
                    fresh=merge_good(old,fresh,floor);fresh.update(last_success_at=run_at,last_checked_at=run_at,status='ok',error=None)
                    fresh['changed_at']=run_at if fresh['data_hash']!=old.get('data_hash') else old.get('changed_at',run_at)
                    bundle['sources'][key]=fresh
                    archive=out/'raw'/f'{key}-{fresh["raw_sha256"][:16]}.bin'
                    if not archive.exists():archive.parent.mkdir(exist_ok=True);archive.write_bytes(raw)
                    print(key,'OK',fresh['latest_observation'],len(fresh['records']),flush=True)
                except Exception as e:
                    errors+=1;bundle['sources'][key]={**old,'last_checked_at':run_at,'status':'error','error':str(e)[:350]}
                    print(key,'ERROR',str(e)[:200],flush=True)
        bundle['last_run_at']=run_at
        text=json.dumps(bundle,ensure_ascii=False,separators=(',',':'))
        atomic(cache,text+'\n')
        atomic(out/'daily-data.js','window.SECTOR_DAILY = '+text.replace('<','\\u003c')+';\n')
        report={'run_at':run_at,'errors':errors,'sources':{k:{x:v.get(x) for x in ['status','latest_observation','last_success_at','last_checked_at','error']} for k,v in bundle['sources'].items()}}
        atomic(out/'update-status.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        return 1 if errors else 0
    finally:
        fcntl.flock(lock_file,fcntl.LOCK_UN);lock_file.close()
if __name__=='__main__':sys.exit(main())
