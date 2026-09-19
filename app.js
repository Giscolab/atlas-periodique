
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { fitFrontCamera } from './camera-fit.mjs';
import { addGallery } from './gallery.mjs';
import { styleTable } from './museum-tiles.mjs';
import { useCinematicGallery } from './cinematic-gallery.mjs';
import { createElementTour } from './element-tour.mjs';
import { createSpecimenView } from './specimen-view.mjs';
import './museum-ui.mjs';

const params = new URLSearchParams(location.search);
const diagnostics = params.has('diagnostics');
const stage = document.getElementById('stage');
const MODEL_URL = "./assets/periodic_table_v4.glb";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const [sourceElements,FRENCH,specimens]=await Promise.all(['./assets/elements.json','./assets/names-fr.json','./assets/specimens.json'].map(async url=>{
  const response=await fetch(url);if(!response.ok)throw new Error('Données locales indisponibles');return response.json();
}));
const specimenView=createSpecimenView({entries:specimens});
const SYMBOLS=sourceElements.map(e=>e.Symbol);
const familyNames={'Alkali metal':'Métaux alcalins','Alkaline earth metal':'Alcalino-terreux','Transition metal':'Métaux de transition','Post-transition metal':'Autres métaux','Metalloid':'Métalloïdes','Nonmetal':'Non-métaux','Halogen':'Halogènes','Noble gas':'Gaz nobles','Lanthanide':'Lanthanides','Actinide':'Actinides'};
const familyOf=z=>familyNames[sourceElements[z-1]?.GroupBlock]||'Autres métaux';
const familyColor=f=>({'Métaux alcalins':'#788898','Alcalino-terreux':'#c49b52','Métaux de transition':'#777b80','Autres métaux':'#5b98ad','Métalloïdes':'#629d87','Non-métaux':'#406f98','Halogènes':'#af679e','Gaz nobles':'#8273b9','Lanthanides':'#56aaa3','Actinides':'#a27bbd'}[f]||'#8795a3');
const fallback=sourceElements.map(e=>({...e,number:Number(e.AtomicNumber),atomic_number:Number(e.AtomicNumber),symbol:e.Symbol,name:FRENCH[e.AtomicNumber],family:familyOf(Number(e.AtomicNumber))}));

let elements = fallback.map(e=>({...e,family:familyOf(e.number)}));
let elementRoots = new Map(), model, mixer, actions=[], maxDuration=10, time=0, playing=false;
let displayRoot, tableRoot, homeFit, homeBounds, focusedRoot=null, museumTiles, gallery;
let selected=null, hoverRoot=null, hoverHelper=null, selectedHelper=null, animationTween=null;

const canvas=document.querySelector("#canvas");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(stage.clientWidth,stage.clientHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.info.autoReset=false;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x10171d);
const camera=new THREE.PerspectiveCamera(28,stage.clientWidth/stage.clientHeight,0.05,180);
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(stage.clientWidth,stage.clientHeight),.40,.38,1.08);
composer.addPass(bloom);
composer.addPass(new OutputPass());
camera.up.set(0,1,0);
camera.position.set(0,0,30);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=false;
controls.enablePan=false;
controls.minPolarAngle=Math.PI/2-0.12;
controls.maxPolarAngle=Math.PI/2+0.12;
controls.minAzimuthAngle=-0.16;
controls.maxAzimuthAngle=0.16;
controls.update();

scene.add(new THREE.HemisphereLight(0xc7d9ed,0x262224,0.50));
const key=new THREE.DirectionalLight(0xfff1de,2.7);
key.position.set(-8,11,15);
key.shadow.radius=3;
key.castShadow=true;
key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:0.5,far:60});
key.shadow.normalBias=0.02;
key.shadow.bias=-0.0001;
scene.add(key);

const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
const ui = id => document.getElementById(id);
const tour=createElementTour({
  total:elements.length,
  onSelect:z=>showElement(z,false,true),
  onState:renderTourControls,
});

