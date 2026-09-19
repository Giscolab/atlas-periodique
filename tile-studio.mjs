import * as THREE from 'three';

// A controlled reflection rig gives the machined edges broad highlights.
// It illuminates the tile materials only; the gallery retains its own HDRI.
export function createTileStudio(renderer){
  const studio=new THREE.Scene();studio.background=new THREE.Color(.045,.055,.075);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(24,20,20),new THREE.MeshBasicMaterial({color:new THREE.Color(.09,.11,.15),side:THREE.BackSide}));
  studio.add(wall);
  const softbox=(w,h,position,color)=>{
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    m.position.set(...position);m.lookAt(0,0,0);studio.add(m);
  };
  softbox(3,15,[-7,2,8],new THREE.Color(3.4,4.3,5.8));
  softbox(12,2,[1,7,7],new THREE.Color(5.0,4.2,3.1));
  softbox(1.5,12,[9,-1,5],new THREE.Color(2.7,3.8,4.8));
  softbox(7,4,[0,-5,-8],new THREE.Color(.20,.26,.32));
  const generator=new THREE.PMREMGenerator(renderer);
  const target=generator.fromScene(studio,.04,.1,50);
  generator.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  return target;
}
