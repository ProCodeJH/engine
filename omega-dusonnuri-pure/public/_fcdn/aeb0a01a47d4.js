/*
	CrossEX Prototype Interface
	iniLINE Co.,Ltd.
	%VERSIONINFO%
*/
var  touchennxwebpolicy = 0x00000000;
var touchennxwebpolicyinfo = {
	// *기능 제어 해제 시 주석 제거
	//	"Capture":0x00000001, //1
	//	"Save":0x00000002,	//2
		"Copy":0x00000004,	//4
		"Paste":0x00000008	//8
	//	"Print":0x00000010,	//16
	//"ViewSource":0x00000020	//32
	//	"RClick":0x00000040,	//64
	//	"DelCache":0x00000080	//128
	//"NewWindown":0x00000160	//256 - 2017.10.23건보 웹 EDI Ctrl+N(현제창 새창열기) 제어 요청
};

for (key in touchennxwebpolicyinfo) {
	touchennxwebpolicy = ( touchennxwebpolicy == null )? touchennxwebpolicyinfo[key] : touchennxwebpolicy | touchennxwebpolicyinfo[key];
}

var touchennxwebparams = [
	//"tefw://"+location.host+"/TouchEn/nxWeb/TEWEB_CONF.ini"+"|"+location.host,
	//location.protocol+"//"+location.host+"/TouchEn/nxWeb/TEWEB_CONF.ini"+"|"+location.host,
	location.protocol+"//"+location.host+location.pathname.substring(0, location.pathname.indexOf("/",2))+"/raonnx/nxWeb/TEWEB_CONF.ini"+"|"+location.host+location.pathname.substring(0, location.pathname.indexOf("/",2)),
	touchennxwebpolicy+"",
	"sremote.exe,Seetrol_Rem.exe",
	//document.title
	//top.document.title
	//top.frames[0].document.title
	//frames.document.title
	""
];

var touchennxwebparams_mac = [
                              // location.protocol+"//"+location.host+location.pathname.substring(0, location.pathname.indexOf("/",2))+"/TouchEn/nxWeb/TEWEB_CONF.ini"+"|"+location.host+location.pathname.substring(0, location.pathname.indexOf("/",2)),
  							 location.protocol+"//"+location.host + "/raonnx/nxWeb/TEWEB_CONF_MAC.ini"+"|"+location.host,
                               //	"tefw://"+location.host+"/TouchEn/nxFw/TEFW_CONF_MAC.ini",
                           	touchennxwebpolicy+"",
                           	location.host+location.pathname,
                           	document.title //titlename
   ];



// TODO Plugin Object Define
var TouchEnnxWEB;

