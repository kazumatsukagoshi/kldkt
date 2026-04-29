/* Copyright 2023 The MediaPipe Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */
import * as THREE from "https://cdn.skypack.dev/three@0.150.1";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.150.1/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.150.1/examples/jsm/loaders/GLTFLoader";
import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.1.0-alpha-16";
/**
 * Returns the world-space dimensions of the viewport at `depth` units away from
 * the camera.
 */
function getViewportSizeAtDepth(camera, depth) {
    const viewportHeightAtDepth = 2 * depth * Math.tan(THREE.MathUtils.degToRad(0.5 * camera.fov));
    const viewportWidthAtDepth = viewportHeightAtDepth * camera.aspect;
    return new THREE.Vector2(viewportWidthAtDepth, viewportHeightAtDepth);
}
/**
 * Creates a `THREE.Mesh` which fully covers the `camera` viewport, is `depth`
 * units away from the camera and uses `material`.
 */
function createCameraPlaneMesh(camera, depth, material) {
    if (camera.near > depth || depth > camera.far) {
        console.warn("Camera plane geometry will be clipped by the `camera`!");
    }
    const viewportSize = getViewportSizeAtDepth(camera, depth);
    const cameraPlaneGeometry = new THREE.PlaneGeometry(viewportSize.width, viewportSize.height);
    cameraPlaneGeometry.translate(0, 0, -depth);
    return new THREE.Mesh(cameraPlaneGeometry, material);
}

let getImageData;
let imgData;

