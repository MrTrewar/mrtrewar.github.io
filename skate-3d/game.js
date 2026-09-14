import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { Run, FIXED_STEP, PHYSICS, BIOMES, readRecords, writeRecord } from './simulation.mjs';
import { SkateAudio } from './skate-audio.mjs';
import { CHALLENGES, dailyCourse, readProgress, saveProgress, completeChallenges, readGhost, saveGhost, ghostAt } from './progress.mjs';
import { trickPose } from './trick-pose.mjs';
import { WorldScene } from './world-scene.mjs';
import { PixelEffects, CRASH_DURATION } from './pixel-effects.mjs';
import { sideCameraCenter, sideCameraWidth } from './side-camera.mjs';

const $ = id => document.getElementById(id);
const mobile = matchMedia('(pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, skater, trickRig, rider, board;
let state = 'loading', run, finalResult = null, saved = false;
let accumulator = 0, lastTime = 0, visualTime = 0;
let kick = 0, trickUntil = 0, lastHud = 0;
let world, effects, viewWidth = 28, sunLight, fillLight, hemiLight;
let levelBannerUntil = 0, lastBlastSound = 0;
const heldKeys = new Set();
const heldPointers = new Map();
const objectMeshes = new Map();
const geometryCache = new Map();
const lookTarget = new THREE.Vector3();
const audio = new SkateAudio();
let mode = 'endless', runDaily = null, ghost = null, ghostData = null, ghostCursor = 0;
let replayFrames = [], nextReplayTime = .1, deckMaterial;
const bones = new Map();
const safeStorage = (fn, fallback = null) => { try { return fn(localStorage); } catch { return fallback; } };
let progress = safeStorage(readProgress, { unlocked: [], selected: 'default' });
const scope = () => mode === 'daily' ? (runDaily || dailyCourse()).scope : 'endless';

function geometry(kind, values) {
  const key = kind + JSON.stringify(values);
  if (!geometryCache.has(key)) geometryCache.set(key, new THREE[kind](...values));
  return geometryCache.get(key);
}
function mesh(parent, geo, mat, x=0, y=0, z=0, shadow=true) {
  const item = new THREE.Mesh(geo, mat);
  item.position.set(x,y,z); item.castShadow = shadow; item.receiveShadow = true;
  parent.add(item); return item;
}
function showError(message) {
  state = 'error'; audio.silence();
  $('error-message').textContent = message;
  $('error').hidden = false;
  $('intro').hidden = true;
  $('pause').disabled = true;
}

function readLocalRecords() {
  try { return readRecords(localStorage, scope()); } catch { return []; }
}
function best() { return readLocalRecords()[0]?.score || 0; }
function format(value) { return Math.floor(value).toString().padStart(4,'0'); }

function resizeScene() {
  const factor = innerWidth < 600 ? 1 : Math.max(2, Math.floor(innerWidth / 720));
  renderer.setPixelRatio(1);
  renderer.setSize(Math.ceil(innerWidth / factor), Math.ceil(innerHeight / factor), false);
  updateCamera(0, true);
}
function updateCamera(dt, snap = false) {
  const aspect = innerWidth / innerHeight;
  const target = sideCameraWidth(aspect, run?.speed || PHYSICS.baseSpeed);
  viewWidth = snap ? target : THREE.MathUtils.damp(viewWidth, target, 2, dt);
  camera.left = -viewWidth / 2; camera.right = viewWidth / 2;
  camera.top = viewWidth / aspect / 2; camera.bottom = -camera.top;
  const pixel = viewWidth / renderer.domElement.width;
  const centerZ = state === 'intro' ? viewWidth * .18 : sideCameraCenter(viewWidth);
  const centerY = 1.1 + (run?.lastSurfaceY || 0) * .45;
  lookTarget.set(0, Math.round(centerY / pixel) * pixel, Math.round(centerZ / pixel) * pixel);
  camera.position.set(32, lookTarget.y + 5.2, lookTarget.z);
  if (kick > 0 && !reducedMotion) camera.position.y += Math.sin(visualTime * 65) * kick;
  kick = Math.max(0, kick - dt * .55);
  camera.lookAt(lookTarget); camera.updateProjectionMatrix();
}
function buildScene() {
  renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#426d63');
  scene.fog = new THREE.Fog('#426d63', 34, 100);
  camera = new THREE.OrthographicCamera(-14, 14, 9, -9, .1, 160);
  hemiLight = new THREE.HemisphereLight('#e8edc7', '#263e34', 2.1); scene.add(hemiLight);
  fillLight = new THREE.DirectionalLight('#fff0d0',1.5);fillLight.position.set(20,7,5);scene.add(fillLight);
  const sun = sunLight = new THREE.DirectionalLight('#ffe2a0', 3.1);
  sun.position.set(10, 24, -18); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 25, bottom: -25, near: 1, far: 85 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .035; scene.add(sun, sun.target);
  world = new WorldScene(scene, { reducedMotion }); effects = new PixelEffects(scene, reducedMotion);
  resizeScene();
}
function updatePalette(dt, snap = false) {
  const level=BIOMES[world.index],blend=snap?1:1-Math.exp(-dt*2.5);
  scene.background.lerp(new THREE.Color(level.sky),blend);scene.fog.color.copy(scene.background);
  scene.fog.near=THREE.MathUtils.lerp(scene.fog.near,level.fogNear,blend);
  scene.fog.far=THREE.MathUtils.lerp(scene.fog.far,level.fogFar,blend);
  for(const [light,color,power] of [[sunLight,level.sun,level.sunPower],[fillLight,level.fill,level.fillPower],[hemiLight,level.hemi,level.hemiPower]]) {
    light.color.lerp(new THREE.Color(color),blend);light.intensity=THREE.MathUtils.lerp(light.intensity,power,blend);
  }
  hemiLight.groundColor.lerp(new THREE.Color(level.ground),blend);
}

function releaseEntity(object) {
  scene.remove(object); object.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
}
function updateEntities() {
  const live = new Set(run.entities.map(e => e.id));
  for (const [id, object] of objectMeshes) if (!live.has(id)) { releaseEntity(object); objectMeshes.delete(id); }
  for (const entity of run.entities) {
    let object = objectMeshes.get(entity.id);
    if (object && object.userData.level !== world.index) { releaseEntity(object); objectMeshes.delete(entity.id); object = null; }
    if (!object) { object = world.surface(entity); scene.add(object); objectMeshes.set(entity.id, object); }
    object.position.set(0, entity.y, entity.z);
  }
}

function announce(text) {$('trick').textContent=text;$('trick').classList.add('visible');trickUntil=visualTime+1.1;}
function onEvent(event) {
  if(event.type==='score')announce(event.label + ' +' + event.points);
  if(event.type==='jump'){$('quality').textContent='';announce(event.trick.label);audio.hit('jump');}
  if(event.type==='speed')announce('TEMPO ' + Math.round(event.speed*3.6) + ' KM/H');
  if(event.type==='grind')audio.hit('grind');
  if(event.type==='land'){kick=.055;audio.hit('land');}
  if(event.type==='landed-trick'&&event.trick){$('quality').textContent=event.quality;if(event.quality==='PERFECT')audio.hit('perfect');}
  if(event.type==='bank'){announce('GESICHERT +' + event.points);audio.hit('bank');}
  if(event.type==='crash'){
    clearMovement(); state='crashing'; kick=reducedMotion?0:.3;
    effects.crash(run.y, -run.x); lastBlastSound=1; audio.hit('crash');
    $('touch-controls').hidden=true; $('coach').hidden=true; $('pause').disabled=true;
    $('trick').classList.remove('visible'); $('quality').textContent='';
  }
}
function buildGhost() {
  ghost = new THREE.Group(); scene.add(ghost);
  const mat = new THREE.MeshBasicMaterial({color:'#c8f8ef',transparent:true,opacity:.25,depthWrite:false});
  const deck = mesh(ghost, geometry('BoxGeometry',[.48,.09,1.58]),mat,0,.17,0,false);
  mesh(ghost, geometry('BoxGeometry',[.5,.55,.4]),mat,0,1.1,-.07,false);
  mesh(ghost, geometry('IcosahedronGeometry',[.21,1]),mat,0,1.65,-.12,false);
  for(const z of [-.4,.4])mesh(ghost,geometry('CylinderGeometry',[.12,.12,.65,6]),mat,0,.58,z,false);
  deck.rotation.y=0;ghost.scale.setScalar(1.65);ghost.visible=false;
}
function updateGhost() {
  if(!ghost)return;
  const pose=ghostData&&ghostAt(ghostData.frames,run.time,ghostCursor);
  ghost.visible=Boolean(pose&&state==='playing'&&Math.abs(pose.distance-run.distance)<100);
  if(pose){ghostCursor=pose.cursor;ghost.position.set(0,pose.y,run.distance-pose.distance-pose.x);}
}
function applyDeck() {
  if(!deckMaterial)return;
  const unlocked=CHALLENGES.find(c=>c.id===progress.selected);
  deckMaterial.color.set(unlocked?.color || '#ffffff');
}
function renderProgress() {
  const list=$('challenges');list.replaceChildren();
  for(const challenge of CHALLENGES){
    const li=document.createElement('li');
    const done=progress.unlocked.includes(challenge.id);
    li.style.setProperty('--swatch',challenge.color);
    const name=document.createElement('strong');name.textContent=challenge.name;
    const status=document.createElement('small');status.textContent=done?'FREIGESCHALTET':'NOCH GESPERRT';
    const requirement=document.createElement('span');requirement.textContent=challenge.label;
    li.append(name,status,requirement);
    li.classList.toggle('complete',done);list.append(li);
  }
  const options=$('deck-options');options.replaceChildren();
  for(const option of [{id:'default',name:'ORIGINAL',color:'#ff9b30'},...CHALLENGES.filter(c=>progress.unlocked.includes(c.id))]){
    const button=document.createElement('button');button.type='button';button.textContent=option.name;
    button.dataset.deck=option.id;
    button.style.setProperty('--swatch',option.color);button.setAttribute('aria-pressed',String(progress.selected===option.id));
    button.addEventListener('click',()=>{
      progress.selected=option.id;safeStorage(storage=>saveProgress(storage,progress));applyDeck();renderProgress();
      options.querySelector('[data-deck="'+option.id+'"]').focus({preventScroll:true});
    });options.append(button);
  }
  const selected=CHALLENGES.find(c=>c.id===progress.selected)?.name || 'ORIGINAL';
  $('deck-status').textContent='Aktives Board: '+selected+'. Gleiche Fahrwerte bei jeder Farbe.';
}
function updateMode() {
  for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
  const daily=dailyCourse();
  $('mode-info').textContent=mode==='daily'?'Tagesline '+daily.day+' (UTC). Gleicher Kurs. Dein Rekord als Ghost.':'Kurze Landeflaechen und weite Transfers. Nicht immer an der Kante springen. A/D korrigiert die Flugweite.';
  $('board-scope').textContent=mode==='daily'?'TAGESLINE / DIESER BROWSER':'ENDLOS / DIESER BROWSER';
  renderRecords();
}
function showIntro() {
  if(!['over','paused'].includes(state))return;
  clearMovement();state='intro';runDaily=null;resetRun();
  for(const id of ['end','hud','pause-panel','touch-controls','coach','run-strip'])$(id).hidden=true;
  $('intro').hidden=false;$('pause').disabled=true;document.body.classList.remove('playing');
  updateMode();renderProgress();
}

function resetRun() {
  for(const object of objectMeshes.values())releaseEntity(object);
  objectMeshes.clear();
  effects.reset();lastBlastSound=0;world.setLevel(0);levelBannerUntil=0;$('level-banner').hidden=true;
  document.body.dataset.level='jungle';updatePalette(0,true);
  runDaily=mode==='daily'?dailyCourse():null;
  run=new Run(runDaily?.seed || Math.floor(Math.random()*4294967295),onEvent);
  ghostData=runDaily?safeStorage(storage=>readGhost(storage,runDaily.day)):null;
  ghostCursor=0;replayFrames=[[0,0,0,0]];nextReplayTime=.1;
  $('quality').textContent='';$('ghost-label').textContent=ghostData?'GHOST: DEIN TAGESREKORD':'';
  clearMovement();
  finalResult=null;saved=false;accumulator=0;kick=0;lastHud=0;updateHud();
  $('entry').hidden=true;$('entry').reset();$('save-status').textContent='';$('open-entry').hidden=false;
  $('trick').classList.remove('visible');$('trick').textContent='';trickUntil=0;
}
function start() {
  if(!['intro','over','paused'].includes(state))return;
  resetRun();state='playing';
  updateCamera(0,true);
  for(const id of ['intro','end','pause-panel'])$(id).hidden=true;
  $('hud').hidden=false;$('touch-controls').hidden=false;$('coach').hidden=false;
  $('pause').disabled=false;$('pause').textContent='PAUSE II';document.body.classList.add('playing');
  $('run-strip').hidden=false;
  document.activeElement?.blur();audio.hit('jump');
}
function pause() {
  if(state!=='playing')return;
  clearMovement(false);audio.silence();
  state='paused';accumulator=0;$('pause-panel').hidden=false;$('touch-controls').hidden=true;$('coach').hidden=true;
  updateHud();$('resume').focus({preventScroll:true});
}
function resume() {
  if(state!=='paused')return;
  state='playing';lastTime=performance.now();accumulator=0;$('pause-panel').hidden=true;$('touch-controls').hidden=false;
  document.activeElement?.blur();
}
function finish() {
  if(state!=='crashing')return;
  state='over';finalResult=Object.freeze({score:run.score,distance:Math.floor(run.distance),combo:run.bestCombo,bestLine:run.bestLine});
  $('final-score').textContent=finalResult.score;$('final-distance').textContent=`${finalResult.distance} m`;$('final-combo').textContent=`×${finalResult.combo}`;
  $('end-title').textContent=finalResult.score>best()?'NEW BEST.':'NICE RIDE.';
  $('end-reason').textContent=run.deathReason;
  const previousUnlocks=progress.unlocked.length;
  progress=completeChallenges(progress,run.stats);
  const progressSaved=safeStorage(storage=>{saveProgress(storage,progress);return true;},false);
  let ghostSaved=false;
  if(runDaily)ghostSaved=safeStorage(storage=>saveGhost(storage,runDaily.day,run.score,replayFrames),false);
  $('run-report').textContent='Beste Line: '+run.bestLine+' | Rails: '+run.stats.rails+' | Perfect: '+run.stats.perfect+' | Pro: '+run.stats.risky+(run.lostCombo?' | Verlorene Combo: '+run.lostCombo:'');
  $('unlock-report').textContent=(progress.unlocked.length>previousUnlocks?'Neue Boardfarbe freigeschaltet! ':'')+(ghostSaved?'Dein neuer Tages-Ghost ist gespeichert. ':'')+(!progressSaved?'Fortschritt konnte nicht dauerhaft gespeichert werden.':'');
  renderProgress();
  $('end').hidden=false;$('touch-controls').hidden=true;$('coach').hidden=true;$('pause').disabled=true;
  renderRecords();$('open-entry').focus({preventScroll:true});
}
function renderRecords() {
  const list=$('leaderboard');list.replaceChildren();
  const records=readLocalRecords();
  if(!records.length){const li=document.createElement('li');li.className='empty';li.textContent='Die erste Line wartet auf deinen Namen.';list.append(li);}
  for(const record of records){
    const li=document.createElement('li'),name=document.createElement('span'),score=document.createElement('strong');
    name.className='name';name.textContent=record.name;score.textContent=record.score;li.append(name,score);list.append(li);
  }
  $('intro-best').textContent=format(best());
}
function updateSoundButton() {$('sound').textContent=audio.enabled?'SOUND AN':'SOUND AUS';$('sound').setAttribute('aria-pressed',String(audio.enabled));}

function updateHud() {
  $('score').textContent=format(run.score);$('distance').textContent=Math.floor(run.distance);$('speed').textContent=Math.round(run.speed*3.6);
  $('combo').textContent='x'+run.multiplier;$('pending').textContent='+'+Math.floor(run.pending);
  $('combo-label').textContent=run.pending?(run.rail?'GRIND / COMBO OFFEN':'AUSROLLEN = SICHERN'):'NAECHSTE LINE';
  $('combo-fill').style.transform='scaleX('+Math.min(1,run.bankProgress/PHYSICS.bankTime)+')';
  const level=BIOMES[world.index],status=world.transition.status(run.score);
  $('biome').textContent='LEVEL '+(world.index+1)+' / '+level.name;
  $('level-progress').hidden=state==='crashing'||state==='over';
  $('level-progress').dataset.phase=status.phase;
  $('next-level').textContent=status.next||'ALLE WELTEN FREI';
  $('level-countdown').textContent=status.phase==='endless'?'MAX':status.phase==='countdown'?status.seconds:status.remaining.toLocaleString('de-DE');
  $('level-countdown-unit').textContent=status.phase==='endless'?'ENDLESS RUN':status.phase==='countdown'?'SEK. BIS WECHSEL':'PUNKTE FEHLEN';
  $('level-fill').style.transform='scaleX('+status.progress+')';
  $('level-track').setAttribute('aria-valuenow',String(Math.round(status.progress*100)));
  $('level-track').setAttribute('aria-valuetext',status.next?(status.phase==='countdown'?'Wechsel in '+status.seconds+' Sekunden':status.remaining+' Punkte fehlen')+' bis '+status.next:'Alle Welten freigeschaltet');
  $('run-challenge').textContent=run.stats.rails+'/3 RAILS · '+run.stats.perfect+'/5 PERFECT · '+run.stats.risky+'/3 PRO';
}

function wireInputs() {
  $('start').addEventListener('click',start);$('retry').addEventListener('click',start);$('pause-restart').addEventListener('click',start);
  $('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);
  $('sound').addEventListener('click',async()=>{await audio.enable(!audio.enabled);updateSoundButton();});
  for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{if(state!=='intro')return;mode=button.dataset.mode;runDaily=null;resetRun();updateMode();});
  $('back-menu').addEventListener('click',showIntro);$('pause-menu').addEventListener('click',showIntro);
  const closeHelp=()=>{$('help-detail').hidden=true;$('help-toggle').setAttribute('aria-expanded','false');$('help-toggle').focus();};
  $('help-toggle').addEventListener('click',()=>{
    $('help-toggle').setAttribute('aria-expanded','true');$('help-detail').hidden=false;
    $('help-detail').querySelector('.help-dialog').scrollTop=0;
    $('help-close-top').focus({preventScroll:true});
  });
  $('help-close').addEventListener('click',closeHelp);
  $('help-close-top').addEventListener('click',closeHelp);
  $('open-entry').addEventListener('click',()=>{if(state!=='over'||saved)return;$('entry').hidden=false;$('open-entry').hidden=true;$('name').focus();});
  $('entry').addEventListener('submit',event=>{
    event.preventDefault();
    if(state!=='over'||saved||!finalResult)return;
    const name=$('name').value.trim();
    if(!name){$('name').setCustomValidity('Bitte gib deinen Namen ein.');$('name').reportValidity();return;}
    try {
      const records=writeRecord(localStorage,name,finalResult,scope());
      saved=true;$('entry').hidden=true;
      const qualifies=records.some(e=>e.name===name.slice(0,16)&&e.score===finalResult.score);
      $('save-status').textContent=qualifies?'Dein Run ist eingetragen.':'Dieser Run reicht noch nicht für die Top 5. Auf zur nächsten Line!';
      renderRecords();$('retry').focus({preventScroll:true});
    }catch{$('save-status').textContent='Speichern nicht möglich. Bitte erlaube Browser-Speicher und versuche es erneut.';}
  });
  $('name').addEventListener('input',()=>$('name').setCustomValidity(''));
  window.addEventListener('keydown',event=>{
    // Typing stays inside forms; buttons retain their native Enter/Space action.
    if(event.target.closest?.('input,textarea,select,[contenteditable]'))return;
    if(state==='playing'&&['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(event.code)){
      event.preventDefault();heldKeys.add(event.code);updateMovement();return;
    }
    if(!$('help-detail').hidden){
      if(event.code==='Escape'){event.preventDefault();closeHelp();}
      if(event.code==='Tab'){
        const buttons=[...$('help-detail').querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
      return;
    }
    if(event.repeat)return;
    if(event.code==='KeyP'||event.code==='Escape'){state==='playing'?pause():resume();return;}
    if(event.target.closest?.('button')&&['Space','Enter'].includes(event.code))return;
    if(['Space','ArrowLeft','ArrowRight','ArrowUp'].includes(event.code))event.preventDefault();
    if(state==='intro'&&event.code==='Enter'){start();return;}
    if(state!=='playing')return;
    if(['Space','ArrowUp'].includes(event.code))run.jump(event.shiftKey);
    if(event.code==='KeyE')run.catch();
  });
  window.addEventListener('keyup',event=>{heldKeys.delete(event.code);updateMovement();});
  document.querySelectorAll('[data-action]').forEach(button=>{
    button.addEventListener('click',event=>{
      if(event.detail!==0||state!=='playing')return;
      if(button.dataset.action==='jump'||button.dataset.action==='pro')run.jump(button.dataset.action==='pro');
      if(button.dataset.action==='catch')run.catch();
    });
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();if(state!=='playing')return;
      const action=button.dataset.action;
      if(action==='jump'||action==='pro'){run.jump(action==='pro');return;}
      if(action==='catch'){run.catch();return;}
      button.setPointerCapture(event.pointerId);
      heldPointers.set(event.pointerId,action);updateMovement();
    });
    for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,event=>{
      heldPointers.delete(event.pointerId);updateMovement();
    });
  });

  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('blur',pause);
  window.addEventListener('resize',resizeScene);
  $('world').addEventListener('webglcontextlost',event=>{event.preventDefault();showError('Die Grafikverbindung wurde unterbrochen. Lade die Seite neu, um weiterzufahren.');});
}

function updateMovement() {
  if(!run)return;
  const pointers=[...heldPointers.values()];
  const left=heldKeys.has('KeyA')||heldKeys.has('ArrowLeft')||pointers.includes('left');
  const right=heldKeys.has('KeyD')||heldKeys.has('ArrowRight')||pointers.includes('right');
  run.steer(Number(right)-Number(left));
}
function clearMovement(clearBuffers=true){heldKeys.clear();heldPointers.clear();if(run){run.steer(0);if(clearBuffers){run.buffer=0;run.catchBuffer=0;}}}

function animateSkater(dt,isIntro) {
  const pose=trickPose(isIntro?null:run.activeTrick,run.jumpTime,run.landingTime);
  skater.visible=state!=='crashing'&&state!=='over';
  skater.position.set(0,isIntro?0:run.y-(run.rail?.10:0),isIntro?0:-run.x);
  const lean=isIntro?0:run.rail?run.balance*.16:-run.vx*.018;
  skater.rotation.z=THREE.MathUtils.damp(skater.rotation.z,lean,9,dt);
  skater.rotation.y=THREE.MathUtils.damp(skater.rotation.y,isIntro?.18:0,6,dt);
  trickRig.rotation.set(pose.pitch,pose.yaw+(isIntro?0:run.stance*Math.PI),pose.roll);
  rider.rotation.x=pose.bodyPitch;rider.position.z=pose.bodyOffsetZ;
  rider.position.y=pose.bodyLift-(pose.tuck+pose.landing)*.15;
  const bend=pose.tuck+pose.landing;
  const rotate=(name,x=0,z=0)=>{const joint=bones.get(name);if(joint){joint.bone.rotation.copy(joint.rest);joint.bone.rotation.x+=x;joint.bone.rotation.z+=z;}};
  rotate('Torso',bend*.35+pose.torsoBend,run.rail?-run.balance*.2:0);
  rotate('Head',-bend*.25);
  rotate('ThighBack',bend*.9+pose.legSpread);rotate('ShinBack',-bend*1.25);
  rotate('ThighFront',-bend*.7-pose.legSpread);rotate('ShinFront',bend*1.1);
  rotate('UpperArmL',pose.tuck*.8+pose.armReach,-pose.armSpread-(run.rail ? .3 : 0));
  rotate('UpperArmR',-pose.tuck*.8+pose.armReach,pose.armSpread+(run.rail ? .3 : 0));
  rotate('ForearmL',-pose.tuck*.5-pose.armReach*.6);rotate('ForearmR',pose.tuck*.5-pose.armReach*.6);
  board.position.set(pose.boardOffsetX,.16+pose.boardLift,pose.boardOffsetZ);
  board.rotation.set(pose.boardPitch,pose.boardYaw,pose.boardRoll);
  if(run.rail&&!isIntro)trickRig.rotation.y=run.stance*Math.PI+.05;
  if(state==='over'){trickRig.rotation.z=-.7;board.rotation.y=.8;}
}

function animate(time) {
  if(state==='error')return;
  const dt=Math.min((time-lastTime)/1000||0,.1);lastTime=time;
  if(state!=='paused')visualTime+=dt;
  if(state==='playing'){
    accumulator=Math.min(accumulator+dt,.15);
    while(accumulator>=FIXED_STEP&&state==='playing'){
      run.tick(FIXED_STEP);accumulator-=FIXED_STEP;
      if(runDaily&&run.time>=nextReplayTime&&replayFrames.length<12000){
        replayFrames.push([run.time,run.distance,run.x,run.y].map(v=>Math.round(v*1000)/1000));nextReplayTime+=.1;
      }
    }
  }
  const isIntro=state==='intro';
  const visualDt=state==='paused'?0:dt;
  if(world.update(run.distance,visualTime,run.biome,state==='playing')) {
    const level=BIOMES[world.index];document.body.dataset.level=level.id;
    $('level-kicker').textContent='LEVEL 0'+(world.index+1)+' / '+level.threshold.toLocaleString('de-DE')+' PUNKTE';
    $('level-name').textContent=level.name;levelBannerUntil=visualTime+2.4;
    audio.hit('bank');
  }
  $('level-banner').hidden=state!=='playing'||visualTime>=levelBannerUntil;
  updateEntities();animateSkater(visualDt,isIntro);updateGhost();audio.update(run,state==='playing');
  effects.update(visualDt,run,state==='playing',state==='paused');
  if(effects.burstCount>lastBlastSound){audio.hit('aftershock');lastBlastSound=effects.burstCount;}
  if(state==='crashing'&&effects.crashAge>=CRASH_DURATION)finish();
  updatePalette(visualDt);
  updateCamera(visualDt);
  if(time-lastHud>70){
    updateHud();
    const surface=run.entities.find(e=>e.id===run.support);
    const riderAt=run.distance+run.x, approachSpeed=Math.max(1,run.speed+run.vx);
    const nearEdge=surface&&surface.at+surface.length/2-riderAt<approachSpeed*.32;
    const next=surface&&run.entities.filter(e=>!e.optional&&e.at-e.length/2>=surface.at+surface.length/2-.01).sort((a,b)=>a.at-b.at)[0];
    const approach=surface&&surface.at+surface.length/2-riderAt<approachSpeed*1.3;
    const precision=approach&&next?.motif==='precision',distance=approach&&next?.motif==='rail';
    const fork=run.entities.find(e=>e.route==='wild'&&e.at-e.length/2>riderAt&&e.at-e.length/2-riderAt<approachSpeed*2.2);
    const airborne=run.didJump&&run.vy<0;
    $('coach').hidden=state!=='playing'||(!nearEdge&&!precision&&!distance&&!fork&&!airborne&&run.time>7);
    $('coach').textContent=precision?(mobile?'KURZES ZIEL: frueher springen / links bremst':'KURZES ZIEL: frueher springen / A bremst'):distance?'WEITER TRANSFER: spaet abspringen':airborne?(mobile?'Links: kuerzer / Rechts: weiter · LAND zum Aufsetzen':'A: kuerzer / D: weiter · E zum Aufsetzen'):nearEdge?'KANTE: LANDEFLAECHE ANVISIEREN':fork?'ROUTE WAEHLEN: UNTEN ODER OBERE RAIL':(mobile?'Pfeile: Flugweite korrigieren. TRICK: springen.':'A/D Flugweite korrigieren · SPACE Tricks · E Landung');
    lastHud=time;
  }
  if(visualTime>trickUntil)$('trick').classList.remove('visible');
  if(run.landingTime>.85||state!=='playing')$('quality').textContent='';
  renderer.render(scene,camera);requestAnimationFrame(animate);
}

async function init() {
  try {
    buildScene();
    const loader=new GLTFLoader();
    const model=await loader.loadAsync('./assets/pixel-rider.glb?v=side-jungle-v4');
    skater=new THREE.Group();trickRig=new THREE.Group();rider=new THREE.Group();board=new THREE.Group();
    skater.add(trickRig);trickRig.add(rider,board);board.position.y=.16;scene.add(skater);scene.updateMatrixWorld(true);
    // Preserve exported mesh transforms when splitting the Blender asset for tricks.
    model.scene.updateMatrixWorld(true);
    for(const child of [...model.scene.children]){
      child.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      (child.name.startsWith('Board')?board:rider).attach(child);
    }
    skater.scale.setScalar(1.65);
    rider.traverse(o=>{if(o.isBone)bones.set(o.name,{bone:o,rest:o.rotation.clone()});});
    board.traverse(o=>{if(o.isMesh&&o.name.startsWith('Board.Deck')){o.material=o.material.clone();deckMaterial=o.material;}});
    buildGhost();applyDeck();resetRun();wireInputs();renderProgress();updateMode();state='intro';
    $('start').disabled=false;$('start-label').textContent='RUN STARTEN';$('load-status').textContent='BEREIT FÜR DEINE ERSTE LINE.';
    lastTime=performance.now();requestAnimationFrame(animate);
  }catch(error){
    console.error('Jungle Ride initialization failed:',error);
    showError('Die 3D-Version konnte nicht geladen werden. Öffne sie über die lokale Vorschau oder einen Webserver und verwende einen Browser mit WebGL 2.');
  }
}
// Read-only diagnostics for browser QA; no state mutation is exposed.
export function inspectGame() {
  return {
    riderScreenX: skater && camera ? (skater.position.clone().project(camera).x + 1) / 2 : null,
    lookAhead: camera ? viewWidth / 2 - lookTarget.z - (run?.x || 0) : null,
    precisionSurfaces: [...objectMeshes.entries()].filter(([,o])=>o.userData.precision).map(([id])=>id),
    levelProgress: world?.transition.status(run?.score || 0),
    runwaySurfaces: [...objectMeshes.entries()].filter(([,o])=>o.userData.runwayLights).map(([id,o])=>({id,type:o.userData.type,...o.userData.runwayLights})),
    surfaceThemes: [...new Set([...objectMeshes.values()].map(o=>o.userData.level))], shockwaveVisible: effects?.ring.visible, level: world?.index, unlockedLevel: run?.biome, levelThresholds: BIOMES.map(l=>l.threshold), environment: world?.diagnostics, score: run?.score, explosionBursts: effects?.burstCount, visibleBursts: effects?.visibleBursts, crashDuration: CRASH_DURATION,
    state, cameraType: camera?.type, pixelWidth: renderer?.domElement.width, viewWidth, renderCalls: renderer?.info.render.calls, particles: effects?.activeCount, explosionAge: effects?.crashAge, riderVisible: skater?.visible, distance: run?.distance, speed: run?.speed, x: run?.x, y: run?.y, vx: run?.vx,
    support: run?.support, rail: run?.rail, trick: run?.activeTrick?.id || null,
    time:run?.time,vy:run?.vy,jumpTime:run?.jumpTime,catchBuffer:run?.catchBuffer,balance:run?.balance,pending:run?.pending,bankProgress:run?.bankProgress,stats:{...run?.stats},mode,scope:scope(),seed:run?.initialSeed,bones:bones.size,ghostVisible:ghost?.visible,ghostFrames:ghostData?.frames.length||0,
    stance: run?.stance, bodyPitch: rider?.rotation.x, modelPitch: trickRig?.rotation.x, boardPitch: board?.rotation.x, boardLift: board?.position.y, modelYaw: trickRig?.rotation.y, boardRoll: board?.rotation.z, boardYaw: board?.rotation.y, bodyLift: rider?.position.y,
    surfaces: run?.entities.map(({id,type,x,y,at,width,length,optional,route,motif})=>({id,type,x,y,at,width,length,optional,route,motif})) || [],
  };
}
init();
