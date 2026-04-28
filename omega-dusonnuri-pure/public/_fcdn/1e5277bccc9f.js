var gIsContinue=0;

function UserAgent()
{
	return navigator.userAgent.substring(0,9);
}

function IsNetscape()			// by Zhang
{
	if(navigator.appName == 'Netscape')
		return true ;
	else
		return false ;
}

function IsNetscape60()			// by Zhang
{
	if(IsNetscape() && UserAgent() == 'Mozilla/5')
		return true ;
	else
		return false ;
}

function XecureUnescape(Msg)		// by Zhang
{
	if(IsNetscape())
		return unescape(Msg) ;
	else
		return Msg ;
}

function XecureEscape(Msg)		// by Zhang
{
	if(IsNetscape())
		return escape(Msg) ;
	else
		return Msg ;
}

function XecureWebError()		// by zhang
{
	var errCode = 0 ;
	var errMsg = "" ;

	if( IsNetscape60() )		// Netscape 6.0
	{
		//errCode = XecureWeb.mAnySignForPC.LastErrCode();
		//errMsg  = XecureWeb.mAnySignForPC.LastErrMsg();
	}
	else
	{
		//errCode = XecureWeb.LastErrCode();
		//errMsg  = XecureWeb.LastErrMsg();
	}
	/*
	if(errCode == -144)
	{
		if(confirm("에러코드 : " + errCode + "\n\n" + XecureUnescape(errMsg) + "\n\n 인증서관리창을 열겠습니까?"))
		ShowCertManager() ;
	}
	*/
	//	else if(errCode != 0)
	//alert( "에러코드 : " + errCode + "\n\n" + XecureUnescape(errMsg) );

	return false;
}

