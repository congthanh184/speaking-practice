importScripts('libflac3-1.3.2.min.js');

let flac_encoder;
const BUFSIZE = 4096;
let CHANNELS = 1;
let SAMPLERATE = 44100;
let COMPRESSION = 5;
let BPS = 16;
let flac_ok = 1;
let flacLength = 0;
const flacBuffers = [];
let WAVFILE = false;
let INIT = false;
let wavLength = 0;
const wavBuffers = [];

function write_callback_fn(buffer, bytes) {
  flacBuffers.push(buffer);
  flacLength += buffer.byteLength;
}

function write_wav(buffer) {
  wavBuffers.push(buffer);
  wavLength += buffer.length;
}

self.onmessage = function (e) {
  switch (e.data.cmd) {
    case 'save_as_wavfile':
      if (INIT == false) {
        WAVFILE = true;
      }
      break;

    case 'init':
      if (WAVFILE) {
        // save as WAV-file

        // WAV-FILE
        // create our WAV file header
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);
        // RIFF chunk descriptor
        writeUTFBytes(view, 0, 'RIFF');

        // set file size at the end
        writeUTFBytes(view, 8, 'WAVE');
        // FMT sub-chunk
        writeUTFBytes(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        // stereo (2 channels)
        view.setUint16(22, 1, true);
        view.setUint32(24, e.data.config.samplerate, true);
        view.setUint32(28, e.data.config.samplerate * 2 /* only one channel, else: 4 */, true);
        view.setUint16(32, 4, true);
        view.setUint16(34, 16, true);
        // data sub-chunk
        writeUTFBytes(view, 36, 'data');

        // DUMMY file length (set real value on export)
        view.setUint32(4, 10, true);
        // DUMMY data chunk length (set real value on export)
        view.setUint32(40, 10, true);

        // store WAV header
        wavBuffers.push(new Uint8Array(buffer));
      } else {
        // using FLAC

        if (!e.data.config) {
          e.data.config = {
            bps: BPS,
            channels: CHANNELS,
            samplerate: SAMPLERATE,
            compression: COMPRESSION
          };
        }

        e.data.config.channels = e.data.config.channels ? e.data.config.channels : CHANNELS;
        e.data.config.samplerate = e.data.config.samplerate ? e.data.config.samplerate : SAMPLERATE;
        e.data.config.bps = e.data.config.bps ? e.data.config.bps : BPS;
        e.data.config.compression = e.data.config.compression
          ? e.data.config.compression
          : COMPRESSION;

        // //
        COMPRESSION = e.data.config.compression;
        BPS = e.data.config.bps;
        SAMPLERATE = e.data.config.samplerate;
        CHANNELS = e.data.config.channels;
        // //

        if (!Flac.isReady()) {
          Flac.onready = function () {
            setTimeout(() => {
              initFlac();
            }, 0);
          };
        } else {
          initFlac();
        }
      }
      break;

    case 'encode':
      if (WAVFILE) {
        // WAVE - PCM
        write_wav(e.data.buf);
      } else {
        // FLAC
        encodeFlac(e.data.buf);
      }
      break;

    case 'finish':
      var data;
      if (WAVFILE) {
        data = exportMonoWAV(wavBuffers, wavLength);
      } else if (!Flac.isReady()) {
        console.error('Flac was not initialized: could not encode data!');
      } else {
        flac_ok &= Flac.FLAC__stream_encoder_finish(flac_encoder);
        console.log(`flac finish: ${flac_ok}`); // DEBUG
        data = exportFlacFile(flacBuffers, flacLength, mergeBuffersUint8);

        Flac.FLAC__stream_encoder_delete(flac_encoder);
      }

      clear();

      self.postMessage({ cmd: 'end', buf: data });
      INIT = false;
      break;
  }
};

