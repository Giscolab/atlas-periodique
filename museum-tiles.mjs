import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createTileStudio } from './tile-studio.mjs';

// Presentation shells follow the original element roots and their Blender tracks.
// The binary asset and its native hierarchy remain unchanged on disk.
const WIDTH=.837, HEIGHT=1.095, PITCH_SCALE=1.30;

function haloTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const c=canvas.getContext('2d');
  c.shadowColor='white';c.shadowBlur=18;c.fillStyle='white';
  c.beginPath();c.roundRect(28,20,200,216,12);c.fill();
  const texture=new THREE.CanvasTexture(canvas);return texture;
}

function roundedPath(shape,w,h,r){
  const x=-w/2,y=-h/2;
  shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);
  shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);
  shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);return shape;
}
function rimGeometry(){
  const s=roundedPath(new THREE.Shape(),WIDTH-.026,HEIGHT-.026,.039);
  s.holes.push(roundedPath(new THREE.Path(),WIDTH-.043,HEIGHT-.043,.034));
  return new THREE.ShapeGeometry(s,8);
}
function labelTexture(element){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=512;
  const c=canvas.getContext('2d');
  c.textAlign='center';c.textBaseline='middle';
  c.fillStyle='#e1e7eb';c.font='400 80px "Segoe UI",sans-serif';
  c.fillText(element.number,192,68);
  c.fillStyle='#f8fafc';c.font='500 202px "Segoe UI",sans-serif';
  c.fillText(element.symbol,192,246);
  let size=69;c.font='400 '+size+'px "Segoe UI",sans-serif';
  while(c.measureText(element.name).width>354&&size>32){size--;c.font='400 '+size+'px "Segoe UI",sans-serif';}
  c.fillStyle='#e0e6eb';c.fillText(element.name,192,415);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=4;
  return t;
}

