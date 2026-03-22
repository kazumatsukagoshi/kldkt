/* SETUP MEDIAPIPE HOLISTIC INSTANCE */
let video = document.querySelector("video.input_video")
video.width = window.outerWidth
video.height = video.width * 1.3333333 //window.outerHeight

const canvasElement = document.getElementById("output_canvas");
canvasElement.width = video.width
canvasElement.height = video.height
const canvasCtx = canvasElement.getContext("2d");
const maskElement = document.getElementById("mask_canvas");
maskElement.width = video.width
maskElement.height = video.height
const maskCtx = maskElement.getContext("2d");

const gestureOutput = document.getElementById("gesture_output");

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
// Create task for image file processing:
import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.1.0-alpha-16";
let gestureRecognizer;

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
  // getUsermedia parameters.
const constraints = {
   video: true,
   video: { 
    width: 1260,
    height: 840,
    facingMode: "user"
   }
};

const creatGestureLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 18
  });
};

creatGestureLandmarker();

var particleSystem = null;
var stage = null;
let startX = 0;
let startY = 0;
//  ウィンドウのロードが終わり次第、初期化コードを呼び出す。
window.addEventListener('load', function () {

  // Stageオブジェクトを作成します。表示リストのルートになります。
  stage = new createjs.Stage('mask_canvas');

  // パーティクルシステム作成します。
  particleSystem = new particlejs.ParticleSystem();

  // パーティクルシステムの描画コンテナーを表示リストに登録します。
  stage.addChild(particleSystem.container);

  // Particle Develop( http://ics-web.jp/projects/particle-develop/ ) から書きだしたパーティクルの設定を読み込む
  particleSystem.importFromJson(
    // パラメーターJSONのコピー＆ペースト ここから--
    {
      'bgColor': 'transparent',
      'width': maskElement.width,
      'height': maskElement.height,
      'emitFrequency': 300,
      'startX': 419,
      'startXVariance': '0',
      'startY': 304,
      'startYVariance': '0',
      'initialDirection': '209.5',
      'initialDirectionVariance': '155',
      'initialSpeed': '2.6',
      'initialSpeedVariance': '3.8',
      'friction': '0.0085',
      'accelerationSpeed': '0.835',
      'accelerationDirection': '233.2',
      'startScale': '1',
      'startScaleVariance': '0.52',
      'finishScale': '0',
      'finishScaleVariance': '0',
      'lifeSpan': '40',
      'lifeSpanVariance': '0',
      'startAlpha': '1',
      'startAlphaVariance': '0',
      'finishAlpha': '1',
      'finishAlphaVariance': '0',
      'shapeIdList': [
        'blur_circle'
      ],
      'startColor': {
        'hue': '17',
        'hueVariance': '32',
        'saturation': '100',
        'saturationVariance': '45',
        'luminance': '56',
        'luminanceVariance': '19'
      },
      'blendMode': true,
      'alphaCurveType': '0'
    }
    // パラメーターJSONのコピー＆ペースト ここまで---
  );

  // フレームレートの設定
  createjs.Ticker.framerate = 60;
  // requestAnimationFrameに従った呼び出し
  createjs.Ticker.timingMode = createjs.Ticker.RAF;
  // 定期的に呼ばれる関数を登録
  //createjs.Ticker.addEventListener('tick', handleTick);

         // Activate the webcam stream.
 navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
  video.srcObject = stream;
  video.addEventListener("loadeddata", predictWebcam);
});

});

function handleTick() {
  //  マウス位置に従って、パーティクル発生位置を変更する
  particleSystem.startX = startX;
  particleSystem.startY = startY;

  // パーティクルの発生・更新
  particleSystem.update();

  // 描画を更新する
  stage.update();
}
/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/

function callbackForVideo(result) {
  var canvas = document.createElement('canvas');
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  var ctx = canvas.getContext('2d');
  //let imageData = canvasCtx.getImageData(
  let imageData = ctx.getImageData(
    0,
    0,
    //canvasElement.width,
    canvas.width,
    //canvasElement.height
    canvas.height
  ).data;
  const mask = result.categoryMask.getAsFloat32Array();
  let j = 0;
  for (let i = 0; i < mask.length; ++i) {
    const maskVal = Math.round(mask[i] * 255.0);
    const legendColor = legendColors[maskVal % legendColors.length];
    imageData[j] = (legendColor[0] + imageData[j]) / 2;
    imageData[j + 1] = (legendColor[1] + imageData[j + 1]) / 2;
    imageData[j + 2] = (legendColor[2] + imageData[j + 2]) / 2;
    imageData[j + 3] = (legendColor[3] + imageData[j + 3]) / 2;
    j += 4;
  }
  const uint8Array = new Uint8ClampedArray(imageData.buffer);
  const dataNew = new ImageData(
    uint8Array,
    canvas.width,
    canvas.height
  );
  ctx.putImageData(dataNew, 0, 0)

  var resizedcanvas = document.createElement('canvas');
  resizedcanvas.width = window.outerWidth
  resizedcanvas.height = window.outerHeight
  var resizedctx = resizedcanvas.getContext('2d');
  //resizedctx.drawImage(canvas, 0, 0, canvasElement.width, canvasElement.height)
  resizedctx.drawImage(canvas, 0, 0, maskElement.width, maskElement.height)
  //maskCtx.putImageData(resizedctx.getImageData(0,0, canvasElement.width, canvasElement.height), 0, 0)
  maskCtx.putImageData(resizedctx.getImageData(0,0, maskElement.width, maskElement.height), 0, 0)
}


