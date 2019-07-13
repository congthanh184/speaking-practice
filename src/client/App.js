import React, { Component } from 'react';
import firebase from 'firebase';
import 'firebase/storage';
import 'firebase/functions';
import './app.css';

import { stopRecording, initRecoderAndStart } from './recorder';

const firebaseConfig = {
  apiKey: '',
  authDomain: 'speaking-practice-245114.firebaseapp.com',
  databaseURL: 'https://speaking-practice-245114.firebaseio.com',
  projectId: 'speaking-practice-245114',
  storageBucket: 'speaking-practice-245114.appspot.com',
  messagingSenderId: '46818754327',
  appId: ''
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export default class App extends Component {
  state = { username: null, record: false };

  componentDidMount() {
    // gapiInitialize();
    // fetch('/api/getUsername')
    //   .then(res => res.json())
    //   .then(user => this.setState({ username: user.username }));
  }

  handleStartRecording = () => {
    initRecoderAndStart(this.createDownloadLink);
    this.setState({
      record: true
    });
  };

  handleStopRecording = () => {
    stopRecording();
  };

  uploadStorage = (blob) => {
    const storageRef = firebase.storage().ref();
    const languageCode = 'en-US';
    const recorderRef = storageRef.child(`${languageCode}-wav_encorder.wav`);
    recorderRef.put(blob).then((snapshot) => {
      console.log('Uploaded a blob or file!');
      this.getTranslation();
    });
  };

  getTranslation = () => {
    const addMessage = firebase.functions().httpsCallable('addMessage');
    addMessage({ text: 'test test test', filename: 'wav_encorder.wav', lang: 'en-US' }).then(
      (result) => {
        console.log(result);
      }
    );
  };

  createDownloadLink = (blob) => {
    const url = window.URL.createObjectURL(blob);
    console.log({ url, blob });
    window.test = url;
    window.blob = blob;
    this.uploadStorage(blob);
    this.setState({ url });
  };

  render() {
    const { username } = this.state;
    return (
      <div>
        <div>
          <button onClick={this.handleStartRecording} type="button">
            Start
          </button>
          {' '}
          <button onClick={this.handleStopRecording} type="button">
            Stop
          </button>
        </div>
        <div>
          <audio controls src={this.state.url} />
        </div>
      </div>
    );
  }
}