function renderTourControls(state=tour.snapshot()){
  const active=state.status!=='idle';
  document.body.classList.toggle('element-tour-active',active);
  ui('tourOptions').hidden=!active;
  ui('tourToggle').setAttribute('aria-expanded',String(active));
  ui('tourToggle').setAttribute('aria-pressed',String(state.status==='playing'));
  ui('tourToggle').textContent=({idle:'Visiter les 118',playing:'Pause visite',paused:'Reprendre la visite',finished:'Recommencer'})[state.status];
  ui('tourProgress').textContent=state.current+' / '+elements.length;
  ui('tourProgress').setAttribute('aria-label','Élément '+state.current+' sur '+elements.length+(state.status==='finished'?' · visite terminée':''));
  ui('tourPrevious').disabled=state.current===1;
  ui('tourNext').disabled=state.current===elements.length;
}
function stopTour(){
  if(tour.snapshot().status==='idle')return;
  tour.stop();museumTiles?.setTourMode(false);
}
function startTour(){
  if(!museumTiles)return;
  const state=tour.snapshot();
  if(state.status==='playing'){tour.pause();return;}
  if(state.status==='idle'||state.status==='finished'){
    resetCamera();
    elementRoots.forEach(root=>{root.visible=true;});
    ui('familyFilters').querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.family==='Tous'));
  }
  clearHover();museumTiles.setTourMode(true);tour.start();
}

function findRoot(obj){
  let o=obj;
  while(o){
    if(/^PT_ELEM_\d{3}_/.test(o.name)) return o;
    o=o.parent;
  }
  return null;
}
function parseRoot(root){
  const m=root?.name.match(/^PT_ELEM_(\d{3})_([A-Za-z]{1,3})/);
  return m?{z:Number(m[1]),symbol:m[2]}:null;
}
function getElement(z){ return elements.find(e=>Number(e.number||e.atomic_number)===Number(z))||fallback[z-1]; }

function setTime(t){
  time=THREE.MathUtils.clamp(t,0,maxDuration);
  if(mixer){
    // Reactivate one-shot tracks when scrubbing backward after the last frame.
    actions.forEach(a=>{a.reset();a.play();});
    mixer.setTime(time); mixer.update(0);
  }
  museumTiles?.update(time);
  const deployed=time>.1&&time<9.85;
  document.body.classList.toggle('scene-deployed',deployed);
  if(deployed)specimenView.close();
  for(const id of ['elementPanel','familyLegend'])ui(id).inert=deployed||ui(id).getAttribute('aria-hidden')==='true';
  ui("timeline").value=time.toFixed(2);
  ui("timecode").textContent=`${String(Math.floor(time/60)).padStart(2,"0")}:${String(Math.floor(time%60)).padStart(2,"0")}`;
}
function tweenTime(target,duration=1600){
  stopTour();
  playing=false; ui('playPause').textContent='▶';
  animationTween=null;
  if(reducedMotion){setTime(target);return;}
  const start=time, t0=performance.now();
  const tween={}; animationTween=tween;
  const tick=now=>{
    if(animationTween!==tween) return;
    const p=Math.min(1,(now-t0)/duration), e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    setTime(THREE.MathUtils.lerp(start,target,e));
    if(p<1) requestAnimationFrame(tick); else animationTween=null;
  };
  requestAnimationFrame(tick);
}