class BasicScene {
    constructor() {
        this.lastTime = 0;
        this.callbacks = [];
        // Initialize the canvas with the same aspect ratio as the video input
        // 画面サイズに合わせて初期化（固定値だとスマホで幅オーバーフローする）
        this.height = window.innerHeight;
        this.width = window.innerWidth;
        // Set up the Three.js scene, camera, and renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.01, 5000);
        this.renderer = new THREE.WebGLRenderer({ 
             antialias: true,
             canvas: document.querySelector("#view"),
        });
        this.renderer.setSize(this.width, this.height);
        THREE.ColorManagement.legacy = false;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        //document.body.appendChild(this.renderer.domElement);
        // Set up the basic lighting for the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        this.scene.add(directionalLight);
        // Set up the camera position and controls
        this.camera.position.z = 0;
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        let orbitTarget = this.camera.position.clone();
        orbitTarget.z -= 5;
        this.controls.target = orbitTarget;
        this.controls.update();
        // Add a video background
        const video = document.getElementById("webcam");
        const inputFrameTexture = new THREE.VideoTexture(video);
        if (!inputFrameTexture) {
            throw new Error("Failed to get the 'input_frame' texture!");
        }
        inputFrameTexture.encoding = THREE.sRGBEncoding;
        const inputFramesDepth = 500;
        const inputFramesPlane = createCameraPlaneMesh(this.camera, inputFramesDepth, new THREE.MeshBasicMaterial({ map: inputFrameTexture }));
        this.scene.add(inputFramesPlane);
        // Render the scene
        this.render();
        window.addEventListener("resize", this.resize.bind(this));

         
    }
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.render(this.scene, this.camera);
    }
    render(time = this.lastTime) {
        const delta = (time - this.lastTime) / 1000;
        this.lastTime = time;
        // Call all registered callbacks with deltaTime parameter
        for (const callback of this.callbacks) {
            callback(delta);
        }
        // Render the scene
        this.renderer.render(this.scene, this.camera);
         if(getImageData == true){
              imgData = this.renderer.domElement.toDataURL();
              getImageData = false;
              const base64Image = imgData //document.getElementById('view').toDataURL()
                   resizeImage(base64Image, (base64) => {
                   const object = {
                     // "url": dataUrl
                   'url': base64Image,
                   }
                   const result = prompt(JSON.stringify(object))
             })
         }

        // Request next frame
        requestAnimationFrame((t) => this.render(t));

    }
}
class Avatar {
    constructor(url, scene) {
        this.loader = new GLTFLoader();
        this.morphTargetMeshes = [];
        this.url = url;
        this.scene = scene;
        this.loadModel(this.url);
    }
    loadModel(url) {
        this.url = url;
        this.loader.load(
        // URL of the model you want to load
        url, 
        // Callback when the resource is loaded
        (gltf) => {
            if (this.gltf) {
                // Reset GLTF and morphTargetMeshes if a previous model was loaded.
                this.gltf.scene.remove();
                this.morphTargetMeshes = [];
            }
            this.gltf = gltf;
            console.log();
            this.scene.add(gltf.scene);
            this.init(gltf);
        }, 
        // Called while loading is progressing
        (progress) => console.log("Loading model...", 100.0 * (progress.loaded / progress.total), "%"), 
        // Called when loading has errors
        (error) => console.error(error));
    }
    init(gltf) {
        gltf.scene.traverse((object) => {
            // Register first bone found as the root
            if (object.isBone && !this.root) {
                this.root = object;
                console.log(object);
            }
            // Return early if no mesh is found.
            if (!object.isMesh) {
                // console.warn(`No mesh found`);
                return;
            }
            const mesh = object;
            // Reduce clipping when model is close to camera.
            mesh.frustumCulled = false;
            // Return early if mesh doesn't include morphable targets
            if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
                // console.warn(`Mesh ${mesh.name} does not have morphable targets`);
                return;
            }
            this.morphTargetMeshes.push(mesh);
        });
    }
    updateBlendshapes(blendshapes) {
        for (const mesh of this.morphTargetMeshes) {
            if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
                // console.warn(`Mesh ${mesh.name} does not have morphable targets`);
                continue;
            }
            for (const [name, value] of blendshapes) {
                if (!Object.keys(mesh.morphTargetDictionary).includes(name)) {
                    // console.warn(`Model morphable target ${name} not found`);
                    continue;
                }
                const idx = mesh.morphTargetDictionary[name];
                mesh.morphTargetInfluences[idx] = value;
            }
        }
    }
    /**
     * Apply a position, rotation, scale matrix to current GLTF.scene
     * @param matrix
     * @param matrixRetargetOptions
     * @returns
     */
    applyMatrix(matrix, matrixRetargetOptions) {
        const { decompose = false, scale = 1 } = matrixRetargetOptions || {};
        if (!this.gltf) {
            return;
        }
        // Three.js will update the object matrix when it render the page
        // according the object position, scale, rotation.
        // To manually set the object matrix, you have to set autoupdate to false.
        matrix.scale(new THREE.Vector3(scale, scale, scale));
        this.gltf.scene.matrixAutoUpdate = false;
        // Set new position and rotation from matrix
        this.gltf.scene.matrix.copy(matrix);
    }
    /**
     * Takes the root object in the avatar and offsets its position for retargetting.
     * @param offset
     * @param rotation
     */
    offsetRoot(offset, rotation) {
        if (this.root) {
            this.root.position.copy(offset);
            if (rotation) {
                let offsetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z));
                this.root.quaternion.copy(offsetQuat);
            }
        }
    }
}
let faceLandmarker;
let video;
let localStream;
const scene = new BasicScene();
//const avatar = new Avatar("https://assets.codepen.io/9177687/raccoon_head.glb", scene.scene);
const avatar = new Avatar("https://kazumatsukagoshi.github.io/kldkt/colapsed.glb", scene.scene);
function detectFaceLandmarks(time) {
    if (!faceLandmarker) {
        return;
    }
    const landmarks = faceLandmarker.detectForVideo(video, time);
    // Apply transformation
    const transformationMatrices = landmarks.facialTransformationMatrixes;
    if (transformationMatrices && transformationMatrices.length > 0) {
        let matrix = new THREE.Matrix4().fromArray(transformationMatrices[0].data);
        // Example of applying matrix directly to the avatar
        avatar.applyMatrix(matrix, { scale: 40 });
    }
    // Apply Blendshapes
    const blendshapes = landmarks.faceBlendshapes;
    if (blendshapes && blendshapes.length > 0) {
        const coefsMap = retarget(blendshapes);
        avatar.updateBlendshapes(coefsMap);
    }
}
function retarget(blendshapes) {
    const categories = blendshapes[0].categories;
    let coefsMap = new Map();
    for (let i = 0; i < categories.length; ++i) {
        const blendshape = categories[i];
        // Adjust certain blendshape values to be less prominent.
        switch (blendshape.categoryName) {
            case "browOuterUpLeft":
                blendshape.score *= 1.2;
                break;
            case "browOuterUpRight":
                blendshape.score *= 1.2;
                break;
            case "eyeBlinkLeft":
                blendshape.score *= 1.2;
                break;
            case "eyeBlinkRight":
                blendshape.score *= 1.2;
                break;
            default:
        }
        coefsMap.set(categories[i].categoryName, categories[i].score);
    }
    return coefsMap;
}
function onVideoFrame(time) {
    detectFaceLandmarks(time);
    video.requestVideoFrameCallback(onVideoFrame);
}

