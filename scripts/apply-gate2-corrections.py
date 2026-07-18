from pathlib import Path
import hashlib
import re

ROOT=Path('.')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def require(condition,message):
    if not condition:
        raise SystemExit(message)

builder_path=ROOT/'app/src/scripts/builder-controller.js'
storage_path=ROOT/'app/src/scripts/storage.js'
catalog_path=ROOT/'app/src/scripts/catalog.js'
storage_test=ROOT/'scripts/test-storage-contract.mjs'
catalog_test=ROOT/'scripts/test-catalog-contract.mjs'
builder_test=ROOT/'scripts/test-builder-contract.mjs'

require(digest(builder_path)=='283ec4cd5597e3622d7039da979d0f13964823bddb82727fa7550502f1ff5f84','Unexpected builder source; refusing to patch.')
require(digest(storage_path)=='f7c4fd4b83d2c9fbb94f8993a3455f6cbe24643a09696eae43c805241d1d2fb7','Published storage source does not match the locally verified correction.')
require(digest(catalog_path)=='bb592f3e38d28ff0233d47f26a731a9c7e78e1a6543d7621f1a0440b557cde71','Published catalog source does not match the locally verified correction.')

s=builder_path.read_text()

def sub(pattern,repl,count=1):
    global s
    ns,n=re.compile(pattern,re.S).subn(lambda _match: repl,s,count=count)
    require(n==count,f'Builder patch pattern matched {n}, expected {count}: {pattern[:80]}')
    s=ns

sub(r"    populateTypes\(leg,selected=''\)\{.*?\n    configureLeg\(leg\)\{", """    populateTypes(leg,selected=''){
      const league=this.legLeague(leg),select=leg.querySelector('.ltype'),types=this.catalog.TYPES[league]||this.catalog.TYPES.MLB,known=types.includes(selected);
      select.innerHTML=(selected&&!known?this.option(selected,`Unsupported: ${selected}`,true):'')+types.map(type=>this.option(type,this.catalog.LABELS[type]||type,type===selected)).join('');
      if(selected&&[...select.options].some(option=>option.value===selected))select.value=selected;
    }
    configureLeg(leg){""")

sub(r"    configureTarget\(leg\)\{.*?\}\n    setTarget", """    configureTarget(leg){const select=leg.querySelector('.targetSelect'),custom=leg.querySelector('.targetCustom'),current=this.targetValue(leg),type=leg.querySelector('.ltype').value,league=this.legLeague(leg),known=(this.catalog.TYPES[league]||[]).includes(type),spec=this.catalog.targetSpec(type,league);if(!known){select.innerHTML=this.option('','Unsupported market')+this.option(this.catalog.MANUAL,'Preserved custom line…');if(current){select.value=this.catalog.MANUAL;custom.value=current;custom.classList.remove('hide')}else custom.classList.add('hide');return}if(spec.mode==='none'){select.innerHTML=this.option('','No target required');custom.value='';custom.classList.add('hide');return}select.innerHTML=this.option('','Select target…')+spec.values.map(value=>this.option(value,spec.mode==='milestone'?`${value}+`:spec.mode==='spread'&&Number(value)>0?`+${value}`:String(value))).join('')+this.option(this.catalog.MANUAL,'Custom line…');if(current&&[...select.options].some(option=>option.value===String(current))){select.value=String(current);custom.classList.add('hide')}else if(current){select.value=this.catalog.MANUAL;custom.value=current;custom.classList.remove('hide')}else custom.classList.add('hide')}
    setTarget""")

sub(r"    toggleManual\(select,input\)\{.*?\}\n    getPair", """    toggleManual(select,input){const manual=select.value===this.catalog.MANUAL;input.classList.toggle('hide',!manual);if(!manual)input.value=''}
    getPair""")

