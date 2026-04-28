var g_oConvert = "fw";							// 정방향, 역방향 값
var isArk = true;								// 자동완성 기능 사용 여부
var isKeydown = false;							// 브라우저가 파이어폭스, 오페라일 경우 keydown 사용 여부
var isListShow = true;
var cursorPos = -1;								// 자동완성 커서 위치 값
var formName = "#search";						// 검색 form의 name을 설정한다.
var queryId = "#query";							// 검색어 <input> 의 id을 설정한다
var arkId = "#ark";								// 자동완성 전체 <div> 의 id을 설정한다
var wrapId = "auto_drop";						// 자동완성 결과 <div> 의 id을 설정한다
var footerId = "ark_footer";					// 자동완성 Footer <div> 의 id을 설정한다
var contentListId = "ark_content_list";			// 자동완성 Content List <li> 의 id을 설정한다
var imgDownId = "ark_img_down";					// 자동완성 down 이미지 id을 설정한다
var imgUpId = "ark_img_up";						// 자동완성 up 이미지 id을 설정한다
var arkUpId = "ark_up";							// 자동완성 up 이미지 <div> 의 id을 설정한다
var arkDownId = "ark_down";						// 자동완성 down 이미지 <div> 의 id을 설정한다
var totalFwCount = 0;							// 전방 검색 전체 개수
var totalRwCount = 0;							// 후방 검색 전체 개수
var target = "npbs";								// ARK 웹서버 설정파일의 목록에 있는 추천어 서비스 대상을 지정한다.
var charset = "utf-8";							// 인코딩 설정 (인코딩이 utf-8이 아닐 경우 8859_1 로 설정해야함)
var datatype = "json";							// 반환받을 Data의 타입을 설정. XML 과 JSON이 가능 (xml | json)
var arkPath = "./ark";						// 자동완성 경로
var transURL = "npea110s02";		// trans 페이지의 URL을 설정한다.
var tempQuery = "";

/**
 *  ARK 구성요소의 위치 및 크기를 아래 변수를 통해 조정함.
 */
var browser = "";
if (navigator.userAgent.match('MSIE') == 'MSIE') {
	browser = "IE";
} else if (navigator.userAgent.match('Firefox') == 'Firefox') {
	browser = "FF";
} else if (navigator.userAgent.match('Opera') == 'Opera' ) {
	browser = "OPERA";
} else if (navigator.userAgent.match('Chrome') == 'Chrome') {
	browser = "CHROME";
}

var browserVersion = navigator.appVersion;		// 웹브라우져의 버전

var offset = null;
var offsetTop = 0;
var offsetLeft = 0;

/** ARK 구성요소의 위치 및 크기를 아래 변수를 통해 조정함. **/
var IE6_TOP_OFFSET = -36;				// IE6 일 경우 TOP 옵셋 값 오차 조정
var IE6_LEFT_OFFSET = 20;				// IE6 일 경우 LEFT 옵셋 값 오차 조정
var IE7_TOP_OFFSET = -63;				// IE7 일 경우 TOP 옵셋 값 오차 조정
var IE7_LEFT_OFFSET = -18;				// IE7 일 경우 LEFT 옵셋 값 오차 조정
var IE8_TOP_OFFSET = 0;					// IE8 일 경우 TOP 옵셋 값 오차 조정
var IE8_LEFT_OFFSET = 0;				// IE8 일 경우 LEFT 옵셋 값 오차 조정
var FF_TOP_OFFSET = 0;
var FF_LEFT_OFFSET = 0;
var CHROME_TOP_OFFSET = 0;
var CHROME_LEFT_OFFSET = 0;
var OPERA_TOP_OFFSET = 0;
var OPERA_LEFT_OFFSET = 0;

