/**
 * (C) Copyright AhnLab, Inc.
 *
 * Any part of this source code can not be copied with
 * any method without prior written permission from
 * the author or authorized person.
 *
 * @version			$Revision: 14980 $
 *
 */

function gotoInstallASTX2()
{
	var sub = '';
	if(typeof(_INST_SUB) != 'undefined' && _INST_SUB != null) {
		sub = _INST_SUB;
	}

	var url = sub+'page_inst_check.jsp?page='+encodeURIComponent(window.location)+'&rnd='+new Date().getTime();
	window.location.href = url;
}

function checkInstallASTX2(fnSuccess, fnFailure)
{
	$_astxj.showOverlay();

	$ASTX2.init(
		function onSuccess() {
			$_astxj.hideOverlay();
			$_astxu.log('ASTX.init() success [astx2.1]');

			if(fnSuccess) {	fnSuccess(); }
		},
		function onFailure() {
			$_astxj.hideOverlay();

			var errno = $ASTX2.getLastError();
			$_astxu.log('ASTX.init() failure: errno='+errno);
			if(errno == $ASTX2_CONST.ERROR_NOTINST) {
				gotoInstallASTX2();
			}else {
				if(fnFailure) { fnFailure(); }
			} // end of if
		}
	);
}

function onMoveFocus(objCurr, idNext, nLength)
{
	if(objCurr.value.length >= nLength)
	{
		var elm = document.getElementById(idNext);
		if(elm) { elm.focus(); }
	}
}



/**
 * PLUGIN2020_01 test 다운로드, 설치 관련 함수 seolz  
 */
//ASTx 다운로드 URL 설정 샘플
function fn_download_ASTx(pkgType) {
  /* 운영CDN */
    //var _baseURL = "http://safetx.ahnlab.com/master";
    //var downURL = _baseURL + "/win/default/all/astx_setup.exe";
    //if (VP_platformInfo.x64) downURL = _baseURL + "/win/default/all/astx_setup.exe";
  var VP_platformInfo = vp_getPlatformInfo();
  
  var _baseURL = "https://safetx.ahnlab.com/master/win/default/all";
    
  var URL_TYPE = "EXTERNAL"; //운영 개발 구분
  /* 개발서버 운영서버 분리 다운로드 */
  try {
      var hostName = document.location.hostname;
      if (hostName.indexOf("dev.longtermcare.or.kr") >= 0 ) {
           URL_TYPE = "INTERNAL";          
          _baseURL = document.location.protocol+"//"+document.location.host+"/homeapp/Portal/static/astx";
      }
  } catch(err) {}

  //WIN용 다운로드
    var downURL = _baseURL + "/astx_setup.exe";

    if(URL_TYPE == "INTERNAL"){ //테스트 내부 환경인경우 seolz
      
      downURL = _baseURL + "/astx_setup_offline.exe"; //개발용
        
      if ((pkgType == "DEV") || (pkgType == "" && VP_platformInfo.Ubuntu)) {
        downURL = _baseURL + "/astx_u32-off.deb";
        if (VP_platformInfo.x64) downURL = _baseURL + "/astx_u64.deb";
        
      }else if ((pkgType == "RPM") || (pkgType == "" && VP_platformInfo.Fedora)) {
          downURL = _baseURL + "/astx_f32-off.rpm";
          if (VP_platformInfo.x64) downURL = _baseURL + "/astx_f64.rpm";
      }
      else if (VP_platformInfo.Mac) {
          downURL = _baseURL + "/astx_offline.dmg";
      }
      
    }else{ //외부접속
      //멀티OS용 다운로드 설정
      if ((pkgType == "DEV") || (pkgType == "" && VP_platformInfo.Ubuntu)) {
          _baseURL = "https://safetx.ahnlab.com/master/linux";
          downURL = _baseURL + "/astx_u32.deb";
          
          if (VP_platformInfo.x64) downURL = _baseURL + "/astx_u64.deb";
      }
      else if ((pkgType == "RPM") || (pkgType == "" && VP_platformInfo.Fedora)) {
        _baseURL = "https://safetx.ahnlab.com/master/linux";
          downURL = _baseURL + "/astx_f32.rpm";
          if (VP_platformInfo.x64) downURL = _baseURL + "/astx_f64.rpm";
      }
      else if (VP_platformInfo.Mac) {
        _baseURL = "https://safetx.ahnlab.com/master/mac";
          downURL = _baseURL + "/astx.dmg";
      }      
      
    }


    location.href = downURL;
}


