/**
 * 톡톡 배너스크립트 설정값
 */
var TALK_PARTNER_CENTER_STATIC_URL; // 톡톡 파트너센터 STATIC(CDN) URL
var TALK_PARTNER_CENTER_URL; // 톡톡 파트너센터 URL
var TALK_CHAT_URL; // 톡톡 채팅 URL
var TALK_ENV; // 톡톡 환경정보

/**
 * 톡톡배너 설정
 * - 파트너센터 및 채팅 URL 초기화 외
 */
function initTalkBannerConfig() {
	// 스크립트 요청 URL 확인
	var srcUrl = getScriptSrcUrl();
	//console.log("srcUrl: " + srcUrl);
	// 요청 URL 파라미터 확인
	var env = "real";
	var queryString = srcUrl.substring(srcUrl.indexOf("?") + 1, srcUrl.length);
	var params = queryString.split("&");
	for(var i = 0; i < params.length; i++) {
		var name  = params[i].substring(0,params[i].indexOf("="));
		var value = params[i].substring(params[i].indexOf("=") + 1, params[i].length);
		if(isNaN(parseInt(value))) {
			params[i] = params[i].replace(value, "'" + value + "'");
		}
		eval(params[i]);
	}
	TALK_ENV = env;
	//console.log("TALK_ENV: " + TALK_ENV);
	// 파트너센터 및 채팅 URL 초기화
	TALK_PARTNER_CENTER_STATIC_URL = srcUrl.substring(0, srcUrl.indexOf("/js/banner/talk_banner.js"));
	//console.log("TALK_PARTNER_CENTER_STATIC_URL: " + TALK_PARTNER_CENTER_STATIC_URL);
	if(TALK_ENV == "real") {
		TALK_PARTNER_CENTER_URL = "https://partner.talk.naver.com";
		TALK_CHAT_URL = "http://talk.naver.com";
	} else if(TALK_ENV == "beta") {
		TALK_PARTNER_CENTER_URL = "https://beta-partner.talk.naver.com";
		TALK_CHAT_URL = "http://beta.talk.naver.com";
	} else if(TALK_ENV == "dev") {
		TALK_PARTNER_CENTER_URL = "https://dev-partner.talk.naver.com";
		TALK_CHAT_URL = "http://dev.talk.naver.com";
	} else if(TALK_ENV == "dev2") {
		TALK_PARTNER_CENTER_URL = "https://dev2-partner.talk.naver.com";
		TALK_CHAT_URL = "http://dev2.talk.naver.com";
	} else if(TALK_ENV == "local") {
		TALK_PARTNER_CENTER_URL = "https://local-partner.talk.naver.com";
		TALK_CHAT_URL = "http://dev.talk.naver.com";
	}
	//console.log("TALK_PARTNER_CENTER_URL: " + TALK_PARTNER_CENTER_URL);
	//console.log("TALK_CHAT_URL: " + TALK_CHAT_URL);
}

/**
 * 톡톡 스크립트 src URL 반환
 */
function getScriptSrcUrl() {
	var srcUrl = "";
	if(document.getElementById("talk_banner")) {
		srcUrl = document.getElementById("talk_banner").getAttribute("src");
	} else {
		var scriptNode = document.getElementsByTagName("script");
		for(var i = 0; i < scriptNode.length; i++) {
			var src = scriptNode[i].getAttribute("src");
			if(src && src.indexOf("talk_banner.js") != -1) {
				srcUrl = src;
				break;
			}
		}	
	}
	return srcUrl;
}

/**
 * 톡톡배너정보 JSONP 요청
 */
function requestTalkBannerInfo() {
	var talk_banner_divs = getElementsByClassNameCompatible("talk_banner_div");
	for(var i = 0; i < talk_banner_divs.length; i++) {
		var bannerNo = talk_banner_divs[i].getAttribute("data-id");
		var refUrl = talk_banner_divs[i].getAttribute("data-ref"); // snippetUrl
	    var scriptNode = document.createElement("script");
	    scriptNode.type = "text/javascript";
	    scriptNode.src = TALK_PARTNER_CENTER_URL + "/banners/" + bannerNo + "?callback=talkBannerCallback";
	    if(refUrl) {
	    	scriptNode.src += "&ref=" + refUrl;
	    }
	    document.getElementsByTagName('body')[0].appendChild(scriptNode);
	}
}

/**
 * 톡톡배너정보 JSONP 콜백
 */