// AABB from visible, non-degenerate meshes only: zero-scale callouts are not framing geometry.
function visibleBounds(object){
  object.updateWorldMatrix(true,true);
  const result=new THREE.Box3();
  object.traverseVisible(o=>{
    if(!o.isMesh || o.userData.ignoreFraming || Math.abs(o.matrixWorld.determinant())<1e-10)return;
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
    result.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  if(result.isEmpty())throw new Error('Aucune géométrie visible à cadrer');
  return result;
}
function frameArea(){
  // Measured from the supplied 1536 x 1024 target. Keep proportions on narrow screens.
  return camera.aspect>=1.25
    ? {left:0.116,right:0.794,top:0.112,bottom:0.817}
    : {left:0.04,right:0.96,top:0.16,bottom:0.64};
}
function calculateFit(box,frame=frameArea()){
  return fitFrontCamera({min:box.min.toArray(),max:box.max.toArray()},
    {aspect:camera.aspect,fov:camera.fov,frame});
}
function applyFit(fit){
  camera.position.fromArray(fit.position);
  controls.target.fromArray(fit.target);
  // Keep the near plane safe when the user dollies toward the fitted volume.
  camera.near=Math.min(0.05,fit.near);
  camera.far=Math.max(180,fit.far);
  camera.updateProjectionMatrix();
  controls.minDistance=fit.distance*0.45;
  controls.maxDistance=fit.distance*1.8;
  controls.update();
}
function resetCamera(){
  stopTour();
  specimenView.close();
  if(!homeBounds)return;
  focusedRoot=null;
  // A true return to the assembled reference view, including after an exploded sequence.
  animationTween=null; playing=false;
  ui('playPause').textContent='▶';
  setTime(0);
  homeFit=calculateFit(homeBounds);
  applyFit(homeFit);
}
function focusRoot(root){
  if(!root)return;
  if(!root.visible){
    elementRoots.forEach(element=>{element.visible=true;});
    ui('familyFilters').querySelectorAll('button').forEach(button=>{
      button.classList.toggle('active',button.dataset.family==='Tous');
    });
  }
  focusedRoot=root;
  const box=visibleBounds(root);
  applyFit(calculateFit(box,{left:0.15,right:0.64,top:0.18,bottom:0.78}));
}
function showHelper(root,selectedMode=false){
  const z=parseRoot(root)?.z;
  if(selectedMode)museumTiles?.select(z);else museumTiles?.hover(z);
}
function clearHover(){
  hoverRoot=null;museumTiles?.hover(null);ui('hoverLabel').style.display='none';
}
const notes={
  26:{summary:'Métal essentiel à la fabrication des aciers, le fer est aussi présent dans l’hémoglobine, qui transporte l’oxygène dans le sang.',applications:'Construction, machines, transports : les aciers sont des alliages à base de fer. Ses propriétés magnétiques interviennent également dans les moteurs et les transformateurs.',history:'Connu depuis l’Antiquité, le fer a donné son nom à un âge de la métallurgie. Son symbole Fe vient du latin ferrum.'},
  79:{summary:'Dense et peu réactif, l’or conserve son éclat. Sa conductivité et sa résistance à la corrosion en font un métal utile bien au-delà de la joaillerie.',applications:'Joaillerie, contacts électriques et revêtements résistants à la corrosion. L’or peut être travaillé en feuilles extrêmement minces.',history:'Connu depuis l’Antiquité, l’or porte le symbole Au, du latin aurum.'},
  92:{summary:'L’uranium est un métal lourd radioactif de la famille des actinides. Ses isotopes possèdent des propriétés nucléaires différentes.',applications:'L’uranium est principalement associé au combustible des réacteurs nucléaires. Ses usages dépendent de sa composition isotopique.',history:'L’uranium a été identifié par Martin Heinrich Klaproth en 1789 et nommé en référence à la planète Uranus.'}
};
const numberFormat=new Intl.NumberFormat('fr-FR',{maximumSignificantDigits:6});
function valueWithUnit(value,unit=''){
  if(value===null||value===undefined||value==='')return '—';
  const n=Number(value);return (Number.isFinite(n)?numberFormat.format(n):value)+unit;
}
function configuration(value){
  return (value||'—').replace(/([spdf])(\d+)/g,(_,orbital,n)=>orbital+[...n].map(d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join(''));
}
function showElement(z,doFocus=false,fromTour=false){
  if(!fromTour)stopTour();
  z=Number(z);const e=getElement(z),root=elementRoots.get(z);if(!e)return;
  selected=z;
  ui('elementPanel').classList.add('open');ui('elementPanel').setAttribute('aria-hidden','false');
  ui('elementPanel').inert=document.body.classList.contains('scene-deployed');
  ui('elementNumber').textContent=String(z);ui('elementSymbol').textContent=e.symbol;
  ui('elementName').textContent=e.name;ui('elementCategory').textContent=e.family;
  ui('elementAccent').style.background=familyColor(e.family);
  ui('elementSummary').textContent=notes[z]?.summary||e.name+' appartient à la famille « '+e.family.toLowerCase()+' ». Son numéro atomique est '+z+'.';
  const kelvin=v=>v===''||v==null?'—':valueWithUnit(Number(v)-273.15,' °C');
  const props=[['Numéro atomique',String(z)],['Famille',e.family],['Masse atomique',valueWithUnit(e.AtomicMass,' u')],['Configuration',configuration(e.ElectronConfiguration)],['État',({Solid:'Solide',Gas:'Gaz',Liquid:'Liquide','Expected to be a Solid':'Solide prévu','Expected to be a Gas':'Gaz prévu'}[e.StandardState]||e.StandardState||'—')],['Masse volumique',valueWithUnit(e.Density,' g/cm³')],[z===6?'Fusion (sous pression)':z===2?'Fusion (sous pression)':'Fusion',kelvin(e.MeltingPoint)],['Ébullition',kelvin(e.BoilingPoint)],['Électronégativité',valueWithUnit(e.Electronegativity)]];
  ui('elementProperties').title='Valeurs PubChem ; conditions de mesure selon la source. Les états prévus des éléments superlourds restent incertains.';
  ui('elementProperties').replaceChildren(...props.map(([name,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;row.append(dt,dd);return row;}));
  if(z===6)ui('elementSummary').textContent+=' À pression ambiante, le carbone se sublime.';
  if(z===2)ui('elementSummary').textContent+=' L’hélium ne se solidifie que sous pression.';
  if(z>=110)ui('elementSummary').textContent+=' État prévu selon PubChem, non établi expérimentalement.';
  ui('shells').replaceChildren();
  ui('elementSource').href='https://pubchem.ncbi.nlm.nih.gov/element/'+encodeURIComponent(e.Name);
  ui('elementApplications').textContent=notes[z]?.applications||'Consultez la fiche PubChem pour les usages et la documentation de cet élément.';
  ui('elementHistory').textContent=notes[z]?.history||(e.YearDiscovered==='Ancient'?'Élément connu depuis l’Antiquité.':'Année de découverte indiquée par PubChem : '+(e.YearDiscovered||'non renseignée')+'.');
  specimenView.show(z);
  if(root){
    if(!root.visible){elementRoots.forEach(r=>r.visible=true);ui('familyFilters').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.family==='Tous'));}
    showHelper(root,true);if(doFocus)focusRoot(root);
  }
}

function buildFilters(){
  const families=["Tous","Métaux alcalins","Alcalino-terreux","Métaux de transition","Autres métaux","Métalloïdes","Non-métaux","Halogènes","Gaz nobles","Lanthanides","Actinides"];
  ui("familyFilters").innerHTML=families.map((f,i)=>`<button class="${i===0?"active":""}" data-family="${f}" style="--family-color:${familyColor(f)}">${f}</button>`).join("");
  ui("familyFilters").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    stopTour();
    ui("familyFilters").querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    const fam=b.dataset.family;
    elementRoots.forEach((root,z)=>{
      root.visible=fam==="Tous"||familyOf(Number(z))===fam;
    });
  }));
}
function updateSearch(q){
  const normalize=value=>String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  q=normalize(q||"").trim();
  const res=elements.filter(e=>{
    const z=Number(e.number||e.atomic_number);
    return !q||String(z)===q||(e.symbol||"").toLowerCase().startsWith(q)||normalize(FRENCH[z]||e.name||"").includes(q);
  }).slice(0,12);
  ui("searchResults").innerHTML=res.map(e=>{
    const z=Number(e.number||e.atomic_number);
    return `<button type="button" class="search-result" data-z="${z}"><span><b>${e.symbol}</b> · ${FRENCH[z]||e.name}</span><span>${z}</span></button>`;
  }).join("");
  ui("searchResults").classList.toggle("open",!!q&&res.length>0);
  ui("searchResults").querySelectorAll(".search-result").forEach(r=>r.addEventListener("click",()=>{
    showElement(Number(r.dataset.z));document.querySelector("#searchDialog")?.close();ui("searchInput").value="";ui("searchResults").classList.remove("open");
  }));
}

