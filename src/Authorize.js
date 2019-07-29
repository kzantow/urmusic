import React from 'react';
import { getApi } from './Gapi';

function authenticate() {
  return getApi().then(gapi => {
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
      return gapi.auth2.getAuthInstance()
      .signIn({scope: "https://www.googleapis.com/auth/youtube.upload"})
      .then(function() { console.log("Sign-in successful"); },
            function(err) { console.error("Error signing in", err); });
    } else {
      return Promise.resolve();
    }
  });
}
function loadClient() {
  return getApi().then(gapi => {
    return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
        .then(function() { console.log("GAPI client loaded for API"); },
              function(err) { console.error("Error loading GAPI client for API", err); });
  });
}


export class Authorize extends React.Component {
  componentDidMount() {
    getApi().then(gapi => {
      gapi.signin2.render('my-signin2', {
        'scope': 'profile email',
        'width': 240,
        'height': 50,
        'longtitle': true,
        'theme': 'dark',
        'onsuccess': (googleUser) => {
          console.log('Logged in as: ' + googleUser.getBasicProfile().getName());
        },
        'onfailure': (error)  =>{
          console.log(error);
        },
      });
    });
  }
    render() {
        return (
            <>
              <div id="my-signin2"></div>
                <button onClick={() => {
                  // window.open(urlGoogle(), 'googleauth');
                  authenticate().then(loadClient).then(() => {
                    getApi().then(gapi => {
                      console.log(gapi.auth2.getAuthInstance().isSignedIn.get());
                    });
                  });
                }}>Authorize</button>
                <button onClick={() => {

                }}>Sign Out</button>
            </>
        );
    }
}
