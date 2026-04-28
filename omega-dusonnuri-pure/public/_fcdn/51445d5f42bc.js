var loadflag = false;

function exLoading(){	
	TOUCHENEX_CHECK.check([touchennxwebInfo], "exLoadingCallback");
}

function exLoadingCallback(check){
	exlog("exLoadingCallback", check);
	if(check.status){
		TOUCHENEX_LOADING("exModuleInit");
	} else {
		//alert("프로그램 설치가 필요합니다.\n" + JSON.stringify(check) + "\n다운로드 버튼을 클릭하여 설치를 진행하세요.");
		alert("웹컨텐츠보호 보안프로그램 설치가 필요합니다.\n[확인]을 선택하시면 설치페이지로 연결됩니다.");
		location.href = touchennxwebInfo.tkInstallpage;
		/*if(TOUCHENEX_UTIL.typeExtension()){
			TOUCHENEX_INSTALL.download("nxfirewall","extension");
		}else{
			TOUCHENEX_INSTALL.download("nxfirewall","client");
		}*/
	}
}

function exModuleInit(result){
	if(result){
		//touchennxwebInterface.CustomEX("Key_Start","tefw://" + downBasePath + "/TouchEn/nxFw/TEFW_CONF.ini");
		//touchennxwebInterface.CustomEX2("Key_Start",touchennxwebparams);
		 if(TOUCHENEX_UTIL.isMac()){			
		//	 alert("MAC");
			touchennxwebInterface.CustomEX2("Key_Start",touchennxwebparams_mac); 
		 }else{
	//		 alert("windows");
			touchennxwebInterface.CustomEX2("Key_Start",touchennxwebparams);
			 }
	} else {
		alert("초기화에 실패하였습니다.");
	}
} 

function tewebInstallMove(){
	location.href = touchennxwebInfo.tkInstallpage;	
}

function tewebInstallDownload(){
	if(TOUCHENEX_UTIL.isChrome() || TOUCHENEX_UTIL.isFirefox() || TOUCHENEX_UTIL.isOpera()){
		TOUCHENEX_INSTALL.download("nxweb","client");	
	}
}

function tewebextensionInstall() {
	if(TOUCHENEX_UTIL.isChrome() || TOUCHENEX_UTIL.isFirefox() || TOUCHENEX_UTIL.isOpera()){
		TOUCHENEX_INSTALL.download("nxweb","extension");	
	}
}

function tewebCheckMove(){
	TOUCHENEX_CHECK.check([touchennxwebInfo], "tewebCheckMoveCallback");
}

function tewebCheckMoveCallback(check) {
    try {
        currStatus = check;
        if (currStatus.status) {
            location.href = touchennxwebInfo.tkMainpage;
        } 
    } catch (e) {}
}