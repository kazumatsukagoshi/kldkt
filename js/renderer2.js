/* SETUP MEDIAPIPE HOLISTIC INSTANCE */
let videoElement = document.querySelector(".input_video"),
    guideCanvas = document.querySelector("canvas.guides"),
    localStream;

window.onload = function() {

  const option = {video: true};
  navigator.mediaDevices.getUserMedia(option).then(function(stream) {
      // 入出力デバイスの取得
      navigator.mediaDevices.enumerateDevices().then(function(devices) {
          devices.forEach(function(device) {
              switch ( device.kind ) {
                case 'videoinput':
                addOption('videoOptions', device.deviceId, device.label);
                break;
              }
          });
      }).catch(function(err) {
          console.error(err);
      });
      // 停止
      stream.getTracks().forEach(function(track) {
          track.stop();
      });
      startCamera();
  }).catch(function (err) {
       console.error(err);
     });
}

function addOption(target, key, value) {
  let sel = document.getElementById(target);
  let opt = document.createElement('option');
  opt.appendChild(document.createTextNode(value));
  opt.value = key;
  sel.appendChild(opt);
}


function startCamera() {
  stop();
  let video = document.getElementById('videoOptions');
  let videoDeviceId;
  /*
  for ( let i in audio.options ) {
      if ( audio.options[i].selected ) {
          audioDeviceId = audio.options[i].value;
      }
  }
  */
  for ( let i in video.options ) {
      if ( video.options[i].selected ) {
          videoDeviceId = video.options[i].value;
      }
  }
  
  // getUsermedia parameters.
  const constraints = {
   video: {
     deviceId: videoDeviceId,
     width: 1260,
     height: 840
    }
  }

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
            videoElement.srcObject = stream;
            localStream = stream;
            videoElement.requestVideoFrameCallback(onVideoFrame);
            animate()
  }).catch(function (err) {
      console.error(err);
  });
}

// ビデオストリームを停止
function stop() {
  if ( localStream ) {
    videoElement.pause();
    videoElement.srcObject = null;
      localStream.getTracks().forEach(function(track) {
          track.stop();
      });
      localStream = null;
  }
}


// Use `Mediapipe` utils to get camera - lower resolution = higher fps

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}



async function onVideoFrame() {
  // Do something with the frame.
  await holistic.send({image: videoElement}); 
  // Re-register the callback to be notified about the next frame.
  videoElement.requestVideoFrameCallback(onVideoFrame);
}

const onResults = (results) => {
  // Draw landmark guides Mediapipeの線の表示
  drawResults(results)
  // Animate model
  animateVRM(currentVrm, results)
}

const holistic = new Holistic({
    locateFile: file => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
    }
  });

holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
    refineFaceLandmarks: true,
    
});

// Pass holistic a callback function
holistic.onResults(onResults);

const drawResults = (results) => {
  guideCanvas.width = videoElement.videoWidth;
guideCanvas.height = videoElement.videoHeight;

let canvasCtx = guideCanvas.getContext('2d');
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
  // Use `Mediapipe` drawing functions
  /*
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "#00cff7",
      lineWidth: 4
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: "#ff0364",
      lineWidth: 2
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
      color: "#C0C0C070",
      lineWidth: 1
    });
    if(results.faceLandmarks && results.faceLandmarks.length === 478){
      //draw pupils
      drawLandmarks(canvasCtx, [results.faceLandmarks[468],results.faceLandmarks[468+5]], {
        color: "#ffe603",
        lineWidth: 2
      });
    }
    
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
      color: "#eb1064",
      lineWidth: 5
    });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, {
      color: "#00cff7",
      lineWidth: 2
    });
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
      color: "#22c3e3",
      lineWidth: 5
    });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, {
      color: "#ff0364",
      lineWidth: 2
    });
    */
    canvasCtx.drawImage(renderer.domElement, 0, 0)
}


//Import Helper Functions from Kalidokit
const remap = Kalidokit.Utils.remap;
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

/* THREEJS WORLD SETUP */
let currentVrm;

