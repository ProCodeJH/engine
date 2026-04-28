/**
****************************************************
TouchEnNx_config.js
****************************************************
| Version     작성자        수정일        변경사항 
 ---------  -------  -----------  ----------
 | v1.0.0.10   강남준    2023.02.01
 | v1.0.0.9    강남준    2021.08.14
 | v1.0.0.8    강남준    2021.01.29
 | v1.0.0.7    강남준    2020.02.17
 | v1.0.0.6    강남준    2019.07.05
 | v1.0.0.5    강남준    2018.12.14
 | v1.0.0.4    백서린    2018.11.12
 | v1.0.0.3    강남준    2018.05.14
 | v1.0.0.2    허혜림    2018.01.31
 | v1.0.0.1    허혜림    2017.12.20          

****************************************************
 Copyright ⒞ RaonSecure Co., Ltd. 
****************************************************
**/

var nxKeyConfig ={};
nxKeyConfig.version = {
	
	extension :   {
		exChromeExtVer		:	"1.0.0.0",
		exFirefoxExtVer		:	"1.0.2.5",
		exFirefoxJpmExtVer	:	"1.0.1.12",
		exOperaExtVer		:	"1.0.1.14"
	},
		
	/** 키보드보안 설정 */
		tkappiver			:	"1.0.0.78",
		tkappmver			:	"1.0.0.67",
		exWinVer			:	"1.0.0.90",
		exWin64Ver			:	"1.0.0.90",
		exWinProtocolVer	:	"1.0.1.1529",
		daemonVer			:   "1.0.2.10",
		macDaemonVer		:   "1.0.1.8",
		linuxDaemonVer		:   "1.0.0.1",
		exMacVer			:	"1.0.0.16",
		exMacProtocolVer	:	"1.0.1.1529"
};

  nxKeyConfig.module = {
        
        extension    :{
            //exChromeExtDownURL    : "https://chrome.google.com/webstore/detail/dncepekefegjiljlfbihljgogephdhph",
            exChromeExtDownURL    : "https://download.raonsecure.com/extension/chrome/chrome.html",
            exFirefoxExtDownURL    : TouchEnNxConfig.path.base + "/extension/touchenex_firefox.xpi",
            exFirefoxJpmExtDownURL    : TouchEnNxConfig.path.base + "/extension/jpm_touchenex_firefox.xpi",
            exOperaExtDownURL    : TouchEnNxConfig.path.base + "/extension/touchenex_opera.nex"                                                        
        },
        
            exWinClient                    :    TouchEnNxConfig.path.base + "/nxKey/module/TouchEn_nxKey_32bit.exe",
            exWin64Client                :    TouchEnNxConfig.path.base + "/nxKey/module/TouchEn_nxKey_64bit.exe",
            daemonDownURL                :    TouchEnNxConfig.path.base + "/nxKey/module/TouchEn_nxKey_32bit.exe",
            macDaemonDownURL            :    TouchEnNxConfig.path.base + "/nxKey/module/TouchEn_nxKey_Installer.pkg",
        //    ubuntu32DaemonDownURL        :    TouchEnNxConfig.path.base + "/nxKey/module/CrossEXService_32bit.deb",
        //    ubuntu64DaemonDownURL        :    TouchEnNxConfig.path.base + "/nxKey/module/CrossEXService_64bit.deb",
        //    fedora32DaemonDownURL        :    TouchEnNxConfig.path.base + "/nxKey/module/CrossEXService_32bit.rpm",
        //    fedora64DaemonDownURL        :    TouchEnNxConfig.path.base + "/nxKey/module/CrossEXService_64bit.rpm",
            exMacClient                    :    TouchEnNxConfig.path.base + "/nxKey/module/TouchEn_nxKey_Installer.pkg",
            exMacProtocolDownURL        :     TouchEnNxConfig.path.base + "/nxKey/module/TouchEn_nxKey_Installer.pkg"
    };

/** 키보드보안 E2E 를 사용하지 않을 경우 주석해제*/
var TNK_SR = "";

