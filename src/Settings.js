var currentSongTitle = "Silence";

// Utils
// object.watch
if (!Object.prototype.watch) {
	Object.defineProperty(Object.prototype, "watch", {
		  enumerable: false
		, configurable: true
		, writable: false
		, value: function (prop, handler) {
			var
			  oldval = this[prop]
			, newval = oldval
			, getter = function () {
				return newval;
			}
			, setter = function (val) {
				oldval = newval;
				return newval = handler.call(this, prop, oldval, val);
			}
			;
			
			if (delete this[prop]) { // can't watch constants
				Object.defineProperty(this, prop, {
					  get: getter
					, set: setter
					, enumerable: true
					, configurable: true
				});
			}
		}
	});
}

// object.unwatch
if (!Object.prototype.unwatch) {
	Object.defineProperty(Object.prototype, "unwatch", {
		  enumerable: false
		, configurable: true
		, writable: false
		, value: function (prop) {
			var val = this[prop];
			delete this[prop]; // remove accessors
			this[prop] = val;
		}
	});
}

function isNullOrUndef(v) { return (v === null || v === undefined); }

function clamp(x, a, b) {
	return Math.max(Math.min(x, b), a);
}

function lerp(a, b, x) {
	return a + x * (b - a);
}

var smoothrand = (function() {
	var randset = [];
	
	var flr = 0;
	var ceil = 0;
	
	return function(i) {
		i = i < 0 ? -i : i;
		
		flr = i | 0;
		ceil = (i+1) | 0;
		
		if(isNullOrUndef(randset[flr])) randset[flr] = Math.random();
		if(isNullOrUndef(randset[ceil])) randset[ceil] = Math.random();
		
		return lerp(randset[flr], randset[ceil], Math.cos((i - flr) * -1 * Math.PI) * -0.5 + 0.5);
	};
})();

function EnumerationValue(ownerEnum, name) {
	this.name = name;
	this.ownerEnum = ownerEnum;
}
EnumerationValue.prototype.toJSON = function() {
	return this.name;
};
EnumerationValue.prototype.toString = EnumerationValue.prototype.toJSON;

function Enumeration(vals) {
	if(!Array.isArray(vals)) {
		throw new Error('No values specified for the Enumeration');
	}
	
	for(var i = 0; i < vals.length; i++) {
		this[vals[i]] = new EnumerationValue(this, vals[i]);
	}
}

var drawMode = new Enumeration([
	'LINES',
	'FILL',
	'OUTLINE'
]);

var sectionType = new Enumeration([
	'FREQ',
	'TIME_DOM',
	'IMAGE',
	'TEXT'
]);

var lineCapMode = new Enumeration([
	'BUTT',
	'ROUND',
	'SQUARE'
]);

var lineJoinMode = new Enumeration([
	'MITER',
	'ROUND',
	'BEVEL'
]);

var textAlignMode = new Enumeration([
	'LEFT',
	'CENTER',
	'RIGHT'
]);

var textBaselineMode = new Enumeration([
	'TOP',
	'HANGING',
	'MIDDLE',
	'ALPHABETIC',
	'IDEOGRAPHIC',
	'BOTTOM'
]);

var refreshables = {
	SETTINGS_BIT: 1,
	TABS_BIT: 2,
	PRESETLIST_BIT: 4
};

var exprArgs = [
	'alert',
	'window',
	'navigator',
	
	'rand',
	'smoothrand',
	'max',
	'min',
	'clamp',
	'floor',
	'ceil',
	'cos',
	'sin',
	'tan',
	'acos',
	'asin',
	'atan',
	'pow',
	'pi',
	'maxval',
	'minval',
	'time',
	'duration',
	
	'maxlowval',
	'minlowval',
	'maxhighval',
	'minhighval',
	
	'csize',
	
	// Section type specific
	'imgw',
	'imgh',
	'imgr',
	
	'songtitle',
	'prettytime',
	'prettyduration'
];

var frameProps = {
	maxval: 0,
	minval: Number.MIN_SAFE_INTEGER,
	
	maxlowval: 0,
	minlowval: Number.MIN_SAFE_INTEGER,
	
	maxhighval: 0,
	minhighval: Number.MIN_SAFE_INTEGER,
	
	csize: 0,
	
	imgw: 0,
	imgh: 0,
	imgr: 0,
	
	time: 0,
	duration: 0,
	prettytime: "0:00",
	prettyduration: "0:00"
};