// HELPER: handle initialization of flac encoder
function initFlac() {
  flac_encoder = Flac.init_libflac_encoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0);
  // //
  if (flac_encoder != 0) {
    const status_encoder = Flac.init_encoder_stream(flac_encoder, write_callback_fn);
    flac_ok &= status_encoder == 0;

    console.log(`flac init     : ${flac_ok}`); // DEBUG
    console.log(`status encoder: ${status_encoder}`); // DEBUG

    INIT = true;
  } else {
    console.error('Error initializing the encoder.');
  }
}

// HELPER: handle incoming PCM audio data for Flac encoding:
function encodeFlac(audioData) {
  if (!Flac.isReady()) {
    // if Flac is not ready yet: buffer the audio
    wavBuffers.push(audioData);
    console.info('buffered audio data for Flac encdoing');
  } else {
    if (wavBuffers.length > 0) {
      // if there is buffered audio: encode buffered first (and clear buffer)

      const len = wavBuffers.length;
      const buffered = wavBuffers.splice(0, len);
      for (let i = 0; i < len; ++i) {
        doEncodeFlac(buffered[i]);
      }
    }

    doEncodeFlac(audioData);
  }
}

// HELPER: actually encode PCM data to Flac
function doEncodeFlac(audioData) {
  const buf_length = audioData.length;
  const buffer_i32 = new Uint32Array(buf_length);
  const view = new DataView(buffer_i32.buffer);
  const volume = 1;
  let index = 0;
  for (let i = 0; i < buf_length; i++) {
    view.setInt32(index, audioData[i] * (0x7fff * volume), true);
    index += 4;
  }

  const flac_return = Flac.FLAC__stream_encoder_process_interleaved(
    flac_encoder,
    buffer_i32,
    buffer_i32.length / CHANNELS
  );
  if (flac_return != true) {
    console.log(`Error: encode_buffer_pcm_as_flac returned false. ${flac_return}`);
  }
}

function exportFlacFile(recBuffers, recLength) {
  // convert buffers into one single buffer
  const samples = mergeBuffersUint8(recBuffers, recLength);

  //	var audioBlob = new Blob([samples], { type: type });
  const the_blob = new Blob([samples], { type: 'audio/flac' });
  return the_blob;
}

function exportMonoWAV(buffers, length) {
  // buffers: array with
  //  buffers[0] = header information (with missing length information)
  //  buffers[1] = Float32Array object (audio data)
  //  ...
  //  buffers[n] = Float32Array object (audio data)

  const dataLength = length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // copy WAV header data into the array buffer
  const header = buffers[0];
  const len = header.length;
  for (let i = 0; i < len; ++i) {
    view.setUint8(i, header[i]);
  }

  // add file length in header
  view.setUint32(4, 32 + dataLength, true);
  // add data chunk length in header
  view.setUint32(40, dataLength, true);

  // write audio data
  floatTo16BitPCM(view, 44, buffers);

  return new Blob([view], { type: 'audio/wav' });
}

function writeUTFBytes(view, offset, string) {
  const lng = string.length;
  for (let i = 0; i < lng; ++i) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function mergeBuffersUint8(channelBuffer, recordingLength) {
  const result = new Uint8Array(recordingLength);
  let offset = 0;
  const lng = channelBuffer.length;
  for (let i = 0; i < lng; i++) {
    const buffer = channelBuffer[i];
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}

function floatTo16BitPCM(output, offset, inputBuffers) {
  let input;
  const jsize = inputBuffers.length;
  let isize;
  let i;
  let s;

  // first entry is header information (already used in exportMonoWAV),
  //  rest is Float32Array-entries -> ignore header entry
  for (let j = 1; j < jsize; ++j) {
    input = inputBuffers[j];
    isize = input.length;
    for (i = 0; i < isize; ++i, offset += 2) {
      s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }
}

/*
 * clear recording buffers
 */
function clear() {
  flacBuffers.splice(0, flacBuffers.length);
  flacLength = 0;
  wavBuffers.splice(0, wavBuffers.length);
  wavLength = 0;
}