// renderer
const renderer = new THREE.WebGLRenderer({alpha:true, preserveDrawingBuffer: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
//以下変更
//document.body.appendChild(renderer.domElement);

//const view = document.getElementById("preview");
//view.appendChild(renderer.domElement, 0, 0);

// camera
const orbitCamera = new THREE.PerspectiveCamera(35,window.innerWidth / window.innerHeight,0.1,1000);
//orbitCamera.position.set(0.0, 1.0, 5.0);
orbitCamera.position.set(0.1, 1.0, 7.0);

// controls
const orbitControls = new THREE.OrbitControls(orbitCamera, renderer.domElement);
orbitControls.screenSpacePanning = true;
//orbitControls.target.set(0.0, 1.0, 0.0);
orbitControls.target.set(0.0, 0.0, 0.0);

orbitControls.update();

// scene
const scene = new THREE.Scene();

// light
const light = new THREE.DirectionalLight(0xffffff);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

// Main Render Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (currentVrm) {
    // Update model to render physics
    currentVrm.update(clock.getDelta());
  }
  renderer.render(scene, orbitCamera);
}


/* VRM CHARACTER SETUP */

// Import Character VRM
const loader = new THREE.GLTFLoader();
loader.crossOrigin = "anonymous";
// Import model from URL, add your own model here
loader.load(
"https://kazumatsukagoshi.github.io/kldkt/Zonko_VRM_221128.vrm",
  gltf => {
    THREE.VRMUtils.removeUnnecessaryJoints(gltf.scene);

    THREE.VRM.from(gltf).then(vrm => {
      scene.add(vrm.scene);
      currentVrm = vrm;
      currentVrm.scene.rotation.y = Math.PI; // Rotate model 180deg to face camera
    });
  },

  progress =>
    console.log(
      "Loading model...",
      100.0 * (progress.loaded / progress.total),
      "%"
    ),

  error => console.error(error)
);

// Animate Rotation Helper function
const rigRotation = (
  name,
  rotation = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!currentVrm) {return}
  const Part = currentVrm.humanoid.getBoneNode(
    THREE.VRMSchema.HumanoidBoneName[name]
  );
  if (!Part) {return}
  
  let euler = new THREE.Euler(
    rotation.x * dampener,
    rotation.y * dampener,
    rotation.z * dampener
  );
  let quaternion = new THREE.Quaternion().setFromEuler(euler);
  Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
};

// Animate Position Helper Function
const rigPosition = (
  name,
  position = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!currentVrm) {return}
  const Part = currentVrm.humanoid.getBoneNode(
    THREE.VRMSchema.HumanoidBoneName[name]
  );
  if (!Part) {return}
  let vector = new THREE.Vector3(
    position.x * dampener,
    position.y * dampener,
    position.z * dampener
  );
  Part.position.lerp(vector, lerpAmount); // interpolate
};

let oldLookTarget = new THREE.Euler()
const rigFace = (riggedFace) => {
    if(!currentVrm){return}
    rigRotation("Neck", riggedFace.head, 0.7);

    // Blendshapes and Preset Name Schema
    const Blendshape = currentVrm.blendShapeProxy;
    const PresetName = THREE.VRMSchema.BlendShapePresetName;
  
    // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
    // for VRM, 1 is closed, 0 is open.
    riggedFace.eye.l = lerp(clamp(1 - riggedFace.eye.l, 0, 1),Blendshape.getValue(PresetName.Blink), .5)
    riggedFace.eye.r = lerp(clamp(1 - riggedFace.eye.r, 0, 1),Blendshape.getValue(PresetName.Blink), .5)
    riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye,riggedFace.head.y)
    Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);
    
    // Interpolate and set mouth blendshapes
    Blendshape.setValue(PresetName.I, lerp(riggedFace.mouth.shape.I,Blendshape.getValue(PresetName.I), .5));
    Blendshape.setValue(PresetName.A, lerp(riggedFace.mouth.shape.A,Blendshape.getValue(PresetName.A), .5));
    Blendshape.setValue(PresetName.E, lerp(riggedFace.mouth.shape.E,Blendshape.getValue(PresetName.E), .5));
    Blendshape.setValue(PresetName.O, lerp(riggedFace.mouth.shape.O,Blendshape.getValue(PresetName.O), .5));
    Blendshape.setValue(PresetName.U, lerp(riggedFace.mouth.shape.U,Blendshape.getValue(PresetName.U), .5));

    //PUPILS
    //interpolate pupil and keep a copy of the value
    let lookTarget =
      new THREE.Euler(
        lerp(oldLookTarget.x, riggedFace.pupil.y, .4),
        lerp(oldLookTarget.y, riggedFace.pupil.x, .4),
        0,
        "XYZ"
      )
    oldLookTarget.copy(lookTarget)
    currentVrm.lookAt.applyer.lookAt(lookTarget);
}