/** ARK 구성요소의 위치 및 크기를 아래 변수를 통해 조정함. **/
var arkWidth = 37;								// 자동완성 전체 넓이 값을 설정한다(변동폭).
var arkTop = 29;								// 자동완성 상단에서의 위치 값을 설정한다.
var arkLeft = -3;								// 자동완성 왼쪽에서의 위치 값을 설정한다.
var arkImgTop = 26;								// 자동완성 화살표 이미지의 상단에서 위치 값을 설정한다.
var arkImgLeft = 26;							// 자동완성 화살표 이미지의 왼쪽에서 위치 값을 설정한다.
var tooltip01TopPos = 0;						// 자동완성 기능끄기 툴팁의 상단 기준 위치 오차 조정값
var tooltip01LeftPos = -155;					// 자동완성 기능끄기 툴팁의 좌측 기준 위치 오차 조정값
var tooltip02TopPos = 0;						// 자동완성 기능켜기 툴팁의 상단 기준 위치 오차 조정값
var tooltip02LeftPos = 0;						// 자동완성 기능켜기 툴팁의 좌측 기준 위치 오차 조정값

//var keyFix = new beta.fix('query');

$(document).ready(function() {
	// 자동완성 기능 사용 여부 확인 한다.
	if(getCookie("ark")=="off") {
		isArk = false;
		$(queryId).attr("autocomplete","on");
	} else {
		$(queryId).attr("autocomplete","off");
	}

	// 자동완성 <div> 생성
	drawArk();

	if (browser == "OPERA" || browser == "FF") {
		//alert("oepra:" + $.browser.opera + " / mozilla:" + $.browser.mozilla);
		$(document).keydown(function(event) {
			var query = $(queryId).val();
			
			if (event.which == 38 || event.which == 40) {
				if (query != "") {
					showArk();
				}
				moveFocusEvent(event);
			} else {
				if ($(event.target).is(queryId)) {
					isKeydown = true;
					eventKeydown();
				}
			}
		});
	} else if (browser == "IE" || browser == "CHROME") {
		//alert("msie:" + $.browser.msie + " / webkit:" + $.browser.webkit);
		$(document).keyup(function(event) {
			var query = $(queryId).val();
			
			if (event.keyCode == 38 || event.keyCode == 40) {
				// 아래(40), 위(38) 방향키 조작시의 이벤트 처리
				if (query != "") {
					showArk();
				}
				moveFocusEvent(event);
			} else if (event.keyCode == 16) {
			} else if (event.keyCode == 8 && query == "") {
				$("#" + contentListId).html("");
				hideArk();
			} else {
				if ($(event.target).is(queryId)) {
					if (isArk && $(queryId).val() != "") {
						if(datatype == "json") {
							requestArkJson($(queryId).val());
						} else if(datatype == "xml") {
							requestArkXml($(queryId).val());
						}
					} else if ($(queryId).val() == "") {
						hideArk();
					}
				}
			}
		});
	}

	// Backspace 에 대한 처리
	$(queryId).keyup(function(event) {
		if(event.keyCode == 8 && $(this).val() == "") {
			$("#" + contentListId).html("");
			hideArk();
		}
	});

	// 브라우저에서 일어나는 클릭 이벤트를 체크한다.
	$(document).click(function(event) {
		stopEventBubble(event);
		if ($(event.target).is("#" + imgDownId)) {
			isListShow = false;
			showArk();
		} else if ($(event.target).is("#" + imgUpId)) {
			hideArk();
		} else if ($(event.target).is(queryId)) {
			if (isArk) {
				var query = $(queryId).val();
				if (query != "") {
					if(datatype == "json") {
						requestArkJson($(queryId).val());
					} else if(datatype == "xml") {
						requestArkXml($(queryId).val());
					}
					keyword = query;
				}
				isKeydown = true;
			}
		} else if (!$(event.target).is("#" + wrapId)) {
			hideArk();
		}
	});
});

/************************************************
 * jQuery Event Bubbling 방지를 위한 함수.
 * @name stopEventBubble
 * @param evt 페이지 이벤트
 ************************************************/
function stopEventBubble(evt) {
	var eventReference = (typeof evt !== "undefined") ? evt : event;
	//alert(eventReference.stopPropagation);

	if(eventReference.stopPropagation) {
		eventReference.stopPropagation();
	} else {
		eventReference.cancelBubble = true;
	}
}