//os버전 체크
function vp_getPlatformInfo() {
  var platformInfo = {
      Windows:false, Linux:false, Ubuntu:false, Fedora:false, Mac:false, iOS:false, Android:false,
      Mobile:false, x64:false,
      type: "unknown", name: "unknown"
  };
  platformInfo.name = navigator.platform;
  if (navigator.appVersion.match("WOW64")) platformInfo.name = "WOW64";

  if (platformInfo.name.match(/Win32/i) || platformInfo.name.match(/WOW64/i)) {
      platformInfo.Windows = true;
      platformInfo.type = "Windows";
      if (navigator.appVersion.match(/Win64/i)) {
          platformInfo.name = "Win64";
          platformInfo.x64 = true;
          platformInfo.type = "Windows64";
      }
  } else if (platformInfo.name.match("Win64")) {
      platformInfo.Windows = true;
      platformInfo.x64 = true;
      platformInfo.type = "Windows64";
  } else if (platformInfo.name.match("Linux armv")) {
      platformInfo.Mobile = true;
      platformInfo.Android = true;
      platformInfo.type = "Android";
  } else if (platformInfo.name.match(/Linux/i)) {
      platformInfo.Linux = true;
      platformInfo.type = "Linux";
      if (platformInfo.name.match(/x86_64/i)) {
          platformInfo.x64 = true;
          platformInfo.type = "Linux64";
      } else if (navigator.userAgent.match(/x86_64/i)) { //Opera
          platformInfo.x64 = true;
          platformInfo.type = "Linux64";
      }
      if (navigator.userAgent.match(/Fedora/i)) {
          platformInfo.Fedora = true;
          platformInfo.type = "Fedora";
          if (platformInfo.x64) platformInfo.type = "Fedora64";
      } else if (navigator.userAgent.match(/Ubuntu/i)) {
          platformInfo.Ubuntu = true;
          platformInfo.type = "Ubuntu";
          if (platformInfo.x64) platformInfo.type = "Ubuntu64";
      } else if (navigator.userAgent.match(/Android/i)) { //modify 20150903: Samsung Galaxy Edge
          platformInfo.Linux = false;
          platformInfo.Mobile = true;
          platformInfo.Android = true;
          platformInfo.type = "Android";
      }
  } else if (platformInfo.name.match(/MacIntel/i)) {
      platformInfo.Mac = true;
      platformInfo.type = "Mac";
  } else if (platformInfo.name == "iPad"
          || platformInfo.name == "iPhone"
          || platformInfo.name == "iPod"
          || platformInfo.name == "iOS") {
      platformInfo.Mobile = true;
      platformInfo.iOS = true;
      platformInfo.type = "iOS";
  }

  if( (navigator.userAgent.match(/iPhone/i))  ||
      (navigator.userAgent.match(/iPod/i))    ||
      (navigator.userAgent.match(/iPad/i))    ||
      (navigator.userAgent.match(/Android/i))) {
      platformInfo.Mobile = true;
  }
  if( (navigator.userAgent.match(/Windows Phone/i)) ||
      (navigator.userAgent.match(/Windows CE/i))    ||
      (navigator.userAgent.match(/Symbian/i))       ||
      (navigator.userAgent.match(/BlackBerry/i))) {
      platformInfo.Mobile = true;
  }

  //modify/remove system type
  if (navigator.userAgent.match("Android") && navigator.userAgent.match("Opera Mini")) {
      platformInfo.Mobile = true;
      platformInfo.Android = true;
      platformInfo.type = "Android";
  }
  return platformInfo;
}