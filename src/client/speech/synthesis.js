const synth = window.speechSynthesis;
let voices = [];

function populateVoiceList(lang) {
  const allVoices = synth.getVoices();

  voices = allVoices.filter(voice => voice.lang.includes(lang));
}

function readTheSentence(txtValue, onEndCallback) {
  const utterThis = new SpeechSynthesisUtterance(txtValue);
  const randomNumber = Math.floor(Math.random() * voices.length);

  utterThis.voice = voices[randomNumber];
  utterThis.rate = 1.1;
  synth.speak(utterThis);
  utterThis.onend = function (event) {
    console.log('Utterance has finished being spoken');
  };
}

function isSpeaking() {
  return synth.speaking;
}

export { readTheSentence, populateVoiceList, isSpeaking };