function ExpressionProperty(v) {
	if(!v) v = 0;
	
	if(v instanceof ExpressionProperty) {
		v = v.expr;
	}
	
	var expr = v.toString();
	var gtr = new Function(exprArgs.join(','), 'return (' + expr + ')');
	var constantNumber = +expr;
	
	Object.defineProperty(this, 'value', {
		get: function() {
			if(!Number.isNaN(constantNumber)) return constantNumber;
			
			try {
				return gtr(
					null, null, null,
					
					Math.random,
					smoothrand,
					Math.max,
					Math.min,
					clamp,
					Math.floor,
					Math.ceil,
					Math.cos,
					Math.sin,
					Math.tan,
					Math.acos,
					Math.asin,
					Math.atan,
					Math.pow,
					Math.PI,
					frameProps.maxval,
					frameProps.minval,
					frameProps.time,
					frameProps.duration,
					
					frameProps.maxlowval,
					frameProps.minlowval,
					frameProps.maxhighval,
					frameProps.minhighval,
					
					frameProps.csize,
					
					frameProps.imgw,
					frameProps.imgh,
					frameProps.imgr,
					
					currentSongTitle,
					frameProps.prettytime,
					frameProps.prettyduration);
			} catch(e) {
				return 0;
			}
		}
	});
	
	Object.defineProperty(this, 'expr', {
		get: function() {
			return expr;
		},
		
		set: function(val) {
			if(val === '') val = '0';
			
			expr = val;
			constantNumber = +val;
			
			if(Number.isNaN(constantNumber)) {
				gtr = new Function(exprArgs.join(','), 'return (' + expr + ')');
			}
		}
	});
}
ExpressionProperty.prototype.toJSON = function() {
	return this.expr;
};

function AdvancedSettings(p) {
	this.set(p);
}
AdvancedSettings.prototype.set = function(p) {
	p = p || {};
	
	this.enableLowpass = !isNullOrUndef(p.enableLowpass) ? p.enableLowpass : false;
	this.enableHighpass = !isNullOrUndef(p.enableHighpass) ? p.enableHighpass : false;
	
	this.lowpassFreq = !isNullOrUndef(p.lowpassFreq) ? +p.lowpassFreq : 120;
	this.highpassFreq = !isNullOrUndef(p.highpassFreq) ? +p.highpassFreq : 480;
	
	this.lowpassSmooth = !isNullOrUndef(p.lowpassSmooth) ? +p.lowpassSmooth : 0.65;
	this.highpassSmooth = !isNullOrUndef(p.highpassSmooth) ? +p.highpassSmooth : 0.65;
};

function AnalyserSection(p) {
	p = p || {};
	
	this.dataCount = new ExpressionProperty(!isNullOrUndef(p.dataCount) ? p.dataCount : 128);
	this.lineWidth = new ExpressionProperty(!isNullOrUndef(p.lineWidth) ? p.lineWidth : 1.0);
	this.lineCap = !isNullOrUndef(p.lineCap) ? lineCapMode[p.lineCap] : lineCapMode.BUTT;
	this.startX = new ExpressionProperty(!isNullOrUndef(p.startX) ? p.startX : -1);
	this.endX = new ExpressionProperty(!isNullOrUndef(p.endX) ? p.endX : 1);
	this.yPos = new ExpressionProperty(!isNullOrUndef(p.yPos) ? p.yPos : 0);
	this.exponent = new ExpressionProperty(!isNullOrUndef(p.exponent) ? p.exponent : 1);
	this.height = new ExpressionProperty(!isNullOrUndef(p.height) ? p.height : 0.5);
	this.mode = !isNullOrUndef(p.mode) ? drawMode[p.mode] : drawMode.LINES;
	this.polar = new ExpressionProperty(!isNullOrUndef(p.polar) ? p.polar : 0.0);
	this.clampShapeToZero = !isNullOrUndef(p.clampShapeToZero) ? p.clampShapeToZero : true;
	this.closeShape = !isNullOrUndef(p.closeShape) ? p.closeShape : true;
	this.drawLast = !isNullOrUndef(p.drawLast) ? p.drawLast : true;
	this.quadratic = !isNullOrUndef(p.quadratic) ? p.quadratic : true;
}

function FreqSection(p) {
	AnalyserSection.call(this, p);
	
	p = p || {};
	
	this.minDecibels = new ExpressionProperty(!isNullOrUndef(p.minDecibels) ? p.minDecibels : -100);
	this.maxDecibels = new ExpressionProperty(!isNullOrUndef(p.maxDecibels) ? p.maxDecibels : -20);
	this.minHeight = new ExpressionProperty(!isNullOrUndef(p.minHeight) ? p.minHeight : 0.01);
	this.freqStart = new ExpressionProperty(!isNullOrUndef(p.freqStart) ? p.freqStart : 0);
	this.freqEnd = new ExpressionProperty(!isNullOrUndef(p.freqEnd) ? p.freqEnd : 0.03);
	this.smartFill = !isNullOrUndef(p.smartFill) ? p.smartFill : false;
}

function TimeDomSection(p) {
	AnalyserSection.call(this, p);
	
	p = p || {};

	this.lineJoin = !isNullOrUndef(p.lineJoin) ? lineJoinMode[p.lineJoin] : lineJoinMode.ROUND;
}