let lastVideoTime = -1;
let results = undefined;
let gestureResults = undefined;

async function predictWebcam() {
  //const webcamElement = document.getElementById("webcam");
  // Now let's start detecting the stream.
  let nowInMs = Date.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    if(gestureRecognizer == null ){
        window.requestAnimationFrame(predictWebcam);
      return
    }
    gestureResults = gestureRecognizer.recognizeForVideo(video, nowInMs);
  }

  //canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  const drawingUtils = new DrawingUtils(canvasCtx);

  if (gestureResults.landmarks) {
    let index = 0;
    startX = 0;
    startY = 0;
    for (const landmarks of gestureResults.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        GestureRecognizer.HAND_CONNECTIONS,
        {
          color: "#00FF00",
          lineWidth: 5
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#FF0000",
        lineWidth: 2
      });

      if ( index == 0){
      startX = landmarks[8].x * video.width
      startY = landmarks[8].y * video.height
      }
      index++
    }
  }

  if (gestureResults.gestures.length > 0) {
    gestureOutput.style.display = "block";
    gestureOutput.style.width = video.videoWidth;
    var i = 0;

   for (const gestures of gestureResults.gestures){
    //  const categoryName = results.gestures[0][0].categoryName;
      const categoryName = gestureResults.gestures[i][0].categoryName;
      const categoryScore = parseFloat(
     // results.gestures[0][0].score * 100
        gestureResults.gestures[i][0].score * 100
      ).toFixed(2);
     //  const handedness = results.handednesses[0][0].displayName;
      const handedness = gestureResults.handednesses[i][0].displayName;
   
      if (i == 0){
        gestureOutput.innerText = `[${i}] ${categoryName}:  ${handedness}`;
        if (categoryName === "Pointing_Up" ){
          if (!interval){
            // 定期的に呼ばれる関数を登録
            createjs.Ticker.addEventListener('tick', handleTick);
            targetTime = new Date().getTime() + 5500; 
            interval = setInterval(updateCountDown, 1000);
         +  updateCountDown();
           }
        }
      } else{
        gestureOutput.innerText += `,[${i}] ${categoryName}:  ${handedness}`;
      }
      i++;
    }
  } else {
    gestureOutput.style.display = "none";
  }

  // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(predictWebcam);
}

/////
///// DEMO
/////
// add 'Tap + Hold to Add to Photos' prompt when user takes a photo
window.addEventListener('mediarecorder-photocomplete', () => {
  document.getElementById('overlay').style.display = 'block'
})

// hide 'Tap + Hold to Add to Photos' prompt when user dismisses preview modal
window.addEventListener('mediarecorder-previewclosed', () => {
  document.getElementById('overlay').style.display = 'none'
})


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

  document.getElementById("save").textContent = seconds;
  if(seconds <= 0){
   clearInterval(interval);
   saveImage(); 
  }
}
/**
   * シャッターボタン
 */
document.querySelector("#save").addEventListener("click", () => {
  if (!interval){
   targetTime = new Date().getTime() + 5500; 
   interval = setInterval(updateCountDown, 1000);
+  updateCountDown();
  }
})

function saveImage(){
  // SEを再生する
  video.pause()  
  se.play()      
  setTimeout( () => {
    video.play()    
  }, 500);


    const ctx = picture.getContext("2d")
    picture.width = video.height
    picture.height = video.width

  // canvasに画像を貼り付ける
  ctx.drawImage(video, 0, 0, picture.width, picture.height);
  //ctx.drawImage(canvasElement, 0, 0, picture.width, picture.height);
  ctx.drawImage(maskElement, 0, 0, picture.width, picture.height);

  var base64Image = document.getElementById('picture').toDataURL()
resizeImage(base64Image, function(base64) {

  var object = {
      //"url": dataUrl
      "url": base64Image
  }
  var result = prompt(JSON.stringify(object))
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
