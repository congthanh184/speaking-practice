const functions = require('firebase-functions');
const Speech = require('@google-cloud/speech');

const audioBucketName = 'speaking-practice-245114.appspot.com';
const projectId = 'speaking-practice-245114';

// lang: [en-US, fr-FR]
async function audio2text({ lang, filename, text }) {
  console.log({ lang, filename, text });
  // Create Google Cloud Speech API client handler object
  const client = new Speech.SpeechClient({
    projectId
  });

  // Define audio file specifications
  //
  // Audio file specification is currently set statically as:
  // Language: English
  // Channels: Mono
  // Codec: FLAC
  // Sample rate: 44.1 kHz
  //
  // Future version of this code should be able to detect audio file
  // format, or receive it from an external source
  // const encoding = 'FLAC';
  // const sampleRateHertz = 44100;
  const languageCode = lang || 'en-US';

  // Set Google Cloud Storage URI for audio file object to be written
  const uri = `gs://${audioBucketName}/${languageCode}-${filename}`;

  // Create Speech API config object for audio file
  const config = {
    // encoding: encoding,
    // sampleRateHertz: sampleRateHertz,
    languageCode
  };

  // Set audio file URI for Speech API
  const audio = {
    uri
  };

  // Create Speech API request object
  const request = {
    config,
    audio
  };

  // Execute Speech API call
  const [response] = await client.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  console.log(`Transcription: ${transcription}`);
  return transcription;
}

exports.addMessage = functions.https.onCall(async (data, context) => {
  // Grab the text parameter.
  const { text, filename, lang } = data;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
  const transcription = await audio2text({text, filename, lang});
  return {
    transcription
  };
});
