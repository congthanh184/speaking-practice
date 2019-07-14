import { EN_READING, FR_READING } from './samples/read-aloud';

const initDictSample = () => {
  const dicts = {};
  dicts[LANGUAGE_CODE.en] = buildDict(EN_READING);
  dicts[LANGUAGE_CODE.fr] = buildDict(FR_READING);
  const samples = {};
  samples[LANGUAGE_CODE.en] = EN_READING;
  samples[LANGUAGE_CODE.fr] = FR_READING;
  return { dicts, samples };
};

const buildDict = (samples) => {
  const dict = {};
  samples.forEach((sample) => {
    const key = generateKey(sample);
    dict[key] = 1;
  });
  return dict;
};

const calculateScore = ({ sample, transcript }) => {
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

const highlightMissed = (sample, missed) => {
  if (!sample || sample === undefined || !missed) return '';
  const result = sample.split(' ').reduce((final, word) => {
    if (missed.includes(word.toLowerCase())) {
      return `${final}<span class="text-danger">${word}</span> `;
    }
    return `${final + word} `;
  }, '');

  return result;
};

const getFirstFiveWords = sentence => sentence.split(' ').slice(0, 5);

const generateKey = sentence => getFirstFiveWords(sentence)
  .join('+')
  .toLowerCase();

export {
  calculateScore, highlightMissed, getFirstFiveWords, generateKey, initDictSample
};