function talkBannerCallback(response, refUrl) {
	if(response.success) {
		// 배너단말타입에 따른 CSS파일 로드
		loadTalkBannerCss(response.data);
		// 톡톡배너 생성
		generateTalkBanner(response.data);
	}
}

/**
 * 톡톡배너 CSS파일 로드
 * - 배너단말타입에 해당하는 CSS 로드
 */
function loadTalkBannerCss(bannerInfo) {
	var headNode = document.getElementsByTagName("head")[0];
	var linkNode = document.createElement("link");
	linkNode.type = "text/css";
	linkNode.rel = "stylesheet";
	if(bannerInfo.bannerDeviceType == "PC") {
		linkNode.href = TALK_PARTNER_CENTER_STATIC_URL + "/css/talk_banner.css";
	} else if(bannerInfo.bannerDeviceType == "MOBILE") {
		linkNode.href = TALK_PARTNER_CENTER_STATIC_URL + "/css/m/talk_banner.css";
	}
	headNode.appendChild(linkNode);
}

/**
 * 톡톡배너 마크업 스크립트 생성
 */
function generateTalkBanner(bannerInfo) {
	// 기본형
	if(bannerInfo.bannerType == "BASIC") {
		if(bannerInfo.bannerDeviceType == "PC") {
			// 기본형 PC 타입
			createTalkBannerBasicType(bannerInfo);
		} else if(bannerInfo.bannerDeviceType == "MOBILE") {
			// 모바일 이슈처리 스크립트 로드
			loadTalkBannerMobileScript();
			// 기본형 Mobile 타입
			createTalkBannerBasicType(bannerInfo);
		}
	// 명함형	
	} else if(bannerInfo.bannerType == "BUSINESSCARD") {
		if(bannerInfo.bannerDeviceType == "PC") {
			// 명함형 PC 타입
			createTalkBannerBusinesscardType(bannerInfo);
		} else if(bannerInfo.bannerDeviceType == "MOBILE") {
			// 모바일 이슈처리 스크립트 로드
			loadTalkBannerMobileScript();
			// 명함형 Mobile 타입
			createTalkBannerBusinesscardType(bannerInfo);
		}
	// 블로그	
	} else if(bannerInfo.bannerType == "BLOG") {
		if(bannerInfo.bannerDeviceType == "PC") {
			// 블로그 PC 타입
			createTalkBannerBlogType(bannerInfo);
		} else if(bannerInfo.bannerDeviceType == "MOBILE") {
			// 블로그 Mobile 타입은 지원하지 않음
		}
	}
}

/**
 * 모바일전용 스크립트 로드
 * - 배너타입이 Mobile 일때, 모바일 스크립트를 head 에 추가한다.
 */
function loadTalkBannerMobileScript() {
	var headNode = document.getElementsByTagName("head")[0];
	var scriptNode = document.createElement("script");
	// 기기별 분기처리로 인한 script: 이 부분은 body 이전에 선언되어야 함
	scriptNode.innerText = "document.documentElement.setAttribute('data-useragent', navigator.userAgent);";
	headNode.appendChild(scriptNode);
}

/**
 * [기본형]타입 배너 생성
 */
