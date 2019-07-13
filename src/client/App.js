import React, { Component } from 'react';
import store from 'store';
import './app.css';

import { stopRecording, initRecoderAndStart } from './flac-recorder';
import { startRecognition } from './speech-recognition';
import { EN_READING, FR_READING } from './samples.js';

// Initialize Firebase
// const { firebase } = window;
// firebase.initializeApp(firebaseConfig);

const MISSED_LIST = 'missed_list';
const DICT_SAMPLES = 'dict_samples';
const COMMON_WORDS = [];
const LANGUAGE_CODE = { en: 'en-US', fr: 'fr-FR' };
const FILE_NAME = Math.random()
  .toString(36)
  .substring(7);

const QuestionsController = ({ onLangChange }) => (
  <div className="question-select">
    <span className="lang-select">
      Select language to practice:
      <select id="languageCodeSelect" className="ml-2" onChange={e => onLangChange(e.target.value)}>
        <option value="en-US">English</option>
        <option value="fr-FR">French</option>
      </select>
    </span>
  </div>
);

class SamplesList extends Component {
  render() {
    const {
      onRandomClick, getFirstFiveWords, samples, onSelect, onDefaultClick
    } = this.props;
    return (
      <div className="container sample-list">
        Content
        <button className="ml-2" onClick={onRandomClick}>
          Random
        </button>
        <button className="ml-2" onClick={onDefaultClick}>
          Default
        </button>
        <div className="list">
          {samples.length > 0
            && samples.map((sample) => {
              const firstFiveWords = getFirstFiveWords(sample);
              const key = firstFiveWords.join('+').toLowerCase();
              return (
                <div key={key}>
                  <a
                    href=""
                    onClick={(e) => {
                      e.preventDefault();
                      onSelect(sample);
                    }}
                  >
                    {`${firstFiveWords.join(' ')} ...`}
                  </a>
                </div>
              );
            })}
        </div>
      </div>
    );
  }
}

export default class App extends Component {
  state = {
    username: null,
    recording: false,
    languageCode: 'en-US',
    loading: false,
    id: 0,
    samples: { 'en-US': [], 'fr-FR': [] }
  };

  componentDidMount() {
    const { dicts, samples } = this.getOrInitDictSample();
    this.setState(prevState => ({
      ...prevState,
      dicts,
      samples,
      currentSample: samples[LANGUAGE_CODE.en][0]
    }));
  }

  initDictSample = () => {
    const dicts = {};
    dicts[LANGUAGE_CODE.en] = this.buildDict(EN_READING);
    dicts[LANGUAGE_CODE.fr] = this.buildDict(FR_READING);
    const samples = {};
    samples[LANGUAGE_CODE.en] = EN_READING;
    samples[LANGUAGE_CODE.fr] = FR_READING;
    return { dicts, samples };
  };

  getOrInitDictSample = () => {
    const dictSample = store.get(DICT_SAMPLES);
    if (dictSample) {
      return dictSample;
    }
    return this.initDictSample();
  };

  getFirstFiveWords = sentence => sentence.split(' ').slice(0, 5);

  generateKey = sentence => this.getFirstFiveWords(sentence)
    .join('+')
    .toLowerCase();

  buildDict = (samples) => {
    const dict = {};
    samples.forEach((sample) => {
      const key = this.generateKey(sample);
      dict[key] = 1;
    });
    return dict;
  };

  checkAndInsertNewSample = (sample) => {
    const key = this.generateKey(sample);
    if (!this.sampleDict[key]) {
      const { dicts, samples, languageCode } = this.state;
      dicts[languageCode][key] = 1;
      samples[languageCode] = [sample, ...samples[languageCode]];
      this.setState(prevState => ({
        ...prevState,
        dicts,
        samples
      }));
      store.set(DICT_SAMPLES, { dicts, samples });
    }
  };

  get sampleDict() {
    const { dicts, languageCode } = this.state;
    return dicts[languageCode];
  }

  get samples() {
    const { samples, languageCode } = this.state;
    return samples[languageCode];
  }

  get flacFileName() {
    const { languageCode } = this.state;
    return `${languageCode}-${FILE_NAME}.flac`;
  }

  handleToggleRecording = () => {
    const { recording, currentSample, languageCode } = this.state;
    this.setState(prevState => ({ ...prevState, recording: !recording, url: null }));
    if (recording) {
      return this.recognition.stop();
      // return stopRecording();
    }
    // initRecoderAndStart(this.createDownloadLink);
    this.recognition = startRecognition(currentSample, languageCode, this.resolveTranscript);
    this.checkAndInsertNewSample(currentSample);
  };

  uploadStorage = (blob) => {
    const storageRef = firebase.storage().ref();
    const recorderRef = storageRef.child(this.flacFileName);
    recorderRef.put(blob).then((snapshot) => {
      console.log('Uploaded a blob or file!');
      this.getTranslation();
    });
  };

  resolveTranscript = (results) => {
    const { currentSample: sample, recording } = this.state;
    let transcript = '';
    for (let i = 0; i < results.length; i += 1) {
      transcript = `${transcript} ${results[i][0].transcript.toLowerCase()}`;
    }
    const { score, missed } = this.calculateScore({
      transcript,
      sample
    });
    const missedList = this.updateMissedList(missed);
    this.setState(prevState => ({
      ...prevState,
      score,
      missedList,
      missed,
      transcript,
      loading: false
    }));
  };