const loader=new GLTFLoader();
loader.load(MODEL_URL,async gltf=>{
  try{
  model=gltf.scene;
  tableRoot=model.getObjectByName('PT_PERIODIC_TABLE_ROOT');
  if(!tableRoot)throw new Error('Racine originale du tableau introuvable');
  // Remove only exported studio surroundings from rendering; keep every original table layer.
  model.children.forEach(child=>{child.visible=child===tableRoot;});
  displayRoot=new THREE.Group();
  displayRoot.name='V4_DisplayRoot';
  displayRoot.add(model);
  scene.add(displayRoot);
  // Measured: H -> He is +X, H -> Li is +Z, text faces +Y. No trial rotations.
  displayRoot.rotation.x=Math.PI/2;
  model.traverse(o=>{
    if(/^PT_ELEM_\d{3}_/.test(o.name)){ const p=parseRoot(o); if(p)elementRoots.set(p.z,o); }
    if(o.isMesh){
      // Standard shadow maps treat transmission as opaque: the glass would black out all tiles.
      const materials=Array.isArray(o.material)?o.material:[o.material];
      o.castShadow=materials.every(m=>!m.transparent && !(m.transmission>0) && m.name!=='PT_Text');
      o.receiveShadow=true;
    }
  });
  mixer=new THREE.AnimationMixer(model);
  actions=gltf.animations.map(c=>{
    maxDuration=Math.max(maxDuration,c.duration);
    const a=mixer.clipAction(c);
    a.setLoop(THREE.LoopOnce,1);
    a.clampWhenFinished=true;
    return a;
  });
  // The imported static pose is assembled. No automatic animation before visual approval.
  museumTiles=styleTable(tableRoot,elementRoots,getElement,familyColor,renderer);
  const center=visibleBounds(tableRoot).getCenter(new THREE.Vector3());
  displayRoot.position.sub(center);
  displayRoot.updateMatrixWorld(true);
  homeBounds=visibleBounds(tableRoot);
  homeFit=calculateFit(homeBounds);
  applyFit(homeFit);
  gallery=await addGallery(scene,homeBounds,renderer);
  if(params.get('gallery')!=='3d')await useCinematicGallery(scene,gallery);
  gallery.resize(stage.clientWidth,stage.clientHeight);
  if(stage.clientWidth>900)showElement(26,false);
  ui('tourToggle').disabled=false;
  if(diagnostics){
    const project=p=>{const v=p.clone().project(camera);return [(v.x+1)/2,(1-v.y)/2,v.z];};
    window.atlasDiagnostics={
      ready:true,
      setTime, resetCamera, focus:z=>focusRoot(elementRoots.get(z)),
      report:()=>({
        count:elementRoots.size,clips:actions.length,time,selected,tour:tour.snapshot(),
        tourPresentation:[...elementRoots].filter(([,root])=>root.getObjectByName('MuseumSurface_'+parseRoot(root).z).scale.x>1.001).map(([z,root])=>({z,scale:root.getObjectByName('MuseumSurface_'+z).scale.x})),
        bounds:{min:homeBounds.min.toArray(),max:homeBounds.max.toArray()},
        camera:{position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),fov:camera.fov,aspect:camera.aspect,near:camera.near,far:camera.far},
        projection:[1,2,3,26,79,92,118].map(z=>({z,screen:project(elementRoots.get(z).getObjectByName('MuseumSurface_'+z).getWorldPosition(new THREE.Vector3()))})),
        corners:[0,1,2,3,4,5,6,7].map(i=>project(new THREE.Vector3(i&1?homeBounds.max.x:homeBounds.min.x,i&2?homeBounds.max.y:homeBounds.min.y,i&4?homeBounds.max.z:homeBounds.min.z))),
        frame:frameArea(), materialEdits:118, presentation:museumTiles.dimensions,
        lights:scene.children.filter(o=>o.isLight).length,
        calls:renderer.info.render.calls,triangles:renderer.info.render.triangles
      })
    };
  }
  ui("bootBar").style.width="100%";ui("bootText").textContent=`118 éléments · ${gltf.animations.length} animations`;
  setTimeout(()=>ui("boot").classList.add("hidden"),350);
  }catch(error){console.error(error);ui("bootText").textContent="La scène n’a pas pu être chargée : "+error.message;}
},xhr=>{
  if(xhr.total){const p=Math.min(99,xhr.loaded/xhr.total*100);ui("bootBar").style.width=`${p}%`;ui("bootText").textContent=`${p.toFixed(0)} % · ${(xhr.loaded/1048576).toFixed(1)} Mo`;}
},err=>{
  console.error(err);ui("bootText").textContent="Erreur de chargement du GLB";ui("bootBar").style.background="#b52f40";
});