// TODO Plugin Info Set
var touchennxwebInfo = {
	"exPluginCallName"	: "TouchEnnxWEB",
	"exPluginName"		: "TouchEnnxWEB",
	"exPluginInfo"		: "touchennxwebInfo",
	"exModuleName"		: "nxweb",
	"tkInstallpage"		: TouchEnNxConfig.installPage.nxweb,  // 설치페이지
	"tkMainpage"		: TouchEnNxConfig.tkMainpage.nxweb,//설치완료 후 이동페이지 
	"tkInstalled"		: false,
	"exInstalled"		: false,
	"clInstalled"		: false,
	"exErrFunc"			:"TK_CommonError",
	"exErrFunc2"		: "",//모듈 변조시 FAQ 페이지로 이동 로직 추가
	"lic"				: TouchEnNxConfig.lic,
	
	// Module Info, 플러그인 설치파일 경로
	"moduleInfo" : {
		"exWinVer"			: nxWebConfig.version.exWinVer,
		"exWinClient"		: nxWebConfig.module.exWinClient,
		"exWin64Ver"		: nxWebConfig.version.exWin64Ver,
		"exWin64Client"		: nxWebConfig.module.exWin64Client,
		"exMacVer"		: nxWebConfig.version.exMacVer,
		"exMacClient"		: nxWebConfig.module.exMacClient,
		"exLinuxVer" : nxWebConfig.version.exLinuxVer, //20180913_bjk
		"exLinuxClient"		: nxWebConfig.module.exLinuxClient //20180913_bjk
	},
	 
	// EX Protocol Info, EX瑜� �ы븿�� �뚮윭洹몄씤 �대씪�댁뼵�� �뚯씪 寃쎈줈
	"exProtocolInfo" : {
		"exWinProtocolVer"			: nxWebConfig.version.exWinProtocolVer,
		"exWinProtocolDownURL"		: nxWebConfig.module.exWinProtocolDownURL,
		"exWin64ProtocolDownURL"	: nxWebConfig.module.exWin64ProtocolDownURL,
		"exMacProtocolVer"		: nxWebConfig.version.exMacProtocolVer,
		"exMacProtocolDownURL"	: nxWebConfig.module.exMacProtocolDownURL,
		"exLinuxProtocolVer" : nxWebConfig.version.exLinuxVer, //20180913_bjk
		"exUbuntu32ProtocolDownURL" : nxWebConfig.module.exLinuxProtocolDownURL //20180913_bjk
	},
	
	//////////////////////////////////////////////////////////////
	//////       CrossEX AREA DO NOT EDIT !!
	//////////////////////////////////////////////////////////////
	"isInstalled"		: false,				// 제품 정상 설치 여부
	"exProtocolName"	: "touchenex",
	"exExtHeader"		: "touchenex",
	"exNPPluginId"		: "touchenexPlugin",
	"exNPMimeType"		: "application/x-raon-touchenex",
	"exFormName"		: "__CROSSEX_FORM__",
	"exFormDataName"	: "__CROSSEX_DATA__",
	"exSiteName"		: "raon",


	"exEdgeInfo" : {
		"isUse"			: TouchEnNxConfig.daemon.info.isUse,
		"addScript"		: TouchEnNxConfig.commonPath+"TouchEnNx_daemon.js",
		"portChecker"	: TouchEnNxConfig.commonPath+"TouchEnNx_port_checker.js",
		"localhost"		: TouchEnNxConfig.daemon.info.localhost,
		"edgeStartPort"	: TouchEnNxConfig.daemon.info.edgeStartPort,
		"portChkCnt"	: TouchEnNxConfig.daemon.info.portChkCnt,
		"daemonVer"		: nxWebConfig.version.daemonVer,
		"daemonDownURL"	: nxWebConfig.module.daemonDownURL,
		"daemon64DownURL" : nxWebConfig.module.daemon64DownURL,
		"supportBrowser": TouchEnNxConfig.daemon.SupportBrowser
	},
	// module minimum specification
	// PASS, ALL, NO
	"checkSpec"	: true,
	"reqSpec"	: {
		"OS"	: {
			"WINDOWS"	: "5.1",	// XP=5.1, VISTA=6.0, Win7=6.1, Win8=6.2, Win8.1=6.3, Win10=6.4/10.0
			"MACOSX"	: "10.7",	// Leopard=10.5, Snow Leopard=10.6, Lion=10.7, Mountain Lion=10.8, Mavericks=10.9, Yosemite=10.10, El Capitan=10.11
			"LINUX"		: "PASS"
		},
		"Browser": {
			"MSIE"		: TouchEnNxConfig.moduleMinVer.MSIE,
			"EDGE"		: TouchEnNxConfig.moduleMinVer.Edge,
			"CHROME"	: TouchEnNxConfig.moduleMinVer.chromeMinVer,
			"FIREFOX"	: TouchEnNxConfig.moduleMinVer.FireFoxMinVer,
			"OPERA"		: TouchEnNxConfig.moduleMinVer.OperaMinVer,
			"SAFARI_WIN": TouchEnNxConfig.moduleMinVer.SafariMinVer,
			"SAFARI_MAC": "6"
		}
	},
	//////////////////////////////////////////////////////////////
	//////       CrossEX AREA DO NOT EDIT !!
	//////////////////////////////////////////////////////////////
	"isInstalled"		: false,				
	"exProtocolName"	: "touchenex",
	"exExtHeader"		: "touchenex",
	"exNPPluginId"		: "touchenexPlugin",
	"exNPMimeType"		: "application/x-raon-touchenex",
	"exSiteName"		: "raon",
	// Extension Info
	"exExtensionInfo" : {
		"exChromeExtVer"		: nxWebConfig.version.extension.exChromeExtVer,
		"exChromeExtDownURL"	: nxWebConfig.module.extension.exChromeExtDownURL,
		"exFirefoxExtVer"		: nxWebConfig.version.extension.exFirefoxExtVer,
		"exFirefoxExtDownURL"	: nxWebConfig.module.extension.exFirefoxExtDownURL,
		"exFirefoxExtIcon"		: "",//48*48 icon
		"exOperaExtVer"			: nxWebConfig.version.extension.exOperaExtVer,
		"exOperaExtDownURL"		: nxWebConfig.module.extension.exOperaExtDownURL
	}
};


