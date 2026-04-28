/*!
 * AnySign, v1.0.2.30
 * 
 * For more information on this product, please see
 * https://www.hancomwith.com
 * 
 * Copyright (c) HANCOM WITH INC. All Rights Reserved.
 * 
 * Date: 2024-06-05
 */
//IE assign 미지원일경우 함수생성
if (typeof Object.assign != 'function') {
	Object.assign = function (target, varArgs) { // .length of function is 2
		'use strict';
		if (target == null) { // TypeError if undefined or null
			throw new TypeError('Cannot convert undefined or null to object');
		}

		var to = Object(target);

		for (var index = 1; index < arguments.length; index++) {
			var nextSource = arguments[index];

			if (nextSource != null) { // Skip over if undefined or null
				for (var nextKey in nextSource) {
					// Avoid bugs when hasOwnProperty is shadowed
					if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
						to[nextKey] = nextSource[nextKey];
					}
				}
			}
		}
		return to;
	};
}
//---------------------------------------------------------------------
//공통
var commSign = {
	//css 파일추가
	addStylesheet: function (aHref) {
		var link = document.createElement('link');
		link.setAttribute('rel', 'stylesheet');
		link.type = 'text/css';
		link.href = aHref;
		document.head.appendChild(link);
	},
	//js , css 파일 삭제
	removeJsCssFile: function (filename, filetype) {
		var targetelement = (filetype == "js") ? "script" : (filetype == "css") ? "link" : "none";
		var targetattr = (filetype == "js") ? "src" : (filetype == "css") ? "href" : "none";
		var allsuspects = document.getElementsByTagName(targetelement);
		for (var i = allsuspects.length; i >= 0; i--) {
			if (allsuspects[i] && allsuspects[i].getAttribute(targetattr) != null && allsuspects[i].getAttribute(targetattr).indexOf(filename) != -1) {
				allsuspects[i].parentNode.removeChild(allsuspects[i]);
			}
		}
	},
	//javascript 다중 파일추가
	addJavascripts: function (aSrc, aOnloadCallBack, sIdx) {
		if (commSign.isEmpty(sIdx)) {
			sIdx = 0;
		}
		if (sIdx < aSrc.length) {
			commSign.addJavascript(aSrc[sIdx], function () {
				commSign.addJavascripts(aSrc, aOnloadCallBack, sIdx + 1);
			});
		} else {
			if (typeof aOnloadCallBack === 'function') {
				aOnloadCallBack();
			}
		}
	},
	//javascript 파일추가
	addJavascript: function (aSrc, aOnloadCallBack) {
		var user_script = document.createElement('script');
		user_script.setAttribute('src', aSrc);
		user_script.onload = function () {
			if (typeof aOnloadCallBack === 'function') {
				aOnloadCallBack();
			}
		}
		document.head.appendChild(user_script);
	},
	//드래그 설정
	dragElement: function (aElmnt, aMoveId) {
		var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
		if (document.getElementById(aMoveId)) {
			/* if present, the header is where you move the DIV from:*/
			document.getElementById(aMoveId).onmousedown = dragMouseDown;
		} else {
			/* otherwise, move the DIV from anywhere inside the DIV:*/
			aElmnt.onmousedown = dragMouseDown;
		}

		function dragMouseDown(e) {
			e = e || window.event;
			e.preventDefault();
			// get the mouse cursor position at startup:
			pos3 = e.clientX;
			pos4 = e.clientY;
			document.onmouseup = closeDragElement;
			// call a function whenever the cursor moves:
			document.onmousemove = elementDrag;
		}

		function elementDrag(e) {
			e = e || window.event;
			e.preventDefault();
			// calculate the new cursor position:
			pos1 = pos3 - e.clientX;
			pos2 = pos4 - e.clientY;
			pos3 = e.clientX;
			pos4 = e.clientY;
			// set the element's new position:
			aElmnt.style.top = (aElmnt.offsetTop - pos2) + "px";
			aElmnt.style.left = (aElmnt.offsetLeft - pos1) + "px";
		}

		function closeDragElement() {
			/* stop moving when mouse button is released:*/
			document.onmouseup = null;
			document.onmousemove = null;
		}
	},
	//yyyyMMdd 포맷으로 반환
	getFormatDate: function (date) {
		if (date == null) date = new Date();
		var year = date.getFullYear();              //yyyy
		var month = (1 + date.getMonth());          //M
		month = month >= 10 ? month : '0' + month;  //month 두자리로 저장
		var day = date.getDate();                   //d
		day = day >= 10 ? day : '0' + day;          //day 두자리로 저장
		return year + '' + month + '' + day;       //'-' 추가하여 yyyy-mm-dd 형태 생성 가능
	},
	getFormatFullDate: function (date) {
		if (date == null) date = new Date();
		var year = date.getFullYear();
		var month = (1 + date.getMonth());
		month = month >= 10 ? month : '0' + month;
		var day = date.getDate();
		day = day >= 10 ? day : '0' + day;
		var hour = date.getHours();
		hour = hour >= 10 ? hour : '0' + hour;
		var min = date.getMinutes();
		min = min >= 10 ? min : '0' + min;
		var sec = date.getSeconds();
		sec = sec >= 10 ? sec : '0' + sec;
		return year + '' + month + '' + day + '' + hour + '' + min + '' + sec;
	},
	fadeIn: function (aTarget) {
		var level = 0;
		commSign.changeOpacity(aTarget, level);
		var inTimer = setInterval(function () {
			level = commSign.fadeInAction(aTarget, level, inTimer);
		}, 50);
	},
	fadeInAction: function (aTarget, aLevel, aInTimer) {
		aLevel = aLevel + 0.1;
		commSign.changeOpacity(aTarget, aLevel);
		if (aLevel > 1) {
			clearInterval(aInTimer);
		}
		return aLevel;
	},
	fadeOut: function (aTarget, aCallBack) {
		var level = 1;
		commSign.changeOpacity(aTarget, level);
		var inTimer = setInterval(function () {
			level = commSign.fadeOutAction(aTarget, level, inTimer, aCallBack);
		}, 50);
	},
	fadeOutAction: function (aTarget, aLevel, aInTimer, aCallBack) {
		aLevel = aLevel - 0.1;
		commSign.changeOpacity(aTarget, aLevel);
		if (aLevel < 0) {
			clearInterval(aInTimer);
			if (typeof aCallBack === 'function') {
				aCallBack();
			}
		}
		return aLevel;
	},
	changeOpacity: function (aTarget, aLevel) {
		var obj = aTarget;
		obj.style.opacity = aLevel;
		obj.style.MozOpacity = aLevel;
		obj.style.KhtmlOpacity = aLevel;
		obj.style.MsFilter = '"progid: DXImageTransform.Microsoft.Alpha(Opacity=' + (aLevel * 100) + ')"';
		obj.style.filter = 'alpha(opacity=' + (aLevel * 100) + ');';
	},
	//라디오버트 값
	getRadioBoxValue: function (aName) {
		var radioBox = document.getElementsByName(aName);
		var radioVaue = '';
		for (var i = 0; i < radioBox.length; i++) {
			if (radioBox[i].checked) {
				radioVaue = radioBox[i].value;
			}
		}
		return radioVaue;
	},
	//빈값여부
	isEmpty: function (text) {
		if (text == ""
			|| text == null
			|| text == undefined
			|| (text != null && typeof text == "object" && !Object
				.keys(text).length)) {
			return true;
		}
		return false;
	},
	slideUp: function (element, aCallBack, duration) {
		if (commSign.isEmpty(duration)) {
			duration = 500;
		}
		element.style.height = element.offsetHeight + 'px';
		//element.style.transitionProperty = `height, margin, padding`;
		element.style.transitionDuration = duration + 'ms';
		element.offsetHeight;
		element.style.overflow = 'hidden';
		element.style.height = 0;
		element.style.paddingTop = 0;
		element.style.paddingBottom = 0;
		element.style.marginTop = 0;
		element.style.marginBottom = 0;
		window.setTimeout(function () {
			element.style.display = 'none';
			element.style.removeProperty('height');
			element.style.removeProperty('padding-top');
			element.style.removeProperty('padding-bottom');
			element.style.removeProperty('margin-top');
			element.style.removeProperty('margin-bottom');
			element.style.removeProperty('overflow');
			element.style.removeProperty('transition-duration');
			element.style.removeProperty('transition-property');
			if (typeof aCallBack === 'function') {
				aCallBack();
			}
		}, duration);
	},
	slideDown: function (element, aCallBack, duration) {
		if (commSign.isEmpty(duration)) {
			duration = 500;
		}
		element.style.removeProperty('display');
		var display = window.getComputedStyle(element).display;

		if (display === 'none')
			display = 'block';

		element.style.display = display;
		var height = element.offsetHeight;
		element.style.overflow = 'hidden';
		element.style.height = 0;
		element.style.paddingTop = 0;
		element.style.paddingBottom = 0;
		element.style.marginTop = 0;
		element.style.marginBottom = 0;
		element.offsetHeight;
		//element.style.transitionProperty = `height, margin, padding`;
		element.style.transitionDuration = duration + 'ms';
		element.style.height = height + 'px';
		element.style.removeProperty('padding-top');
		element.style.removeProperty('padding-bottom');
		element.style.removeProperty('margin-top');
		element.style.removeProperty('margin-bottom');
		window.setTimeout(function () {
			element.style.removeProperty('height');
			element.style.removeProperty('overflow');
			element.style.removeProperty('transition-duration');
			element.style.removeProperty('transition-property');
			if (typeof aCallBack === 'function') {
				aCallBack();
			}
		}, duration);
	},
	//쿠키 설정
	setCookie: function (name, value, expiredays) {
		var today = new Date();
		today.setDate(today.getDate() + expiredays);
		document.cookie = name + "=" + escape(value) + "; path=/; expires=" + today.toGMTString() + ";"
	},
	//쿠키확인
	getCookie: function (name) {
		var cook = document.cookie + ";";
		var idx = cook.indexOf(name, 0);
		var val = "";
		if (idx != -1) {
			cook = cook.substring(idx, cook.length);
			begin = cook.indexOf("=", 0) + 1;
			end = cook.indexOf(";", begin);
			val = unescape(cook.substring(begin, end));
		}
		return val;
	},
	//object 찾기  
	objectFindByKey: function (array, key, value) {
		for (var i = 0; i < array.length; i++) {
			if (array[i][key] === value) {
				return array[i];
			}
		}
		return null;
	},
	//언어 설정별 텍스트
	getLanguage: function (aSignType, aTextId) {
		if (aSignType == 'simplesign') {
			if (!commSign.isEmpty(simplesignLocale[aTextId]))
				return simplesignLocale[aTextId];
		}
		else if (aSignType == 'naversign') {
			if (!commSign.isEmpty(naversignLocale[aTextId]))
				return naversignLocale[aTextId];
		}
		else if (aSignType == 'yessign') {
			if (!commSign.isEmpty(yessignLocale[aTextId]))
				return yessignLocale[aTextId];
		}
		else if (aSignType == 'yessignCorp') {
			if (aTextId == "L00001" || aTextId == "L00002" || aTextId == "L00031") {
				var newNum = aTextId.substring(0, 3);
				var modNum = parseInt(aTextId.substring(3)) + 100;
				newNum = newNum + modNum;
			}
			if (!commSign.isEmpty(yessignLocale[newNum]))
				return yessignLocale[newNum];
		}
		else if (aSignType == 'yessignInt') {
			if (!commSign.isEmpty(yessignLocale[aTextId]))
				return yessignLocale[aTextId];
		}
		else if (aSignType == 'tosssign') {
			if (!commSign.isEmpty(tosssignLocale[aTextId]))
				return tosssignLocale[aTextId];
		}
		else if (aSignType == 'kakaopay') {
			if (!commSign.isEmpty(kakaopayLocale[aTextId]))
				return kakaopayLocale[aTextId];
		}
		else if (aSignType == 'passsign') {
			if (!commSign.isEmpty(passsignLocale[aTextId]))
				return passsignLocale[aTextId];
		}
		else if (aSignType == 'paycosign') {
			if (!commSign.isEmpty(paycosignLocale[aTextId]))
				return paycosignLocale[aTextId];
		}
		else if (aSignType == 'kakaotalk') {
			if (!commSign.isEmpty(kakaotalkLocale[aTextId]))
				return kakaotalkLocale[aTextId];
		}
		else if (aSignType == 'shinhansign') {
			if (!commSign.isEmpty(shinhansignLocale[aTextId]))
				return shinhansignLocale[aTextId];
		}
		/* HanaOneSign-sskim */
		else if (aSignType == 'hanaonesign') {
			if (!commSign.isEmpty(hanaonesignLocale[aTextId]))
				return hanaonesignLocale[aTextId];
		}
		return aTextId;
	},
	//tag삭제
	removeElement: function (aTarget) {
		if (aTarget != null) {
			var element = aTarget.parentNode;
			if (element) {
				element.removeChild(aTarget);
			}
		}
	},
	//모든 태그 클래스 삭제
	removeClassAll: function (aTarget, aClassName) {
		for (var i = 0; i < aTarget.length; i++) {
			aTarget[i].classList.remove(aClassName);
		}
	},
	//숫자입력여부
	checkNumber: function (event) {
		window.addEventListener("keyup", function (e) {
			if ([38, 40].indexOf(e.keyCode) > -1) {
				e.preventDefault();
			}
		}, false);
		event.currentTarget.value = event.currentTarget.value.replace(/[^0-9]/g, "");
		if (event.currentTarget.value.length > event.currentTarget.maxLength) {
			event.currentTarget.value = event.currentTarget.value.slice(0, event.currentTarget.maxLength);
		}
	},
	checkIdnToBirth: function (idn1, gender) {
		var genType = gender.value.substring(0, 1);
		var year = 0;
		var month = '';
		var birthday = '';

		switch (parseInt(genType)) {
			// 1900
			case 1:
			case 2:
			case 5:
			case 6:
				year = 1900 + parseInt(idn1.value.substring(0, 2));
				break;
			// 2000
			case 3:
			case 4:
			case 7:
			case 8:
				year = 2000 + parseInt(idn1.value.substring(0, 2));
				break;
			// 1800
			case 9:
			case 0:
				year = 1800 + parseInt(idn1.value.substring(0, 2));
				break;
			default:
		}
		month = idn1.value.substring(2, 6);
		birthday = year + month;

		return birthday;
	},
	//http post 요청
	ajaxPost: function (type, url, param, fnSuccess, fnFail) {
		var xhr = new XMLHttpRequest();
		var send_data, send_url, content_type;
		var form_data = [];

		if (AnySignProp.aUseRestApi == true) {
			send_url = AnySignProp.restApiInfo.host;
			switch (type) {
				case "identity":
					// TODO: 서비스 본인확인
					send_url += AnySignProp.restApiInfo.idenReq;
					break;
				case "result":
					// TODO: 서비스 본인확인 검증
					send_url += AnySignProp.restApiInfo.idenRes;
					break;
				case "sign":
					send_url += AnySignProp.restApiInfo.signReq;
					break;
				case "verify":
					send_url += AnySignProp.restApiInfo.signRes;
					break;
				case "decrypt":
					send_url += AnySignProp.restApiInfo.signDec;
					break;
				default:
					fnFail("Invalid type parameter");
			}
			send_data = JSON.stringify(param);
			content_type = 'application/json;charset=utf-8';
		} else {
			send_url = url;
			for (var key in param) {
				form_data.push(key + '=' + param[key]);
			}
			send_data = form_data.join('&');
			content_type = 'application/x-www-form-urlencoded;charset=utf-8';
		}

		xhr.onload = function () {
			if (this.status === 200) {
				if (typeof this.response === 'string') {
					fnSuccess(JSON.parse(this.response));
				} else {
					fnSuccess(this.response);
				}
			} else {
				if (typeof this.response === 'string') {
					fnFail(JSON.parse(this.response));
				} else {
					fnFail(this.response);
				}
			}
		};

		xhr.onerror = function () {
			fnFail("AnySign Server Error.");
		}

		xhr.open("POST", send_url, true);
		xhr.setRequestHeader('Content-type', content_type);
		xhr.send(send_data);
	},
	// 옵션값을 사용해 출력값을 Hex로 표현할 시 사용 by junseong
	// Convert Base64 to Hex
	base64ToHex: function (aTarget) {
		var raw = atob(aTarget);
		var result = '';

		try {
			for (var i = 0; i < raw.length; i++) {
				var hex = raw.charCodeAt(i).toString(16);
				result += (hex.length === 2 ? hex : '0' + hex);
			}
		} catch (e) {
			console.log("base64ToHex function error : " + e);
		}
		return result.toUpperCase();
	},
	hexToBase64: function (aTarget) {
		return btoa(String.fromCharCode.apply(null,
			aTarget.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
		);
	},
	base64UrlToBase64: function (value) {
		var resBase64;

		try {
			String.prototype.repeat = function (count) {
				var str = "";
				for (var i = 0; i < count; i++) {
					str += this;
				}
				return str;
			}

			if (typeof value === 'string') {
				resBase64 = value.replace(/-/gi, "+");
				resBase64 = resBase64.replace(/_/gi, "/");
				if (resBase64.length % 4 != 0) {
					resBase64 += "=".repeat(4 - resBase64.length % 4);
				}
			} else {
				resBase64 = new Array();
				value.forEach(function (v, i) {
					resBase64[i] = v.replace(/-/gi, "+");
					resBase64[i] = resBase64[i].replace(/_/gi, "/");

					if (resBase64[i].length % 4 != 0) {
						resBase64[i] += "=".repeat(4 - resBase64[i].length % 4);
					}
				})
			}
		} catch (e) {
			console.log("[FinCert] Base64UrlSafe ==(conv)==> Base64 : error " + e);
		}
		return resBase64;
	},
	hexToBytes: function (hex) {
		var rval = '';
		var i = 0;
		if (hex.length & 1 == 1) {
			// odd number of characters, convert first character alone
			i = 1;
			rval += String.fromCharCode(parseInt(hex[0], 16));
		}
		// convert 2 characters (1 byte) at a time
		for (; i < hex.length; i += 2) {
			rval += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
		}
		return rval;
	},
	encodeBase64: function (input, maxline) {
		var _base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		var line = "";
		var output = "";
		var chr1, chr2, chr3;
		var i = 0;
		while (i < input.length) {
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
			line += _base64.charAt(chr1 >> 2);
			line += _base64.charAt((chr1 & 3) << 4 | chr2 >> 4);
			if (isNaN(chr2)) {
				line += "==";
			} else {
				line += _base64.charAt((chr2 & 15) << 2 | chr3 >> 6);
				line += isNaN(chr3) ? "=" : _base64.charAt(chr3 & 63);
			}
			if (maxline && line.length > maxline) {
				output += line.substr(0, maxline) + "\r\n";
				line = line.substr(maxline);
			}
		}
		output += line;
		return output;
	},
	encodeBase64url: function (input) {
		var output = this.encodeBase64(input);
		return output.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=+$/, "");
	},
	// Platform Check
	isMobilePlatform: function () {
		if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
			|| /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
			return true;
		} else {
			return false;
		}
	},
	// mobile OS check
	isMobileOSCheck: function () {
		var info = navigator.userAgent.toLowerCase();

		if (info.indexOf('android') > -1) {
			return "android";
		} else if (info.indexOf("iphone") > -1 || info.indexOf("ipad") > -1 || info.indexOf("ipod") > -1) {
			return "ios";
		} else {
			return "other";
		}
	},
	// SimpleSign GetLastLocation
	GetLastLocation: function (aUserCallback) {
		if (typeof XCrypto == "undefined") {
			if (aUserCallback) aUserCallback(null);
			return;
		}

		if (!XCrypto.checkXCrypto || typeof XCrypto.checkXCrypto != "function") {
			if (aUserCallback) aUserCallback(null);
			return;
		}

		try {
			if (!Integrity.checkIntegrity("XCrypto", "getLastLocation"))
				return;
		} catch (e) { console.log("try catch checkIntegrity"); }
		XCrypto.getLastLocation(aUserCallback);
	},
	// SimpleSign SetLastLocation
	SetLastLocation: function (aMediaID) {
		if (typeof XCrypto == "undefined") {
			if (aUserCallback) aUserCallback(null);
			return;
		}

		if (!XCrypto.checkXCrypto || typeof XCrypto.checkXCrypto != "function") {
			if (aUserCallback) aUserCallback(null);
			return;
		}

		try {
			if (!Integrity.checkIntegrity("XCrypto", "setLastLocation"))
				return;
		} catch (e) { console.log("try catch checkIntegrity"); }
		XCrypto.setLastLocation(aMediaID);
	},
	CleanLastLocation: function () {
		if (typeof XCrypto == "undefined") {
			if (aUserCallback) aUserCallback(null);
			return;
		}

		if (!XCrypto.checkXCrypto || typeof XCrypto.checkXCrypto != "function") {
			if (aUserCallback) aUserCallback(null);
			return;
		}

		try {
			if (!Integrity.checkIntegrity("XCrypto", "setLastLocation"))
				return;
		} catch (e) { console.log("try catch checkIntegrity"); }
		XCrypto.setLastLocation(null);
	},
	generateRandom: function () {
		create = function () {
			return parseInt((window.crypto || window.msCrypto).getRandomValues(new Uint32Array(1))[0] % 999999);
		}

		var n = create();
		while (n.toString().length != 6) {
			n = create();
		}
		return n.toString();
	},
	// 전체 동의
	agreeCheckBox: function () {
		var b1 = document.getElementById('B1');
		var b2 = document.getElementById('B2');
		var b3 = document.getElementById('B3');

		if (b1.checked == false) b1.checked = true;
		if (b2.checked == false) b2.checked = true;

		b3.checked = true;
	},
	// string 문자열 스페이스 제거
	deleteSpace: function (str) {
		return str.replace(/\s/g, '');
	},
	getSearchHashValue: function (aFileHash, aDelimeter) {
		var aResult;
		var aHashAlg = "SHA2";

		var aHashValueArray;
		var aFileHashArray = aFileHash.split("$");

		for (var i = 0; i < aFileHashArray.length; i++) {
			aHashValueArray = aFileHashArray[i].split("|");
			if (aHashValueArray[0].trim().toUpperCase() == "SHA256") {
				break;
			}
		}

		// encoding
		var byteHashValue = commSign.hexToBytes(aHashValueArray[1]);
		aResult = commSign.encodeBase64url(byteHashValue);

		return aResult;
	},
	attachFileInfo: function (aSigned, aFileInfo, aDelimeter) {
		var aOutput = new Array();

		aFileInfo = aFileInfo.split(aDelimeter);

		for (var i = 0; i < aSigned.length; i++) {
			var tmpFileInfo = aFileInfo[i].split("|");
			var filename = tmpFileInfo[0];
			var filetime = tmpFileInfo[1];

			var ba = forge.util.hexToBytes(aSigned[i]);
			var getFileNameAsn1 = function (value) {
				var valueTagClass = forge.asn1.Type.UTF8;
				if (valueTagClass === forge.asn1.Type.UTF8) {
					value = forge.util.encodeUtf8(value);
					value = forge.util.decodeUtf8(value);
				}
				return forge.asn1.create(forge.asn1.Class.UNIVERSAL, valueTagClass, false, value);
			};

			var filename_ba = forge.asn1.toDer(getFileNameAsn1(filename)).getBytes();
			var getUTCTimeAsn1 = function (dateValue) {
				var date;
				// dateValue paramenter is accepted only ASN.1 UTCTime Format. 
				if (dateValue.lastIndexOf("Z") === dateValue.length - 1)
					date = dateValue;
				else
					date = dateValue + "Z";
				return forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTCTIME, false, forge.asn1.dateToUtcTime(date));
			};

			var filetime_ba = forge.asn1.toDer(getUTCTimeAsn1(filetime)).getBytes();
			aOutput[i] = forge.util.bytesToHex(ba + filename_ba + filetime_ba);
		}
		return aOutput;
	},
	detachFileInfo: function (aSigned, aDelimeter) {
		var aFileName, aFileDate;
		if (aSigned.charAt(0) == "3") {
			var ba = forge.util.hexToBytes(aSigned);
			var count = ba.charCodeAt(1) - 128;
			var byteSize = 0;
			if (count > 0)
				for (var i = 0; i < count; i++) {
					var tmp = ba.charCodeAt(count + 1 - i);
					byteSize += tmp << i * 8
				}
			else {
				count = 0;
				byteSize = ba.charCodeAt(1)
			}
			var pos = 2 + count + byteSize;
			var b7 = ba.slice(0, pos);
			if (byteSize < 0 || pos > ba.length) {
				error.setError(error.ERROR_CREATE_SIGNDATA);
				return null
			}
			if (ba.charCodeAt(pos) != 12) {
				error.setError(error.ERROR_CREATE_SIGNDATA);
				return null
			}
			count = ba.charCodeAt(pos + 1) - 128;
			if (count > 0) {
				byteSize = 0;
				for (i = 0; i < count; i++) {
					tmp = ba.charCodeAt(pos + count + 1 - i);
					byteSize += tmp << i * 8
				}
			} else {
				count = 0;
				byteSize = ba.charCodeAt(pos + 1)
			}
			pos = pos + 2 + count + byteSize;
			if (byteSize < 0 || pos > ba.length) {
				error.setError(error.ERROR_CREATE_SIGNDATA);
				return null
			}
			aFileName = ba.slice(pos - byteSize, pos);
			if (ba.charCodeAt(pos) != 23) {
				error.setError(error.ERROR_CREATE_SIGNDATA);
				return null
			}
			count = ba.charCodeAt(pos + 1) - 128;
			if (count > 0) {
				byteSize = 0;
				for (i = 0; i < count; i++) {
					tmp = ba.charCodeAt(pos + count + 1 - i);
					byteSize += tmp << i * 8
				}
			} else {
				count = 0;
				byteSize = ba.charCodeAt(pos + 1)
			}
			pos = pos + 2 + count + byteSize;
			if (byteSize < 0 || pos > ba.length) {
				error.setError(error.ERROR_CREATE_SIGNDATA);
				return null
			}
			aFileDate = ba.slice(pos - byteSize, pos);
			//asn = asn1.fromDer(b7);
		} else if (aSigned.charAt(0) == "M") {
			var ba = forge.util.decode64(aSigned);
			//asn = asn1.fromDer(ba)
		}

		return aFileName + "|" + aFileDate;
	}
};