function gfn_openXecureCert(userType, custId, form, formActionString, popYn) {
	/*
    if (!custId) {
        alert("주민등록번호를 입력하세요.");
        return;
    }*/
	var caList_ = AnySign.mCAList;
	
	//console.log('xecure_cert_s='+xecure_cert_s);
	//console.log('popYn='+popYn);
	
	if(userType){
		/*
		 * A:장기요양기관
		 * B:복지용구공급업체
		 * C:복지용구소독업체
		 * D:등급판정위원회
		 * E:요양보호사 직무교육기관
		 * F:장기요양 심사위원회
		 * G:서비스 모니터링 요원
		 * H:폐업후
		 * I:가족상담 지원사업
		 * J:장기요양외부평가자
		 * K:노인복지관
		 * P:개인
		 * 1:법인
		 * 2:개인
		 * L:급여제공기관종사자 20211022 추가
		 * N:포상심의위원회 20220208 추가
		 * M:통합돌봄  20220311 추가 
		 * */
		if(userType == '2' ||userType == 'F' || userType == 'I' || userType == 'P' || userType == 'H' || userType == 'G' || userType == 'D' || userType == 'J' || userType == 'L' || userType == 'N' || userType == 'M') {
			caList_ = getAcceptCertList('2');
		}else if(userType == '1' ||userType == 'A' || userType == 'B' || userType == 'C' || userType == 'E' || userType == 'K'){
			caList_ = getAcceptCertList('1');
		}		
		
		//H : 폐업 후 는 보건복지부 개인인증서만 허용
		if(userType == 'H'){
			caList_ = getAcceptCertList('3'); 
		}
		
		
		console.log('caList_='+caList_);
	}	
	
	/*2018.10.20. / 박홍식 / 엑티브X제거사업   ---> 
	* XecureWeb -> AnySign 변경
	*/	
	AnySign.SignDataWithVID("",
			caList_,
		    "a", // aPlain
		    20, // aOption
		    "", // aDescription
		    AnySign.mLimitedTrial,
		    "", // 고객번호
		    s, 
		    gfn_signDataCallback,
		    gfn_errorCallback);	
    
    //팝업에서 인증서 호출시 인증서 위치를 팝업 왼쪽 상단으로 이동(팝업 사이즈때문에 적용함) 팝업창은 w:450px H:570 스크롤 'Y'일 경우 w:470px H:580
    if(popYn == true){
    	$("div").each(function(){
    		if($(this).css("z-index") == 530010){    			
    			var filterText = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+WEB_FULL_PATH + CONTEXT_PATH+"/assets/solution/AnySign4PC/AnySign4PC/img/white.png', sizingMethod='scale')";
    			$(this).css("filter" , filterText);
    			$(".xwup_cert_pop").css("top", "0");
    			$(".xwup_cert_pop").css("left", "0");
    			$(".xwup_cert_pop").css("border-top-style", "none");
    	    	$(".xwup_cert_pop").css("border-left-style", "none");
    	    	$(".xwup_cert_pop").css("border-right-style", "none");
    	    	$(".xwup_cert_pop").css("border-bottom-style", "none");
    		}
    	});
    }    
    
    // 공인인증서 확인 후 인증결과에 대한 처리 callback 함수
    // aResult와 aResultVid를 서버에 보내 이후 인증 처리를 한다.
    function gfn_signDataCallback(aResult) {
    	/*    	
    	1 : subject dn
    	2 : issure dn
    	3 : serial
    	4 : policy OID
    	5 : cert Data(all, Pem)
    	6 : cert Data(all, Binary / not umplemented, 추가된다면 Base64로 반환)    	
    	var serial = XecureWeb.GetCertInfo(aResult, 0, 3);
    	*/
    	
    	if(form.find("input[name=aSignedMsg]").length == 0){
    		form.append("<input type='hidden' name='aSignedMsg' id='signed_msg' value='' />");
    	}

        console.log('aSignedMsg='+aResult);
        
        form.find("input[name=aSignedMsg]").val(aResult);
    	/*2018.10.20. / 박홍식 / 엑티브X제거사업   ---> 
    	* 기존코드: 
    	*  form.find("input[name=aVidMsg]").val(send_vid_info());
         $("#signed_msg").val(aResult);
         $("#vid_msg").val(send_vid_info());
         form.prop("action", formActionString);
         AnySign.XecureSubmit(document.getElementById(form.prop("id")), ""); 
    	*/        
        send_vid_info(gfn_signDataWithVID_UserCallback);

         
     };
 	/*2018.10.20. / 박홍식 / 엑티브X제거사업   ---> 
 	* 콜백 추가 
 	*/      
     function gfn_signDataWithVID_UserCallback(aResultVid){
    	 
         if(form.find("input[name=aVidMsg]").length == 0){
         	form.append("<input type='hidden' name='aVidMsg' id='vid_msg' value='' />");
         }
    	 
    	 console.log('aVidMsg='+aResultVid);
    	 
    	 form.find("input[name=aVidMsg]").val(aResultVid);
    	 
    	 console.log('formActionString='+formActionString+',form.prop='+form.prop("id"));
    	 
         form.prop("action", formActionString);
         
         if (typeof AnySign === "undefined") {
             form.submit();
         } else {        	
        	 //kjs 암호화 제거 AnySign.XecureSubmit(document.getElementById(form.prop("id")), "");
        	 form.submit();
         }
     };     
     
     function gfn_errorCallback(aResult){
    	 if (!aResult.msg){
    		 aResult.msg = "Unknown Error";
    	 }
    	 
    	 alert("[" + aResult.code + "] " +aResult.msg); 
    	 
    	 if(popYn == true){
    		 if(aResult.code == '10000006'){
        		 window.close(); 
        	 }
    	 }
     };
}