/* VRM Character Animator */
const animateVRM = (vrm, results) => {
  if (!vrm) {
    return;
  }   
  // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
  let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

  const faceLandmarks = results.faceLandmarks;
  // Pose 3D Landmarks are with respect to Hip distance in meters
  const pose3DLandmarks = results.ea;
  // Pose 2D landmarks are with respect to videoWidth and videoHeight
  const pose2DLandmarks = results.poseLandmarks;
  // Be careful, hand landmarks may be reversed
  const leftHandLandmarks = results.rightHandLandmarks;
  const rightHandLandmarks = results.leftHandLandmarks;

  // Animate Face
  if (faceLandmarks) {
   riggedFace = Kalidokit.Face.solve(faceLandmarks,{
      runtime:"mediapipe",
      video:videoElement
   });
   rigFace(riggedFace)
  }

  // Animate Pose
  if (pose2DLandmarks && pose3DLandmarks) {
    riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
      runtime: "mediapipe",
      video:videoElement,
    });
    rigRotation("Hips", riggedPose?.Hips?.rotation, 0.7);
    rigPosition(
      "Hips",
      {
        x: -riggedPose?.Hips?.position?.x, // Reverse direction
        y: riggedPose?.Hips?.position?.y + 1, // Add a bit of height
        z: -riggedPose?.Hips?.position?.z // Reverse direction
      },
      1,
      0.07
    );

    rigRotation("Chest", riggedPose?.Spine, 0.25, .3);
    rigRotation("Spine", riggedPose?.Spine, 0.45, .3);

    rigRotation("RightUpperArm", riggedPose?.RightUpperArm, 1, .3);
    rigRotation("RightLowerArm", riggedPose?.RightLowerArm, 1, .3);
    rigRotation("LeftUpperArm", riggedPose?.LeftUpperArm, 1, .3);
    rigRotation("LeftLowerArm", riggedPose?.LeftLowerArm, 1, .3);

    rigRotation("LeftUpperLeg", riggedPose?.LeftUpperLeg, 1, .3);
    rigRotation("LeftLowerLeg", riggedPose?.LeftLowerLeg, 1, .3);
    rigRotation("RightUpperLeg", riggedPose?.RightUpperLeg, 1, .3);
    rigRotation("RightLowerLeg", riggedPose?.RightLowerLeg, 1, .3);
  }

  // Animate Hands
  if (leftHandLandmarks) {
    riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
    rigRotation("LeftHand", {
      // Combine pose rotation Z and hand rotation X Y
      z: riggedPose?.LeftHand?.z,
      y: riggedLeftHand.LeftWrist?.y,
      x: riggedLeftHand.LeftWrist?.x
    });
    rigRotation("LeftRingProximal", riggedLeftHand.LeftRingProximal);
    rigRotation("LeftRingIntermediate", riggedLeftHand.LeftRingIntermediate);
    rigRotation("LeftRingDistal", riggedLeftHand.LeftRingDistal);
    rigRotation("LeftIndexProximal", riggedLeftHand.LeftIndexProximal);
    rigRotation("LeftIndexIntermediate", riggedLeftHand.LeftIndexIntermediate);
    rigRotation("LeftIndexDistal", riggedLeftHand.LeftIndexDistal);
    rigRotation("LeftMiddleProximal", riggedLeftHand.LeftMiddleProximal);
    rigRotation("LeftMiddleIntermediate", riggedLeftHand.LeftMiddleIntermediate);
    rigRotation("LeftMiddleDistal", riggedLeftHand.LeftMiddleDistal);
    rigRotation("LeftThumbProximal", riggedLeftHand.LeftThumbProximal);
    rigRotation("LeftThumbIntermediate", riggedLeftHand.LeftThumbIntermediate);
    rigRotation("LeftThumbDistal", riggedLeftHand.LeftThumbDistal);
    rigRotation("LeftLittleProximal", riggedLeftHand.LeftLittleProximal);
    rigRotation("LeftLittleIntermediate", riggedLeftHand.LeftLittleIntermediate);
    rigRotation("LeftLittleDistal", riggedLeftHand.LeftLittleDistal);
  }
  if (rightHandLandmarks) {
    riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
    rigRotation("RightHand", {
      // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
      z: riggedPose?.RightHand?.z,
      y: riggedRightHand.RightWrist?.y,
      x: riggedRightHand.RightWrist?.x
    });
    rigRotation("RightRingProximal", riggedRightHand.RightRingProximal);
    rigRotation("RightRingIntermediate", riggedRightHand.RightRingIntermediate);
    rigRotation("RightRingDistal", riggedRightHand.RightRingDistal);
    rigRotation("RightIndexProximal", riggedRightHand.RightIndexProximal);
    rigRotation("RightIndexIntermediate",riggedRightHand.RightIndexIntermediate);
    rigRotation("RightIndexDistal", riggedRightHand.RightIndexDistal);
    rigRotation("RightMiddleProximal", riggedRightHand.RightMiddleProximal);
    rigRotation("RightMiddleIntermediate", riggedRightHand.RightMiddleIntermediate);
    rigRotation("RightMiddleDistal", riggedRightHand.RightMiddleDistal);
    rigRotation("RightThumbProximal", riggedRightHand.RightThumbProximal);
    rigRotation("RightThumbIntermediate", riggedRightHand.RightThumbIntermediate);
    rigRotation("RightThumbDistal", riggedRightHand.RightThumbDistal);
    rigRotation("RightLittleProximal", riggedRightHand.RightLittleProximal);
    rigRotation("RightLittleIntermediate", riggedRightHand.RightLittleIntermediate);
    rigRotation("RightLittleDistal", riggedRightHand.RightLittleDistal);
  }
};