/************************************************
 * 자동완성 키워드 목록 출력을 위한 DIV 생성
 * @name drawArk
 ************************************************/
function drawArk() {
	var str = "";
	// 자동완성 결과 생성
	str +="<div id=\""+wrapId + "\">";
	str += "	<ul id=\"" + contentListId + "\"></ul>";
	str += "</div>";

	$(arkId).html(str);
}

/************************************************
 * 자동완성 결과 요청
 * @name requestArk
 * @param query 키보드 입력된 문자열
 ************************************************/
function requestArkJson(query) {
	jQuery.support.cors = true;

	cursorPos = -1;

	$.ajaxSetup({cache:false});
	$.ajax({
		url: transURL,
		type: "POST",
		dataType: "json",
		data: {"convert":g_oConvert, "target":target, "charset":charset, "query":query, "datatype": datatype},
		success: function(data) {
			if(data.result.length <= 0) {
				totalFwCount = 0;
				totalRwCount = 0;
			}

			var str = "";

			$.each(data.result, function(i, result) {
				var totalCount = parseInt(result.totalcount);
				if (i == 0) {
					totalFwCount = totalCount;
				} else {
					totalRwCount = totalCount;
				}

				if (totalCount > 0) {
					
					$("#" + wrapId).addClass(wrapId);
					
					// 정방향, 역방향 구분선
					if (i > 0 && totalFwCount > 0 && totalRwCount > 0) {
						str += "<li style=\"border-top:1px solid #f3f3f3;\"></li>";
					}

					// 자동완성 리스트 설정
					$.each(result.items, function(num,item){
						if (i != 0) {
							num = totalFwCount + num;
						}

						str += "<li id=\"bg" + num + "\" onclick=\"onClickKeyword(" + num + ");\" onmouseover=\"onMouseOverKeyword(" + num + ");\"";
						str += " onmouseout=\"onMouseOutKeyword(" + num + ");\">" +  "&nbsp;&nbsp;" + item.hkeyword;
						str += " <span id=\"f" + num + "\" style=display:none;>" + item.keyword + "</span></li>";
					});
				}
			});

			if ((totalFwCount + totalRwCount) == 0) {
				$("#" + wrapId).addClass(wrapId);
				$("#" + contentListId).html("<li>&nbsp;&nbsp; 해당 단어로 시작하는 검색어가 없습니다.</li>");
			} else {
				$("#" + contentListId).html(str);
			}

			showArk();
		}
    });
}