/****************************
 ** edge condition
 ** include exproto_ext_daemon.js
 ****************************/
/*function touchenexEdgeCond(){
	return touchennxwebInfo.exEdgeInfo.isUse && TOUCHENEX_UTIL.isEdge();
}
if(touchenexEdgeCond()){
	document.write("<script type='text/javascript' src='" + touchennxwebInfo.exEdgeInfo.addScript + "'></script>");
}*/

// TODO Plugin Interface Define
var touchennxwebInterface = {
	exCommonError : function( response ){
		// TODO module check error
		alert(response);
	},
	
	exSpecError : function( type, reqSpec ){
		if(type == "OS"){
			var printOS = "";
			if(TOUCHENEX_UTIL.isWin()){
				var winName = "";
				//XP=5.1, VISTA=6.0, Win7=6.1, Win8=6.2, Win8.1=6.3, Win10=6.4/10.0
				if(reqSpec.WINDOWS == "5.1") winName = "XP";
				else if(reqSpec.WINDOWS == "6.0") winName = "VISTA";
				else if(reqSpec.WINDOWS == "6.1") winName = "Win7";
				else if(reqSpec.WINDOWS == "6.2") winName = "Win8";
				else if(reqSpec.WINDOWS == "6.3") winName = "Win8.1";
				else if(reqSpec.WINDOWS == "6.4") winName = "Win10";
				else if(reqSpec.WINDOWS == "10.0") winName = "Win10";
				printOS = "WINDOWS " + winName + "이상";
			} else if(TOUCHENEX_UTIL.isMac()) printOS = "MACOSX " + reqSpec.MACOSX + "이상";
			else if(TOUCHENEX_UTIL.isLinux()) printOS = "LINUX " + reqSpec.LINUX + "이상";
			else printOS = "UNDEFINED OS";
			
			alert("지원하지 않는 운영체제 입니다.");
		} else if (type == "BROWSER"){
			var printBrowser = "";
			if(TOUCHENEX_UTIL.isIE()) printBrowser = "IE " + reqSpec.MSIE + "이상";
			else if(TOUCHENEX_UTIL.isEdge()) printBrowser = "Edge " + reqSpec.EDGE + "이상";
			else if(TOUCHENEX_UTIL.isChrome()) printBrowser = "Chrome " + reqSpec.CHROME + "이상";
			else if(TOUCHENEX_UTIL.isFirefox()) printBrowser = "Firefox " + reqSpec.FIREFOX + "이상";
			else if(TOUCHENEX_UTIL.isOpera()) printBrowser = "Opera " + reqSpec.OPERA + "이상";
			else if(TOUCHENEX_UTIL.isSafari() && TOUCHENEX_UTIL.isWin()) printBrowser = "Safari " + reqSpec.SAFARI_WIN + "이상";
			else if(TOUCHENEX_UTIL.isSafari() && TOUCHENEX_UTIL.isMac()) printBrowser = "Safari " + reqSpec.SAFARI_MAC + "이상";
			else printBrowser = "UNDEFINED BROWSER";
			
			alert("지원하지 않는 브라우저 입니다.");
		}
		return;
	},
	
	InitEcho : function( params, callback ){
		TouchEnnxWEB.setEcho(true);
		var exCallback = "touchennxwebInterface.InitEchoCallback";
		TouchEnnxWEB.Invoke("TestEX", params, exCallback, callback);
	},
	
	InitEchoCallback : function( result ) {
		TouchEnnxWEB.setEcho(false);
		try{
			var strSerial = JSON.stringify(result);
			exlog("touchennxwebInterface.InitEchoCallback", result);
			if(result.callback){
				eval(result.callback)(result.reply);
			}
		} catch (e) {
			exlog("touchennxwebInterface.InitEchoCallback [exception] result", result);
			exalert("touchennxwebInterface.InitEchoCallback", "처리중 오류가 발생하였습니다.\n" + "result : "+result + "\nexception : " + e);
		}
	},
	
	TestEX : function( params, callback ){
		
		var exCallback = "touchennxwebInterface.TestEXCallback";
		TouchEnnxWEB.Invoke("TestEX", params, exCallback, callback);
	},
	
	TestEXCallback : function( result ) {
		try{
			var strSerial = JSON.stringify(result);
			exlog("touchennxwebInterface.TestEXCallback", result);
			if(result.callback){
				eval(result.callback)(result.reply);
			}
		} catch (e) {
			exlog("touchennxwebInterface.TestEXCallback [exception] result", result);
			exalert("touchennxwebInterface.TestEXCallback", "처리중 오류가 발생하였습니다.\n" + "result : "+result + "\nexception : " + e);
		}
	},
	
	TestEXPush : function( params ){
		TouchEnnxWEB.SetPushCallback("new", params);
	},
	
	TestEXPushAdd : function( params ){
		TouchEnnxWEB.SetPushCallback("add", params);
	},

	call2 : function( params, callback ) {
		try{
			var strObj = JSON.stringify(params);
			TouchEnnxWEB.ScriptInvoke(params, callback);
		} catch (e) {
			exlog("touchennxwebInterface.call2 [exception] params", params);
			exlog("touchennxwebInterface.call2 [exception]", e);
			exalert("touchennxwebInterface.call2", "params값은 JSON 타입이어야합니다.");
		}
	},
	
	
	CustomEX : function (cmd, params) {
		var exCallback = "touchennxwebInterface.CustomEXCallback";
		if(!cmd) {
			exalert("touchennxwebInterface.CustomEX", "cmd를 입력하세요.");
			return;
		}
		
		try {
			var obj = JSON.parse(params);
			params = obj;
		} catch(e){}
		
		TouchEnnxWEB.Invoke(cmd, [params], exCallback);
	},
	
	CustomEXCallback : function( result ) {
		try{
			var strSerial = JSON.stringify(result);
			exlog("touchennxwebInterface.CustomEXCallback", result);
			
			var resultArea = document.getElementById("resultArea");
			if(resultArea){
				resultArea.value = strSerial;
			} else {
				//alert(strSerial);
			}
		} catch (e) {
			exlog("touchennxwebInterface.CustomEXCallback [exception] result", result);
			exalert("touchennxwebInterface.CustomEXCallback", "처리중 오류가 발생하였습니다.\n" + "result : "+result + "\nexception : " + e);
		}
	},
	
	CustomEX2 : function (cmd, params) {
		var exCallback = "touchennxwebInterface.CustomEXCallback2";
		if(!cmd) {
			exalert("touchennxwebInterface.CustomEX", "cmd를 입력하세요.");
			return;
		}
		
		TouchEnnxWEB.Invoke(cmd, params, exCallback);
		
	},
	
	CustomEXCallback2 : function( result ) {
		try{
			var strSerial = JSON.stringify(result);
			exlog("touchennxwebInterface.CustomEXCallback", result);
		
			
			var resultArea = document.getElementById("resultArea");
			if(resultArea){
				resultArea.value = strSerial;
			} else {
				//alert(strSerial);
			}
		} catch (e) {
			exlog("touchennxwebInterface.CustomEXCallback [exception] result", result);
			exalert("touchennxwebInterface.CustomEXCallback", "처리중 오류가 발생하였습니다.\n" + "result : "+result + "\nexception : " + e);
		}
	},
	
	
	//////////////////////////////////////////////
	// UserDefinition Interface Code Area......
	//////////////////////////////////////////////
	
	
	sampleFunction : function( params ){
		var exCallback = "touchennxwebInterface.sampleFunctionCallback";
		TouchEnnxWEB.Invoke("TestEX", params, exCallback, callback);
	},
	
	sampleFunctionCallback : function( result ){
		try{
			var strSerial = JSON.stringify(result);
			exlog("touchennxwebInterface.sampleFunctionCallback", result);
			if(result.callback){
				eval(result.callback)(result.reply);
			}
		} catch (e) {
			exlog("touchennxwebInterface.sampleFunctionCallback [exception] result", result);
			exalert("touchennxwebInterface.sampleFunctionCallback", "처리중 오류가 발생하였습니다.\n" + "result : "+result + "\nexception : " + e);
		}
	}
	
	
};