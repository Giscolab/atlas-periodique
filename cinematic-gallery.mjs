import * as THREE from 'three';

// A fixed-camera photographic plate, with live 3D tiles/reflections in front.
// The fully modeled alternative remains available through ?gallery=3d.
export async function useCinematicGallery(scene,gallery){
  const plate=await new THREE.TextureLoader().loadAsync('./assets/environment/gallery-backplate.png');
  plate.colorSpace=THREE.SRGBColorSpace;
  scene.background=plate;
  const reflection=gallery.group.getObjectByName('Live rough concrete reflection');
  gallery.group.traverse(object=>{if(object.isMesh&&object!==reflection)object.visible=false;});
  const reflect=reflection.onBeforeRender;
  reflection.onBeforeRender=function(...args){
    const background=scene.background;scene.background=new THREE.Color(0x303946);
    try{reflect.apply(this,args);}finally{scene.background=background;}
  };
  const originalResize=gallery.resize;
  gallery.resize=(width,height)=>{
    originalResize(width,height);
    const displayAspect=width/height,plateAspect=1536/1024;
    if(displayAspect>plateAspect){plate.repeat.set(1,plateAspect/displayAspect);plate.offset.set(0,(1-plate.repeat.y)/2);}
    else{plate.repeat.set(displayAspect/plateAspect,1);plate.offset.set((1-plate.repeat.x)/2,0);}
    plate.updateMatrix();
  };
  return gallery;
}