sub(r"    setPair\(select,input,value\)\{.*?\}\n    ticketGame\(\)", """    setPair(select,input,value){const text=this.clean(value);if(!text){select.value='';input.value='';input.classList.add('hide')}else if([...select.options].some(option=>option.value===text)){select.value=text;input.value='';input.classList.add('hide')}else{select.value=this.catalog.MANUAL;input.value=text;input.classList.remove('hide')}}
    gameSelection(select,input){
      const game=this.getPair(select,input);if(!game)return{};
      if(select.value===this.catalog.MANUAL)return{game,manual:true};
      const option=select.options?.[select.selectedIndex];return{game,gameId:this.clean(option?.dataset?.gameId),gamePk:this.clean(option?.dataset?.gamePk),gameStart:this.clean(option?.dataset?.gameStart),gameNumber:this.clean(option?.dataset?.gameNumber)};
    }
    restoreGameSelection(select,input,source){
      if(!source?.game)return false;
      if(source.manual){select.value=this.catalog.MANUAL;input.value=source.game;input.classList.remove('hide');return true}
      if(this.restoreSelectGame(select,source)){input.value='';input.classList.add('hide');return true}
      const candidates=[...select.options].filter(option=>option.value===source.game);if(candidates.length>1){select.value=this.catalog.MANUAL;input.value=source.game;input.classList.remove('hide');return true}
      this.setPair(select,input,source.game);return true;
    }
    ticketGame()""")

sub(r"    async loadTicketGames\(\)\{.*?\n    async gamesFor", """    async loadTicketGames(){
      const league=this.league(),date=this.ymd(this.$('date').value),select=this.$('ticketGame'),input=this.$('ticketGameManual'),previous=this.gameSelection(select,input);if(!league||!date)return;
      const items=await this.gamesFor(league,date);this.renderGameOptions(select,items,league,date);this.restoreGameSelection(select,input,previous);this.toggleManual(select,input);this.apiStatus(`${items.length} games loaded.`,items.length?'good':'');for(const leg of this.legs())if(this.ticketType()!=='parlay')this.renderTeams(leg)
    }
    async loadLegGames(leg){
      if(this.ticketType()!=='parlay')return;
      const league=this.legLeague(leg),date=this.legDate(leg),select=leg.querySelector('.lgame'),input=leg.querySelector('.lgameManual'),current=this.gameSelection(select,input),saved=this.safeJson(leg.dataset.savedGame),source=current.game?current:saved;
      const items=await this.gamesFor(league,date);this.renderGameOptions(select,items,league,date);this.restoreGameSelection(select,input,source);this.toggleManual(select,input);delete leg.dataset.savedGame;
    }
    async gamesFor""")

sub(r"    renderGameOptions\(select,items,league\)\{.*?\n    readableGameLabel", """    renderGameOptions(select,items,league,date=this.ymd(this.$('date').value)){
      const previous=select.value;select.innerHTML=this.option('',items.length?'Select game…':'No games found');
      for(const item of items){const data=typeof item==='string'?{value:item,label:item}:item||{},value=this.clean(data.value||data.game||data.code||data.id),label=this.clean(data.label||data.display||value);if(!value)continue;const option=document.createElement('option');option.value=value;option.textContent=this.readableGameLabel(value,label,league);for(const [name,source] of Object.entries({gameId:data.gameId||data.eventId||data.id,gamePk:data.gamePk,gameStart:data.gameStart||data.startTime||data.start||data.date||data.gameDate,gameNumber:data.gameNumber||data.doubleHeaderGame}))if(source!==undefined&&source!==null&&source!=='')option.dataset[name]=String(name==='gameStart'?this.normalizeGameStart(source,date):source);select.appendChild(option)}
      select.insertAdjacentHTML('beforeend',this.option(this.catalog.MANUAL,'Manual entry…'));if(previous&&[...select.options].some(option=>option.value===previous))select.value=previous;
    }
    readableGameLabel""")