function requestArkXml(query) {
	jQuery.support.cors = true;

	cursorPos = -1;
	totalFwCount = 0;
	totalRwCount = 0;

	$.ajaxSetup({cache:false});
	$.ajax({
		url: transURL,
		type: "POST",
		dataType: "xml",
		data: {"convert":g_oConvert, "target":target, "charset":charset, "query":query, "datatype": datatype},
		success: function(data, xhr) {
			var str = "";

			var $resultElement = $(data).find("Response").find("Value");
			var returnCode = $resultElement.find("Return").text();

			if (returnCode == 0) {
				if ($resultElement.find("ARKList").size() <= 0) {
					totalFwCount = 0;
				} else {
					var totalCount = $resultElement.find("ARKList").find("TotalCount").text();
					totalFwCount = totalCount;
				}

				if ($resultElement.find("ARKRList").size() <= 0) {
					totalRwCount = 0;
				} else {
					var totalCount = $resultElement.find("ARKRList").find("TotalCount").text();
					totalRwCount = totalCount;
				}

				// ARKList
				$resultElement.find("ARKList").each(function(idx) {
					$(this).find("ARK").each(function(idx) {
						var $ark = $(this);
						var hkeyword = $ark.attr("HKeyword");
						var keyword = $ark.attr("keyword");
						var count = $ark.attr("count");
						var type = $ark.attr("type");

						str += "<li id=\"bg"+ idx +"\" onclick=\"onClickKeyword(" + idx + ");\" onmouseover=\"onMouseOverKeyword(" + idx + ");\"";
						str += " onmouseout=\"onMouseOutKeyword(" + idx + ");\">"+  "&nbsp;&nbsp;" + item.hkeyword;
						str += " <span id=\"f" + idx +"\" style=display:none;>" + keyword + "</span></li>";
					});
				});

				if(totalFwCount > 0 && totalRwCount > 0) {
					str += "<li style=\"border-top:1px solid #f3f3f3; padding:0;\"></li>";
				}

				// ARKRList
				$resultElement.find("ARKRList").each(function(idx) {
					$(this).find("ARK").each(function(i) {
						var nums = i + parseInt(totalFwCount);
						var $ark = $(this);
						var hkeyword = $ark.attr("HKeyword");
						var keyword = $ark.attr("keyword");
						var count = $ark.attr("count");
						var type = $ark.attr("type");

						str += "<li id=\"bg"+ nums +"\" onclick=\"onClickKeyword(" + nums + ");\" onmouseover=\"onMouseOverKeyword(" + nums + ");\"";
						str += " onmouseout=\"onMouseOutKeyword(" + nums + ");\">"+  "&nbsp;&nbsp;" + item.hkeyword;
						str += " <span id=\"f" + nums +"\" style=display:none;>" + keyword + "</span></li>";
					});
				});

				if ((totalFwCount + totalRwCount) == 0) {
					$("#" + contentListId).html("<li style=\"padding:6px 0 6px 10px;\">해당 단어로 시작하는 검색어가 없습니다.</li>");
				} else {
					$("#" + contentListId).html(str);
				}

				showArk();
			}
		}
	});
}


var keyword = "";

/************************************************
 * 브라우저가 FireFox, Opera 일 경우 한글 입력
 * @name eventKeydown
 ************************************************/
function eventKeydown() {
	// 방향키 이동시 메소드 실행을 중지시킨다.
	if(!isKeydown) {
		return;
	}

	if (keyword != $(queryId).val()) {
		keyword = $(queryId).val();
		if (keyword != "" && isArk) {
			if(datatype == "json") {
				requestArkJson($(queryId).val());
			} else if(datatype == "xml") {
				requestArkXml($(queryId).val());
			}
		} else {
			hideArk();
		}
	}
	setTimeout("eventKeydown()", 20);
}


/************************************************
 * 방향키 이벤트 처리
 * @name moveFocusEvent
 * @param event 페이지 이벤트
 ************************************************/
function moveFocusEvent(event) {
	isKeydown = false;

	if (event.keyCode == 38) {
		if (cursorPos==-1 || cursorPos==0) {
			cursorPos = -1;
			hideArk();
			$(queryId).val(tempQuery);
			tempQuery = "";
		} else {
			onMouseOutKeyword(cursorPos);
			cursorPos = cursorPos - 1;
			onMouseOverKeyword(cursorPos);
			$(queryId).val($("#f" + cursorPos).text());
		}
	} else if (event.keyCode == 40) {
		if(cursorPos == -1) {
			tempQuery = $(queryId).val();
		}
		if ((totalFwCount + totalRwCount) > (cursorPos + 1)) {
			onMouseOutKeyword(cursorPos);
			cursorPos = cursorPos + 1;
			onMouseOverKeyword(cursorPos);
			$(queryId).val($("#f" + cursorPos).text());
		}
	}
}

/************************************************
 * MouseOver 일 경우 선택한 배경을 설정
 * @name onMouseOverKeyword
 * @param cursorNum 커서의 위치 인덱스 값
 ************************************************/
function onMouseOverKeyword(cursorNum) {
	clearCursorPos();
	cursorPos = cursorNum;
	$("#bg" + cursorNum).css({"backgroundColor" : "#eeeeee"});
	$("#bg" + cursorNum).css({"cursor" : "pointer"});
}

