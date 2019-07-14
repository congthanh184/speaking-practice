
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