sub(r"    bindingFor\(select\)\{.*?\}\n    applyBinding", """    bindingFor(select,savedAt=''){
      const option=select?.options?.[select.selectedIndex];if(!option||!option.value||option.value===this.catalog.MANUAL)return{};
      const same=[...select.options].filter(candidate=>candidate.value===option.value),ordinal=Number(option.dataset.gameNumber)||(same.length>1?same.indexOf(option)+1:0),binding={gameId:this.clean(option.dataset.gameId),gamePk:this.clean(option.dataset.gamePk),gameStart:this.clean(option.dataset.gameStart),gameNumber:ordinal||undefined};if(savedAt)binding.gameSavedAt=savedAt;return binding;
    }
    applyBinding""")

sub(r"    restoreSelectGame\(select,source\)\{.*?\}\n    renderTeams", """    restoreSelectGame(select,source){if(!select||!source?.game)return false;const candidates=[...select.options].filter(option=>option.value===source.game);if(!candidates.length)return false;let chosen=source.gameId?candidates.find(option=>option.dataset.gameId===String(source.gameId)):null;if(!chosen&&source.gamePk)chosen=candidates.find(option=>option.dataset.gamePk===String(source.gamePk));if(!chosen&&source.gameStart)chosen=candidates.find(option=>option.dataset.gameStart===String(source.gameStart));const ordinal=Number(source.gameNumber);if(!chosen&&Number.isInteger(ordinal)&&ordinal>=1&&ordinal<=candidates.length)chosen=candidates[ordinal-1];if(!chosen&&candidates.length===1)chosen=candidates[0];if(!chosen)return false;select.selectedIndex=[...select.options].indexOf(chosen);return true}
    renderTeams""")

sub(r"    selectGameForTeam\(leg,team\)\{.*?\}\n    async loadPlayers", """    selectGameForTeam(leg,team){
      const wanted=this.clean(team).toUpperCase();if(!wanted||team===this.catalog.MANUAL)return;
      const select=this.ticketType()==='parlay'?leg.querySelector('.lgame'):this.$('ticketGame'),matches=[...select.options].filter(option=>option.value&&option.value!==this.catalog.MANUAL&&this.catalog.gameTeams(option.value).includes(wanted));if(matches.length===1&&!select.value){select.value=matches[0].value;if(this.ticketType()==='parlay')this.renderTeams(leg,wanted)}
    }
    async loadPlayers""")

old="const response=await this.api('getPlayersForGame',{league,date,game,team,playerRole:role});list=response.players||[];this.players.set(key,list)"
new="const response=await this.api('getPlayersForGame',{league,date,game,team,playerRole:role});if(response.error)throw new Error(response.error);list=response.players||[];this.players.set(key,list)"
require(s.count(old)==1,'Player API patch target not found exactly once.')
s=s.replace(old,new,1)

