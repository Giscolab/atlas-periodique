import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const ASSETS = new URL('./assets/environment/', import.meta.url);

// A modeled room with locally bundled photographic PBR textures. The HDRI is
// lighting only: every visible architectural surface is actual scene geometry.
export async function addGallery(scene, bounds, renderer) {
  const group = new THREE.Group();
  group.name = 'Atlas_Museum';
  const floorY = bounds.min.y - 0.14;
  const rearZ = Math.min(bounds.min.z - 4.8, -4.8);
  const loader = new THREE.TextureLoader();
  const textures = [];
  const materials = [];
  const texture = async (name, srgb = false) => {
    const t = await loader.loadAsync(new URL(name, ASSETS).href);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    return t;
  };
  const [wallMap, wallNormal, wallRough, floorMap, floorNormal, floorRough, hdri, forest] = await Promise.all([
    texture('concrete_wall_006_diff_1k.jpg', true),
    texture('concrete_wall_006_nor_gl_1k.jpg'),
    texture('concrete_wall_006_rough_1k.jpg'),
    texture('smooth_concrete_floor_diff_1k.jpg', true),
    texture('smooth_concrete_floor_nor_gl_1k.jpg'),
    texture('smooth_concrete_floor_rough_1k.jpg'),
    new RGBELoader().loadAsync(new URL('lebombo_1k.hdr', ASSETS).href),
    new RGBELoader().loadAsync(new URL('rainforest_trail_1k.hdr', ASSETS).href),
  ]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(hdri);
  hdri.dispose(); pmrem.dispose();
  const previousEnvironment = scene.environment;
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.5;
  scene.environmentRotation.set(0, 0.72, 0);
  scene.add(group);
  function material(options) {
    const m = new THREE.MeshStandardMaterial(options); materials.push(m); return m;
  }
  const concrete = material({color: 0x87939e, map: wallMap, normalMap: wallNormal,
    normalScale: new THREE.Vector2(0.22, 0.22), roughnessMap: wallRough, roughness: 0.94});
  const paleConcrete = material({color: 0xa2b0ba, map: wallMap, normalMap: wallNormal,
    normalScale: new THREE.Vector2(0.18, 0.18), roughnessMap: wallRough, roughness: 0.86});
  const charcoal = material({color: 0x171c20, roughness: 0.55, metalness: 0.2});
  const bronze = material({color: 0x76604a, roughness: 0.4, metalness: 0.75});
  const floorMat = material({color: 0x939fac, map: floorMap, normalMap: floorNormal,
    normalScale: new THREE.Vector2(0.16, 0.16), roughnessMap: floorRough, roughness: 0.56, metalness: 0.12});
  for (const m of [concrete, paleConcrete, floorMat]) {
    m.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), 0.92);');
      if (m === floorMat) shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
        'outgoingLight = mix(outgoingLight, vec3(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.83, 0.96, 1.15), 0.78);\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => m === floorMat ? 'atlas-cool-polished-floor-v3' : 'atlas-neutral-concrete-v2';
  }
  const lightMat = new THREE.MeshBasicMaterial({color: 0xffd19b, toneMapped: false});
  materials.push(lightMat);
  // Box UVs are measured in world units: the maps retain a consistent scale on
  // broad walls, narrow columns and soffits rather than stretching once per box.
  function block(name, size, position, mat, texSize = 2.8) {
    const geometry = new THREE.BoxGeometry(...size);
    const uv = geometry.attributes.uv;
    for (let face = 0; face < 6; face++) {
      const u = face < 2 ? size[2] : size[0];
      const v = face < 2 ? size[1] : face < 4 ? size[2] : size[1];
      for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * u / texSize, uv.getY(i) * v / texSize);
    }
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = name; mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  block('Polished concrete floor', [65, 0.22, 62], [0, floorY - 0.11, 5], floorMat, 3.5);
  block('Far gallery wall', [48, 25, 0.6], [0, floorY + 12.5, rearZ - 7], concrete);
  block('Left return wall', [0.6, 20, 15], [-13, floorY + 10, rearZ + 2], concrete);
  block('Left gallery pier', [3.7, 20, 1.25], [-12, floorY + 10, rearZ + 0.5], concrete);
  block('Right monolithic pier', [3.0, 23, 1.4], [10.0, floorY + 11.5, rearZ + 0.5], paleConcrete);
  block('Right dark return', [12, 24, 0.8], [17.5, floorY + 12, rearZ + 1.2], charcoal);
  block('Overhead concrete slab', [38, 0.6, 20], [0, 8.8, rearZ + 3], concrete);
  const beam = block('Deep diagonal lintel', [25, 1.15, 1.4], [-1.5, 6.55, rearZ + 1.4], concrete);
  beam.rotation.z = -0.06;
  beam.rotation.y = 0.09;
  // Panel joints are thin recessed shadow gaps, with an occasional bronze reveal.
  for (const x of [8.8, 10.3, 11.4]) {
    block('Vertical formwork joint', [0.028, 23, 0.018], [x, floorY + 11.5, rearZ + 1.213], charcoal);
  }
  for (const y of [floorY + 3.7, floorY + 7.4, floorY + 11.1, floorY + 14.8]) {
    block('Horizontal formwork joint', [3.0, 0.026, 0.018], [10.0, y, rearZ + 1.213], charcoal);
  }
  // A real recessed glazed bay: foreground mullions, glass, courtyard geometry
  // and a rear wall sit at different depths, making parallax physically coherent.
  forest.wrapS = forest.wrapT = THREE.ClampToEdgeWrapping;
  forest.repeat.set(0.34, 0.47);
  forest.offset.set(0.17, 0.30);
  forest.generateMipmaps = true;
  forest.minFilter = THREE.LinearMipmapLinearFilter;
  textures.push(forest);
  const bay = new THREE.MeshBasicMaterial({map: forest, color: 0x526376});
  bay.onBeforeCompile = shader => {
    const softMap = THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'texture2D( map, vMapUv, 1.6 )');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', softMap +
      '\n diffuseColor.rgb = mix(vec3(0.010, 0.018, 0.027), diffuseColor.rgb / (vec3(1.0) + diffuseColor.rgb * 8.0), 0.72);');
  };
  bay.customProgramCacheKey = () => 'atlas-distant-atmospheric-forest-v3';
  materials.push(bay);
  // The distant vegetation panorama is confined behind real glazing and
  // architectural occluders; it does not replace any of the museum geometry.
  const landscape = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 14), bay);
  landscape.name = 'Distant rainforest beyond glazing';
  landscape.position.set(-4.8, floorY + 7, rearZ - 5.8);
  group.add(landscape);
  const glass = new THREE.MeshPhysicalMaterial({color: 0x51778e, roughness: 0.1, metalness: 0.2,
    transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide});
  materials.push(glass);
  block('Recessed glazing', [12, 12, 0.025], [-4.5, floorY + 6, rearZ - 1.8], glass).castShadow = false;
  for (const x of [-10.6, -5.1, 0.8, 4.3, 8.1]) {
    block('Window deep mullion', [0.16, 12, 0.52], [x, floorY + 6, rearZ - 1.35], charcoal);
    block('Window mullion highlight', [0.025, 12, 0.03], [x - 0.07, floorY + 6, rearZ - 1.06], bronze);
  }
  block('Bay sill', [19.0, 0.28, 1.1], [-1.25, floorY + 0.5, rearZ - 1.4], concrete);
  for (const x of [2.3, 6.4]) {
    block('Rear room pier', [0.45, 12, 2.1], [x, floorY + 6, rearZ - 4], concrete);
  }
  // Recessed warm strip and fixtures, with local light rather than screen bloom.
  block('Left concealed warm strip', [3.8, 0.045, 0.045], [-12, 5.3, rearZ + 1.17], lightMat);
  block('Rear skirting luminous reveal', [23, 0.035, 0.035], [-1.5, floorY + 0.22, rearZ + 1.0], lightMat);
  for (const [x, y] of [[-4.7, 5.73], [-1.2, 5.52], [2.3, 5.31], [5.8, 5.1]]) {
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.026, 16), lightMat);
    fixture.position.set(x, y, rearZ + 1.6); group.add(fixture);
  }
  function spot(name, color, intensity, position, target, angle, shadows) {
    const light = new THREE.SpotLight(color, intensity, 35, angle, 0.7, 2);
    light.name = name; light.position.set(...position); light.target.position.set(...target);
    light.castShadow = shadows;
    if (shadows) { light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.0003; light.shadow.normalBias = 0.04; }
    group.add(light, light.target); return light;
  }
  spot('Left warm wall wash', 0xffe0b8, 170, [-11.3, 5.2, rearZ + 2.5], [-12, -1, rearZ + 1.2], 0.68, true);
  spot('Rear warm accent', 0xffd6a6, 200, [5.4, 5.0, rearZ + 0.7], [3.8, -1.0, rearZ - 4.0], 0.52, false);
  spot('Cool upper architectural wash', 0xc1d8ef, 480, [7, 8, rearZ + 4], [9.5, 7, rearZ + 1.2], 0.95, false);
  spot('Cool soffit fill', 0xb2c7dd, 180, [-4, 5.5, rearZ + 6], [-2, 6.9, rearZ + 1.5], 1.04, false);

  // A planar reflection of the live scene is mixed with the physical floor.
  // Fine roughness, normal-map distortion and continuous mip filtering avoid the
  // polished-mirror look while keeping legible, synchronized element reflections.
  const shader = {
    uniforms: THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
    vertexShader: Reflector.ReflectorShader.vertexShader
      .replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vFloorUv;')
      .replace('vUv = textureMatrix', 'vFloorUv = uv; vUv = textureMatrix'),
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D floorNormal;
      uniform sampler2D floorRough;
      uniform vec2 texel;
      varying vec4 vUv;
      varying vec2 vFloorUv;
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        vec2 concreteUv = vFloorUv * vec2(18.57, 17.71);
        vec2 n = texture2D(floorNormal, concreteUv).rg * 2.0 - 1.0;
        float rough = texture2D(floorRough, concreteUv).g;
        vec2 p = vUv.xy / vUv.w + n * 0.0008;
        vec3 reflected = texture2D(tDiffuse, p, 2.2 + rough * 1.4).rgb;
        gl_FragColor = vec4(reflected, 0.28 + (1.0 - rough) * 0.07);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  shader.uniforms.floorNormal = {value: floorNormal};
  shader.uniforms.floorRough = {value: floorRough};
  shader.uniforms.texel = {value: new THREE.Vector2(1 / 1024, 1 / 768)};
  const floorReflection = new Reflector(new THREE.PlaneGeometry(65, 62), {
    clipBias: 0.002, textureWidth: 1024, textureHeight: 768, shader, multisample: 0,
  });
  floorReflection.name = 'Live rough concrete reflection';
  floorReflection.getRenderTarget().texture.generateMipmaps = true;
  floorReflection.getRenderTarget().texture.minFilter = THREE.LinearMipmapLinearFilter;
  floorReflection.rotation.x = -Math.PI / 2;
  floorReflection.position.set(0, floorY + 0.008, 5);
  floorReflection.material.transparent = true;
  floorReflection.material.depthWrite = false;
  floorReflection.renderOrder = 2;
  group.add(floorReflection);
  return {
    group,
    resize(width, height) {
      const ratio = Math.min(1, 1280 / width);
      const w = Math.max(256, Math.floor(width * ratio));
      const h = Math.max(256, Math.floor(height * ratio));
      floorReflection.getRenderTarget().setSize(w, h);
      floorReflection.material.uniforms.texel.value.set(1 / w, 1 / h);
    },
    dispose() {
      group.removeFromParent();
      const geometries = new Set();
      group.traverse(child => { if (child.geometry) geometries.add(child.geometry); });
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      floorReflection.dispose(); environment.dispose();
      if (scene.environment === environment.texture) scene.environment = previousEnvironment;
    },
  };
}