function ImageSection(p) {
	p = p || {};
	
	this.imageURL = !isNullOrUndef(p.imageURL) ? p.imageURL : '';
	this.imageBorderRadius = new ExpressionProperty(!isNullOrUndef(p.imageBorderRadius) ? p.imageBorderRadius : 0.0);
	this.opaque = !isNullOrUndef(p.opaque) ? p.opaque : false;
	this.borderSize = new ExpressionProperty(!isNullOrUndef(p.borderSize) ? p.borderSize : 0.0);
	
	this.borderColor = !isNullOrUndef(p.borderColor) ? p.borderColor : '#ffffff';
	this.borderVisible = !isNullOrUndef(p.borderVisible) ? p.borderVisible : false;
	
	var that = this;
	this.image = new Image();
	
	var imageReady = false;
	this.image.onload = function() {
		imageReady = true;
	};
	
	Object.defineProperty(this, 'imageReady', {
		get: function() {
			return imageReady;
		}
	});
	
	this.watch('imageURL', function(id, oldVal, newVal) {
		imageReady = false;
		that.image.src = newVal;
		
		return newVal;
	});
	
	this.image.src = this.imageURL;
}

function TextSection(p) {
	p = p || {};
	
	this.text = new ExpressionProperty(!isNullOrUndef(p.text) ? p.text : '"Type your text here"');
	this.fontStyle = !isNullOrUndef(p.fontStyle) ? p.fontStyle : "normal";
	this.fontSize = new ExpressionProperty(!isNullOrUndef(p.fontSize) ? p.fontSize : 0.2);
	this.fontFamily = !isNullOrUndef(p.fontFamily) ? p.fontFamily : "sans-serif";
	this.textAlign = !isNullOrUndef(p.textAlign) ? textAlignMode[p.textAlign] : textAlignMode.CENTER;
	this.textBaseline = !isNullOrUndef(p.textBaseline) ? textBaselineMode[p.textBaseline] : textBaselineMode.ALPHABETIC;
}

function Section(p) {
	p = p || {};
	
	this.name = !isNullOrUndef(p.name) ? p.name : 'A section';
	this.type = !isNullOrUndef(p.type) ? sectionType[p.type] : sectionType.FREQ;
	this.visible = !isNullOrUndef(p.visible) ? p.visible : true;
	this.opacity = new ExpressionProperty(!isNullOrUndef(p.opacity) ? p.opacity : 1.0);
	this.posX = new ExpressionProperty(!isNullOrUndef(p.posX) ? p.posX : 0.0);
	this.posY = new ExpressionProperty(!isNullOrUndef(p.posY) ? p.posY : 0.0);
	this.rotation = new ExpressionProperty(!isNullOrUndef(p.rotation) ? p.rotation : 0.0);
	this.scaleX = new ExpressionProperty(!isNullOrUndef(p.scaleX) ? p.scaleX : 1.0);
	this.scaleY = new ExpressionProperty(!isNullOrUndef(p.scaleY) ? p.scaleY : 1.0);
	this.color = !isNullOrUndef(p.color) ? p.color : '#ffffff';
	this.glowness = new ExpressionProperty(!isNullOrUndef(p.glowness) ? p.glowness : 0.0);
	this.target = null;
	
	if(this.type === sectionType.FREQ) {
		this.target = new FreqSection(p.target ? p.target : p);
	} else if(this.type === sectionType.TIME_DOM) {
		this.target = new TimeDomSection(p.target ? p.target : p);
	} else if(this.type === sectionType.IMAGE) {
		this.target = new ImageSection(p.target ? p.target : p);
	} else if(this.type === sectionType.TEXT) {
		this.target = new TextSection(p.target ? p.target : p);
	}
	
	var that = this;
	this.watch('type', function(pname, oldVal, newVal) {
		if(!(oldVal instanceof EnumerationValue && oldVal.ownerEnum === sectionType) || newVal === oldVal) {
			return oldVal;
		}
		
		if(newVal === sectionType.FREQ) {
			that.target = new FreqSection(that.target);
		} else if(newVal === sectionType.TIME_DOM) {
			that.target = new TimeDomSection(that.target);
		} else if(newVal === sectionType.IMAGE) {
			that.target = new ImageSection(that.target);
		} else if(newVal === sectionType.TEXT) {
			that.target = new TextSection(that.target);
		}
		
		refreshControls(refreshables.TABS_BIT);
		
		return newVal;
	});
}

