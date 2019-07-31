import React from 'react';
import './App.css';
import SettingsNav from './SettingsNav';
import AudioPlayer from './AudioPlayer';
import { Authorize, authenticate, loadClient, isAuthenticated } from './Authorize';
import settings from './Settings';
import { getApi, googleConfig } from './Gapi';
import { MediaUploader } from './MediaUploader';

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
              {/* <audio id="audioElement" loop></audio> */}
              <audio id="audioElement"></audio>
            </div>
            
            <div className="preview">
              <canvas className="preview" id="cvs"></canvas>
              <AudioPlayer />
            </div>

            {/* {isAuthenticated() && ( */}
              <button onClick={() => this.upload()}>Upload</button>
            )}

            <canvas className="render" id="cvs"></canvas>

            {/* <video id="recorded" playsInline loop></video> */}
            <video id="recorded" playsInline></video>
            
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
        const captureVideo = (webm: Blob) => {
          this.uploadFileToYoutube({
            title: 'file2',
            description: 'desc 2',
            tags: ["cool", "video", "more keywords"],
            category: 22,
          }, gapi, webm);
        };
        (window as any).onStopRecording = captureVideo;
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

  uploadFileToYoutube(video: Video, gapi: any, webm: Blob) {
    xhr('POST', 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,contentDetails',
      {
        'Authorization': 'Bearer ' + gapi.auth.getToken().access_token,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': '' + webm.size,
        'X-Upload-Content-Type': 'video/webm',
      },
      JSON.stringify(
        {
          "snippet": {
            "title": video.title,
            "description": video.description,
            "tags": video.tags,
            "categoryId": video.category
          },
          "status": {
            "privacyStatus": "public",
            "embeddable": true,
            "license": "youtube"
          }
        }
      ),
    ).then(rsp => {
      const location = rsp.getResponseHeader('Location');

      let uploading = true;
      const ping = () => setTimeout(() => {
        xhr('PUT', location,
          {
            'Authorization': 'Bearer ' + gapi.auth.getToken().access_token,
            'Content-Type': 'video/webm',
          },
          '',
        ).then(e => {
          console.log('uploading!');
        });
        if (uploading) {
          ping();
        }
      },1000);

      xhr('PUT', location,
        {
          'Authorization': 'Bearer ' + gapi.auth.getToken().access_token,
          'Content-Type': 'video/webm',
        },
        webm,
      ).then(rsp => {
        uploading = false;
      });
    });
  }
}

interface Video {
  title: string,
  description: string,
  category: number,
  tags: string[],
}

function xhr(method: 'PUT'|'POST', url: string, headers: {[key:string]:string}, body: string|Blob): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    for (const k in headers) {
      xhr.setRequestHeader(k, headers[k]);
    }
    xhr.onload = (e: any) => {
        if (e.target.status < 400) {
          resolve(e.target);
        }
        else {
            reject(e);
        }
    };
    xhr.onerror = e => reject(e);
    xhr.send(body);
  });
}

function blobToFile(theBlob: Blob, fileName:string): File {
  const b: any = theBlob;
  //A Blob() is almost a File() - it's just missing the two properties below which we will add
  b.lastModifiedDate = new Date();
  b.name = fileName;

  //Cast to a File() type
  return theBlob as File;
}

export default App;