//撮影
const picture = document.querySelector("#picture");
const countDown = document.getElementById('countdown'); 
const se = document.querySelector('#se');
let targetTime;
let interval; 

function updateCountDown(){

  const now = new Date().getTime();
  const distance = targetTime - now;

  //const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  //const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.getElementById("countdown-sec").textContent = seconds;
  if(seconds <= 0){
   clearInterval(interval);
   interval = null;
   saveImage(); 
  }
}
/**
   * シャッターボタン
 */
document.querySelector("#save").addEventListener("click", () => {
  if (!interval) {
    targetTime = new Date().getTime() + 5500; 
    interval = setInterval(updateCountDown, 1000);
    updateCountDown();
  }
})

function saveImage(){
 // SEを再生する
 videoElement.pause()  
 se.play()      
 setTimeout( () => {
   videoElement.play()    
 }, 500);

const ctx = picture.getContext('2d')
picture.width = videoElement.videoWidth
picture.height = videoElement.videoHeight

 // canvasに画像を貼り付ける
ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight)
ctx.drawImage(guideCanvas, 0, 0, videoElement.videoWidth, videoElement.videoHeight)
//ctx.drawImage(maskElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight)

const base64Image = document.getElementById('picture').toDataURL()
resizeImage(base64Image, (base64) => {
 const object = {
   // "url": dataUrl
   'url': base64Image,
 }
 const result = prompt(JSON.stringify(object))
   })
return false
}


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