function Settings(p) {
	this.set(p);
}
Settings.prototype = {
	addSection: function(p) {
		this.sections.push(new Section(p));
		
		return this;
	},
	set: function(p) {
		p = p || {};
		
		this.smoothingTimeConstant = new ExpressionProperty(!isNullOrUndef(p.smoothingTimeConstant) ? p.smoothingTimeConstant : 0.65);
		
		this.sections = [];
		if(Array.isArray(p.sections)) {
			for(var i = 0; i < p.sections.length; i++) {
				this.addSection(p.sections[i]);
			}
		}
		
		this.globalScale = new ExpressionProperty(!isNullOrUndef(p.globalScale) ? p.globalScale : 1.0);
		this.globalOffsetX = new ExpressionProperty(!isNullOrUndef(p.globalOffsetX) ? p.globalOffsetX : 0.0);
		this.globalOffsetY = new ExpressionProperty(!isNullOrUndef(p.globalOffsetY) ? p.globalOffsetY : 0.0);
		this.globalRotation = new ExpressionProperty(!isNullOrUndef(p.globalRotation) ? p.globalRotation : 0.0);
		
		this.backgroundColor = !isNullOrUndef(p.backgroundColor) ? p.backgroundColor : '#3b3b3b';
		
		if(!this.advanced) this.advanced = new AdvancedSettings(p.advanced);
		else this.advanced.set(p.advanced);
	}
};

