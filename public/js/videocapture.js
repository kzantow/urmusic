/*
*  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

/* globals main */

// This code is adapted from
// https://rawgit.com/Miguelao/demos/master/mediarecorder.html

/* globals main, MediaRecorder */

const mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
let mediaRecorder;
let recordedBlobs;
let sourceBuffer;

const audio = document.querySelector('audio');
const canvas = document.querySelector('canvas');
const video = document.querySelector('video');

const recordButton = document.querySelector('button#record');
const playButton = document.querySelector('button#play');
const downloadButton = document.querySelector('button#download');
recordButton.onclick = toggleRecording;
playButton.onclick = play;
downloadButton.onclick = download;

function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
  // if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  // }
}

function handleStop(event) {
  console.log('Recorder stopped: ', event);
  const superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
  // FIXME this is an ugly global hack
  if (window.onStopRecording) window.onStopRecording(superBuffer);
  video.src = window.URL.createObjectURL(superBuffer);
}

function toggleRecording() {
  if (recordButton.textContent === 'Start Recording') {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = 'Start Recording';
    playButton.disabled = false;
    downloadButton.disabled = false;
  }
}

// The nested try blocks will be simplified when Chrome 47 moves to Stable
function startRecording() {
  let options = {mimeType: 'video/webm'};
  recordedBlobs = [];
  
  const canvasStream = canvas.captureStream(); // param is frames per second
  let finalStream = new MediaStream();

  if (audio.captureStream) {
    for (var track of canvasStream.getTracks()) {
      finalStream.addTrack(track);
    }

    const audioStream = audio.captureStream();
    for (var track of audioStream.getTracks()) {
      finalStream.addTrack(track);
    }
  } else if (audio.mozCaptureStream) {
    const audioStream = audio.mozCaptureStream();
    const audioTrack = audioStream.getTracks()[0];
    const canvasTrack = canvasStream.getTracks()[0];
    finalStream = new MediaStream([audioTrack, canvasTrack]);
  }

  console.log('Started stream capture from finalStream: ', finalStream);

  try {
    // mediaRecorder = new MediaRecorder(canvasStream, options);
    mediaRecorder = new MediaRecorder(finalStream, options);
  } catch (e0) {
    console.log('Unable to create MediaRecorder with options Object: ', e0);
    try {
      options = {mimeType: 'video/webm,codecs=vp9'};
      mediaRecorder = new MediaRecorder(canvasStream, options);
    } catch (e1) {
      console.log('Unable to create MediaRecorder with options Object: ', e1);
      try {
        options = 'video/vp8'; // Chrome 47
        mediaRecorder = new MediaRecorder(canvasStream, options);
      } catch (e2) {
        alert('MediaRecorder is not supported by this browser.\n\n' +
          'Try Firefox 29 or later, or Chrome 47 or later, ' +
          'with Enable experimental Web Platform features enabled from chrome://flags.');
        console.error('Exception while creating MediaRecorder:', e2);
        return;
      }
    }
  }
  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.textContent = 'Stop Recording';
  playButton.disabled = true;
  downloadButton.disabled = true;
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;

  mediaRecorder.start();
  // mediaRecorder.start(100); // collect 100ms of data
  console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
  mediaRecorder.stop();
  //aStream.stop();
  // gumStream.getAudioTracks()[0].stop()
  console.log('Recorded Blobs: ', recordedBlobs);
  video.controls = true;
}

function play() {
  video.play();
}

function download() {
  const blob = new Blob(recordedBlobs, {type: 'video/webm'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}