const constraints = {
  audio: true,
  video: false
};

let rec;
let gumStream;

// MediaStreamAudioSourceNode we'll be recording
// shim for AudioContext when it's not avb.
let recording = false;
let encoder;
let input;
let node;

const initRecoderAndStart = (createDownloadLink) => {
  // const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext({ sampleRate: 16000 });
  encoder = new Worker('encoder.js');
  encoder.onmessage = (e) => {
    if (e.data.cmd === 'end') {
      createDownloadLink(e.data.buf);
      encoder.terminate();
    }
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      console.log('getUserMedia() success, stream created, initializing Recorder.js ...');
      recording = true;
      /* assign to gumStream for later use */
      gumStream = stream;
      /* use the stream */
      input = audioContext.createMediaStreamSource(stream);
      if (input.context.createJavaScriptNode) node = input.context.createJavaScriptNode(4096, 1, 1);
      else if (input.context.createScriptProcessor) node = input.context.createScriptProcessor(4096, 1, 1);
      else console.error('No node');

      // stop the input from playing back through the speakers
      // input.connect(audioContext.destination); // get the encoding
      encoder.postMessage({
        cmd: 'init',
        config: {
          samplerate: audioContext.sampleRate,
          bps: 16,
          channels: 1,
          compression: 5
        }
      });

      node.onaudioprocess = function (e) {
        if (!recording) return;
        // see also: http://typedarray.org/from-microphone-to-wav-with-getusermedia-and-web-audio/
        const channelLeft = e.inputBuffer.getChannelData(0);
        // var channelRight = e.inputBuffer.getChannelData(1);
        encoder.postMessage({ cmd: 'encode', buf: channelLeft });
      };

      input.connect(node);
      node.connect(audioContext.destination);
      console.log('Recording started');
    })
    .catch((err) => {
      console.log(err);
      // enable the record button if getUserMedia() fails
      // recordButton.disabled = false;
      // stopButton.disabled = true;
      // pauseButton.disabled = true;
    });
};

const stopRecording = () => {
  if (!recording) {
    return;
  }
  const tracks = gumStream.getAudioTracks();
  for (let i = tracks.length - 1; i >= 0; --i) {
    tracks[i].stop();
  }
  recording = false;
  encoder.postMessage({ cmd: 'finish' });

  input.disconnect();
  node.disconnect();
  input = node = null;
};

export { initRecoderAndStart, stopRecording };
