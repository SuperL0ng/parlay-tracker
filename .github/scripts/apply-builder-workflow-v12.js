const fs = require('fs');
const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

const oldPreview = '<section class="card"><div class="ticketTop"><strong>LIVE TICKET PREVIEW</strong><span id="previewStatus">updates as you edit</span></div><div id="preview" class="preview"></div></section>';
const newPreview = '<section class="card previewCard"><div class="ticketTop"><strong>LIVE TICKET PREVIEW</strong><div class="previewTools"><span id="previewStatus">updates as you edit</span><button id="codeMenuBtn" class="ghost codeMenuBtn" type="button" aria-label="Ticket code options">•••</button></div></div><div id="preview" class="preview"></div></section>';
if (!s.includes(oldPreview)) throw new Error('preview section target not found');
s = s.replace(oldPreview, newPreview);

const oldOutput = '<section class="card"><div class="btns"><button onclick="generate()">Generate Ticket Code</button><button class="ghost" onclick="copyOutput()">Copy Output</button></div><label>Output</label><textarea id="output"></textarea></section>';
const newOutput = '<section id="codePanel" class="card codePanel hide"><div class="ticketTop"><strong>TICKET CODE</strong><button id="hideCodeBtn" class="ghost hideCodeBtn" type="button">Hide</button></div><textarea id="output" readonly></textarea></section>';
if (!s.includes(oldOutput)) throw new Error('output section target not found');
s = s.replace(oldOutput, newOutput);

const sheet = `
<div id="codeSheetBackdrop" class="codeSheetBackdrop hide" aria-hidden="true"></div>
<div id="codeSheet" class="codeSheet hide" role="dialog" aria-modal="true" aria-labelledby="codeSheetTitle">
  <div class="sheetHandle"></div>
  <strong id="codeSheetTitle">TICKET CODE</strong>
  <button id="showCodeAction" class="sheetAction ghost" type="button">Show Code</button>
  <button id="copyCodeAction" class="sheetAction" type="button">Copy Code</button>
  <button id="cancelCodeAction" class="sheetCancel ghost" type="button">Cancel</button>
</div>
`;
s = s.replace('</body>', sheet + '\n</body>');

const css = `
/* BUILDER_SELECTION_AND_RESULT_V12 */
.previewTools{display:flex;align-items:center;gap:8px;min-width:0}
.codeMenuBtn{width:42px;min-width:42px;height:34px;padding:0;font-size:16px;letter-spacing:.08em;line-height:1}
.codePanel{scroll-margin-top:12px}
.codePanel textarea{min-height:190px;margin-top:10px}
.hideCodeBtn{width:auto;min-width:64px;padding:8px 10px;font-size:10px}
.codeSheetBackdrop{position:fixed;inset:0;z-index:90;background:rgba(8,12,18,.48);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
.codeSheet{position:fixed;left:0;right:0;bottom:0;z-index:100;padding:10px 14px calc(14px + env(safe-area-inset-bottom));border-radius:18px 18px 0 0;border:1px solid rgba(255,255,255,.85);background:linear-gradient(180deg,#f7f9fc,#c8d0db 65%,#9da8b7);box-shadow:0 -12px 30px rgba(0,0,0,.28)}
.codeSheet strong{display:block;margin:4px 0 12px;text-align:center;color:#596372;font-size:11px;letter-spacing:.16em}
.sheetHandle{width:42px;height:5px;margin:0 auto 8px;border-radius:5px;background:rgba(65,73,84,.42)}
.sheetAction,.sheetCancel{display:block;width:100%;margin-top:9px}
body.codeSheetOpen{overflow:hidden}
`;
s = s.replace('</style>', css + '\n</style>');