function createTalkBannerBasicType(bannerInfo) {
	// 배너정보 확인
	var bannerNo = bannerInfo.id;
	/*var bannerType = bannerInfo.bannerType;
	var bannerDeviceType = bannerInfo.bannerDeviceType;
	var bannerName = bannerInfo.bannerName;*/
	var colorType = bannerInfo.colorType;
	var width = bannerInfo.width;
	var height = bannerInfo.height;
	var mainText = bannerInfo.mainText ? bannerInfo.mainText : "";
	var responseImpossibleMainText = bannerInfo.responseImpossibleMainText ? bannerInfo.responseImpossibleMainText : "";
	var bannerStatus = bannerInfo.bannerStatus;
	var accountId = bannerInfo.accountId;
	// 배너상태
	var talk_preview_area_div = document.createElement("div");
	var talk_preview_area_div_class = "talk_preview_area";
	if(bannerStatus != "NORMAL") talk_preview_area_div_class += " off";
	talk_preview_area_div.setAttribute("class", talk_preview_area_div_class);
	// 배너링크
	var talk_banner_link_a = document.createElement("a");
	talk_banner_link_a.setAttribute("href", "#");
	if(bannerStatus == "NORMAL") {
		var refUrl = bannerInfo.refUrl ? encodeURIComponent(bannerInfo.refUrl) : encodeURIComponent(location.href);
		talk_banner_link_a.setAttribute("onclick", "javascript:window.open('" + TALK_CHAT_URL + "/" + accountId + "?ref=" + refUrl + "', 'talktalk', 'scrollbars=1, resizable=1, width=486, height=745');return false;");
	}
	talk_banner_link_a.setAttribute("class", "talk_banner_link");
	// 배너컬러타입
	var talk_banner_preview_div = document.createElement("div");
	var talk_banner_preview_div_class = "talk_banner_preview";
	if(colorType == "WHITE") talk_banner_preview_div_class += " talk_expose_white";
	if(colorType == "GREY") talk_banner_preview_div_class += " talk_expose_grey";
	if(colorType == "GREEN") talk_banner_preview_div_class += " talk_expose_green";
	if(colorType == "BLACK") talk_banner_preview_div_class += " talk_expose_black";
	talk_banner_preview_div.setAttribute("class", talk_banner_preview_div_class);
	// 배너 사이즈
	var talk_banner_preview_div_style = "width:" + width + "px;height:" + height + "px;";
	talk_banner_preview_div.setAttribute("style", talk_banner_preview_div_style);
	var ico_talk_banner_span = document.createElement("span");
	ico_talk_banner_span.setAttribute("class", "ico_talk_banner");
	ico_talk_banner_span.innerHTML = "톡톡";
	// 배너문구
	var talk_banner_desc_em = document.createElement("em");
	var talk_banner_desc_em_class = "talk_banner_desc";
	if(bannerStatus == "NORMAL") {
		if(mainText) {
			talk_banner_desc_em.innerHTML = mainText;
			talk_banner_preview_div_class += " on";
			talk_banner_preview_div.setAttribute("class", talk_banner_preview_div_class);
		} else {
			talk_banner_desc_em_class += " talk_hide";
		}
	} else {
		if(responseImpossibleMainText) {
			talk_banner_desc_em.innerHTML = responseImpossibleMainText;
			talk_banner_preview_div_class += " on";
			talk_banner_preview_div.setAttribute("class", talk_banner_preview_div_class);
		} else {
			talk_banner_desc_em_class += " talk_hide";
		}
	}
	talk_banner_desc_em.setAttribute("class", talk_banner_desc_em_class);
	// 엘리먼트 조합
	talk_banner_preview_div.appendChild(ico_talk_banner_span);
	// em 태그 앞뒤에 공백 추가(margin + 4px 처리)
	talk_banner_preview_div.appendChild(document.createTextNode(" "));
	talk_banner_preview_div.appendChild(talk_banner_desc_em);
	talk_banner_preview_div.appendChild(document.createTextNode(" "));
	talk_banner_link_a.appendChild(talk_banner_preview_div);
	talk_preview_area_div.appendChild(talk_banner_link_a);
	// 배너 엘리먼트 등록
	var talk_banner_divs = getElementsByClassNameCompatible("talk_banner_div");
	for(var i = 0; i < talk_banner_divs.length; i++) {
		if(talk_banner_divs[i].getAttribute("data-id") == bannerNo && 
			(!talk_banner_divs[i].getAttribute("data-ref") || talk_banner_divs[i].getAttribute("data-ref") == refUrl)) {		
			if(!talk_banner_divs[i].hasChildNodes()) {
				talk_banner_divs[i].appendChild(talk_preview_area_div.cloneNode(true));
			}
		}
	}
}

/**
 * [명함형]타입 배너 생성
 */
