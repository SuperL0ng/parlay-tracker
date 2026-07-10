const fs = require('fs');
const path = 'index.html';
let s = fs.readFileSync(path, 'utf8');

// Remove every prior reorder-mode patch block before applying one clean version.
s = s.replace(/\/\* BUILDER_REORDER_MODE_V7 \*\/[\s\S]*?(?=<\/style>)/g, '');
s = s.replace(/\/\* BUILDER_REORDER_MODE_V8 \*\/[\s\S]*?(?=<\/style>)/g, '');
s = s.replace(/\/\* BUILDER_REORDER_MODE_V9 \*\/[\s\S]*?(?=<\/style>)/g, '');
s = s.replace(/\/\* BUILDER_REORDER_MODE_V7 \*\/[\s\S]*?(?=<\/script>)/g, '');
s = s.replace(/\/\* BUILDER_REORDER_MODE_V8 \*\/[\s\S]*?(?=<\/script>)/g, '');
s = s.replace(/\/\* BUILDER_REORDER_MODE_V9 \*\/[\s\S]*?(?=<\/script>)/g, '');

const css = String.raw`
/* BUILDER_REORDER_MODE_V9 */
.legsTitleRow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}
.reorderToggle{display:none;width:auto;min-width:126px;padding:9px 11px;font-size:11px}
.reorderToggle.visible{display:inline-flex;align-items:center;justify-content:center}
.reorderToggle.active{background:linear-gradient(180deg,#f8fbff,#d7dee8 48%,#7e8a99);border-color:rgba(105,116,130,.65);color:#111820}
.leg .headControls{display:flex;align-items:center;justify-content:flex-end;gap:14px}
.leg .grip{display:none}
.leg .miniRemove{display:none;width:42px;height:34px;padding:0}
.leg .miniRemove.preReorderVisible{display:inline-flex}
body.reorderMode .leg{margin-top:10px;padding:11px 10px;border:1px solid rgba(255,255,255,.72);border-radius:10px;background:linear-gradient(180deg,rgba(250,252,255,.86),rgba(197,206,218,.82));box-shadow:inset 0 1px 0 rgba(255,255,255,.88),0 3px 8px rgba(0,0,0,.12);touch-action:none;-webkit-user-select:none;user-select:none}
body.reorderMode .leg.straightInactive{opacity:1;filter:none}
body.reorderMode .leg > :not(.legHead){display:none!important}
body.reorderMode .legHead{display:grid;grid-template-columns:minmax(0,1fr) 72px minmax(110px,1fr);align-items:center;gap:18px;margin:0;min-height:44px}
body.reorderMode .legHeadLeft{min-width:0}
body.reorderMode .leg .headControls{display:contents}
body.reorderMode .leg .grip{display:inline-flex!important;grid-column:2;justify-self:center;width:72px;height:38px;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
body.reorderMode .leg .miniRemove{display:inline-flex!important;grid-column:3;justify-self:stretch;width:100%;min-width:110px;height:38px;padding:0 14px}
body.reorderMode .straightPick{display:none!important}
.reorderSummary{max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#66717f;font-size:11px;font-weight:750;letter-spacing:0;text-transform:none}
.leg.reorderDragging{opacity:.82!important;filter:none!important;position:relative;z-index:30;transform:scale(1.015);box-shadow:0 12px 24px rgba(0,0,0,.24)!important}
.leg.reorderBefore{box-shadow:0 -4px 0 #c89232,inset 0 1px 0 rgba(255,255,255,.88),0 3px 8px rgba(0,0,0,.12)!important}
.reorderHint{display:none;margin:8px 0 2px;text-align:center;color:#596372;font-size:11px;font-weight:750;letter-spacing:.04em}
body.reorderMode .reorderHint{display:block}
`;