const js = `
/* BUILDER_SELECTION_AND_RESULT_V12 */
const TEAM_NAMES={
MLB:{ARI:'Arizona Diamondbacks',ATH:'Athletics',ATL:'Atlanta Braves',BAL:'Baltimore Orioles',BOS:'Boston Red Sox',CHC:'Chicago Cubs',CWS:'Chicago White Sox',CIN:'Cincinnati Reds',CLE:'Cleveland Guardians',COL:'Colorado Rockies',DET:'Detroit Tigers',HOU:'Houston Astros',KC:'Kansas City Royals',LAA:'Los Angeles Angels',LAD:'Los Angeles Dodgers',MIA:'Miami Marlins',MIL:'Milwaukee Brewers',MIN:'Minnesota Twins',NYM:'New York Mets',NYY:'New York Yankees',PHI:'Philadelphia Phillies',PIT:'Pittsburgh Pirates',SD:'San Diego Padres',SEA:'Seattle Mariners',SF:'San Francisco Giants',STL:'St. Louis Cardinals',TB:'Tampa Bay Rays',TEX:'Texas Rangers',TOR:'Toronto Blue Jays',WSH:'Washington Nationals'},
NBA:{ATL:'Atlanta Hawks',BOS:'Boston Celtics',BKN:'Brooklyn Nets',CHA:'Charlotte Hornets',CHI:'Chicago Bulls',CLE:'Cleveland Cavaliers',DAL:'Dallas Mavericks',DEN:'Denver Nuggets',DET:'Detroit Pistons',GS:'Golden State Warriors',HOU:'Houston Rockets',IND:'Indiana Pacers',LAC:'Los Angeles Clippers',LAL:'Los Angeles Lakers',MEM:'Memphis Grizzlies',MIA:'Miami Heat',MIL:'Milwaukee Bucks',MIN:'Minnesota Timberwolves',NOP:'New Orleans Pelicans',NYK:'New York Knicks',OKC:'Oklahoma City Thunder',ORL:'Orlando Magic',PHI:'Philadelphia 76ers',PHX:'Phoenix Suns',POR:'Portland Trail Blazers',SAC:'Sacramento Kings',SA:'San Antonio Spurs',TOR:'Toronto Raptors',UTA:'Utah Jazz',WAS:'Washington Wizards'},
WNBA:{ATL:'Atlanta Dream',CHI:'Chicago Sky',CON:'Connecticut Sun',DAL:'Dallas Wings',GS:'Golden State Valkyries',IND:'Indiana Fever',LA:'Los Angeles Sparks',LV:'Las Vegas Aces',MIN:'Minnesota Lynx',NY:'New York Liberty',PHX:'Phoenix Mercury',SEA:'Seattle Storm',WAS:'Washington Mystics'},
WC:{ARG:'Argentina',AUS:'Australia',AUT:'Austria',BEL:'Belgium',BIH:'Bosnia and Herzegovina',BRA:'Brazil',CAN:'Canada',CIV:'Ivory Coast',COL:'Colombia',CRO:'Croatia',CZE:'Czechia',DEN:'Denmark',ECU:'Ecuador',EGY:'Egypt',ENG:'England',ESP:'Spain',FRA:'France',GER:'Germany',GHA:'Ghana',HTI:'Haiti',IRI:'Iran',IRQ:'Iraq',JPN:'Japan',KOR:'South Korea',KSA:'Saudi Arabia',MAR:'Morocco',MEX:'Mexico',NED:'Netherlands',NOR:'Norway',NZL:'New Zealand',PAN:'Panama',PAR:'Paraguay',POR:'Portugal',QAT:'Qatar',RSA:'South Africa',SCO:'Scotland',SEN:'Senegal',SUI:'Switzerland',TUN:'Tunisia',TUR:'Türkiye',URU:'Uruguay',USA:'United States'}
};
function teamDisplayName(code,l){return TEAM_NAMES[l]?.[code]||code}
function gameDisplayName(value,l){const teams=gameTeams(value);return teams.length===2?teamDisplayName(teams[0],l)+' @ '+teamDisplayName(teams[1],l):value}
function relabelGameSelect(sel,l){if(!sel)return;[...sel.options].forEach(o=>{if(!o.value||o.value===MAN)return;const text=gameDisplayName(o.value,l);if(o.textContent!==text)o.textContent=text})}
function relabelTeamSelect(sel,l){if(!sel)return;[...sel.options].forEach(o=>{if(!o.value||o.value===MAN)return;const text=teamDisplayName(o.value,l);if(o.textContent!==text)o.textContent=text})}
function selectMatchingGameForTeam(teamSel){if(!teamSel||!teamSel.value||teamSel.value===MAN)return;const leg=teamSel.closest('.leg');const gameSel=ttype()==='parlay'&&leg?leg.querySelector('.lgame'):$('ticketGame');if(!gameSel)return;const match=[...gameSel.options].find(o=>o.value&&o.value!==MAN&&gameTeams(o.value).includes(teamSel.value));if(!match)return;if(gameSel.value!==match.value){gameSel.value=match.value;gameSel.dispatchEvent(new Event('change',{bubbles:true}))}}
function refreshReadableOptions(root=document){relabelGameSelect($('ticketGame'),league());document.querySelectorAll('.leg').forEach(d=>{const l=legLeague(d);relabelGameSelect(d.querySelector('.lgame'),l);relabelTeamSelect(d.querySelector('.team'),l)});document.querySelectorAll('.team').forEach(selectMatchingGameForTeam)}
const readableOptionsObserver=new MutationObserver(()=>requestAnimationFrame(()=>refreshReadableOptions()));
window.addEventListener('load',()=>{readableOptionsObserver.observe(document.body,{childList:true,subtree:true});requestAnimationFrame(()=>refreshReadableOptions())});
document.addEventListener('change',e=>{if(e.target.matches('.team'))selectMatchingGameForTeam(e.target)});

function openCodeSheet(){ $('codeSheet').classList.remove('hide');$('codeSheetBackdrop').classList.remove('hide');$('codeSheetBackdrop').setAttribute('aria-hidden','false');document.body.classList.add('codeSheetOpen') }
function closeCodeSheet(){ $('codeSheet').classList.add('hide');$('codeSheetBackdrop').classList.add('hide');$('codeSheetBackdrop').setAttribute('aria-hidden','true');document.body.classList.remove('codeSheetOpen') }
function currentTicketCode(){return formatTicket(canonicalTicket())}
function showTicketCode(){const panel=$('codePanel');$('output').value=currentTicketCode();panel.classList.remove('hide');closeCodeSheet();requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}))}
async function copyTicketCode(){const code=currentTicketCode();$('output').value=code;try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(code);else{const ta=document.createElement('textarea');ta.value=code;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}$('previewStatus').textContent='code copied'}catch(e){$('previewStatus').textContent='copy failed'}closeCodeSheet()}
window.addEventListener('load',()=>{$('codeMenuBtn').addEventListener('click',openCodeSheet);$('codeSheetBackdrop').addEventListener('click',closeCodeSheet);$('cancelCodeAction').addEventListener('click',closeCodeSheet);$('showCodeAction').addEventListener('click',showTicketCode);$('copyCodeAction').addEventListener('click',copyTicketCode);$('hideCodeBtn').addEventListener('click',()=>$('codePanel').classList.add('hide'))});
`;
s = s.replace('</script>', js + '\n</script>');

fs.writeFileSync(path, s);