function createTalkBannerBusinesscardType(bannerInfo) {
	// 배너정보 확인
	var bannerNo = bannerInfo.id;
	/*var bannerType = bannerInfo.bannerType;
	var bannerName = bannerInfo.bannerName;*/
	var bannerDeviceType = bannerInfo.bannerDeviceType;
	var colorType = bannerInfo.colorType;
	var width = bannerInfo.width;
	var height = bannerInfo.height;
	var mainText = bannerInfo.mainText ? bannerInfo.mainText : "";
	var detailText = bannerInfo.detailText ? bannerInfo.detailText : "";
	var responseImpossibleMainText = bannerInfo.responseImpossibleMainText ? bannerInfo.responseImpossibleMainText : "";
	var responseImpossibleDetailText = bannerInfo.responseImpossibleDetailText ? bannerInfo.responseImpossibleDetailText : "";
	var bannerStatus = bannerInfo.bannerStatus;
	var accountId = bannerInfo.accountId;
	// 배너상태
	var talk_preview_area_div = document.createElement("div");
	var talk_preview_area_div_class = "talk_preview_area";
	if(bannerStatus != "NORMAL") talk_preview_area_div_class += " off";
	talk_preview_area_div.setAttribute("class", talk_preview_area_div_class);
	// 배너링크
	var talk_banner_link_a = document.createElement("a");
	talk_banner_link_a.setAttribute("href", "#");
	if(bannerStatus == "NORMAL") {
		var refUrl = bannerInfo.refUrl ? encodeURIComponent(bannerInfo.refUrl) : encodeURIComponent(location.href);
		talk_banner_link_a.setAttribute("onclick", "javascript:window.open('" + TALK_CHAT_URL + "/" + accountId + "?ref=" + refUrl + "', 'talktalk', 'scrollbars=1, resizable=1, width=486, height=745');return false;");
	}
	talk_banner_link_a.setAttribute("class", "talk_banner_link");
	// 배너컬러타입
	var talk_banner_preview_div = document.createElement("div");
	var talk_banner_preview_div_class = "talk_banner_preview banner_type_card";
	if(colorType == "WHITE") talk_banner_preview_div_class += " talk_expose_white";
	if(colorType == "GREY") talk_banner_preview_div_class += " talk_expose_grey";
	if(colorType == "GREEN") talk_banner_preview_div_class += " talk_expose_green";
	if(colorType == "BLACK") talk_banner_preview_div_class += " talk_expose_black";
	talk_banner_preview_div.setAttribute("class", talk_banner_preview_div_class);
	// 배너 사이즈
	var talk_banner_preview_div_style = "width:" + width + "px;height:" + height + "px;";
	talk_banner_preview_div.setAttribute("style", talk_banner_preview_div_style);
	var talk_banner_preview_inner_div = document.createElement("div");
	talk_banner_preview_inner_div.setAttribute("class", "talk_banner_preview_inner");
	var ico_talk_banner_span = document.createElement("span");
	ico_talk_banner_span.setAttribute("class", "ico_talk_banner");
	ico_talk_banner_span.innerHTML = "톡톡";
	// 주요문구
	var talk_banner_desc_em = document.createElement("em");
	var talk_banner_desc_em_class = "talk_banner_desc";
	if(bannerStatus == "NORMAL") {
		if(mainText) {
			talk_banner_desc_em.innerHTML = mainText;
		} else {
			talk_banner_desc_em_class += " talk_hide";
		}
	} else {
		if(responseImpossibleMainText) {
			talk_banner_desc_em.innerHTML = responseImpossibleMainText;	
		} else {
			talk_banner_desc_em_class += " talk_hide";
		}
	}
	talk_banner_desc_em.setAttribute("class", talk_banner_desc_em_class);
	// 상세문구
	var talk_banner_detail_p = document.createElement("p");
	var talk_banner_detail_p_class = "talk_banner_detail";
	if(bannerStatus == "NORMAL") {
		if(detailText) {
			talk_banner_detail_p.innerHTML = detailText;
		} else {
			talk_banner_detail_p_class += " talk_hide";
		}
	} else {
		if(responseImpossibleMainText) {
			talk_banner_detail_p.innerHTML = responseImpossibleDetailText;	
		} else {
			talk_banner_detail_p_class += " talk_hide";
		}
	}
	talk_banner_detail_p.setAttribute("class", talk_banner_detail_p_class);
	// 문의하기 버튼
	if(bannerDeviceType == "PC") {
		var talk_banner_consult_div = document.createElement("div");
		var talk_banner_consult_strong = document.createElement("strong");
		talk_banner_consult_strong.setAttribute("class", "talk_banner_consult");
		talk_banner_consult_strong.innerHTML = "문의하기";
	}
	// 엘리먼트 조합
	talk_banner_preview_inner_div.appendChild(ico_talk_banner_span);
	talk_banner_preview_inner_div.appendChild(talk_banner_desc_em);
	talk_banner_preview_inner_div.appendChild(talk_banner_detail_p);
	if(bannerDeviceType == "PC") {
		talk_banner_preview_inner_div.appendChild(talk_banner_consult_strong);
	}
	talk_banner_preview_div.appendChild(talk_banner_preview_inner_div);
	talk_banner_link_a.appendChild(talk_banner_preview_div);
	talk_preview_area_div.appendChild(talk_banner_link_a);
	// 배너 엘리먼트 등록
	var talk_banner_divs = getElementsByClassNameCompatible("talk_banner_div");
	for(var i = 0; i < talk_banner_divs.length; i++) {
		if(talk_banner_divs[i].getAttribute("data-id") == bannerNo && 
				(!talk_banner_divs[i].getAttribute("data-ref") || talk_banner_divs[i].getAttribute("data-ref") == refUrl)) {	
			if(!talk_banner_divs[i].hasChildNodes()) {
				talk_banner_divs[i].appendChild(talk_preview_area_div.cloneNode(true));
			}
		}
	}
}