sub(r"    rawTicket\(\)\{.*?\n    \}\n    canonicalTicket\(\)\{.*?\n    \}\n    formatTicket", """    rawTicket(snapshotTime=new Date().toISOString()){
      const type=this.ticketType(),ticket={title:this.clean(this.$('odds').value)||'Untitled',type,tracker:this.$('tracker').value,date:this.ymd(this.$('date').value),league:this.league(),game:type==='parlay'?'':this.ticketGame(),legs:[]};
      if(ticket.type!=='parlay'&&ticket.game)this.applyBinding(ticket,this.bindingFor(this.$('ticketGame'),snapshotTime));
      for(const element of this.includedLegs()){
        const type=element.querySelector('.ltype').value,leg={label:this.clean(element.querySelector('.lbl').value)||this.autoLabel(element),type,league:this.legLeague(element),date:this.legDate(element),game:this.legGame(element)},team=this.legTeam(element),player=this.legPlayer(element),target=this.targetValue(element);if(team)leg.team=team;if(player)leg.player=player;
        if(type==='manual'){const current=this.numberOrText(element.querySelector('.manualCurrent').value),manualTarget=this.numberOrText(element.querySelector('.manualTarget').value);leg.current=current===''?0:current;leg.target=manualTarget===''?1:manualTarget}else if(target!=='')leg.target=this.numberOrText(target);
        if(['team_sot_half_over','team_sot_half_under'].includes(type))leg.half=Number(element.querySelector('.half').value||1);
        if(ticket.type==='parlay'&&leg.game)this.applyBinding(leg,this.bindingFor(element.querySelector('.lgame'),snapshotTime));ticket.legs.push(leg);
      }
      if(ticket.type==='parlay'){const leagues=[...new Set(ticket.legs.map(leg=>leg.league).filter(Boolean))];ticket.league=leagues.length===1?leagues[0]:''}
      return ticket;
    }
    canonicalTicket(raw=this.rawTicket()){
      const output={title:raw.tracker==='worldcup'&&raw.title.startsWith('+')?`＋${raw.title.slice(1)}`:raw.title,date:raw.date,type:raw.type},leagues=[...new Set(raw.legs.map(leg=>leg.league).filter(Boolean))];
      if(raw.type==='parlay'){if(leagues.length===1)output.league=leagues[0]}else{if(raw.league||leagues[0])output.league=raw.league||leagues[0];if(raw.game){output.game=raw.game;this.applyBinding(output,raw)}}
      output.legs=raw.legs.map(source=>{const leg={label:source.label,type:source.type};if(raw.type==='parlay'){if(source.game)leg.game=source.game;if(source.date&&source.date!==raw.date)leg.date=source.date;if(leagues.length>1&&source.league)leg.league=source.league}else if(source.league&&source.league!==output.league)leg.league=source.league;for(const name of ['team','player','target','current','half'])if(source[name]!==undefined&&source[name]!==null&&source[name]!=='')leg[name]=source[name];if(raw.type==='parlay')for(const name of ['gameId','gamePk','gameStart','gameNumber','gameSavedAt'])if(source[name]!==undefined&&source[name]!==null&&source[name]!=='')leg[name]=source[name];return leg});return output;
    }
    formatTicket""")