var settingsPresets = {
	'Default': new Settings().addSection(),
	'Time domain default': new Settings(JSON.parse('{"smoothingTimeConstant":"0.65","sections":[{"name":"A section","type":"TIME_DOM","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"256","lineWidth":"1","lineCap":"BUTT","polar":"0","lineJoin":"ROUND","startX":"-1","endX":"1","yPos":"0","exponent":"1","height":"0.5","mode":"OUTLINE","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true}}],"globalScale":"1","globalOffsetX":"0","globalOffsetY":"0","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":false,"enableHighpass":false,"lowpassFreq":120,"highpassFreq":480}}')),
	'The Dub Rebellion': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"Background","type":"IMAGE","visible":true,"opacity":"1","posX":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","posY":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","rotation":"0","scaleX":"(imgr * 2.4) / max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","scaleY":"2.4 / max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","color":"#ffffff","glowness":"0","target":{"imageURL":"img/me163.jpg","imageBorderRadius":"0","image":{}}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#fbfe5c","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.4","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#fbfe5c","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"2.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.4","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#fe89d8","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.3","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#fe89d8","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"2.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.3","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#c6def7","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.2","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#c6def7","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"2.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.2","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#505986","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.1","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#505986","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"2.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.1","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"-0.005","freqEnd":"0.03","smartFill":true}},{"name":"A section","type":"IMAGE","visible":true,"opacity":"1","posX":"0.006","posY":"0.018","rotation":"0","scaleX":"1.15","scaleY":"1.15","color":"#ffffff","glowness":"0","target":{"imageURL":"img/tdr.png","imageBorderRadius":"0","image":{}}}],"globalScale":"max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","globalOffsetX":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalOffsetY":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":true,"enableHighpass":false,"lowpassFreq":100,"highpassFreq":480,"lowpassSmooth":0.8,"highpassSmooth":0.8}}')),
	'Monstercat': new Settings(JSON.parse('{"smoothingTimeConstant":"0.8","sections":[{"name":"Background","type":"IMAGE","visible":true,"opacity":"1","posX":"0.02 * (smoothrand(time) * 2 - 1)","posY":"0.02 * (smoothrand(time + duration) * 2 - 1)","rotation":"0","scaleX":"imgr * 2.4","scaleY":"2.4","color":"#ffffff","glowness":"0","target":{"imageURL":"img/me163.jpg","imageBorderRadius":"0","image":{}}},{"name":"Frequency bars","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"64","lineWidth":"2.5","lineCap":"BUTT","startX":"-1","endX":"1","yPos":"0","exponent":"6","height":"0.4","mode":"LINES","polar":"0","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-60","maxDecibels":"-20","minHeight":"0.01","freqStart":"0","freqEnd":"0.02","smartFill":false}},{"name":"Title 1","type":"TEXT","visible":true,"opacity":"1","posX":"-0.6","posY":"-0.06","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"text":"\\"MONSTERCAT PODCAST\\"","fontStyle":"bold","fontSize":"0.12","fontFamily":"Verdana","textAlign":"LEFT","textBaseline":"TOP"}},{"name":"Title 2","type":"TEXT","visible":true,"opacity":"1","posX":"-0.6","posY":"-0.19","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"text":"\\"EP. 122\\"","fontStyle":"bold","fontSize":"0.12","fontFamily":"Verdana","textAlign":"LEFT","textBaseline":"TOP"}},{"name":"Subtitle","type":"TEXT","visible":true,"opacity":"1","posX":"-0.6","posY":"-0.33","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"text":"\\"Direct Takeover\\"","fontStyle":"normal","fontSize":"0.12","fontFamily":"Verdana","textAlign":"LEFT","textBaseline":"TOP"}},{"name":"Artwork","type":"IMAGE","visible":true,"opacity":"1","posX":"-0.82","posY":"-0.25","rotation":"0","scaleX":"0.4","scaleY":"0.4","color":"#ffffff","glowness":"0","target":{"imageURL":"img/mc.png","imageBorderRadius":"0","image":{}}}],"globalScale":"1","globalOffsetX":"0","globalOffsetY":"0","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":false,"enableHighpass":false,"lowpassFreq":120,"highpassFreq":480,"lowpassSmooth":0.65,"highpassSmooth":0.65}}')),
	'DubstepGutter': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"Background","type":"IMAGE","visible":true,"opacity":"1","posX":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","posY":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","rotation":"0","scaleX":"(imgr * 2.4) / max(max((maxlowval + 70) / 50, 0) * 3.8, 1.5)","scaleY":"2.4 / max(max((maxlowval + 70) / 50, 0) * 3.8, 1.5)","color":"#ffffff","glowness":"0","target":{"imageURL":"img/me163.jpg","imageBorderRadius":"0","image":{}}},{"name":"Bass top","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"1","lineCap":"ROUND","startX":"-0.55","endX":"0.1","yPos":"0.2","exponent":"5","height":"0.04","mode":"FILL","polar":"1","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-70","maxDecibels":"-30","minHeight":"0","freqStart":"0","freqEnd":"0.014","smartFill":true}},{"name":"Bass bottom","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"1","lineCap":"ROUND","startX":"0.65","endX":"0.1","yPos":"0.2","exponent":"5","height":"0.04","mode":"FILL","polar":"1","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-70","maxDecibels":"-30","minHeight":"0","freqStart":"0","freqEnd":"0.014","smartFill":true}},{"name":"High top","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"1","lineCap":"ROUND","startX":"1.45","endX":"1.05","yPos":"0.2","exponent":"3","height":"0.03","mode":"FILL","polar":"1","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-70","maxDecibels":"-30","minHeight":"0","freqStart":"0.02","freqEnd":"0.03","smartFill":true}},{"name":"High bottom","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"1","lineCap":"ROUND","startX":"0.65","endX":"1.05","yPos":"0.2","exponent":"3","height":"0.03","mode":"FILL","polar":"1","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true,"minDecibels":"-70","maxDecibels":"-30","minHeight":"0","freqStart":"0.02","freqEnd":"0.03","smartFill":true}},{"name":"Image","type":"IMAGE","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"0.41","scaleY":"0.41","color":"#ffffff","glowness":"0","target":{"imageURL":"img/dsg.png","imageBorderRadius":"0.5","image":{}}}],"globalScale":"max(max((maxlowval + 70) / 50, 0) * 3.8, 1.5)","globalOffsetX":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalOffsetY":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":true,"enableHighpass":false,"lowpassFreq":20,"highpassFreq":480,"lowpassSmooth":0.8,"highpassSmooth":0.8}}')),
	'Drop the Bassline': new Settings(JSON.parse('{"smoothingTimeConstant":"0.5","sections":[{"name":"Background","type":"IMAGE","visible":true,"opacity":"1","posX":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","posY":"rand() * max((maxlowval + 70) / 50, 0) * 0.015 - 0.0075","rotation":"0","scaleX":"(imgr * 2.4) / max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","scaleY":"2.4 / max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","color":"#ffffff","glowness":"0","target":{"imageURL":"img/me163.jpg","imageBorderRadius":"0","image":{}}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-0.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.23","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.23","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ff0000","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-0.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.19","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ff0000","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.19","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"-0.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.15","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"FREQ","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"1","scaleY":"1","color":"#ffffff","glowness":"0","target":{"dataCount":"128","lineWidth":"0.8","lineCap":"BUTT","startX":"1.5","endX":"0.5","yPos":"0.4","exponent":"3","height":"0.15","mode":"FILL","polar":"1","clampShapeToZero":false,"closeShape":false,"drawLast":true,"quadratic":true,"minDecibels":"-48","maxDecibels":"-20","minHeight":"0.002","freqStart":"0","freqEnd":"0.015","smartFill":true}},{"name":"A section","type":"IMAGE","visible":true,"opacity":"1","posX":"0","posY":"0","rotation":"0","scaleX":"0.8","scaleY":"0.8","color":"#ffffff","glowness":"0","target":{"imageURL":"img/dtb.png","imageBorderRadius":"0.5","image":{}}}],"globalScale":"max(max((maxlowval + 70) / 50, 0) * 1.2, 0.8)","globalOffsetX":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalOffsetY":"0.01 * (rand() * 2 - 1) * clamp((maxlowval + 70) / 50, 0, 1)","globalRotation":"0","backgroundColor":"#3b3b3b","advanced":{"enableLowpass":true,"enableHighpass":false,"lowpassFreq":100,"highpassFreq":480,"lowpassSmooth":0.8,"highpassSmooth":0.8}}')),
	'BOD': new Settings(JSON.parse('{"smoothingTimeConstant":"0.65","sections":[{"name":"A section","visible":true,"minDecibels":"-65","maxDecibels":"-10","dataCount":"256","freqStart":"0","freqEnd":"0.1","lineWidth":"0.5","startX":"-1","endX":"1","yPos":"0.2","color":"#ff0000","exponent":"3","height":"-1","minHeight":"-0.002","glowness":"64","polar":"0","mode":"LINES","clampShapeToZero":true,"closeShape":true,"drawLast":true,"quadratic":true}],"globalScale":"1","globalOffsetX":"0","globalOffsetY":"0","globalRotation":"0","imageURL":"","imageX":"0","imageY":"0","imageWidth":"0.4","imageHeight":"0.4","imageRot":"0","backgroundColor":"#000000"}'))
};