/**
 * [블로그]타입 배너 생성
 */
function createTalkBannerBlogType(bannerInfo) {
	// 배너정보 확인
	var bannerNo = bannerInfo.id;
	var bannerDeviceType = "PC"
	/*var bannerType = bannerInfo.bannerType;
	var bannerDeviceType = bannerInfo.bannerDeviceType;
	var bannerName = bannerInfo.bannerName;
	var colorType = bannerInfo.colorType;*/
	var width = bannerInfo.width;
	var height = bannerInfo.height;
	var mainText = bannerInfo.mainText ? bannerInfo.mainText : "";
	var detailText = bannerInfo.detailText ? bannerInfo.detailText : "";
	var responseImpossibleMainText = bannerInfo.responseImpossibleMainText ? bannerInfo.responseImpossibleMainText : "";
	var responseImpossibleDetailText = bannerInfo.responseImpossibleDetailText ? bannerInfo.responseImpossibleDetailText : "";
	var bannerStatus = bannerInfo.bannerStatus;
	var accountId = bannerInfo.accountId;
	var profileImageUrl;
	if(bannerInfo.profileImageUrl) {
		profileImageUrl = bannerInfo.profileImageUrl.startsWith('https://') ? bannerInfo.profileImageUrl : TALK_PARTNER_CENTER_URL + "/" + bannerInfo.profileImageUrl;
	} else {
		profileImageUrl = TALK_PARTNER_CENTER_STATIC_URL + "/img/@tmp_no_profileimg.png";
	}
	// 배너상태
	var talk_preview_area_div = document.createElement("div");
	var talk_preview_area_div_class = "talk_preview_area";
	if(bannerStatus != "NORMAL") talk_preview_area_div_class += " off";
	talk_preview_area_div.setAttribute("class", talk_preview_area_div_class);
	var talk_banner_preview_div = document.createElement("div");
	talk_banner_preview_div.setAttribute("class", "talk_banner_preview banner_type_blog");
	// 배너 사이즈
	var talk_banner_preview_div_style = "width:" + width + "px;height:" + height + "px;";
	talk_banner_preview_div.setAttribute("style", talk_banner_preview_div_style);
	var talkpartner_img_area_div = document.createElement("div");
	talkpartner_img_area_div.setAttribute("class", "talkpartner_img_area");
	// 프로필이미지
	var talkpartner_profile_img = document.createElement("img");
	talkpartner_profile_img.setAttribute("class", "talkpartner_profile");
	talkpartner_profile_img.setAttribute("width", "80");
	talkpartner_profile_img.setAttribute("height", "80");
	talkpartner_profile_img.setAttribute("alt", "판매자 프로필");
	talkpartner_profile_img.setAttribute("src", profileImageUrl);
	talkpartner_profile_img.setAttribute("onerror", "this.src='" + TALK_PARTNER_CENTER_STATIC_URL + "/img/@tmp_no_profileimg.png'");
	var talkpartner_thumb_span = document.createElement("span");
	talkpartner_thumb_span.setAttribute("class", "talkpartner_thumb");
	var talk_banner_preview_inner_div = document.createElement("div");
	talk_banner_preview_inner_div.setAttribute("class", "talk_banner_preview_inner");
	// 주요문구
	var talk_banner_desc_em = document.createElement("em");
	var talk_banner_desc_em_class = "talk_banner_desc";
	if(bannerStatus == "NORMAL") {
		if(mainText) {
			talk_banner_desc_em.innerHTML = mainText;
		} else {
			talk_banner_desc_em_class += " talk_hide";
		}
	} else {
		if(responseImpossibleMainText) {
			talk_banner_desc_em.innerHTML = responseImpossibleMainText;	
		} else {
			talk_banner_desc_em_class += " talk_hide";
		}
	}
	talk_banner_desc_em.setAttribute("class", talk_banner_desc_em_class);
	// 상세문구
	var talk_banner_detail_p = document.createElement("p");
	var talk_banner_detail_p_class = "talk_banner_detail";
	if(bannerStatus == "NORMAL") {
		if(detailText) {
			talk_banner_detail_p.innerHTML = detailText;
		} else {
			talk_banner_detail_p_class += " talk_hide";
		}
	} else {
		if(responseImpossibleMainText) {
			talk_banner_detail_p.innerHTML = responseImpossibleDetailText;	
		} else {
			talk_banner_detail_p_class += " talk_hide";
		}
	}
	talk_banner_detail_p.setAttribute("class", talk_banner_detail_p_class);
	// 배너링크
	var btn_bn_talk_button = document.createElement("button");
	btn_bn_talk_button.setAttribute("class", "btn_bn_talk");
	if(bannerStatus == "NORMAL") {
		var refUrl = bannerInfo.refUrl ? encodeURIComponent(bannerInfo.refUrl) : encodeURIComponent(location.href);
		btn_bn_talk_button.setAttribute("onclick", "javascript:window.open('" + TALK_CHAT_URL + "/" + accountId + "?ref=" + refUrl + "', 'talktalk', 'scrollbars=1, resizable=1, width=486, height=745');return false;");
	} else {
		btn_bn_talk_button.setAttribute("disabled", "disabled");
	}
	var talk_btn_txt_span = document.createElement("span");
	talk_btn_txt_span.setAttribute("class", "talk_btn_txt");
	talk_btn_txt_span.innerHTML = "톡톡하기";
	// 엘리먼트 조합
	btn_bn_talk_button.appendChild(talk_btn_txt_span);
	talk_banner_preview_inner_div.appendChild(talk_banner_desc_em);
	talk_banner_preview_inner_div.appendChild(talk_banner_detail_p);
	talkpartner_img_area_div.appendChild(talkpartner_profile_img);
	talkpartner_img_area_div.appendChild(talkpartner_thumb_span);
	talk_banner_preview_div.appendChild(talkpartner_img_area_div);
	talk_banner_preview_div.appendChild(talk_banner_preview_inner_div);
	talk_banner_preview_div.appendChild(btn_bn_talk_button);
	talk_preview_area_div.appendChild(talk_banner_preview_div);
	// 배너 엘리먼트 등록
	var talk_banner_divs = getElementsByClassNameCompatible("talk_banner_div");
	for(var i = 0; i < talk_banner_divs.length; i++) {
		if(talk_banner_divs[i].getAttribute("data-id") == bannerNo && 
				(!talk_banner_divs[i].getAttribute("data-ref") || talk_banner_divs[i].getAttribute("data-ref") == refUrl)) {	
			if(!talk_banner_divs[i].hasChildNodes()) {
				talk_banner_divs[i].appendChild(talk_preview_area_div.cloneNode(true));
			}
		}
	}
}
/*##########################################################################################*/
/**
 * [IE8] getElementsByClassName 미지원 관련 처리
 */
