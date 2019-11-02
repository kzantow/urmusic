import React from 'react';

import { loadScript } from './ScriptLoader';

declare var WaveSurfer: any;
declare var ctx: any;
declare var SC: any;

export default class AudioPlayer extends React.Component {
  componentDidMount() {
    loadScript('https://unpkg.com/wavesurfer.js').then(() => {
      var wavesurfer = WaveSurfer.create({
        container: '#waveform',
        audioContext: ctx,
      });
    });
  }
  connectToSoundcloud() {
    loadScript('https://connect.soundcloud.com/sdk/sdk-3.3.2.js').then(() => {
      SC.initialize({
        client_id: 'YOUR_CLIENT_ID',
        redirect_uri: 'http://example.com/callback'
      });
      // initiate auth popup
      SC.connect().then(function() {
        return SC.get('/me');
      }).then(function(me: any) {
        alert('Hello, ' + me.username);
      });
    })
  }
  render() {
    return (
      <>
<button onClick={() => this.connectToSoundcloud()}>
<img src="https://connect.soundcloud.com/2/btn-connect-l.png"/>
</button>
      <div id="waveform"></div>
		  <audio className="controls" controls />
    </>
    );
  }
}
