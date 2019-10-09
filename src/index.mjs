import './vendor/PointerLockControls.js';
import {WEBVR} from './vendor/WebVR.js';
import {loadAssets} from './assetManager.mjs';
import './vendor/BasisTextureLoader.js';


import * as worldHall from './worldHall.mjs';
import * as worldPanorama from './worldPanorama.mjs';
import * as worldPanoramaStereo from './worldPanoramaStereo.mjs';
import * as worldPhotogrammetryObject from './worldPhotogrammetryObject.mjs';
import * as worldCity from './worldCity.mjs';
import * as worldElevator from './worldElevator.mjs'
import * as worldVertigo from './worldVertigo.mjs';
import * as worldSound from './worldSound.mjs';
import {shaders} from './shaders.mjs';


var clock = new THREE.Clock();


var scene, parent, renderer, camera, controls, context;
var controller1, controller2;

var worlds = [
  worldHall,
  worldSound,
  worldPhotogrammetryObject,
  worldVertigo,
  worldCity,
  worldElevator,
  worldPanorama,
  worldPanoramaStereo,
];
var currentWorld = 0;

var assets = {
  // fonts
  inter_bold_font: 'fonts/Inter-Bold.font',
  inter_bold_tex: 'fonts/Inter-Bold.png',
  inter_regular_font: 'fonts/Inter-Regular.font',
  inter_regular_tex: 'fonts/Inter-Regular.png',
  metropolis_bold_font: 'fonts/Metropolis-Bold.font',
  metropolis_bold_tex: 'fonts/Metropolis-Bold.png',

  //
  hall_model: 'hall.gltf',
  city_model: 'city.glb',
  vertigo_model: 'vertigo2.gltf',
  elevator_model: 'elevator.glb',
  generic_controller_model: 'generic_controller.gltf',
  lightmap_tex: 'lightmap.basis',
  travertine_tex: 'travertine.png',
  travertine2_tex: 'travertine2.jpg',
  controller_tex: 'controller.png',
  pano1: 'zapporthorn.basis',
  pano1small: 'zapporthorn_small.jpg',
  pano2small: 'andes_small.jpg',
  panoballfx_tex: 'ballfx.jpg',
  andesL: 'andesL.jpg',
  andesR: 'andesR.jpg',
  elevator_lm_tex: 'elevator_lm.png',
  lanes01_tex: 'lanes01.jpg',
  pavement_tex: 'pavement.jpg',
  checkboard_tex: 'checkboard.png',
  vertigo_lm_tex: 'vertigo2_lm.jpg',

  // sound
  sound_model: 'sound.glb',
  sound_shadow_tex: 'sound_shadow.png',

  // photogrammetry object
  pg_floor_tex: 'travertine2.jpg',
  pg_floor_lm_tex: 'angel_floor_lm.jpg',
  pg_object_tex: 'angel.basis',
  pg_object_model: 'angel.glb', // TODO: try draco version, angel.min.glb
  pg_bg_tex: 'pg_bg.jpg',
  pg_flare_tex: 'flare.jpg',
  pg_panel_tex: 'panel.jpg',

  // paintings
  painting_seurat_tex: 'paintings/seurat.basis',
  painting_sorolla_tex: 'paintings/sorolla.basis',
  painting_bosch_tex: 'paintings/bosch.basis',
  painting_degas_tex: 'paintings/degas.basis',
  painting_rembrandt_tex: 'paintings/rembrandt.basis',
};

function gotoWorld(world) {
  worlds[currentWorld].exit(context);
  currentWorld = world;
  worlds[currentWorld].enter(context);
}

export function init() {
  var w = 100;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.005, 10000);
  camera.position.set(0, 1.6, 0);
  camera.position.set(1.5, 1.6, 2.3); //near pano1
  controls = new THREE.PointerLockControls(camera);
  document.body.addEventListener('click', () => controls.lock());
  document.body.addEventListener('keydown', ev => {
    switch(ev.keyCode) {
      case 87: controls.moveForward(0.2); break;
      case 65: controls.moveRight(-0.2); break;
      case 83: controls.moveForward(-0.2); break;
      case 68: controls.moveRight(0.2); break;
      case 78: gotoWorld((currentWorld + 1) % worlds.length); break;
    }
  });
  scene.add(controls.getObject());

  parent = new THREE.Object3D();
  scene.add(parent);

  renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: false});
  renderer.gammaOutput = true;
  renderer.gammaFactor = 2.2;
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.vr.enabled = true;

  window.addEventListener('resize', onWindowResize, false);
  setInterval(()=>{
    console.log('render calls:', renderer.info.render.calls);
  }, 2000);

  controller1 = renderer.vr.getController(0);
  scene.add(controller1);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);

  controller2 = renderer.vr.getController(1);
  scene.add(controller2);
  controller2.raycaster = new THREE.Raycaster();
  controller2.raycaster.near = 0.1;
  //controller2.raycaster.far = 3;
  controller2.addEventListener('selectstart', onSelectStart);
  controller2.addEventListener('selectend', onSelectEnd);

  context = {
    assets: assets,
    shaders: shaders,
    scene : parent,
    renderer: renderer,
    camera: camera,
    controllers: [controller1, controller2]
  };

  loadAssets(renderer, '../assets/', assets, () => {
    setupControllers();
    worldHall.setup(context);
    worldPanorama.setup(context);
    worldPanoramaStereo.setup(context);
    worldPhotogrammetryObject.setup(context);
    worldCity.setup(context);
    worldElevator.setup(context);
    worldVertigo.setup(context);
    worldSound.setup(context);

    currentWorld = 0;
    worlds[currentWorld].enter(context);

    document.body.appendChild( renderer.domElement );
    document.body.appendChild(WEBVR.createButton(renderer));
    renderer.setAnimationLoop(animate);
  })
}

function setupControllers() {
  var model = assets['generic_controller_model'].scene;
  var material = new THREE.MeshLambertMaterial({
    map: assets['controller_tex'],
  });
  model.getObjectByName('body').material = material;
  model.getObjectByName('trigger').material = material;
  controller1.add(model);
  controller2.add(model.clone());
}

function onSelectStart(ev) {
  const trigger = ev.target.getObjectByName('trigger');
  trigger.rotation.x = -0.3;
  //gotoWorld((currentWorld + 1) % worlds.length);
}

function onSelectEnd(ev) {
  const trigger = ev.target.getObjectByName('trigger');
  trigger.rotation.x = 0;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  var delta = clock.getDelta();
  var elapsedTime = clock.elapsedTime;
  context.goto = null;
  worlds[currentWorld].execute(context, delta, elapsedTime);
  renderer.render( scene, camera );
}

window.onload = () => {init()};