/*2018.10.20. / 박홍식 / 엑티브X제거사업   ---> 
* XecureWeb -> AnySign 변경
*/	
function gfn_getXecureCert(custId, userType) {
	
	if(!custId){
		custId = "";
	}
	
	console.log('custId='+custId);
	
	var caList_ = AnySign.mCAList;
	
	
	if(userType){
		/*
		 * A:장기요양기관
		 * B:복지용구공급업체
		 * C:복지용구소독업체
		 * D:등급판정위원회
		 * E:요양보호사 직무교육기관
		 * F:장기요양 심사위원회
		 * G:서비스 모니터링 요원
		 * H:폐업후
		 * I:가족상담 지원사업
		 * J:장기요양외부평가자
		 * K:노인복지관
		 * P:개인
		 * 1:법인
		 * 2:개인
		 * L:급여제공기관종사자 20211022 추가
		 * N:포상심의위원회 20220208 추가
		 * M:통합돌봄 20220311 추가
		 * */
		if(userType == '2' ||userType == 'F' || userType == 'I' || userType == 'P' || userType == 'H' || userType == 'G' || userType == 'D'  || userType == 'J' || userType == 'L' || userType == 'N' || userType == 'M' ){
			caList_ = getAcceptCertList('2');
		}else if(userType == '1' ||userType == 'A' || userType == 'B' || userType == 'C' || userType == 'E' || userType == 'K'){
			caList_ = getAcceptCertList('1');
		}
		
		//H : 폐업 후 는 보건복지부 개인인증서만 허용
		if(userType == 'H'){
			caList_ = getAcceptCertList('3'); 
		}
	}
	
	AnySign.SignDataWithVID("",
    		caList_,
            "a", // aPlain
            20, // aOption
            "", // aDescription
            AnySign.mLimitedTrial,
            "", // 고객번호
            s, 
            gfn_signDataCallback_,
            gfn_errorCallback_);

    // 공인인증서 확인 후 인증결과에 대한 처리 callback 함수
    // aResult와 aResultVid를 서버에 보내 이후 인증 처리를 한다.
    function gfn_signDataCallback_(aResult) {    
    	console.log('signed_msg='+aResult);
        $("#signed_msg").val(aResult);
        send_vid_info(gfn_signDataWithVID_UserCallback);
     };
     function gfn_signDataWithVID_UserCallback(aResultVid){
    	 console.log('vid_msg='+aResultVid);
         $("#vid_msg").val(aResultVid);
         //alert("aResultVid :" + aResultVid);
         
         if($("#modalYn").val()=='Y'){
         	if(typeof gfn_getXecureCertResultModal == 'function'){
         		gfn_getXecureCertResultModal(true);
         	}			
         }
         else{
	         if(typeof gfn_getXecureCertResult == 'function'){
	         	gfn_getXecureCertResult(true);
	         }
         }
             	 
    	 
     };       
     
     function gfn_errorCallback_(aResult){
    	 if (!aResult.msg){
    		 aResult.msg = "Unknown Error";
    	 }   
    	 
    	 if(typeof gfn_getXecureCertResult == 'function'){
    		 gfn_getXecureCertResult(false, "[" + aResult.code + "]" +aResult.msg);
         }else{
        	 alert("[" + aResult.code + "]" +aResult.msg);
         }
     };
}