const js = String.raw`
/* BUILDER_REORDER_MODE_V9 */
let reorderMode = false;
let reorderLeg = null;
let reorderPointerId = null;
function legsArray(){return [...document.querySelectorAll('#legs > .leg')]}
function ensureReorderToolbar(){const legs=document.getElementById('legs');if(!legs)return;const card=legs.closest('.card');if(!card||document.getElementById('reorderLegsBtn'))return;const heading=card.querySelector(':scope > strong');const row=document.createElement('div');row.className='legsTitleRow';if(heading){heading.parentNode.insertBefore(row,heading);row.appendChild(heading)}else{row.innerHTML='<strong>LEGS</strong>';card.insertBefore(row,card.firstChild)}const btn=document.createElement('button');btn.id='reorderLegsBtn';btn.className='ghost reorderToggle';btn.type='button';btn.textContent='Reorder Legs';btn.addEventListener('click',()=>setReorderMode(!reorderMode));row.appendChild(btn);const hint=document.createElement('div');hint.className='reorderHint';hint.textContent='Hold the center handle and drag. Use Remove to delete a leg.';row.insertAdjacentElement('afterend',hint)}
function updateReorderSummaries(){legsArray().forEach((leg,i)=>{let summary=leg.querySelector('.reorderSummary');if(!summary){summary=document.createElement('span');summary.className='reorderSummary';leg.querySelector('.legHeadLeft')?.appendChild(summary)}const lbl=clean(leg.querySelector('.lbl')?.value);summary.textContent=lbl||('Leg '+(i+1))})}
function applyReorderState(){ensureReorderToolbar();const legs=legsArray();const btn=document.getElementById('reorderLegsBtn');if(reorderMode&&legs.length<2)reorderMode=false;document.body.classList.toggle('reorderMode',reorderMode);if(btn){btn.classList.toggle('visible',legs.length>=2);btn.classList.toggle('active',reorderMode);btn.textContent=reorderMode?'Done':'Reorder Legs'}updateReorderSummaries();legs.forEach(leg=>{const remove=leg.querySelector('.miniRemove');const grip=leg.querySelector('.grip');if(remove){remove.classList.remove('hide');remove.classList.toggle('preReorderVisible',!reorderMode&&legs.length>=2);remove.disabled=false;remove.textContent=reorderMode?'Remove':'−';remove.setAttribute('aria-label','Remove leg')}if(grip){grip.classList.toggle('hide',!reorderMode||legs.length<2);grip.textContent='≡';grip.setAttribute('aria-label','Drag to reorder leg')}leg.querySelectorAll('input,select,textarea,button').forEach(el=>{if(el.classList.contains('miniRemove'))return;el.disabled=reorderMode})});if(!reorderMode&&typeof updateStraightStates==='function')updateStraightStates()}
function setReorderMode(on){reorderMode=Boolean(on)&&legsArray().length>=2;clearReorderDrag();applyReorderState()}
function clearReorderTargets(){document.querySelectorAll('.leg.reorderBefore').forEach(x=>x.classList.remove('reorderBefore'))}
function clearReorderDrag(){clearReorderTargets();if(reorderLeg)reorderLeg.classList.remove('reorderDragging');reorderLeg=null;reorderPointerId=null}
function startReorderDrag(e){if(!reorderMode)return;const grip=e.target.closest('.grip');if(!grip||grip.classList.contains('hide'))return;const leg=grip.closest('#legs > .leg');if(!leg)return;e.preventDefault();reorderLeg=leg;reorderPointerId=e.pointerId;leg.classList.add('reorderDragging');grip.setPointerCapture?.(e.pointerId)}
function continueReorderDrag(e){if(!reorderMode||!reorderLeg||e.pointerId!==reorderPointerId)return;e.preventDefault();const siblings=legsArray().filter(x=>x!==reorderLeg);clearReorderTargets();let before=null;for(const item of siblings){const r=item.getBoundingClientRect();if(before===null&&e.clientY<r.top+r.height/2)before=item}if(before){before.classList.add('reorderBefore');document.getElementById('legs').insertBefore(reorderLeg,before)}else document.getElementById('legs').appendChild(reorderLeg)}
function finishReorderDrag(e){if(!reorderLeg||e.pointerId!==reorderPointerId)return;e.preventDefault();clearReorderDrag();renumber();updateReorderSummaries();preview()}
const originalAddLegV9=window.addLeg;window.addLeg=function(){originalAddLegV9();requestAnimationFrame(()=>applyReorderState())};
const originalRemoveLegV9=window.removeLeg;window.removeLeg=function(btn){originalRemoveLegV9(btn);requestAnimationFrame(()=>applyReorderState())};
const reorderObserverV9=new MutationObserver(()=>requestAnimationFrame(applyReorderState));
window.addEventListener('load',()=>{ensureReorderToolbar();applyReorderState();const legs=document.getElementById('legs');if(legs)reorderObserverV9.observe(legs,{childList:true})});
document.addEventListener('pointerdown',startReorderDrag,{passive:false,capture:true});
document.addEventListener('pointermove',continueReorderDrag,{passive:false});
document.addEventListener('pointerup',finishReorderDrag,{passive:false});
document.addEventListener('pointercancel',finishReorderDrag,{passive:false});
`;

s = s.replace('</style>', css + '\n</style>');
s = s.replace('</script>', js + '\n</script>');
if(!s.includes('BUILDER_REORDER_MODE_V9')) throw new Error('V9 patch was not applied');
fs.writeFileSync(path, s);