function addOption(target, key, value) {
    const sel = document.getElementById(target);
    const opt = document.createElement('option');
    opt.appendChild(document.createTextNode(value));
    opt.value = key;
    sel.appendChild(opt);
}

async function startCamera() {
    video = document.getElementById("webcam");
    if (localStream) {
        video.srcObject = null;
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    const sel = document.getElementById('videoOptions');
    const deviceId = sel && sel.value ? sel.value : null;
    const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: window.innerWidth, height: window.innerHeight }
        : { facingMode: "user", width: window.innerWidth, height: window.innerHeight };
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
        localStream = stream;
        video.srcObject = stream;
        video.onloadedmetadata = () => { video.play(); };
        video.requestVideoFrameCallback(onVideoFrame);
    } catch (e) {
        console.error(`Failed to acquire camera feed: ${e}`);
    }
}

async function runDemo() {
    // 権限取得 → デバイス列挙 → select に登録
    try {
        const tmpStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        devices.forEach(d => {
            if (d.kind === 'videoinput') addOption('videoOptions', d.deviceId, d.label);
        });
        tmpStream.getTracks().forEach(t => t.stop());
    } catch (e) {
        console.error(e);
    }
    document.getElementById('videoOptions').addEventListener('change', startCamera);
    await startCamera();
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.1.0-alpha-16/wasm");
    faceLandmarker = await FaceLandmarker.createFromModelPath(vision, "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task");
    await faceLandmarker.setOptions({
        baseOptions: { delegate: "GPU" },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true
    });
    console.log("Finished Loading MediaPipe Model.");
}
runDemo();


//撮影
const picture = document.querySelector("#picture")
let  guideCanvas = document.querySelector("#view")
const se = document.querySelector('#se');
/**
   * シャッターボタン
 */
document.querySelector("#save").addEventListener("click", () => {
  getImageData = true
  const ctx = picture.getContext('2d')
  picture.width = 820
  picture.height = 1106

 let videoElement = document.getElementById("webcam");

  // SEを再生する
    videoElement.pause()  
    se.play()      
    setTimeout( () => {
      videoElement.play()    
  }, 500);
 
    // canvasに画像を貼り付ける
  //ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight)
  //ctx.drawImage(guideCanvas, 0, 0, picture.width, picture.height)
  //ctx.drawImage(maskElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight)

 
  return false
})

/**
 * 画像のリサイズ
 * @param  {string}   base64   [base64]
 * @param  {Function} callback [Function]
 * @return {string}            [base64]
 */
const resizeImage = function(base64, callback) {
    const MIN_SIZE = 400;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = function(event){
        var dstWidth, dstHeight;
        if (this.width > this.height) {
            dstWidth = MIN_SIZE;
            dstHeight = this.height * MIN_SIZE / this.width;
        } else {
            dstHeight = MIN_SIZE;
            dstWidth = this.width * MIN_SIZE / this.height;
        }
        canvas.width = dstWidth;
        canvas.height = dstHeight;
        ctx.drawImage(this, 0, 0, this.width, this.height, 0, 0, dstWidth, dstHeight);
        callback(canvas.toDataURL());
    };
    image.src = base64;
};
 
 /**
 * base64からBlobにコンパイル
 * @param  {string} base64 [base64]
 * @return {string}        [blob]
 */
function base64toBlob(base64) {
  var bin = atob(base64.replace(/^.*,/, ''));
  var buffer = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) {
    buffer[i] = bin.charCodeAt(i);
  }
  try{
    var blob = new Blob([buffer.buffer], {
      type: 'image/jpeg'
    });
  }catch (e){
    return false;
  }
  return blob;
}
