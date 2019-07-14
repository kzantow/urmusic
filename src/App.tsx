import React from 'react';
import './App.css';

const audio = document.createElement('audio') as any;
const browserSupport = audio && (audio.captureStream || audio.mozCaptureStream);

export class App extends React.Component {
  componentDidMount() {
    for (const src of [
      //'https://connect.soundcloud.com/sdk/sdk-3.1.2.js',
      //'js/theplayer.js',
      //'js/spin.min.js',
      'js/index.js',
      'js/videocapture.js',
    ]) {
      const s = document.createElement('script');
      s.setAttribute('src', src);
      document.body.appendChild(s);
    }
  }
  render() {
    return (
      <div className="App">
        {!browserSupport && (
          <div className="warningMessage">
            <header>
              <i className="fa fa-exclamation-triangle w3-large warnIcon"></i>
              <h5>Error</h5>
            </header>
            <p>
              This browser does not support the needed APIs.
              <br/>
              This app works well with Chrome and Firefox.
            </p>
          </div>
        )}
        {browserSupport && (
          <div>
            <div style={{"display": "none"}}>
              <a id="downloader"></a>
              <input type="file" id="fileChooser" multiple />
              
              <audio id="audioElement" loop></audio>
            </div>
            
            <canvas id="cvs" origin-clean="false"></canvas>
            <video id="recorded" playsInline loop></video>
            
            <div className="buttons">
              <button id="record">Start Recording</button>
              <button id="play" disabled>Play</button>
              <button id="download" disabled>Download</button>
            </div>
      
            <nav id="helpNav" className="hidable">
              <h2>Drag a song here to get started</h2><br />
              <p>You can also paste a link in the SoundCloud menu on the top right corner</p>
            </nav>
          </div>
        )}
      </div>
    );
  }
}

export default App;