  getTranslation = () => {
    const addMessage = firebase.functions().httpsCallable('addMessage');
    const { currentSample, languageCode } = this.state;
    addMessage({
      sample: '',
      filename: this.flacFileName,
      lang: languageCode
    }).then((result) => {
      console.log(result);
      const {
        data: { transcription: transcript }
      } = result;
      const { score, missed } = this.calculateScore({
        transcript,
        sample: currentSample
      });
      const missedList = this.updateMissedList(missed);
      this.setState(prevState => ({
        ...prevState,
        score,
        missedList,
        missed,
        transcript,
        loading: false
      }));
    });
  };

  createDownloadLink = (blob) => {
    const url = window.URL.createObjectURL(blob);
    console.log({ url, blob });
    window.test = url;
    window.blob = blob;
    this.uploadStorage(blob);
    this.setState(prevState => ({ ...prevState, url, loading: true }));
  };

  handleLangChange = (value) => {
    this.setState(prevState => ({ ...prevState, languageCode: value }));
  };

  handleIdChange = (value) => {
    this.setState(prevState => ({ ...prevState, id: parseInt(value) }));
  };

  updateMissedList = (list) => {
    const currentList = store.get(MISSED_LIST) || {};
    const unique = [...new Set(list)];
    const filtered = unique.filter(word => !COMMON_WORDS.includes(word));
    filtered.forEach(word => (currentList[word] = (currentList[word] || 0) + 1));
    store.set(MISSED_LIST, currentList);
    console.log({ filtered, currentList });
    return currentList;
  };

  clearMissedList = () => {
    store.remove(MISSED_LIST);
    this.setState({ missedList: null });
  };

  handleTextChange = (value) => {
    this.setState({ currentSample: value });
  };

  calculateScore = ({ sample, transcript }) => {
    const processed = transcript
      .toLowerCase()
      .replace(/[,–\.\!\?]/g, '')
      .split(' ');
    const missed = [];
    let total = 0;
    sample
      .toLowerCase()
      .replace(/[,–\.\!\?]/g, '')
      .split(' ')
      .forEach((word) => {
        if (word === '') return;
        total += 1;
        const pos = processed.indexOf(word);
        if (pos === -1) {
          missed.push(word);
        } else {
          processed.splice(pos, 1);
        }
      });

    console.log({
      processed,
      sample: sample
        .toLowerCase()
        .replace(/[,-\.]/g, '')
        .split(' ')
    });
    return {
      missed,
      score: 1 - missed.length / total
    };
  };

  handleRandomClick = () => {
    const total = this.samples.length;
    const randomNumber = Math.floor(Math.random() * total);
    this.setState(prevState => ({ ...prevState, currentSample: this.samples[randomNumber] }));
  };

  handleDefaultClick = () => {
    store.remove(DICT_SAMPLES);
    const { dicts, samples } = this.initDictSample();
    this.setState(prevState => ({
      ...prevState,
      dicts,
      samples,
      currentSample: samples[LANGUAGE_CODE.en][0]
    }));
  };

  highlightMissed = (sample, missed) => {
    if (!sample || sample === undefined || !missed) return '';
    const result = sample.split(' ').reduce((final, word) => {
      if (missed.includes(word.toLowerCase())) {
        return `${final}<span class="text-danger">${word}</span> `;
      }
      return `${final + word} `;
    }, '');

    return result;
  };

  render() {
    const {
      recording,
      id,
      url,
      transcript,
      score,
      missedList,
      loading,
      missed,
      currentSample
    } = this.state;
    window.test = this.calculateScore;
    const sortedList = Object.keys(missedList || {}).sort((a, b) => missedList[a] - missedList[b]);

    console.log({ currentSample, missed });
    return (
      <div className="App">
        <header className="App-header mb-5 text-center">Speaking Practice</header>
        <div className="row">
          <div className="col-md-3">
            <SamplesList
              samples={this.samples}
              getFirstFiveWords={this.getFirstFiveWords}
              onSelect={sample => this.setState({ currentSample: sample })}
              onRandomClick={this.handleRandomClick}
              onDefaultClick={this.handleDefaultClick}
            />
          </div>
          <div className="col-md-7">
            <QuestionsController onLangChange={this.handleLangChange} />

            <div className="text-area">
              <textarea
                rows="6"
                className="mt-5 mb-5"
                style={{ width: '100%' }}
                value={currentSample}
                onChange={e => this.handleTextChange(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                className="btn btn-primary btn-large"
                onClick={this.handleToggleRecording}
                type="button"
                disabled={loading}
              >
                {recording ? '\u23F9 Stop' : '\u25B6 Start'}
              </button>
            </div>
            <div className="mt-5">
              <div>
                <span className="mr-2">Result:</span>
                {loading && (
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                )}
                {!loading && score && `${(score * 100).toFixed(2)}%`}
              </div>

              {url && (
                <div className="pt-5">
                  <audio controls src={url} />
                </div>
              )}
              <div className="alert alert-dark mt-3" role="alert">
                <div
                  dangerouslySetInnerHTML={{ __html: this.highlightMissed(currentSample, missed) }}
                />
              </div>
              {transcript && (
                <div>
                  Transcript:
                  <div className="alert alert-dark mt-3" role="alert">
                    <div>{transcript}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="col-md-2">
            <div>
              Word list
              <button onClick={this.clearMissedList} className="ml-2">
                Clear
              </button>
            </div>
            {sortedList.length > 0
              && sortedList
                .slice(0, 10)
                .map(key => <div key={key}>{`(${missedList[key]}) ${key}`}</div>)}
          </div>
        </div>
      </div>
    );
  }
}
