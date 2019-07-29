import React from 'react';
import './App.css';
import SettingsNav from './SettingsNav';
import AudioPlayer from './AudioPlayer';
import { Authorize, authenticate, loadClient, isAuthenticated } from './Authorize';
import settings from './Settings';
import { getApi } from './Gapi';

const audio = document.createElement('audio') as any;
const browserSupport = audio && (audio.captureStream || audio.mozCaptureStream);

export class App extends React.Component {
  componentDidMount() {
    console.log(settings);
    
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
        <Authorize />
        
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
          <>
            <div>
              <a href="#downloader" id="downloader">HELO</a>
              <input type="file" id="fileChooser" multiple />
              <audio id="audioElement" loop></audio>
            </div>
            
            <div className="preview">
              <canvas className="preview" id="cvs"></canvas>
              <AudioPlayer />
            </div>

            {/* {isAuthenticated() && ( */}
              <button onClick={() => this.upload()}>Upload</button>
            )}

            <canvas className="render" id="cvs"></canvas>

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

            <SettingsNav />
          </>
        )}
      </div>
    );
  }
  upload(): void {
    authenticate().then(loadClient).then(() => {
      getApi().then(gapi => {
        const recordButton = document.querySelector('#record') as HTMLButtonElement;
        const audio = document.querySelector('#audioElement') as HTMLAudioElement;
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;

        console.log('record!!!');
        recordButton.click();

        console.log('playing!!!');
        audio.play();

        const uploadWhenDone = () => {
          console.log('done!!!')
          recordButton.click();
          audio.removeEventListener('ended', uploadWhenDone);
        };
        audio.addEventListener('ended', uploadWhenDone);

        console.log(gapi.auth2.getAuthInstance().isSignedIn.get());
      });
    });
  }
}

export default App;