sub(r"    validate\(ticket\)\{.*?\}\n    preview\(\)\{.*?\}\n    recordFromBuilder\(existing=null\)\{.*?\}\n", """    validate(ticket){
      const issues=[],datePattern=/^\\d{8}$/,ticketTypes=new Set(['sgp','parlay','straight']),legs=Array.isArray(ticket.legs)?ticket.legs:[];
      if(ticket.title==='Untitled')issues.push('Missing odds/title');if(!datePattern.test(this.clean(ticket.date)))issues.push('Invalid date: use YYYYMMDD');if(!ticketTypes.has(ticket.type))issues.push(`Invalid ticket type: ${ticket.type||'missing'}`);if(!legs.length)issues.push('Add at least one leg');if(ticket.type!=='parlay'&&!ticket.game)issues.push('Missing ticket game');if(ticket.type==='straight'&&legs.length!==1)issues.push('Select one active straight bet');
      legs.forEach((leg,index)=>{
        const prefix=`Leg ${index+1}:`,league=this.clean(leg.league||ticket.league).toUpperCase(),type=this.clean(leg.type).toLowerCase(),allowed=this.catalog.TYPES[league]||[],game=leg.game||ticket.game,teams=this.catalog.gameTeams(game),team=this.clean(leg.team).toUpperCase(),requiresTeam=this.catalog.needsTeam(type)||this.catalog.isPlayer(type);
        if(!leg.label)issues.push(`${prefix} missing label`);if(!datePattern.test(this.clean(leg.date||ticket.date)))issues.push(`${prefix} invalid date`);if(!allowed.includes(type))issues.push(`${prefix} ${type||'missing type'} is not available for ${league||'the selected league'}`);if(requiresTeam&&!team)issues.push(`${prefix} missing team`);if(this.catalog.isPlayer(type)&&!leg.player)issues.push(`${prefix} missing player`);if(team&&requiresTeam&&teams.length===2&&!teams.includes(team))issues.push(`${prefix} team is not in ${game}`);
        if(this.catalog.needsTarget(type)){if(leg.target===undefined||leg.target===null||leg.target==='')issues.push(`${prefix} missing target`);else if(!Number.isFinite(Number(leg.target)))issues.push(`${prefix} numeric target required`)}
        if(type==='manual'){if(!Number.isFinite(Number(leg.current))||Number(leg.current)<0)issues.push(`${prefix} manual current must be a nonnegative number`);if(!Number.isFinite(Number(leg.target))||Number(leg.target)<=0)issues.push(`${prefix} manual target must be a positive number`)}
        if(ticket.type==='parlay'&&!leg.game)issues.push(`${prefix} missing game`);
      });return issues;
    }
    preview(){const ticket=this.rawTicket(),issues=this.validate(ticket);this.$('warnings').textContent=issues.join('\\n');this.$('previewStatus').textContent=issues.length?`${issues.length} issue${issues.length===1?'':'s'}`:'ready';this.$('preview').innerHTML=`<div class="ticket"><div class="ticketTop"><span class="title">${this.esc(ticket.title)}</span><span class="badge">${this.esc(ticket.type.toUpperCase())}</span></div><div class="meta">${this.esc([ticket.league,ticket.game,ticket.date].filter(Boolean).join(' · '))}</div>${ticket.legs.map(leg=>`<div class="pline"><div><b>${this.esc(leg.label||'Untitled')}</b><div class="sub">${this.esc([leg.game,leg.team,leg.player].filter(Boolean).join(' · '))}</div></div><div>${this.esc(leg.type==='manual'?`${leg.current}/${leg.target}`:leg.target??'')}</div></div>`).join('')}</div>`;this.$('output').value=this.formatTicket(this.canonicalTicket(ticket));return issues}
    recordFromBuilder(existing=null){const now=new Date().toISOString(),raw=this.rawTicket(now),canonical=this.canonicalTicket(raw);return{id:existing?.id||this.storage.makeId(),sportsbook:this.clean(this.$('sportsbook').value),status:this.clean(this.$('ticketStatus').value)||'active',savedAt:existing?.savedAt||now,createdAt:existing?.createdAt||now,updatedAt:now,ticket:raw,canonical}}
""")

old="await this.loadTicketGames();if(!this.restoreSelectGame(this.$('ticketGame'),ticket))this.setPair(this.$('ticketGame'),this.$('ticketGameManual'),ticket.game);"
new="await this.loadTicketGames();this.restoreGameSelection(this.$('ticketGame'),this.$('ticketGameManual'),ticket);"
require(s.count(old)==1,'Ticket restore patch target not found exactly once.')
s=s.replace(old,new,1)
old="await this.loadLegGames(leg);const source=saved.game?saved:ticket;if(!this.restoreSelectGame(leg.querySelector('.lgame'),source))this.setPair(leg.querySelector('.lgame'),leg.querySelector('.lgameManual'),source.game);"
new="await this.loadLegGames(leg);"
require(s.count(old)==1,'Leg restore patch target not found exactly once.')
s=s.replace(old,new,1)
old="    currentCode(){return this.formatTicket(this.canonicalTicket())}"
new="    currentCode(){const raw=this.rawTicket();return this.formatTicket(this.canonicalTicket(raw))}"
require(s.count(old)==1,'Current code patch target not found exactly once.')
s=s.replace(old,new,1)

builder_path.write_text(s)