/************************************************
 * MouseOut 일 경우 설정한 배경을 초기화
 * @name onMouseOutKeyword
 * @param cursorNum 커서의 위치 인덱스 값
 ************************************************/
function onMouseOutKeyword(curSorNum) {
	cursorPos = curSorNum;
	$("#bg" + cursorPos).css({"backgroundColor" : "#ffffff"});
}

/************************************************
 * 커서 위치가 변경될 때마다 선택되지 않은 부분 초기화
 * @name clearCursorPos
 ************************************************/
function clearCursorPos() {
	for(var i=0; i<(totalFwCount + totalRwCount); i++){
		$("#bg" + i).css({"backgroundColor" : "#ffffff"});
	}
}

/************************************************
 * 마우스 클릭시 검색을 수행
 * @name onClickKeyword
 * @param cursorPos 커서의 위치
 ************************************************/
function onClickKeyword(cursorPos) {
    $(queryId).val($("#f" + cursorPos).text());
    $(formName).submit();
}



/************************************************
 * 자동완성 목록을 화면에 보여줌
 * @name showArk
 ************************************************/
function showArk() {
  if(  $(queryId).val() != ""){
	    $("#" + wrapId).show();

	}
}

/************************************************
 * 자동완성 목록을 화면에서 감춤
 * @name hideArk
 ************************************************/
function hideArk() {
	$("#" + wrapId).hide();
}

/************************************************
 * 도움말 팝업
 * @name openHelp
 ************************************************/
function openHelp() {
	window.open(arkPath + "/help/help_01.html", "도움말", "height=540,width=768,toolbar=no,menubar=no,scrollbars=yes,resizable=no,location=no,directories=no,status=no");
}

/************************************************
 * 단어 입력 후 정방향/역방향 이미지 버튼 클릭시 이벤트 처리
 * @name onConvert
 * @param convert
 ************************************************/
function onConvert(convert) {
	var query = $(queryId).val();

	if (convert == "fw") {
		g_oConvert = "fw";
	} else {
		g_oConvert = "rw";
	}

	if (datatype == "json") {
		requestArkJson(query);
	} else if (datatype == "xml") {
		requestArkXml(query);
	}

	return;
}


/************************************************
 * 자동완성 기능 끄기
 * @name setArkOff
 ************************************************/
function setArkOff() {
	$(queryId).attr("autocomplete", "on");
	isArk = false;

	var today = new Date();
	var expire_date = new Date(today.getTime() + 365*60*60*24*1000);
	setCookie("ark", "off", expire_date);
}

/************************************************
 * 자동완성 기능 켜기
 * @name setARkOn
 ************************************************/
function setArkOn() {
	$(queryId).attr("autocomplete", "on");
	isArk = true;

	var today = new Date();
	var expireDate = new Date(today.getTime() - 60*60*24*1000);
	setCookie("ark", "on", expireDate);

	var query = $(queryId).val();
	if (query != "") {
		if(datatype == "json") {
			requestArkJson(query);
		} else if(datatype == "xml") {
			requestArkXml(query);
		}
	}
}

/************************************************
 * 쿠키 설정값을 저장
 * @name setCookie
 * @param name 쿠키 항목명
 * @param value 쿠키 항목의 값
 * @param expire 쿠키 만료일자
 ************************************************/
function setCookie(name, value, expire) {
	var expire_date = new Date(expire);
	document.cookie = name + "=" + escape(value) + "; path=/; expires=" + expire_date.toGMTString();
}

/************************************************
 * 쿠키 설정값을 로드
 * @name getCookie
 * @param name 쿠키 항목명
 ************************************************/
function getCookie(name) {
	var dc = document.cookie;
	var prefix = name + "=";
	var begin = dc.indexOf("; " + prefix);
	if (begin == -1) {
		begin = dc.indexOf(prefix);
		if (begin != 0) {
			return null;
		}
	} else {
		begin += 2;
	}

	var end = document.cookie.indexOf(";", begin);

	if (end == -1) {
		end = dc.length;
	}

	return unescape(dc.substring(begin + prefix.length, end));
}

