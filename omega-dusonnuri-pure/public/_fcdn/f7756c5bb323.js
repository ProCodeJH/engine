

/**
****************************************************
TouchEnNx_config.js
****************************************************
| Version     작성자        수정일        변경사항 
 ---------  -------  -----------  ----------    
| v1.0.0.1    허혜림    2017.10.23      

****************************************************
 Copyright ⒞ RaonSecure Co., Ltd. 
****************************************************
**/
var nxWebConfig = {};

nxWebConfig.version = {
	
	extension :{
		exChromeExtVer		:	"1.0.1.14",
		exFirefoxExtVer		:	"1.0.2.5",
		exFirefoxJpmExtVer	:	"1.0.1.12",
		exOperaExtVer		:	"1.0.1.13"
	}, 
	
	/** 웹컨텐츠보안 설정 */
		exWinVer			:	"1.0.0.7",
		exWin64Ver			:	"1.0.0.7",
		exWinProtocolVer	:	"1.0.1.1091",
		daemonVer			:	"1.0.2.4",
		daemon64DownURL		:	"1.0.2.4",
		exMacVer			:	"1.0.0.1",
		exMacProtocolVer	:	"1.0.0.981",
		exLinuxVer			: 	"1.0.0.0",
	linux :{
		url : "127.0.0.1",
		port : "33377"
	}
};

nxWebConfig.module = {
	
	
	extension	:{
		//exChromeExtDownURL	: "https://chrome.google.com/webstore/detail/dncepekefegjiljlfbihljgogephdhph",
		exChromeExtDownURL	: "https://download.raonsecure.com/extension/chrome/chrome.html",
		exFirefoxExtDownURL	: TouchEnNxConfig.path.base + "/extension/touchenex_firefox.xpi",
		exFirefoxJpmExtDownURL	: TouchEnNxConfig.path.base + "/extension/jpm_touchenex_firefox.xpi",
		exOperaExtDownURL	: TouchEnNxConfig.path.base + "/extension/touchenex_opera.nex"
	},
	
		exWinClient		:	TouchEnNxConfig.path.base + "/nxWeb/module/TouchEn_nxWeb_Installer32.exe",
	    //exWinClient		:	"http://downloadbicns.pe.kr/nxWeb/TouchEn_nxWeb_Installer32.exe",
		exWin64Client	:	TouchEnNxConfig.path.base + "/nxWeb/module/TouchEn_nxWeb_Installer64.exe",
	    //exWin64Client	:	"http://downloadbicns.pe.kr/nxWeb/TouchEn_nxWeb_Installer64.exe",
		daemonDownURL	:	TouchEnNxConfig.path.base + "/nxWeb/module/TouchEn_nxWeb_Installer32.exe",
		//daemonDownURL	:	"http://downloadbicns.pe.kr/nxWeb/TouchEn_nxWeb_Installer32.exe",
		exMacClient					:	TouchEnNxConfig.path.base + "/nxWeb/module/TEWeb_Installer.pkg",
		exMacProtocolDownURL		: 	TouchEnNxConfig.path.base + "/nxWeb/module/TEWeb_Installer.pkg",
		exLinuxProtocolDownURL	:	TouchEnNxConfig.path.base + "/nxWeb/module/NxWeb.deb",
		exUbuntu32ProtocolDownURL	:	TouchEnNxConfig.path.base + "/nxWeb/module/NxWeb.deb"
};