function isRendered(object){for(let o=object;o;o=o.parent){if(!o.visible)return false;}return true;}
let pointerDown=null;
canvas.addEventListener('pointerdown',event=>{pointerDown=[event.clientX,event.clientY];});
canvas.addEventListener("pointermove",ev=>{
  if(!model)return;
  if(tour.snapshot().status!=='idle'){clearHover();return;}
  const r=canvas.getBoundingClientRect();pointer.x=((ev.clientX-r.left)/r.width)*2-1;pointer.y=-((ev.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(model,true).find(h=>isRendered(h.object)&&findRoot(h.object)?.visible);
  if(!hit){clearHover();return;}
  const root=findRoot(hit.object), p=parseRoot(root);
  if(root!==hoverRoot){hoverRoot=root;showHelper(root,false);}
  const e=getElement(p.z), label=ui("hoverLabel");label.style.display="block";label.style.left=`${ev.clientX-r.left}px`;label.style.top=`${ev.clientY-r.top}px`;
  label.textContent=`${String(p.z).padStart(3,"0")} · ${p.symbol} · ${FRENCH[p.z]||e.name}`;
});
canvas.addEventListener("pointerleave",clearHover);
canvas.addEventListener("click",ev=>{
  if(!model||!pointerDown||Math.hypot(ev.clientX-pointerDown[0],ev.clientY-pointerDown[1])>5)return;
  const r=canvas.getBoundingClientRect();pointer.x=((ev.clientX-r.left)/r.width)*2-1;pointer.y=-((ev.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(model,true).find(h=>isRendered(h.object)&&findRoot(h.object)?.visible);
  if(hit){const p=parseRoot(findRoot(hit.object));if(p)showElement(p.z);}
});

ui("closePanel").addEventListener("click",()=>{ui("elementPanel").classList.remove("open");ui("elementPanel").setAttribute("aria-hidden","true");if(selectedHelper)scene.remove(selectedHelper);selectedHelper=null;selected=null;museumTiles?.select(null);resetCamera();});
ui("resetCamera").addEventListener("click",resetCamera);
ui("deployBtn").addEventListener("click",()=>tweenTime(Math.min(6.83,maxDuration),1700));
ui("foldBtn").addEventListener("click",()=>tweenTime(maxDuration,1700));
ui("demoBtn").addEventListener("click",()=>{stopTour();animationTween=null;setTime(0);playing=true;ui("playPause").textContent="❚❚";});
ui("playPause").addEventListener("click",()=>{stopTour();animationTween=null;playing=!playing;ui("playPause").textContent=playing?"❚❚":"▶";});
ui("timeline").addEventListener("input",e=>{stopTour();animationTween=null;playing=false;ui("playPause").textContent="▶";setTime(Number(e.target.value));});
document.querySelectorAll("[data-timeline]").forEach(b=>b.addEventListener("click",()=>tweenTime(Number(b.dataset.timeline))));
document.querySelectorAll("[data-element]").forEach(b=>b.addEventListener("click",()=>showElement(Number(b.dataset.element))));
ui("searchInput").addEventListener("input",e=>updateSearch(e.target.value));
ui('tourToggle').addEventListener('click',startTour);
ui('tourPrevious').addEventListener('click',()=>tour.step(-1));
ui('tourNext').addEventListener('click',()=>tour.step(1));
ui('tourSpeed').addEventListener('change',event=>tour.setDuration(Number(event.target.value)));
for(const id of ['searchNav','aboutNav'])ui(id).addEventListener('click',()=>tour.pause());
ui('elementPanel').addEventListener('pointerdown',()=>tour.pause());
ui('elementPanel').addEventListener('keydown',()=>tour.pause());
controls.addEventListener('start',stopTour);
document.addEventListener('visibilitychange',()=>{if(document.hidden)tour.pause();});
document.addEventListener('atlas:specimen-open',()=>tour.pause());
renderTourControls();

let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(.05,elapsed);last=now;
  tour.update(elapsed);
  museumTiles?.animateTour(dt,reducedMotion);
  if(playing){
    setTime(time+dt);
    if(time>=maxDuration-.01){playing=false;ui("playPause").textContent="▶";}
  }
  if(hoverHelper&&hoverRoot)hoverHelper.box.setFromObject(hoverRoot);
  if(selectedHelper&&selected&&elementRoots.get(selected))selectedHelper.box.setFromObject(elementRoots.get(selected));
  controls.update();renderer.info.reset();composer.render();
}
requestAnimationFrame(animate);

addEventListener("resize",()=>{
  const w=stage.clientWidth,h=Math.max(1,stage.clientHeight);
  camera.aspect=w/h;
  renderer.setSize(w,h,false);
  composer.setSize(w,h);
  gallery?.resize(w,h);
  if(homeBounds){
    if(focusedRoot)focusRoot(focusedRoot);
    else {homeFit=calculateFit(homeBounds);applyFit(homeFit);}
  }else camera.updateProjectionMatrix();
});
buildFilters();updateSearch('');
canvas.addEventListener('dblclick',event=>{
  if(!model)return;
  const bounds=canvas.getBoundingClientRect();
  pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(model,true).find(item=>isRendered(item.object)&&findRoot(item.object)?.visible);
  if(hit)focusRoot(findRoot(hit.object));
});
