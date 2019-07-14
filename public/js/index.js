// TAB_SIZE = 4


function prettyTime(s) {
	s = s || 0;
	
	var seconds = (s % 60) | 0;
	var minutes = (s / 60 % 60) | 0;
	var hours = (s / 3600) | 0;
	
	if(hours) return hours+':'+('0'+minutes).substr(-2)+':'+('0'+seconds).substr(-2);
	else return minutes+':'+('0'+seconds).substr(-2);
}

CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
	r = Math.max(r, 0);
	if(r === 0) {
		this.beginPath();
		this.rect(x, y, w, h);
		return;
	}
	
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	this.beginPath();
	this.moveTo(x+r, y);
	this.arcTo(x+w, y,   x+w, y+h, r);
	this.arcTo(x+w, y+h, x,   y+h, r);
	this.arcTo(x,   y+h, x,   y,   r);
	this.arcTo(x,   y,   x+w, y,   r);
	this.closePath();
}

// The actual app
var AudioContext = window.AudioContext || window.webkitAudioContext;
var MediaStream = window.MediaStream || window.webkitMediaStream;
var MediaRecorder = window.MediaRecorder || window.webkitMediaRecorder;

var ctx; // boo

(function() {
	var requestAnimationFrame =
		window.requestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		function(callback){ setTimeout(callback, 1000/60); };
	
	var cvs = document.getElementById("cvs");
	var gtx = cvs.getContext('2d');
	ctx = new AudioContext();
	var scClientID = '09bfcfe5b0303000a41b9e9675c0cb47';
	var spinnerOpts = {
		lines: 8, // The number of lines to draw
		length: 0, // The length of each line
		width: 14, // The line thickness
		radius: 19, // The radius of the inner circle
		scale: 0.3, // Scales overall size of the spinner
		corners: 1, // Corner roundness (0..1)
		color: '#fff', // #rgb or #rrggbb or array of colors
		opacity: 0, // Opacity of the lines
		rotate: 90, // The rotation offset
		direction: 1, // 1: clockwise, -1: counterclockwise
		speed: 1.5, // Rounds per second
		trail: 100, // Afterglow percentage
		fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
		zIndex: 2e9, // The z-index (defaults to 2000000000)
		className: 'spinner', // The CSS class to assign to the spinner
		top: '50%', // Top position relative to parent
		left: '50%', // Left position relative to parent
		shadow: false, // Whether to render a shadow
		hwaccel: true, // Whether to use hardware acceleration
		position: 'absolute' // Element positioning
	};
	
	var audioSource;
	var gainNode;
	var analyser;
	var freqData;
	var timeData;
	
	var lowpass;
	var lowAnalyser;
	var lowFreqData;
	
	var highpass;
	var highAnalyser;
	var highFreqData;

	var audioElement = document.getElementById("audioElement");
	var helpNav = document.getElementById('helpNav');
	var thePlayer = document.getElementById('itsThePlayer');
	
	var musicApps = document.getElementById('musicApps');
	
	var bottomMenuOpener = document.getElementById('bottomMenuOpener');
	var bottomMenu = document.getElementById('bottomMenu');
	var buttonRecord = document.getElementById('videoRecord');
	
	var cvs_strm_track = cvs.captureStream().getTracks()[0];
	var aud_strm_track = ctx.createMediaStreamDestination().stream.getTracks()[0];
	var recorder = new MediaRecorder(new MediaStream([cvs_strm_track, aud_strm_track]));
	
	var hidableStuff = document.getElementsByClassName('hidable');
	
	function processImageFile(imageFile) {
		if(!imageFile.type.match('image.*') || !activeSection || activeSection.type !== sectionType.IMAGE) {
			return;
		}
		
		var reader = new FileReader();
		reader.addEventListener('load', function(e) {
			activeSection.target.imageURL = e.target.result;
			
			refreshControls(refreshables.TABS_BIT);
		});
		
		reader.readAsDataURL(imageFile);
	}
	
	function processAudioDataURL(title, theurl) {
		audioElement.src = theurl;
		currentSongTitle = title;
		document.title = "Urmusic - " + title;
		
		audioElement.play();
		
		helpNav.classList.add("masked");
		// buttonRecord.classList.remove('disabled');
	}
	
	function processAudioFile(soundFile) {
		try {
			// https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio
			ctx. resume();
		} catch(e){
			console.error(e);
		}

		if(!soundFile.type.match('audio.*')) {
			return;
		}
		
		var reader = new FileReader();
		reader.addEventListener('load', function(e) {
			processAudioDataURL(soundFile.name.substr(0, soundFile.name.lastIndexOf('.')), e.target.result);
		});
		
		reader.readAsDataURL(soundFile);
	}
	
	function processFiles(files) {
		var imageFile;
		var soundFile;
		
		for(var i = 0; i < files.length; i++) {
			if(files[i].type.match('image.*')) {
				imageFile = files[i];
			} else if(files[i].type.match('audio.*')) {
				soundFile = files[i];
			} else if(files[i].name.endsWith('.urm')) {
				loadFilePreset(files[i], i === (files.length - 1));
			}
		}
		
		if(imageFile) {
			processImageFile(imageFile);
		}
		if(soundFile) {
			processAudioFile(soundFile);
		}
	}
	
	function addressArray(array, i, outValue) {
		if(i < 0 || i >= array.length) {
			return outValue;
		} else {
			return array[i];
		}
	}
	
	function quadCurve(p0y, cpy, p1y, t) {
		return (1.0 - t) * (1.0 - t) * p0y + 2.0 * (1.0 - t) * t * cpy + t * t * p1y;
	}

	function getValue(array, index, quadInterpolation, minValue) {
		// Quadratic interpolation
		if(quadInterpolation) {
			var rdn = Math.floor(index + 0.5);
			
			return quadCurve(
				lerp(
					addressArray(array, rdn - 1, minValue),
					addressArray(array, rdn, minValue),
					0.5),
				addressArray(array, rdn, minValue),
				lerp(addressArray(array, rdn, minValue),
					addressArray(array, rdn + 1, minValue),
					0.5),
				
				index - rdn + 0.5);
		} else {
			var flr = Math.floor(index);
			var cel = Math.ceil(index);
			
			var flrv = addressArray(array, flr, minValue);
			var celv = addressArray(array, cel, minValue);
			
			return lerp(flrv, celv, index - flr);
		}
	}
	
	function freqValue(nind, section) {
		var minDec = section.minDecibels.value;
		
		return Math.max(
			getValue(
				freqData,
				lerp(section.freqStart.value, section.freqEnd.value, nind) * freqData.length,
				section.quadratic,
				minDec) - minDec,
			0) / (section.maxDecibels.value - minDec);
	}
	
	function loop() {
		analyser.smoothingTimeConstant = clamp(settings.smoothingTimeConstant.value, 0.0, 1.0);
		lowAnalyser.smoothingTimeConstant = clamp(settings.advanced.lowpassSmooth, 0.0, 1.0);
		highAnalyser.smoothingTimeConstant = clamp(settings.advanced.highpassSmooth, 0.0, 1.0);
		
		if(!freqData) {
			freqData = new Float32Array(analyser.frequencyBinCount);
			
			if(audioElement.paused) {
				for(var i = 0; i < freqData.length; i++) {
					freqData[i] = Number.MIN_SAFE_INTEGER;
				}
			}
		}
		
		if(!timeData) {
			timeData = new Float32Array(analyser.frequencyBinCount);
			
			if(audioElement.paused) {
				for(var i = 0; i < timeData.length; i++) {
					timeData[i] = 0;
				}
			}
		}
		
		if(settings.advanced.enableLowpass) {
			if(!lowFreqData) {
				lowFreqData = new Float32Array(lowAnalyser.frequencyBinCount);
				
				if(audioElement.paused) {
					for(var i = 0; i < lowFreqData.length; i++) {
						lowFreqData[i] = Number.MIN_SAFE_INTEGER;
					}
				}
			}
		}
		
		if(settings.advanced.enableHighpass) {
			if(!highFreqData) {
				highFreqData = new Float32Array(highAnalyser.frequencyBinCount);
				
				if(audioElement.paused) {
					for(var i = 0; i < highFreqData.length; i++) {
						highFreqData[i] = Number.MIN_SAFE_INTEGER;
					}
				}
			}
		}
		
		if(!audioElement.paused) {
			analyser.getFloatFrequencyData(freqData);
			analyser.getFloatTimeDomainData(timeData);
			
			if(settings.advanced.enableLowpass) {
				lowAnalyser.getFloatFrequencyData(lowFreqData);
			}
			
			if(settings.advanced.enableHighpass) {
				highAnalyser.getFloatFrequencyData(highFreqData);
			}
		}
		
		if(cvs.width != cvs.clientWidth || cvs.height != cvs.clientHeight) {
			cvs.width = cvs.clientWidth;
			cvs.height = cvs.clientHeight;
		}
		
		frameProps.minval = Math.min.apply(Math, freqData);
		frameProps.maxval = Math.max.apply(Math, freqData);
		frameProps.time = audioElement.currentTime;
		frameProps.duration = audioElement.duration;
		frameProps.prettytime = prettyTime(frameProps.time);
		frameProps.prettyduration = prettyTime(frameProps.duration);
		frameProps.imgw = 0;
		frameProps.imgh = 0;
		frameProps.imgr = 0;
		
		if(settings.advanced.enableLowpass) {
			frameProps.maxlowval = Math.max.apply(Math, lowFreqData);
			frameProps.minlowval = Math.min.apply(Math, lowFreqData);
		}
		
		if(settings.advanced.enableHighpass) {
			frameProps.maxhighval = Math.max.apply(Math, highFreqData);
			frameProps.minhighval = Math.min.apply(Math, highFreqData);
		}
		
		render();
		
		requestAnimationFrame(loop);
	}
	
	function getFootProps(csize, section, per) {
		var height = Math.pow(freqValue(per, section), section.exponent.value) * section.height.value;
		
		var x = lerp(section.startX.value, section.endX.value, per);
		var y = section.yPos.value;
		
		var polar = section.polar.value;
		if(polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			
			x = lerp(x * csize, xp * csize, polar);
			y = lerp(y * csize, yp * csize, polar);
		} else {
			x *= csize;
			y *= csize;
		}
		
		return {
			x: x,
			y: y
		};
	}
	
	function getTimeFootProps(csize, section, per) {
		var x = lerp(section.startX, section.endX, per);
		var y = section.yPos;
		
		if(section.polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			
			x = lerp(x * csize, xp * csize, section.polar);
			y = lerp(y * csize, yp * csize, section.polar);
		} else {
			x *= csize;
			y *= csize;
		}
		
		return {
			x: x,
			y: y
		};
	}
	
	function getProps(csize, section, per) {
		var height = Math.pow(freqValue(per, section), section.exponent.value) * section.height.value;
		
		var x = lerp(section.startX.value, section.endX.value, per);
		var y = section.yPos.value;
		
		var ey = y + section.minHeight.value + height;
		var ex = x;
		
		var polar = section.polar.value;
		if(polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			var exp = cosx * ey;
			var eyp = sinx * ey;
			
			x = lerp(x * csize, xp * csize, polar);
			y = lerp(y * csize, yp * csize, polar);
			ex = lerp(ex * csize, exp * csize, polar);
			ey = lerp(ey * csize, eyp * csize, polar);
		} else {
			x *= csize;
			y *= csize;
			ex *= csize;
			ey *= csize;
		}
		
		return {
			x: x,
			y: y,
			ex: ex,
			ey: ey
		};
	}
	
	function getTimeProps(csize, section, per) {
		var height = getValue(
								timeData,
								per * timeData.length,
								section.quadratic,
								0);
		var powered = Math.abs(Math.pow(height, section.exponent.value));
		height = (height >= 0 ? powered : -powered) * section.height.value;
		
		var x = lerp(section.startX.value, section.endX.value, per);
		var y = section.yPos.value;
		
		var ey = y + height;
		var ex = x;
		 
		var polar = section.polar.value;
		if(polar > 0.0) {
			var cosx = Math.cos((x * 0.5 + 0.5) * Math.PI * 2);
			var sinx = Math.sin((x * 0.5 + 0.5) * Math.PI * 2);
			
			var xp = cosx * y;
			var yp = sinx * y;
			var exp = cosx * ey;
			var eyp = sinx * ey;
			
			x = lerp(x * csize, xp * csize, polar);
			y = lerp(y * csize, yp * csize, polar);
			ex = lerp(ex * csize, exp * csize, polar);
			ey = lerp(ey * csize, eyp * csize, polar);
		} else {
			x *= csize;
			y *= csize;
			ex *= csize;
			ey *= csize;
		}
		
		return {
			x: x,
			y: y,
			ex: ex,
			ey: ey
		};
	}
	
	var render = (function() {
		var csize = 0;
		var glblscl = 0;
		
		var section = null;
		var sectarg = null;
		var dataCount = 32;
		var glowness = 0;
		var lineWidth = 0;
		
		function renderFreq() {
			dataCount = sectarg.dataCount.value;
			var mode = sectarg.mode;
			
			gtx.strokeStyle = section.color;
			gtx.fillStyle = section.color;
			gtx.lineWidth = (sectarg.lineWidth.value / 100) * csize;
			gtx.shadowColor = section.color;
			gtx.shadowBlur = glowness * glblscl; // Cause for some reasons, it's not scaled by the scale. This comment doesn't make sense.
			
			gtx.lineCap = sectarg.lineCap.name.toLowerCase();
			
			gtx.beginPath();
			for(var i = 0; i < dataCount; i++) {
				if(!sectarg.drawLast && i === dataCount - 1) {
					break;
				}
				
				var per = i / (dataCount - 1);
				
				var p = getProps(csize, sectarg, per);
				
				if(mode == drawMode.LINES || (i == 0 && sectarg.clampShapeToZero)) {
					gtx.moveTo(p.x, p.y);
				}
				
				gtx.lineTo(p.ex, p.ey);
				
				if(i == dataCount - 1 && sectarg.clampShapeToZero) {
					gtx.lineTo(p.x, p.y);
				}
			}
			
			if(sectarg.closeShape && mode !== drawMode.FILL) { // Doesn't affect fill mode
				gtx.closePath();
			}
			
			if(mode === drawMode.FILL) {
				if(sectarg.smartFill) {
					for(var i = dataCount - 1; i >= 0; i--) {
						if(!sectarg.drawLast && i === dataCount - 1) {
							continue;
						}
						
						var per = i / (dataCount - 1);
						var fp = getFootProps(csize, sectarg, per);
						
						gtx.lineTo(fp.x, fp.y);
					}
				}
				
				gtx.fill();
			} else {
				gtx.moveTo(0, 0);
				gtx.stroke();
			}
		};
		
		function renderTimeDom() {
			dataCount = sectarg.dataCount.value;
			var mode = sectarg.mode;
			
			gtx.strokeStyle = section.color;
			gtx.fillStyle = section.color;
			gtx.lineWidth = (sectarg.lineWidth.value / 100) * csize;
			gtx.shadowColor = section.color;
			gtx.shadowBlur = glowness * glblscl; // Cause for some reasons, it's not scaled by the scale. This comment doesn't make sense.
			
			gtx.lineCap = sectarg.lineCap.name.toLowerCase();
			gtx.lineJoin = sectarg.lineJoin.name.toLowerCase();
			
			gtx.beginPath();
			for(var i = 0; i < dataCount; i++) {
				if(!sectarg.drawLast && i === dataCount - 1) {
					break;
				}
				
				var per = i / (dataCount - 1);
				
				var p = getTimeProps(csize, sectarg, per);
				
				if(mode == drawMode.LINES || (i == 0 && sectarg.clampShapeToZero)) {
					gtx.moveTo(p.x, p.y);
				}
				
				gtx.lineTo(p.ex, p.ey);
				
				if(i == dataCount - 1 && sectarg.clampShapeToZero) {
					gtx.lineTo(p.x, p.y);
				}
			}
			
			if(sectarg.closeShape && mode !== drawMode.FILL) { // Doesn't affect fill mode
				gtx.closePath();
			}
			
			if(mode === drawMode.FILL) {
				if(sectarg.smartFill) {
					for(var i = dataCount - 1; i >= 0; i--) {
						if(!sectarg.drawLast && i === dataCount - 1) {
							continue;
						}
						
						var per = i / (dataCount - 1);
						var fp = getTimeFootProps(csize, sectarg, per);
						
						gtx.lineTo(fp.x, fp.y);
					}
				}
				
				gtx.fill();
			} else {
				gtx.moveTo(0, 0);
				gtx.stroke();
			}
		}
		
		function renderImage() {
			gtx.strokeStyle = sectarg.borderColor;
			gtx.fillStyle = section.color;
			gtx.lineWidth = (sectarg.borderSize.value / 100) * csize;
			gtx.shadowColor = section.color;
			gtx.shadowBlur = glowness * glblscl; // Cause for some reasons, it's not scaled by the scale. This comment doesn't make sense.
			gtx.scale(1, -1);
			
			var img = sectarg.image;
			
			var imgBorderRad = sectarg.imageBorderRadius.value * csize;
			if(imgBorderRad !== 0.0) {
				gtx.roundRect(
					-csize/2,
					-csize/2,
					csize,
					csize,
					imgBorderRad);
				gtx.clip();
				
				if(sectarg.opaque) gtx.fill();
				if(sectarg.borderVisible) gtx.stroke();
				
				if(sectarg.imageReady) {
					gtx.drawImage(img,
						-csize/2,
						-csize/2,
						csize,
						csize);
				}
			} else {
				gtx.beginPath();
				gtx.rect(
					-csize/2,
					-csize/2,
					csize,
					csize);
				if(sectarg.opaque) gtx.fill();
				if(sectarg.borderVisible) gtx.stroke();
				
				if(sectarg.imageReady) {
					gtx.drawImage(img,
						-csize/2,
						-csize/2,
						csize,
						csize);
				}
			}
		}
		
		function renderText() {
			var txt = '';
			
			if(!sectarg.text || '' === (txt = sectarg.text.value)) {
				return;
			}
		
			gtx.shadowColor = section.color;
			gtx.shadowBlur = glowness * glblscl;
			gtx.fillStyle = section.color;
			gtx.font = sectarg.fontStyle + ' ' + (sectarg.fontSize.value * csize) + 'px ' + sectarg.fontFamily;
			gtx.textAlign = sectarg.textAlign.name.toLowerCase();
			gtx.textBaseline = sectarg.textBaseline.name.toLowerCase();
			
			gtx.scale(1, -1);
			
			gtx.fillText(txt, 0, 0);
		}
		
		return function() {
			aspect = cvs.width / cvs.height;
			csize = Math.min(cvs.width, cvs.height);
			frameProps.csize = csize;
			
			gtx.clearRect(0, 0, cvs.width, cvs.height);
			
			gtx.fillStyle = settings.backgroundColor;
			gtx.fillRect(0, 0, cvs.width, cvs.height);
			
			gtx.save();
				gtx.translate(cvs.width/2, cvs.height/2);
				gtx.scale(0.5, -0.5);
				
				glblscl = settings.globalScale.value;
				gtx.scale(glblscl, glblscl);
				
				gtx.translate(settings.globalOffsetX.value * csize, settings.globalOffsetY.value * csize);
				gtx.rotate(settings.globalRotation.value * Math.PI / 180);
				
				for(var is = 0; is < settings.sections.length; is++) {
					section = settings.sections[is];
					sectarg = section.target;
					
					if(!section.visible) {
						continue;
					}
					
					if(section.type === sectionType.IMAGE && sectarg.imageReady) {
						frameProps.imgw = sectarg.image.width;
						frameProps.imgh = sectarg.image.height;
						frameProps.imgr = frameProps.imgw / frameProps.imgh;
					} else {
						frameProps.imgw = frameProps.imgh = frameProps.imgr = 0;
					}
					
					glowness = section.glowness.value;
					
					gtx.save();
						gtx.translate(section.posX.value * csize, section.posY.value * csize);
						gtx.rotate(section.rotation.value * Math.PI / 180);
						gtx.scale(section.scaleX.value, section.scaleY.value);
						
						gtx.globalAlpha = section.opacity.value;
						
						if(section.type === sectionType.FREQ) {
							renderFreq();
						} else if(section.type === sectionType.TIME_DOM) {
							renderTimeDom();
						} else if(section.type === sectionType.IMAGE) {
							renderImage();
						} else if(section.type === sectionType.TEXT) {
							renderText();
						}
					gtx.restore();
				}
			gtx.restore();
		}
	})();
	
	function initSoundCloud() {
		SC.initialize({
			client_id: scClientID
		});
		
		var scInput = document.getElementById('soundcloudApp').parentNode.getElementsByClassName('appLinkInput')[0];
		var container = scInput.parentNode.parentNode;
		scInput.addEventListener('change', function() {
			container.classList.add('loading');
			
			SC.resolve(this.value).then(function(s) {
				var xhr = new XMLHttpRequest();
				xhr.onload = function(e) {
					processAudioDataURL(s.title + " (SoundCloud)", e.target.responseURL);
					container.classList.remove('loading');
				};
				xhr.open('GET', s.stream_url + "?client_id="+scClientID);
				xhr.send();
			}, function() {
				container.classList.remove('loading');
			});
		});
	}
	
	function initApp(appIcon) {
		var appDivContainer = document.createElement('div');
		var urlformdiv = document.createElement('div');
		var urlinput = document.createElement('input');
		var loadicon = document.createElement('i');
		
		appDivContainer.classList.add('musicAppIconContainer');
		appDivContainer.appendChild(appIcon);
		
		urlinput.placeholder = "Paste a link...";

		urlformdiv.appendChild(urlinput);
		urlformdiv.appendChild(loadicon);
		
		urlformdiv.classList.add('appLinkForm');
		urlinput.classList.add('appLinkInput');
		
		loadicon.classList.add('loadIcon');
		new Spinner(spinnerOpts).spin(loadicon);
		
		appDivContainer.appendChild(urlformdiv);
		
		appIcon.addEventListener('click', function() {
			appDivContainer.classList.contains('activated') ? appDivContainer.classList.remove('activated') : appDivContainer.classList.add('activated');
		});
		
		return appDivContainer;
	}
	
	function initApps() {
		var apps = [];
		while(musicApps.children.length !== 0) {
			apps.push(initApp(musicApps.removeChild(musicApps.children[0])));
		}
		
		for(var i = 0, l = apps.length; i < l; i++) {
			musicApps.appendChild(apps[i]);
		}
		
		initSoundCloud();
	}
	
	window.addEventListener('keydown', function(e) {
		if(document.activeElement && document.activeElement.tagName === "INPUT") { return; }
		
		if(e.keyCode === 112) { // F1
			e.preventDefault();
			
			for(var i = 0; i < hidableStuff.length; i++) {
				hidableStuff[i].classList.toggle('hidden');
			}
		} else if(audioElement.src) {
			if(e.keyCode === 32) { // Spacebar
				e.preventDefault();
				
				if(audioElement.paused) audioElement.play();
				else audioElement.pause();
			} else if(e.keyCode === 36) { // Home
				audioElement.currentTime = 0;
			} else if(e.keyCode === 37) { // Left
				audioElement.currentTime -= 5;
			} else if(e.keyCode === 39) { // Right
				audioElement.currentTime += 5;
			}
		}
	});
	
	if(!cvs || !gtx || !ctx) {
		alert("Your browser isn't compatible"); 
		throw new Error("Couldn't initialize");
		
		return;
	}
	
	audioSource = ctx.createMediaElementSource(audioElement);
	gainNode = ctx.createGain();
	gainNode.gain.value = 0.8;
	
	analyser = ctx.createAnalyser();
	analyser.fftSize = 2048;
	
	lowpass = ctx.createBiquadFilter();
	lowpass.type = 'lowpass';
	lowAnalyser = ctx.createAnalyser();
	lowAnalyser.fftSize = 2048;
	
	highpass = ctx.createBiquadFilter();
	highpass.type = 'highpass';
	highAnalyser = ctx.createAnalyser();
	highAnalyser.fftSize = 2048;
	
	// cvs.width = document.body.clientWidth;
	// cvs.height = document.body.clientHeight;
	
	cvs.addEventListener('dragover', function(e) {
		e.stopPropagation();
		e.preventDefault();
		
		e.dataTransfer.dropEffect = 'copy';
	}, false);
	
	cvs.addEventListener('drop', function(e) {
		e.stopPropagation();
		e.preventDefault();
		
		processFiles(e.dataTransfer.files);
	}, false);
	
	if(!localStorage.urmusic_volume) {
		localStorage.urmusic_volume = gainNode.gain.value;
	} else {
		gainNode.gain.value = localStorage.urmusic_volume;
	}
	
	THEPLAYER.setupPlayer(thePlayer, {
		target: audioElement,
		volume: gainNode.gain.value,
		
		onvolumechange: function(newValue) {
			gainNode.gain.value = newValue;
			localStorage.urmusic_volume = newValue;
		}
	});
	
	audioElement.crossOrigin = "anonymous";
	
	var setNav = document.getElementById('settingsNav');
	var presetMenuOpenCloseBtn = document.getElementById('presetMenuOpenCloseBtn');
	var presetMenu = document.getElementById('settingsPresetsMenu');
	var allButtons = document.getElementsByClassName('button');
	
	document.getElementById('hambParent').addEventListener('click', function(e) {
		setNav.classList.contains('activated') ? setNav.classList.remove('activated') : setNav.classList.add('activated');
		
		if(!setNav.classList.contains('activated')) {
			presetMenu.classList.remove('opened');
			presetMenuOpenCloseBtn.classList.remove('opened');
		}
	});
	
	recorder.addEventListener('dataavailable', function(e) {
		downloader.href = URL.createObjectURL(e.data);
		downloader.download = "urmusic recording.webm";
		
		downloader.click();
		
		buttonRecord.innerHTML = "Record a video";
		buttonRecord.classList.remove('disabled');
	});
	
	presetMenuOpenCloseBtn.addEventListener('click', function() {
		if(this.classList.contains('opened')) {
			this.classList.remove('opened');
			presetMenu.classList.remove('opened');
		} else {
			this.classList.add('opened');
			presetMenu.classList.add('opened');
		}
	});
	bottomMenuOpener.addEventListener('click', function() {
		this.classList.toggle('closeMode');
		thePlayer.classList.toggle('bottomMenuOpened');
		bottomMenu.classList.toggle('opened');
	});
	buttonRecord.addEventListener('click', function() {
		if(this.classList.contains('disabled')) return;
		
		if(recorder.state === 'recording') {
			recorder.stop();
			
			return;
		}
		
		// Start recording
		audioElement.currentTime = 0;
		// recorder.start();
		
		this.innerHTML = "Stop the record";
	});
	
	for(var i = 0; i < allButtons.length; i++) {
		var b = allButtons[i];
		
		b.addEventListener('mousedown', function() {
			this.classList.add('pushed');
		});
		b.addEventListener('mouseup', function() {
			this.classList.remove('pushed');
		});
	}
	
	audioElement.addEventListener('ended', function() {
		if(recorder.state === 'recording') recorder.stop();
	});
	audioElement.addEventListener('pause', function() {
		if(recorder.state === 'recording') recorder.pause();
	});
	audioElement.addEventListener('play', function() {
		if(recorder.state === 'paused') recorder.resume();
	});
	
	lowpass.connect(lowAnalyser);
	highpass.connect(highAnalyser);
	
	audioSource.connect(gainNode);
	audioSource.connect(analyser);
	audioSource.connect(lowpass);
	audioSource.connect(highpass);
	gainNode.connect(ctx.destination);
	
	settings.advanced.watch('lowpassFreq', function(id, oldval, newval) {
		lowpass.frequency.value = newval;
		return newval;
	});
	settings.advanced.watch('highpassFreq', function(id, oldval, newval) {
		highpass.frequency.value = newval;
		return newval;
	});
	settings.advanced.lowpassFreq = settings.advanced.lowpassFreq;
	settings.advanced.highpassFreq = settings.advanced.highpassFreq;
	
	initApps();
	
	console.log(
		" _    _ ________     __  _ \n"
	+	"| |  | |  ____\\ \\   / / | |\t" +	"Hey you! This app is highly customizable through the JavaScript\n"
	+	"| |__| | |__   \\ \\_/ /  | |\t" +	"console too! Have fun, and try not to broke everything :p!\n"
	+	"|  __  |  __|   \\   /   | |\t" +	"\n"
	+	"| |  | | |____   | |    |_|\t" +	"Urmusic V1.4.3\n"
	+	"|_|  |_|______|  |_|    (_)\t" +	"By Nasso (https://nasso.github.io/)\n\n");
	
	loadPreset();
	
	loop();
})();