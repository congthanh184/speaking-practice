const synth = window.speechSynthesis;
let voices = [];

function populateVoiceList(lang) {
  const allVoices = synth.getVoices();

  voices = allVoices.filter(voice => voice.lang.toLowerCase().includes(lang.toLowerCase()));
}

function readTheSentence(txtValue, onEndCallback) {
  const utterThis = new SpeechSynthesisUtterance(txtValue);
  const randomNumber = Math.floor(Math.random() * voices.length);

  utterThis.voice = voices[randomNumber];
  utterThis.rate = 0.95;
  synth.speak(utterThis);
  console.log(voices[randomNumber], voices, randomNumber);
  utterThis.onend = function (event) {
    console.log('Utterance has finished being spoken');
  };
}

function isSpeaking() {
  return synth.speaking;
}

export { readTheSentence, populateVoiceList, isSpeaking };
