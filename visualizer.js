// from MDN's http://mdn.github.io/voice-change-o-matic/

window.onload = function() {

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.mediaDevices.getUserMedia ||
                          navigator.msGetUserMedia);

if(navigator.getUserMedia == null) {
  console.log("navigator isn't working.");
} else {
  console.log("navigator is loaded");
}

// forked web audio context, for multiple browsers
var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
// no voice select for now...
//var voiceSelect = document.getElementById("voice");
var source;
var stream;


// TODO setup mute button
var mute = document.getElementsByClassName('mute-button')[0];
//mute_btn.onclick=function(){console.log("Foobar!")};

// set up the different audio nodes for the app
var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

var distortion = audioCtx.createWaveShaper();
var gainNode = audioCtx.createGain();
var biquadFilter = audioCtx.createBiquadFilter();
var convolver = audioCtx.createConvolver();

// distortion curve for the waveshaper, by Kevin Ennis
// http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion

function makeDistortionCurve(amount) {
  var k = typeof amount == 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for ( ; i < n_samples; ++i) {
    x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
};

// grab audio track via XMR for convolver node
// TODO soundSource dosen't work so either try delete-ing intro track or somehow enable iit

var soundSource, concertHallBuffer;

ajaxRequest = new XMLHttpRequest();

ajaxRequest.open('GET', 'http://mdn.github.io/voice-change-o-matic/audio/concert-crowd.ogg', true);

ajaxRequest.responseType = 'arraybuffer';

ajaxRequest.onload = function() {
  var audioData = ajaxRequest.response;

  audioCtx.decodeAudioData(audioData, function(buffer) {
    concertHallBuffer = buffer;
    soundSource = audioCtx.createBufferSource();
    soundSource.buffer = concertHallBuffer;
  }, function(e){"Error with decoding audio data" + e.err});

  //soundSource.connect(audioCtx.destination);
  //soundSource.loop = true;
  //soundsource.start();
}

ajaxRequest.send();

// set up canvas context for visualizer

var canvas = document.querySelector('.visualizer');
var canvasCtx = canvas.getContext("2d");

var intendedWidth = document.querySelector('.wrapper').clientWidth;

canvas.setAttribute('width', intendedWidth);

var visualSelect = document.getElementById("visual");

var drawVisual;

// main block for doing the audio recording
function beginUserMedia() {
if (navigator.getUserMedia) {
  console.log('getUserMedia supported.');
  navigator.getUserMedia (
    // constraints - only audio needed for this app
    {
      audio: true
    },

    // Success callback
    function(stream) {
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.connect(distortion);
      distortion.connect(biquadFilter);
      biquadFilter.connect(convolver);
      convolver.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      visualize();
      voiceChange();
    },

    // Error callback
    function(err){
      console.log("The following gUM error occured: " + err);
    }
  );
} else {
  console.log('getUserMedia not supported on your browser!');
}
}

beginUserMedia();

function visualize() {
  // changed fullscreen with css, might work on a JS solution
  //WIDTH = window.innerWidth;
  //HEIGHT = window.innerHeight;

  WIDTH = canvas.width;
  HEIGHT= canvas.height;

  var visualSetting = visualSelect.value;
  console.log(visualSetting);

  if(visualSetting == "sinewave") {
    /* TODO ORIGINAL DO NOT REPLACE
    analyser.fftSize = 2048; */
    analyser.fftSize = 1024;
    var bufferLength = analyser.fftSize;
    console.log(bufferLength);
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {

      drawVisual = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(200, 200, 200)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

      canvasCtx.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT/2;

        if(i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height/2);
      canvasCtx.stroke();
    };

    draw();

  } else if(visualSetting == 'frequencybars') {
    analyser.fftSize = 256;
    var bufferLength = analyser.frequencyBinCount;
    console.log(bufferLength);
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
      drawVisual = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      var barWidth = (WIDTH / bufferLength) * 2.5;
      var barHeight;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
        canvasCtx.fillRect(x,HEIGHT - barHeight/2,barWidth,barHeight/2);

        x += barWidth + 1;
      }
    };

    draw();

  }else if(visualSetting == "sinewave_enchanced"){
    analyser.fftSize = 2048;
    var bufferLength = analyser.fftSize;
    console.log(bufferLength);
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {

      drawVisual = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgba(253,231,31, 0.2)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      canvasCtx.lineWidth = 4;
      canvasCtx.strokeStyle = 'rgba(1,139,27, 0.2)';

      canvasCtx.beginPath();

      var sliceWidth = WIDTH * 1.0 / bufferLength;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT/2;

        if(i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height/2);
      canvasCtx.stroke();
    };

    draw();
  }else if(visualSetting == "off") {
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.fillStyle = "green";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  }

}

//TODO remove
//canvas.onclick = function(){console.log("clicked canvas")}
//TODO run voiceMute()
console.log(gainNode);
mute.onclick = function(){
  console.log(gainNode);
  voiceMute();
  console.log(gainNode.gain.value);};

function voiceChange() {}

// event listeners to change visualize and voice settings

visualSelect.onchange = function() {
  window.cancelAnimationFrame(drawVisual);
  visualize();
}

/* TODO make effects */
/*voiceSelect.onchange = function() {
  voiceChange();
}*/

var stream_store = stream;

function voiceMute() {
  console.log(gainNode);
  if(mute.id == "") {
    console.log("gain disabling" + this);
    gainNode.gain.value = 0;
    console.log("gain disabled" + gainNode.gain.value);
    mute.id = "activated";
    mute.innerHTML = "Unmute";
    source = null;
  } else {
    beginUserMedia();
    source.connect(analyser);
    gainNode.gain.value = 1;
    mute.id = "";
    mute.innerHTML = "Mute";
  }
}

};
