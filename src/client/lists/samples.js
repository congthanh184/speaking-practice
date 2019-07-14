import React, { Component } from 'react';
import { getFirstFiveWords } from '../utils';

class SamplesList extends Component {
  render() {
    const { samples, onSelect, onDefaultClick } = this.props;
    return (
      <div className="container sample-list">
        Content
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

export default SamplesList;