/**	클라이언트 솔루션별 동작 설정*/
TouchEnNxConfig.solution={
		nxkey : {
				tekOption : {
					"pki": "TouchEnkeyEx",
				    "keyboardonly": "false",
				    "defaultenc": "false",
				    "verify": "0",
				    "defaultpaste": "true",
				    "iframename": "",
				    "usegetenc": "false",
				    "clearbufferonempty": "true",
				    "refreshsession": "true",
				    "improve": "true",
					"bstart": 0,
				    "setcallback": "false",
				    "usebspress": "false",
				    "ignoreprogress": "true",
				    "ignoreprogress2": "true",
				    "exformname": "",
				    "idbase": "false",
				    "allcrypt": "false",
					"browserinfo" : "",
					"cert" : "-----BEGIN CERTIFICATE-----MIIDVjCCAj6gAwIBAgIJAO4t+//wr+T6MA0GCSqGSIb3DQEBCwUAMGcxCzAJBgNVBAYTAktSMR0wGwYDVQQKExRSYW9uU2VjdXJlIENvLiwgTHRkLjEaMBgGA1UECxMRUXVhbGl0eSBBc3N1cmFuY2UxHTAbBgNVBAMTFFJhb25TZWN1cmUgQ28uLCBMdGQuMB4XDTE4MDMxOTA3MjkzMFoXDTE4MDYxNzA3MjkzMFowUjELMAkGA1UEBhMCS1IxGjAYBgNVBAoMEW1pcmFlYXNzZXRjYXBpdGFsMScwJQYDVQQDDB5UPVQmRD1bY2FwaXRhbC5taXJhZWFzc2V0LmNvbV0wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDVWhRlgrtXFsmDpFnRGeYGvtizoJHNHXZAysIExPJKKYY3HE/8COBMacz6nosK786NyoRT+UP9shg8tMr6fjDTctpivVtVKWHFfudSBwWyQvvFQIUVLbwprKF7U/siYHUy3OiwW19Ge1uSg7hBYwzao9AxUw9/bvHKBDQ3Y2QZXyOFbHSeLTRWraydj/VAn6+LHyEQZLf2sEGN9Y/xPzcOZM5ZbRAzisZl1UT+qMD0XX3h5tyUTE7QH89Hui6GcajbWl729IlHXUHaihsgRNb697ZeNEOHr4iDFyacVm4LWcgoUG4gLekb2QTuWYb2x8c2FyYhb2QfAz9P50XaP73zAgMBAAGjGjAYMAkGA1UdEwQCMAAwCwYDVR0PBAQDAgXgMA0GCSqGSIb3DQEBCwUAA4IBAQAhc3TiNhXtBDZRZ1rBr8YfcOMAa/mSzAUwjSeX/n4jWTofpEjLL3SkJwOeSaVhiE2PzXi61tE3QZB3GRA8k9wIvTvKJ0kNO8NPEq02/4/h1Ac8Z0Ds9XdsWaDRCWNNrYmFWYMO6cqdu7sSxLT0hyMhFdyTaBfJyFeOVZKDFX1/qiYWU1Jzs+Q2sIEn7Sm9YthqEIr5cIwnwMpMEKUBe+kYKJPi545C2yMt1B+WVkE6N986RCrL1ThMIsbM+vaVIMR8oxzFvjmohXj5oRS6Pah/jVNJETGlWi0q/g2uCwR+iIMv7DxsEd32Qp85gIyDWQkc3ue7t69FSlXvHVDrTDGt-----END CERTIFICATE-----",
					"srdk": TNK_SR,
					"generate_event": "false",
					"driverexcept": "0",
					"delayedck": "false",
					"shiftbypass": "true",
					"allowdup": "false",
					"enc2": "false",
				    "searchformname":"",
					"runtype": TouchEnNxConfig.runtype,
					"tk_isRunningSecurity" : "false", 
					"isAllowIdOverlap" : "true", //히든필드 중복오류 수정시 false설정 및 서버버전 v2.0.3.3 적용필요
					"defaultsecurityid" : "true",
					"newModule" : "true",
					"useWebSquarePast" : "false"
				}
		}
};