function getElementsByClassNameCompatible(className) {
	if(document.getElementsByClassName) {
		return document.getElementsByClassName(className);
	} 
    var regEx = new RegExp('(^| )' + className+'( |$)');
	var nodes = new Array();
    var elements = document.body.getElementsByTagName("*");
	var len = elements.length;
    for(var i=0; i < len ; i++) {
        if(regEx.test(elements[i].className)) {
			nodes.push(elements[i]);
		}
	}
	elements = null;
    return nodes;
}
/*##########################################################################################*/
/**
 * 톡톡배너 초기화
 */
(function() {
	// domready start
	var fns = [], listener
		, doc = typeof document === 'object' && document
		, hack = doc && doc.documentElement.doScroll
		, domContentLoaded = 'DOMContentLoaded'
		, loaded = doc && (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)

	if (!loaded && doc)
		doc.addEventListener(domContentLoaded, listener = function () {
			doc.removeEventListener(domContentLoaded, listener)
			loaded = 1
			while (listener = fns.shift()) listener()
		})

	var addDomReadyCallback = function (fn) {
		loaded ? setTimeout(fn, 0) : fns.push(fn)
	}
	// domready end

	// 01. 설정 초기화
	//initTalkBannerConfig();
	addDomReadyCallback(initTalkBannerConfig);
	// 02. 배너정보 요청
	//requestTalkBannerInfo();
	addDomReadyCallback(requestTalkBannerInfo);
	// 03. 이후는 콜백함수에서 처리
}());
/*##########################################################################################*/