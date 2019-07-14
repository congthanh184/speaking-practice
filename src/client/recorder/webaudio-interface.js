const constraints = {
  audio: true,
  video: false
};

let rec;
let gumStream;

// MediaStreamAudioSourceNode we'll be recording
// shim for AudioContext when it's not avb.

const initRecoderAndStart = createDownloadLink => {
  // const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext({ sampleRate:16000});
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => {
      console.log(
        "getUserMedia() success, stream created, initializing Recorder.js ..."
      );
      /* assign to gumStream for later use */
      gumStream = stream;
      /* use the stream */
      const input = audioContext.createMediaStreamSource(stream);
      // stop the input from playing back through the speakers
      // input.connect(audioContext.destination); // get the encoding
      const encodingType = "wav";
      /* Create the Recorder object and configure to record mono sound (1 channel) Recording 2 channels will double the file size */
      rec = new WebAudioRecorder(input, {
        workerDir: "js/",
        numChannels: 1,
        onEncoderLoading(recorder, encoding) {
          // show "loading encoder..." display
          console.log(`Loading ${encoding} encoder...`);
        },
        onEncoderLoaded(recorder, encoding) {
          // hide "loading encoder..." display
          console.log(`${encoding} encoder loaded`);
        }
      });
      rec.onComplete = function(recorder, blob) {
        console.log("Encoding complete");
        createDownloadLink(blob, recorder.encoding);
        // encodingTypeSelect.disabled = false;
      };
      rec.setOptions({
        timeLimit: 60,
        encodeAfterRecord: true,
      });
      // start the recording process
      rec.startRecording();
      console.log("Recording started");
    })
    .catch(err => {
      console.log(err);
      // enable the record button if getUserMedia() fails
      // recordButton.disabled = false;
      // stopButton.disabled = true;
      // pauseButton.disabled = true;
    });
};

const stopRecording = () => {
  rec.finishRecording();
  gumStream.getAudioTracks()[0].stop();
};

export { initRecoderAndStart, stopRecording };
