import { dedupe } from './Dedupe';

export const googleConfig = {
    apiKey: 'AIzaSyA3B2VUAlv7IFDaF3FJXEUEgf_c7T8a5_o',
    clientId: '663951290792-7p8h0a0ap7q8n42trn0udq88s0rkqi8o.apps.googleusercontent.com',
    clientSecret: 'vNMsdDg7xexIq9T6XIQn7Gu6',
    redirect: 'http://lvh.me:3000/login', // this must match your google api settings
};

let gapi: any = undefined;

const scope = 'https://www.googleapis.com/auth/youtube.upload';

export function getApi(): Promise<any> {
    if (gapi) {
        return Promise.resolve(gapi);
    }
    return dedupe('gapi', () => new Promise((resolve, reject) => {
        const gapiScript = document.createElement('script')
        gapiScript.src = 'https://apis.google.com/js/api.js?onload=onGapiLoad';
        (window as any).onGapiLoad = () => {
            gapi = (window as any).gapi;
            gapi.load("client:auth2:signin2", function() {
                gapi.client.setApiKey(googleConfig.apiKey);
                gapi.auth2.init({
                    client_id: googleConfig.clientId,
                    scope,
                })
                .then(() => {
                    console.log(gapi.auth2.getAuthInstance().isSignedIn.get());
                    resolve(gapi);
                });
            });
            // gapi.load('client:auth', () => {
            //     gapi.auth.init({
            //         'apiKey': googleConfig.apiKey,
            //         // clientId and scope are optional if auth is not required.
            //         'clientId': googleConfig.clientId,
            //         'scope': 'profile',
            //     }).then(function () {
            //         // 3. Initialize and make the API request.
            //         return gapi.client.request({
            //             'path': 'https://people.googleapis.com/v1/people/me?requestMask.includeField=person.names',
            //         });
            //     }).then(function (response: any) {
            //         console.log(response.result);
            //     }, function (reason: any) {
            //         console.error(reason);
            //         // console.log('Error: ' + reason.result.error.message);
            //     });
            // });
            // delete (window as any).onGapiLoad;
            // delete (window as any).gapi;
        };
        document.body.appendChild(gapiScript);
    }));
}