var refreshControls = (function(){
	var glblSettings = null;
	var advcdSettings = null;
	var secTabs = null;
	var addTabLi = null;
	var sectionSettingsUl = null;
	var presetList = null;
	var presetNameIn = null;
	var loadPresetBtn = null;
	var savePresetBtn = null;
	
	var downloader = null;
	var fileChooser = null;
	
	var initialized = false;
	
	var sectionControls = [];
	
	var refreshTabs = function() {
		var thisIndex = -1;
		
		for(var i = 0; i < secTabs.children.length; i++) {
			if(secTabs.children[i].classList.contains("activated")) {
				thisIndex = i;
				continue;
			}
		}
		
		while(sectionSettingsUl.children.length !== 0) {
			sectionSettingsUl.removeChild(sectionSettingsUl.children[0]);
		}
		
		while(secTabs.children.length !== 0 && secTabs.children[0] !== addTabLi) {
			secTabs.removeChild(secTabs.children[0]);
		}
		
		for(var i = 0; i < settings.sections.length; i++) {
			actionAddTab(i);
		}
		
		if(thisIndex !== -1) {
			for(var i = 0; i < sectionControls[thisIndex].length; i++) {
				sectionSettingsUl.appendChild(sectionControls[thisIndex][i]);
			}
			
			if(secTabs.children.length > 1) {
				secTabs.children[Math.min(thisIndex, secTabs.children.length - 2)].classList.add("activated");
				activeSection = settings.sections[Math.min(thisIndex, secTabs.children.length - 2)];
			} else {
				activeSection = null;
			}
		} else {
			activeSection = null;
		}
	};
	
	var createControl = function(s, x) {
		var p = s[x];
		if(isNullOrUndef(p)) p = '';
		
		if((typeof p === 'object' && !p.hasOwnProperty('expr')) || typeof p === 'function') {
			return null;
		}
		
		var li = document.createElement('li');
		var span = document.createElement('span');
		var input = document.createElement('input');
		
		li.classList.add("settingsCtrl");
		span.classList.add("ctrlName");
		input.classList.add("ctrlInput");
		
		span.innerHTML = x;
		
		if(typeof p === 'boolean') {
			input.type = 'checkbox';
			
			input.checked = p;
		} else if(x.toLowerCase().endsWith('color')) { // Assume this is a color
			input.type = 'color';
			
			input.value = p.toString();
		} else {
			input.type = 'text';
			
			input.placeholder = p instanceof ExpressionProperty ? 'expression' : (typeof p);
			
			var val = p.toString();
			if(p instanceof ExpressionProperty) {
				input.value = p.expr;
			} else {
				if(val.startsWith('data:')) { // data url :p
					input.value = 'DataURL';
				} else {
					input.value = p.toString();
				}
			}
		}
		
		input.addEventListener('change', function(){
			if(typeof s[x] === 'number') {
				if(this.value === '') return;
				
				s[x] = this.value;
			} else if(typeof s[x] === 'boolean') {
				s[x] = this.checked;
			} else if(s[x].hasOwnProperty('expr')) {
				s[x].expr = this.value;
			} else {
				s[x] = this.value;
			}
		});
		
		li.appendChild(span);
		li.appendChild(input);
		
		if(typeof p === 'boolean') {
			var chkbx = document.createElement('span');
			chkbx.classList.add("ctrlCheckbox", "fa");
			
			chkbx.addEventListener('click', function(e) {
				s[x] = input.checked = !input.checked;
			});
			
			li.appendChild(chkbx);
		}
		
		return li;
	}
	
	var createControlCombo = function(s, x, vals) {
		var p = s[x];
		
		var li = document.createElement('li');
		var span = document.createElement('span');
		var select = document.createElement('select');
		
		li.classList.add("settingsCtrl");
		span.classList.add("ctrlName");
		select.classList.add("ctrlInput");
		
		span.innerHTML = x;
		for(var h in vals) {
			var opt = document.createElement('option');
			opt.value = h;
			opt.innerHTML = h;
			
			select.appendChild(opt);
			
			if(s[x] === vals[h]) {
				select.value = h;
			}
		}
		
		select.addEventListener('change', function(){
			var val = vals[this.value];
			s[x] = val;
		});
		
		li.appendChild(span);
		li.appendChild(select);
		
		return li;
	}
	
	var createSectionNameControl = function(s, x) {
		var p = s[x];
		
		var li = document.createElement('li');
		var input = document.createElement('input');
		var ul = document.createElement('ul');
		
		li.classList.add("settingsMajorCtrl");
		input.classList.add("ctrlMajorInput");
		ul.classList.add("ctrlOptions");
		
		input.type = 'text';
		input.placeholder = x;
		input.value = p.toString();
		
		var cloneLi = document.createElement('li');
		var deleteLi = document.createElement('li');
		var moveLi = document.createElement('li');
		
		cloneLi.classList.add("fa", "fa-clone", "w3-large", "ctrlOptClone");
		deleteLi.classList.add("fa", "fa-trash-o", "w3-large", "ctrlOptDelete");
		
		var rightI = document.createElement('i');
		var leftI = document.createElement('i');
		
		rightI.classList.add("fa", "fa-angle-right", "w3-small", "ctrlOptRight");
		leftI.classList.add("fa", "fa-angle-left", "w3-small", "ctrlOptLeft");
		
		moveLi.classList.add("ctrlOptMoves");
		
		moveLi.appendChild(rightI);
		moveLi.appendChild(document.createElement('br'));
		moveLi.appendChild(leftI);
		
		rightI.addEventListener('click', function() {
			var index = settings.sections.indexOf(s);
			
			if(index >= settings.sections.length - 1) {
				return;
			}
			
			var a = settings.sections[index];
			settings.sections[index] = settings.sections[index + 1];
			settings.sections[index + 1] = a;
			
			refreshTabs();
			
			secTabs.children[index + 1].click();
		});
		
		leftI.addEventListener('click', function() {
			var index = settings.sections.indexOf(s);
			
			if(index <= 0) {
				return;
			}
			
			var a = settings.sections[index];
			settings.sections[index] = settings.sections[index - 1];
			settings.sections[index - 1] = a;
			
			refreshTabs();
			
			secTabs.children[index - 1].click();
		});
		
		cloneLi.addEventListener('click', function() {
			var copy = new Section(s);
			settings.sections.push(copy);
			
			actionAddTab(settings.sections.length - 1);
		});
		
		deleteLi.addEventListener('click', function() {
			var index = settings.sections.indexOf(s);
			
			settings.sections.splice(index, 1);
			
			actionRemoveTab(index);
		});
		
		ul.appendChild(moveLi);
		ul.appendChild(cloneLi);
		ul.appendChild(deleteLi);
		
		input.addEventListener('change', function(){
			s[x] = this.value;
			
			secTabs.children[settings.sections.indexOf(s)].title = s[x];
		});
		
		li.appendChild(input);
		li.appendChild(ul);
		
		return li;
	};
	
	var createSectionControls = (function() {
		var ctrls = null;
		
		function addControlsFor(s) {
			for(var x in s) {
				var ctrl = null;
				
				if(s[x] instanceof EnumerationValue) {
					ctrl = createControlCombo(s, x, s[x].ownerEnum);
				} else if(x === 'name') {
					// Special case for name
					ctrl = createSectionNameControl(s, x);
				} else {
					ctrl = createControl(s, x);
				}
				
				if(ctrl) ctrls.push(ctrl);
			}
		}
		
		return function(s) {
			ctrls = [];
			
			addControlsFor(s);
			addControlsFor(s.target);
			
			return ctrls;
		}
	})();
	
	var actionTabClicked = function() {
		if(this === addTabLi) return;
		
		if(this.classList.contains('activated'))
			return;
		
		var thisIndex = -1;
		
		for(var i = 0; i < settings.sections.length; i++) {
			if(secTabs.children[i] === this) {
				thisIndex = i;
				continue;
			}
			
			if(secTabs.children[i].classList.contains('activated'))
				secTabs.children[i].classList.remove('activated');
		}
		
		this.classList.add('activated');
		
		while(sectionSettingsUl.children.length !== 0) {
			sectionSettingsUl.removeChild(sectionSettingsUl.children[0]);
		}
		
		for(var i = 0; i < sectionControls[thisIndex].length; i++) {
			sectionSettingsUl.appendChild(sectionControls[thisIndex][i]);
		}
		
		activeSection = settings.sections[thisIndex];
	};
	
	var actionAddTab = function(i) {
		var tabLi = document.createElement("li");
		tabLi.innerHTML = i.toString();
		tabLi.title = settings.sections[i].name;
		tabLi.classList.add('sectionTab');
		tabLi.addEventListener('click', actionTabClicked);
		
		secTabs.insertBefore(tabLi, addTabLi);
		sectionControls[i] = createSectionControls(settings.sections[i]);
	};
	
	var actionRemoveTab = function(i) {
		var e = secTabs.children[i];
		if(!e) return;
		
		e.removeEventListener('click', actionTabClicked);
		
		secTabs.removeChild(e);
		
		refreshTabs();
	}
	
	var refreshSettings = function() {
		while(glblSettings.children.length !== 0) {
			glblSettings.removeChild(glblSettings.children[0]);
		}
		
		for(var x in settings) {
			var ctrl = createControl(settings, x);
			
			if(ctrl) glblSettings.appendChild(ctrl);
		}
		
		while(advcdSettings.children.length !== 0) {
			advcdSettings.removeChild(advcdSettings.children[0]);
		}
		
		for(var x in settings.advanced) {
			var ctrl = createControl(settings.advanced, x);
			
			if(ctrl) advcdSettings.appendChild(ctrl);
		}
	};
	
	var refreshPresetList = function() {
		while(presetList.children.length !== 0) {
			presetList.removeChild(presetList.children[0]);
		}
		
		for(var x in settingsPresets) {
			var preset = document.createElement('li');
			preset.innerHTML = x.toString(); // SHOULD be a string
			
			preset.addEventListener('click', (function() {
				var presetName = x;
				
				return function() {
					loadPreset(presetName);
					refreshTabs();
				};
			})());
			
			presetList.appendChild(preset);
		}
	};
	
	return function(what) {
		if(what === 0) {
			return;
		} else if(!what) {
			what = refreshables.SETTINGS_BIT | refreshables.TABS_BIT | refreshables.PRESETLIST_BIT;
		}
		
		if(!glblSettings)		glblSettings = document.getElementById("globalSettings");
		if(!advcdSettings)		advcdSettings = document.getElementById("advancedSettings");
		if(!secTabs)			secTabs = document.getElementById("settingsSectionTabs");
		if(!addTabLi)			addTabLi = document.getElementById("addTab");
		if(!sectionSettingsUl)	sectionSettingsUl = document.getElementById("sectionSettings");
		if(!presetList)			presetList = document.getElementById("settingsPresetsList");
		if(!presetNameIn)		presetNameIn = document.getElementById("presetNameInput");
		if(!loadPresetBtn)		loadPresetBtn = document.getElementById("settingsPresetsOptOpen");
		if(!savePresetBtn)		savePresetBtn = document.getElementById("settingsPresetsOptSave");
		if(!downloader)			downloader = document.getElementById('downloader');
		if(!fileChooser)		fileChooser = document.getElementById('fileChooser');
		
		if((what & refreshables.SETTINGS_BIT) !== 0) refreshSettings();
		if((what & refreshables.TABS_BIT) !== 0) refreshTabs();
		if((what & refreshables.PRESETLIST_BIT) !== 0) refreshPresetList();
		
		if(!initialized) {
			addTabLi.addEventListener('click', function() {
				var newSec = new Section();
				settings.sections.push(newSec);
				
				actionAddTab(settings.sections.length - 1);
			});
			
			fileChooser.addEventListener('change', function(e) {
				for(var i = 0; i < e.target.files.length - 1; i++) {
					loadFilePreset(e.target.files[i]);
				}
				
				loadFilePreset(e.target.files[e.target.files.length - 1], true);
			});
			
			loadPresetBtn.addEventListener('click', function() {
				// Ask for .urm file
				fileChooser.accept = ".urm";
				fileChooser.click();
			});
			
			savePresetBtn.addEventListener('click', function() {
				var newPresetName = presetNameIn.value ? presetNameIn.value : "untitled";
				
				// Download .urm
				downloader.href = "data:text/plain;base64," + btoa(JSON.stringify(settings));
				downloader.download = newPresetName + ".urm";
				downloader.click();
				
				var counter = 0;
				while(settingsPresets[newPresetName] !== undefined) {
					newPresetName = (presetNameIn.value ? presetNameIn.value : "untitled") + ' (' + counter + ')';
					counter++;
				}
				
				settingsPresets[newPresetName] = new Settings(settings);
				
				refreshSettings();
				refreshTabs();
				refreshPresetList();
			});
			
			if(secTabs.children.length > 1) actionTabClicked.call(secTabs.children[0]);
			
			initialized = true;
		}
	};
})();

var activeSection = null;

function loadPreset(name) {
	if(isNullOrUndef(name)) {
		var names = [];
		
		for(var x in settingsPresets) {
			names.push(x);
		}
		
		name = names[Math.floor(Math.random() * names.length)];
	}
	
	settings.set(settingsPresets[name]);
	
	refreshControls();
}

function loadFilePreset(f, setIt) {
	if(!f) return;
	
	var fileName = f.name.substr(0, f.name.lastIndexOf('.'));
	var reader = new FileReader();
	reader.onload = function(e) {
		var newSets = new Settings(JSON.parse(e.target.result));
		
		var newPresetName = fileName;
		
		var counter = 0;
		while(settingsPresets[newPresetName] !== undefined) {
			newPresetName = fileName + ' (' + counter + ')';
			counter++;
		}
		
		settingsPresets[newPresetName] = newSets;
		
		if(setIt) loadPreset(newPresetName);
	};
	
	reader.readAsText(f);
}

var settings = new Settings();

export default settings;

// FIXME
window.settings = settings;
window.loadPreset = loadPreset;
window.clamp = clamp;
window.frameProps = frameProps;
window.sectionType = sectionType;
window.lerp = lerp;
window.drawMode = drawMode;