export function styleTable(tableRoot,roots,getElement,familyColor,renderer){
  const studio=createTileStudio(renderer);
  const elementsLayer=tableRoot.getObjectByName('PT_LAYER_ELEMENTS');
  tableRoot.children.forEach(layer=>{layer.visible=layer===elementsLayer;});
  elementsLayer.children.forEach(child=>{child.visible=roots.has(Number(child.name.match(/^PT_ELEM_(\d{3})_/)?.[1]));});
  const outer=new RoundedBoxGeometry(WIDTH,HEIGHT,.52,4,.055);
  const inner=new RoundedBoxGeometry(WIDTH-.057,HEIGHT-.057,.444,3,.038);
  // A very shallow convex face catches broad softbox reflections; the label
  // remains in front of its highest point and follows the same element root.
  const positions=inner.attributes.position,normals=inner.attributes.normal;
  for(let i=0;i<positions.count;i++){
    if(normals.getZ(i)<.99)continue;
    const x=positions.getX(i)/(WIDTH/2),y=positions.getY(i)/(HEIGHT/2);
    positions.setZ(i,positions.getZ(i)+.006*(1-x*x)*(1-y*y));
    const n=new THREE.Vector3(x*.18,y*.13,1).normalize();normals.setXYZ(i,n.x,n.y,n.z);
  }
  positions.needsUpdate=true;normals.needsUpdate=true;
  const edge=rimGeometry();
  const label=new THREE.PlaneGeometry(WIDTH-.093,HEIGHT-.09);
  const tiles=new Map(),haloMap=haloTexture();
  for(const [z,root] of roots){
    root.children.forEach(child=>{child.visible=false;});
    const group=new THREE.Group();
    group.name='MuseumSurface_'+z;
    // Spread rows, not glyphs: the new shells and typography have their own aspect ratio.
    group.position.set(0,.028,root.position.z*(PITCH_SCALE-1));
    group.rotation.x=-Math.PI/2;
    root.add(group);
    const e=getElement(z), color=new THREE.Color(familyColor(e.family));
    const caseMaterial=new THREE.MeshStandardMaterial({
      color:color.clone().lerp(new THREE.Color('#d4dee4'),.56),
      metalness:.94,roughness:.20,envMap:studio.texture,envMapIntensity:1.45
    });
    const body=new THREE.Mesh(outer,caseMaterial);
    body.castShadow=true;body.receiveShadow=true;group.add(body);
    const faceMaterial=new THREE.MeshPhysicalMaterial({
      color:color.clone().multiplyScalar(e.family==='Métaux de transition'?.1:.22),metalness:.65,roughness:.25,
      clearcoat:1,clearcoatRoughness:.14,envMap:studio.texture,envMapIntensity:.85
    });
    const face=new THREE.Mesh(inner,faceMaterial);face.position.z=.052;
    face.castShadow=true;face.receiveShadow=true;group.add(face);
    const edgeMaterial=new THREE.MeshBasicMaterial({color:color.clone().lerp(new THREE.Color('#d4f2ff'),.35),transparent:true,opacity:.40});
    const outline=new THREE.Mesh(edge,edgeMaterial);outline.position.z=.282;group.add(outline);
    const textMaterial=new THREE.MeshBasicMaterial({map:labelTexture(e),transparent:true,depthWrite:false,toneMapped:false});
    const text=new THREE.Mesh(label,textMaterial);text.position.z=.284;group.add(text);
    // A narrow edge highlight emphasizes the machined bevel without global bloom.
    const glint=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH-.15,.009),
      new THREE.MeshBasicMaterial({color:0xd2e0e6,transparent:true,opacity:.60,toneMapped:false}));
    glint.position.set(-.008,HEIGHT/2-.025,.278);group.add(glint);
    const halo=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH*1.3,HEIGHT*1.22),new THREE.MeshBasicMaterial({map:haloMap,color:0x4488dd,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    halo.position.z=-.26;halo.userData.ignoreFraming=true;halo.raycast=()=>{};group.add(halo);
    tiles.set(z,{root,group,faceMaterial,edgeMaterial,caseMaterial,color,glint,halo});
  }
  let selected=26,hover=null,tourMode=false;
  function applyHighlights(){
    for(const [z,t] of tiles){
      const active=z===selected,over=!tourMode&&z===hover,featured=!tourMode&&[1,26,79,92].includes(z);
      const accent=z===26||z===1?new THREE.Color('#58b8ff'):z===79?new THREE.Color('#edba5a'):z===92?new THREE.Color('#b37bee'):t.color;
      t.faceMaterial.emissive.copy(accent);t.faceMaterial.emissiveIntensity=active?.09:over?.05:featured?(z===92?.10:z===79?.075:z===1?.04:0):0;
      t.edgeMaterial.color.copy(active||over?accent:new THREE.Color(t.color).lerp(new THREE.Color('#d4f2ff'),.35));
      t.edgeMaterial.opacity=active?1:over?.85:featured?.9:.08;
      if(featured||active)t.edgeMaterial.color.copy(accent).multiplyScalar(5);
      t.halo.material.color.copy(accent);t.halo.material.opacity=active?.55:over?.25:featured?.32:0;
      t.glint.material.opacity=active?.95:.55;
    }
  }
  applyHighlights();
  // Technical layers remain available in the exploded view, faintly indicated.
  const technical=[];
  for(const name of ['PT_LAYER_BACK','PT_LAYER_TECHNICAL','PT_LAYER_FRAME','PT_LAYER_GLASS']){
    const layer=tableRoot.getObjectByName(name);if(!layer)continue;
    layer.children.forEach(c=>{c.visible=false;});layer.visible=true;
    const panel=new THREE.Mesh(new THREE.BoxGeometry(16.0,.035,10.7),
      new THREE.MeshStandardMaterial({color:name.includes('TECHNICAL')?0x154046:0x8a989e,metalness:.7,roughness:.35,transparent:true,opacity:0,depthWrite:false}));
    panel.position.z=.49;panel.name='MuseumTechnical_'+name;
    panel.visible=false;layer.add(panel);
    technical.push(panel);
  }
  return {
    select(z){selected=z;applyHighlights();},
    hover(z){hover=z;applyHighlights();},
    setTourMode(enabled){tourMode=enabled;hover=null;applyHighlights();},
    animateTour(delta,reducedMotion=false){
      const blend=reducedMotion?1:1-Math.exp(-Math.max(0,delta)*10);
      for(const [z,t] of tiles){
        const active=tourMode&&z===selected;
        const y=.028+(active?.22:0),scale=active?1.055:1;
        t.group.position.y=THREE.MathUtils.lerp(t.group.position.y,y,blend);
        t.group.scale.setScalar(THREE.MathUtils.lerp(t.group.scale.x,scale,blend));
      }
    },
    update(time){
      const reveal=time>0.7&&time<8.7?Math.min(1,(time-.7)/1.5,(8.7-time)/1.2):0;
      for(const p of technical){p.visible=reveal>.001;p.material.opacity=reveal*.13;}
    },
    dimensions:{tileWidth:WIDTH,tileHeight:HEIGHT,rowSpacingScale:PITCH_SCALE},
  };
}