/************************************************
 * 폰트 컬러 설정
 * @name showSource
 * @param count 등급 레벨
 ************************************************/
function showSource(count) {
	var color;
	var ret;

	if (count >= 0 && count <= 4) {
		color = "#989898";
	} else {
		color = "#CC6633";
	}

	if (count == 0 || count == 5) {
		ret = "<font style='font-size:11px;font-family:돋움;color:"+color+"'>사전</font>";
	} else if(count == 1 || count == 6) {
		ret = "<font style='font-size:11px;font-family:돋움;color:"+color+"'>일반</font>"; //색인
	} else if(count == 2 || count == 7) {
		ret = "<font style='font-size:11px;font-family:돋움;color:"+color+"'>인기</font>";
	} else if(count == 3 || count == 8) {
		ret = "<font style='font-size:11px;font-family:돋움;color:"+color+"'>테마</font>";
	} else if(count == 4 || count == 9) {
		ret = "<font style='font-size:11px;font-family:돋움;color:"+color+"'>추천</font>";
	} else {
		ret = "";
	}

	return ret;
}

var preview = "";
var gobj = "";

function attachEvent_(obj, evt, fuc, useCapture) {
	if (!useCapture) {
		useCapture = false;
	}

	if (obj.addEventListener) {
		// W3C DOM 지원 브라우저
		return obj.addEventListener(evt,fuc,useCapture);
	} else if (obj.attachEvent) {
		// MSDOM 지원 브라우저
		return obj.attachEvent("on"+evt, fuc);
	} else {
		// NN4 나 IE5mac 등 비 호환 브라우저
		MyAttachEvent(obj, evt, fuc);
		obj['on'+evt]=function() { MyFireEvent(obj,evt) };
	}
}

function detachEvent_(obj, evt, fuc, useCapture) {
  if(!useCapture) useCapture=false;
  if(obj.removeEventListener) {
    return obj.removeEventListener(evt,fuc,useCapture);
  } else if(obj.detachEvent) {
    return obj.detachEvent("on"+evt, fuc);
  } else {
    MyDetachEvent(obj, evt, fuc);
    obj['on'+evt]=function() { MyFireEvent(obj,evt) };
  }
}

function MyAttachEvent(obj, evt, fuc) {
  if(!obj.myEvents) obj.myEvents= {};
  if(!obj.myEvents[evt]) obj.myEvents[evt]=[];
  var evts = obj.myEvents[evt];
  evts[evts.length]=fuc;
}

function MyFireEvent(obj, evt) {
  if(!obj.myEvents || !obj.myEvents[evt]) return;
  var evts = obj.myEvents[evt];
  for (var i=0;i<len;i++) {
    len=evts.length;
    evts[i]();
  }
}

function previewShow(e, obj, pv) {
  preview=pv;
  gobj=obj;
  attachEvent_(obj, "mousemove", previewMove, false);
  attachEvent_(obj, "mouseout", previewHide, false);
}

function previewMove(e) {
  var hb = document.getElementById(preview);
  if(hb.parentElement) {
	  hb.parentElement.style.display="block";
  } else {
	  hb.parentNode.style.display="";
  }
  var evt = e ? e : window.event;
  var posx=0;
  var posy=0;

  if (evt.pageX || evt.pageY) { // pageX/Y 표준 검사
    posx = evt.pageX +8;
    posy = evt.pageY +16;
  } else if (evt.clientX || evt.clientY) { //clientX/Y 표준 검사 Opera
    posx = evt.clientX +10;
    posy = evt.clientY +20;
    if (window.event) { // IE 여부 검사
      posx += document.body.scrollLeft - 80;
      posy += document.body.scrollTop;
     }
  }

  hb.style.left = posx + "px";
  hb.style.top = posy + "px";
}

function previewHide() {
  var hb = document.getElementById(preview);
  if(hb.parentElement) hb.parentElement.style.display="none";
  else hb.parentNode.style.display="none";

  detachEvent_(gobj,"mousemove", previewMove, false);
}