s=storage_test.read_text()
needle="assert.equal(S.remove(null),0,'Removing no IDs must be a no-op');\n\nconsole.log('Storage contract verified.');"
replacement="""assert.equal(S.remove(null),0,'Removing no IDs must be a no-op');

S.save([{id:'duplicate-id',ticket:{title:'Existing'},canonical:{title:'Existing'},status:'active'}]);
const inserted=S.upsert({ticket:{title:'New'},canonical:{title:'New'},status:'active'});
assert.equal(inserted.id,'duplicate-id-1','A generated ID collision must be resolved without overwriting an existing ticket');
assert.equal(S.load().length,2,'Generated ID collisions must preserve both tickets');
assert.equal(S.find('duplicate-id').ticket.title,'Existing','Generated ID collisions must not replace the existing ticket');

console.log('Storage contract verified.');"""
require(s.count(needle)==1,'Storage test patch target not found exactly once.')
storage_test.write_text(s.replace(needle,replacement,1))

s=catalog_test.read_text()
old="assert.throws(()=>C.TYPES.MLB.push('tamper'),TypeError,'Consumers must not be able to mutate shared market definitions');"
new="assert.throws(()=>C.TYPES.MLB.push('tamper'),error=>error?.name==='TypeError','Consumers must not be able to mutate shared market definitions');"
require(s.count(old)==1,'Catalog test patch target not found exactly once.')
catalog_test.write_text(s.replace(old,new,1))

s=builder_test.read_text()
needle="builder.selectGameForTeam({},'TB');assert.equal(uniqueSelect.value,'TB@BOS','Team-first auto-selection must select a unique matching game');\n"
addition="""
const ambiguousInput={value:'',classList:new FakeClassList('hide')};duplicateSelect.value='';
assert.equal(builder.restoreGameSelection(duplicateSelect,ambiguousInput,{game:'TB@BOS'}),true,'Ambiguous saved games must be preserved for review');
assert.equal(duplicateSelect.value,C.MANUAL,'An ambiguous saved game must not silently bind to Game 1');
assert.equal(ambiguousInput.value,'TB@BOS','An ambiguous saved game must retain its original game code');
"""
require(s.count(needle)==1,'Builder ambiguity test target not found exactly once.')
s=s.replace(needle,needle+addition,1)
needle="builder.populateTypes(typeLeg,'future_market');\nassert.equal(typeSelect.value,'future_market','Loading an unknown saved market must preserve it instead of silently substituting another type');\n"
addition="""
const unknownTargetSelect=new FakeSelect([new FakeOption('','Select target')]),unknownCustom={value:'',classList:new FakeClassList('hide')},unknownTypeSelect=new FakeSelect([new FakeOption('future_market','Unsupported')]);
const unknownLeg={querySelector:selector=>({'.ltype':unknownTypeSelect,'.targetSelect':unknownTargetSelect,'.targetCustom':unknownCustom}[selector]||null)};
builder.setTarget(unknownLeg,'7.5');
assert.equal(unknownTargetSelect.value,C.MANUAL,'An unknown saved market must retain a custom target channel');
assert.equal(builder.targetValue(unknownLeg),'7.5','An unknown saved market must preserve its original target');
"""
require(s.count(needle)==1,'Builder unknown-market test target not found exactly once.')
builder_test.write_text(s.replace(needle,needle+addition,1))

expected={
    builder_path:'209fcd70d403868122f4dafc12e49ab755023a497be7f6a8ceea533f377359e8',
    storage_test:'e31fe650ae5730f301b7f59b30e7a19e7f3dd9957f218bcfa489d8d37f7e2ea2',
    catalog_test:'d26ee347d2c48d1ed6e21a63fff963eb1bab7705f512bfc45aeb2ee0cc5dc059',
    builder_test:'4133ad2696a69c5cb9cdd7b513549adca4330daabad38d13af3165ef4d36bdb8',
}
for path,wanted in expected.items():
    actual=digest(path)
    require(actual==wanted,f'{path} produced {actual}, expected {wanted}.')
print('Gate 2 corrections applied with exact verified hashes.')
