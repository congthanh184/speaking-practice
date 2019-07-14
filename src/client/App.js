import React, { Component, Fragment } from 'react';
import store from 'store';
import moment from 'moment';
import './app.css';
import './config';

import { startRecognition } from './speech/recognition';
import { readTheSentence, populateVoiceList, isSpeaking } from './speech/synthesis';
import SamplesList from './lists/samples';
import {
  calculateScore,
  highlightMissed,
  getFirstFiveWords,
  generateKey,
  initDictSample
} from './utils';

window.moment = moment;

const QuestionsController = ({ onLangChange, onModeChange }) => (
  <div className="question-select">
    <span className="lang-select">
      Select language to practice:
      <select id="languageCodeSelect" className="ml-2" onChange={e => onLangChange(e.target.value)}>
        <option value="en-US">English</option>
        <option value="fr-FR">French</option>
      </select>
      <select id="selectMode" className="ml-2" onChange={e => onModeChange(e.target.value)}>
        <option value="read">Read Aloud</option>
        <option value="repeat">Repeat Sentence</option>
      </select>
    </span>
  </div>
);

export default class App extends Component {
  state = {
    username: null,
    recording: false,
    languageCode: 'en-US',
    loading: false,
    id: 0,
    samples: { 'en-US': [], 'fr-FR': [] },
    mode: 'read',
    repeatState: 'start'
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

  getOrInitDictSample = () => {
    const dictSample = store.get(DICT_SAMPLES);
    if (dictSample) {
      return dictSample;
    }
    return initDictSample();
  };

  checkAndInsertNewSample = (sample) => {
    const key = generateKey(sample);
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

  handleToggleRecording = () => {
    const { recording, currentSample, languageCode } = this.state;
    this.setState(prevState => ({ ...prevState, recording: !recording, url: null }));
    if (recording) {
      return this.recognition.stop();
    }
    this.recognition = startRecognition(currentSample, languageCode, this.resolveTranscript);
    this.checkAndInsertNewSample(currentSample);
  };

  resolveTranscript = (results) => {
    const { currentSample: sample, recording } = this.state;
    let transcript = '';
    for (let i = 0; i < results.length; i += 1) {
      transcript = `${transcript} ${results[i][0].transcript.toLowerCase()}`;
    }
    const { score, missed } = calculateScore({
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

  handleLangChange = (value) => {
    this.setState(prevState => ({ ...prevState, languageCode: value }));
    populateVoiceList(value);
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

  handleRandomClick = () => {
    const total = this.samples.length;
    const randomNumber = Math.floor(Math.random() * total);
    this.setState(prevState => ({ ...prevState, currentSample: this.samples[randomNumber] }));
  };

  handleDefaultClick = () => {
    store.remove(DICT_SAMPLES);
    const { dicts, samples } = initDictSample();
    this.setState(prevState => ({
      ...prevState,
      dicts,
      samples,
      currentSample: samples[LANGUAGE_CODE.en][0]
    }));
  };

  handleModeChange = (mode) => {
    this.setState(prevState => ({ ...prevState, mode }));
    console.log({ mode });
    if (mode === 'repeat') {
      this.interval = setInterval(() => this.repeatSM(), 300);
    } else {
      clearInterval(this.interval);
    }
  };

  repeatSM = () => {
    const { repeatState, startTime, recording } = this.state;
    const currentTime = moment();
    const diffTime = startTime && startTime.diff(currentTime);
    if (recording) return;
    switch (repeatState) {
      case 'start':
        this.setState(prevState => ({
          ...prevState,
          repeatState: 'count-down-spk',
          countDown: SPEAK_COUNTDOWN_MS / 1000,
          startTime: moment().add(SPEAK_COUNTDOWN_MS, 'milliseconds')
        }));
        break;
      case 'count-down-spk':
        if (diffTime <= 0) {
          readTheSentence('Hello this is a test run');
          this.setState(prevState => ({ ...prevState, repeatState: 'speak' }));
        } else {
          this.setState(prevState => ({
            ...prevState,
            countDown: moment.duration(diffTime, 'milliseconds').seconds()
          }));
        }
        break;
      case 'speak':
        if (!isSpeaking()) {
          this.setState(prevState => ({
            ...prevState,
            repeatState: 'count-down-repeat',
            countDown: SPEAK_COUNTDOWN_MS / 1000,
            startTime: moment().add(SPEAK_COUNTDOWN_MS, 'milliseconds')
          }));
        }
        break;
      case 'count-down-repeat':
        if (diffTime <= 0) {
          this.setState(prevState => ({ ...prevState, repeatState: 'record' }));
        } else {
          this.setState(prevState => ({
            ...prevState,
            countDown: moment.duration(diffTime, 'milliseconds').seconds()
          }));
        }
        break;
      case 'record':
        this.setState(prevState => ({
          ...prevState,
          repeatState: 'start'
        }));
        this.handleToggleRecording();
        clearInterval(this.interval);
        break;
    }
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
      mode,
      countDown,
      repeatState,
      currentSample
    } = this.state;
    const sortedList = Object.keys(missedList || {}).sort((a, b) => missedList[a] - missedList[b]);

    console.log({ currentSample, missed });
    return (
      <div className="App">
        <header className="App-header mb-5 text-center">Speaking Practice</header>
        <div className="row">
          <div className="col-md-3">
            <SamplesList
              samples={this.samples}
              onSelect={sample => this.setState({ currentSample: sample })}
              onRandomClick={this.handleRandomClick}
              onDefaultClick={this.handleDefaultClick}
            />
          </div>
          <div className="col-md-7">
            <QuestionsController
              onLangChange={this.handleLangChange}
              onModeChange={this.handleModeChange}
            />

            {mode === 'read' ? (
              <div className="text-area">
                <textarea
                  rows="6"
                  className="mt-5 mb-5"
                  style={{ width: '100%' }}
                  value={currentSample}
                  onChange={e => this.handleTextChange(e.target.value)}
                />
              </div>
            ) : (
              <div className="flex-center mt-5 mb-5">
                <h3>{`${repeatState}-${countDown}`}</h3>
              </div>
            )}

            <div className="flex-center">
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
                <div dangerouslySetInnerHTML={{ __html: highlightMissed(currentSample, missed) }} />
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