/*##PHS##*/
function getAcceptCertList(type_){
	//type_ : 1(법인), 2(개인)
	var accept_cert1 = "yessignCA:1.2.410.200005.1.1.5";
	accept_cert1+=",signGATE CA:1.2.410.200004.5.2.1.1:1.2.410.200004.5.2.1.6.141";
	accept_cert1+=",SignKorea CA:1.2.410.200004.5.1.1.7";
	accept_cert1+=",NCASign CA:1.2.410.200004.5.3.1.2:1.2.410.200004.5.3.1.1";
	accept_cert1+=",TradeSignCA:1.2.410.200012.1.1.3:1.2.410.200012.5.4.1.101";
	accept_cert1+=",signGATE CA2:1.2.410.200004.5.2.1.1:1.2.410.200004.5.2.1.6.141";
	accept_cert1+=",NCASignCA:1.2.410.200004.5.3.1.2:1.2.410.200004.5.3.1.1";
	accept_cert1+=",CrossCert Certificate Authority:1.2.410.200004.5.4.1.2";
	
	// 고도화 발급기관 추가 2011.11.14
	accept_cert1 += ",yessignCA Class 1:1.2.410.200005.1.1.5";
	accept_cert1 += ",yessignCA Class 2:1.2.410.200005.1.1.5";
	accept_cert1 += ",yessignCA Class 3:1.2.410.200005.1.1.5";
	
	accept_cert1 +=",signGATE CA4:1.2.410.200004.5.2.1.1:1.2.410.200004.5.2.1.6.141";
	accept_cert1 +=",SignKorea CA2:1.2.410.200004.5.1.1.7";
	accept_cert1 +=",TradeSignCA2:1.2.410.200012.1.1.3:1.2.410.200012.5.4.1.101";
	accept_cert1 +=",CrossCertCA2:1.2.410.200004.5.4.1.2";
	//CA추가 2017.6.20.
	accept_cert1 +=",SignKorea CA3:1.2.410.200004.5.1.1.7";
	accept_cert1 +=",SignKorea CA4:1.2.410.200004.5.1.1.7";
	accept_cert1 +=",CrossCertCA3:1.2.410.200004.5.4.1.2";
	
	accept_cert1 +=",CrossCertCA4:1.2.410.200004.5.4.1.2";
	
	accept_cert1 +=",TradeSignCA3:1.2.410.200012.1.1.3:1.2.410.200012.5.4.1.101";
	accept_cert1 +=",TradeSignCA4:1.2.410.200012.1.1.3:1.2.410.200012.5.4.1.101";
	accept_cert1 +=",signGATE CA5:1.2.410.200004.5.2.1.1:1.2.410.200004.5.2.1.6.141";
	accept_cert1 +=",signGATE CA6:1.2.410.200004.5.2.1.1:1.2.410.200004.5.2.1.6.141";
	//GPKI 인증서 발급기관 추가 2011.12.19
	accept_cert1 +=",CA131000001,CA131000002,CA131000031,CA131000032,CA131100001,CA131100002";
	//GPKI 테스트인증서 발급기관 추가 2011.12.19
	accept_cert1 +=",CA131000031T";

	// 개인 범용인증서 + 용도제한
	var accept_cert2 = "yessignCA:1.2.410.200005.1.1.1:1.2.410.200005.1.1.4";
	accept_cert2+=",signGATE CA2:1.2.410.200004.5.2.1.2:1.2.410.200004.5.2.1.7.1:1.2.410.200004.5.2.1.7.2:1.2.410.200004.5.2.1.7.3";
	accept_cert2+=",SignKorea CA:1.2.410.200004.5.1.1.5:1.2.410.200004.5.1.1.9:1.2.410.200004.5.1.1.9.2";
	accept_cert2+=",CrossCert Certificate Authority:1.2.410.200004.5.4.1.1:1.2.410.200004.5.4.1.101:1.2.410.200004.5.4.1.102:1.2.410.200004.5.4.1.103:1.2.410.200004.5.4.1.104";
	accept_cert2+=",TradeSignCA:1.2.410.200012.1.1.1:1.2.410.200012.1.1.101:1.2.410.200012.1.1.103:1.2.410.200012.1.1.105:1.2.410.200012.1.1.13";

	// 고도화 발급기관 추가 2011.11.14
	accept_cert2+= ",yessignCA Class 1:1.2.410.200005.1.1.1:1.2.410.200005.1.1.4";
	accept_cert2+= ",yessignCA Class 2:1.2.410.200005.1.1.1:1.2.410.200005.1.1.4";
	accept_cert2+= ",yessignCA Class 3:1.2.410.200005.1.1.1:1.2.410.200005.1.1.4";
	
	
	//테스트 인증서를 개인 로그인시에도 보여주기 위해 추가-임시로 추가함. 운영시 삭제 signGATE CA4:1.2.410.200004.5.2.1.1
	accept_cert2+=",signGATE CA4:1.2.410.200004.5.2.1.1:1.2.410.200004.5.2.1.2:1.2.410.200004.5.2.1.7.1:1.2.410.200004.5.2.1.7.2:1.2.410.200004.5.2.1.7.3:1.2.410.200004.5.2.1.5.141";
	accept_cert2+=",SignKorea CA2:1.2.410.200004.5.1.1.5:1.2.410.200004.5.1.1.9:1.2.410.200004.5.1.1.9.2";
	accept_cert2+=",CrossCertCA2:1.2.410.200004.5.4.1.1:1.2.410.200004.5.4.1.101:1.2.410.200004.5.4.1.102:1.2.410.200004.5.4.1.103:1.2.410.200004.5.4.1.104";
	accept_cert2+=",TradeSignCA2:1.2.410.200012.1.1.1:1.2.410.200012.1.1.101:1.2.410.200012.1.1.103:1.2.410.200012.1.1.105:1.2.410.200012.1.1.13";
	//CA추가 2017.6.20.
	accept_cert2+=",SignKorea CA3:1.2.410.200004.5.1.1.5:1.2.410.200004.5.1.1.9:1.2.410.200004.5.1.1.9.2";
	accept_cert2+=",CrossCertCA3:1.2.410.200004.5.4.1.1:1.2.410.200004.5.4.1.101:1.2.410.200004.5.4.1.102:1.2.410.200004.5.4.1.103:1.2.410.200004.5.4.1.104";
	accept_cert2+=",TradeSignCA3:1.2.410.200012.1.1.1:1.2.410.200012.1.1.101:1.2.410.200012.1.1.103:1.2.410.200012.1.1.105:1.2.410.200012.1.1.13";
	accept_cert2+=",signGATE CA5:1.2.410.200004.5.2.1.1:1.2.410.200004.5.2.1.2:1.2.410.200004.5.2.1.7.1:1.2.410.200004.5.2.1.7.2:1.2.410.200004.5.2.1.7.3:1.2.410.200004.5.2.1.5.141";

	accept_cert2+=",signGATE CA6:1.2.410.200004.5.2.1.1:1.2.410.200004.5.2.1.2:1.2.410.200004.5.2.1.7.1:1.2.410.200004.5.2.1.7.2:1.2.410.200004.5.2.1.7.3:1.2.410.200004.5.2.1.5.141:1.2.410.200004.5.2.1.6.141";
	accept_cert2+=",TradeSignCA4:1.2.410.200012.1.1.1:1.2.410.200012.1.1.101:1.2.410.200012.1.1.103:1.2.410.200012.1.1.105:1.2.410.200012.1.1.13";
	accept_cert2+=",CrossCertCA4:1.2.410.200004.5.4.1.1:1.2.410.200004.5.4.1.101:1.2.410.200004.5.4.1.102:1.2.410.200004.5.4.1.103:1.2.410.200004.5.4.1.104";
	accept_cert2+=",SignKorea CA4:1.2.410.200004.5.1.1.5:1.2.410.200004.5.1.1.9:1.2.410.200004.5.1.1.9.2";
	
	//GPKI 인증서 발급기관 추가 2011.12.19
	accept_cert2+=",CA131000001,CA131000002,CA131000031,CA131000032,CA131100001,CA131100002";
	//GPKI 테스트인증서 발급기관 추가 2011.12.19
	accept_cert2+=",CA131000031T";
	
	// H : 페업후 인증기관 (보건복지부 발급 개인인증서만 허용-홍성진과장님-20160410)
	var accept_cert3 = "signGATE CA2:1.2.410.200004.5.2.1.5.141";
	accept_cert3+=",signGATE CA4:1.2.410.200004.5.2.1.5.141";
	accept_cert3+=",signGATE CA5:1.2.410.200004.5.2.1.5.141";
	accept_cert3+=",signGATE CA6:1.2.410.200004.5.2.1.5.141";
			
	if(type_ == '1'){
		return accept_cert1;
	}else if(type_ == '2'){
		return accept_cert2;
	}else if(type_ == '3'){
		return accept_cert3;
	}else{
		return accept_cert1;
	}
}