export const repeatSM = ({ state, input }) => {
  const { scheduledTime, recording, isSpeaking } = input;
  const currentTime = moment();
  const diffTime = scheduledTime && scheduledTime.diff(currentTime);
  if (recording) return;
  switch (state) {
    case 'start':
      return {
        state: 'count-down-spk',
        countDown: SPEAK_COUNTDOWN_MS / 1000,
        scheduledTime: moment().add(SPEAK_COUNTDOWN_MS, 'milliseconds')
      };
    case 'count-down-spk':
      if (diffTime <= 0) {
        return { state: 'speak' };
      }
      return {
        countDown: moment.duration(diffTime, 'milliseconds').seconds()
      };
    case 'speak':
      if (!isSpeaking) {
        return {
					state: 'count-down-repeat',
          countDown: SPEAK_COUNTDOWN_MS / 1000,
          scheduledTime: moment().add(SPEAK_COUNTDOWN_MS, 'milliseconds')
        };
      }
			return {};
    case 'count-down-repeat':
      if (diffTime <= 0) {
        return { state: 'record' };
      }
      return {
        countDown: moment.duration(diffTime, 'milliseconds').seconds()
      };
    case 'record':
      return {
        state: 'start'
      };
  }
};
