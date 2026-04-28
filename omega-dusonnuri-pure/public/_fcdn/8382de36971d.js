/*================================   function list   ==================================*
*  데이터호출관련 - 비동기
*  fn_getAddrSiGunGuCd : 시군구 불러오기
*  fn_getAddrHDongCd : 행정동 불러오기
*  fn_getAddrBDongCd : 법정동 불러오기
*  fn_getAddrRiCd : 리 불러오기
*  bfn_getLtcoInfo : 장기요양기관 불러오기
*  bfn_ltcoInfoPop : 장기요양기관 조회 팝업
*  bfn_postNoPop : 우편번호 조회 팝업
*  fn_addComboItem : 콤보박스 생성
*======================================================================================*/

// 수정 2025. 09. 30. / 김기영 / 디지털 서비스 고도화 사업 UI/UX개선

ST = {
	//주소관련 시군구 불러오기
	fn_getAddrSiGunGuCd : function(info, callback){
		var data = {siDoCd: info.siDoCd};
	    var request = gfn_ajaxReqComn("/npbs/add/selectCommonAddrSiGunGuCd", gfn_setJson(data));
	    request.done(function (responseText, statusText, xhr) {
	    	var rtnData = gfn_getJson(responseText);
	        if($.isFunction(callback)) callback(rtnData.addrSiGunGu);
	    });
	},
	//주소관련 행정동
	fn_getAddrHDongCd : function(info, callback){
		var data = {siDoCd: info.siDoCd, siGunGuCd:info.siGunGuCd, hDongCd:info.hDongCd, adptYn:info.adptYn};
	    var request = gfn_ajaxReqComn("/npbs/add/selectCommonAddrHDongCd", gfn_setJson(data));
	    request.done(function (responseText, statusText, xhr) {
	    	var rtnData = gfn_getJson(responseText);
	        if($.isFunction(callback)) callback(rtnData.addrHDong);
	    });
	},
	//주소관련 도로명
	fn_getAddrRoadCd : function(info, callback){
		var data = {siDoCd: info.siDoCd, siGunGuCd:info.siGunGuCd, hDongCd:info.hDongCd, adptYn:info.adptYn};
	    var request = gfn_ajaxReqComn("/npbs/add/selectCommonAddrRoad", gfn_setJson(data));
	    request.done(function (responseText, statusText, xhr) {
	    	var rtnData = gfn_getJson(responseText);
	        if($.isFunction(callback)) callback(rtnData.addrRoad);
	    });
	},
	//주소관련 법정동
	fn_getAddrBDongCd : function(info, callback){
		var data = {siDoCd: info.siDoCd, siGunGuCd:info.siGunGuCd, hDongCd:info.hDongCd, adptYn:info.adptYn};
	    var request = gfn_ajaxReqComn("/npbs/add/selectCommonAddrBDongCd", gfn_setJson(data));
	    request.done(function (responseText, statusText, xhr) {
	    	var rtnData = gfn_getJson(responseText);
	        if($.isFunction(callback)) callback(rtnData.addrBDong);
	    });
	},
	//주소관련 리
	fn_getAddrRiCd : function(info, callback){
		var data = {siDoCd: info.siDoCd, siGunGuCd:info.siGunGuCd, hDongCd:info.hDongCd, bDongCd:info.bDongCd, adptYn:info.adptYn};
	    var request = gfn_ajaxReqComn("/npbs/add/selectCommonAddrRiCd", gfn_setJson(data));
	    request.done(function (responseText, statusText, xhr) {
	    	var rtnData = gfn_getJson(responseText);
	        if($.isFunction(callback)) callback(rtnData.addrRi);
	    });
	},
	
	//장기요양기관 불러오기
	bfn_getLtcoInfo : function(value, callback){
		var data = {ltcoNm : value};
		var request = gfn_ajaxReqComn("/npbs/t/z/150/selectCommonLtcoInfo", gfn_setJson(data));
		request.done(function (responseText, statusText, xhr) {
			var rtnData = gfn_getJson(responseText);
	        if($.isFunction(callback)) callback(rtnData.asynLtcoInfo);
		});
	},
	
	//사용코드조회 불러오기(TBNYPZ32)
	bfn_getSelectCommonBizCodeList : function(info, callback){
		var data = {ltcBaseCdPttn : info.ltcBaseCdPttn, baseCdUseBusiTypeCd : info.baseCdUseBusiTypeCd};
		var request = gfn_ajaxReqComn("/npbs/code/selectCommonBizCodeList", gfn_setJson(data));
		request.done(function (responseText, statusText, xhr) {
			var rtnData = gfn_getJson(responseText);
			var rtn = "rtnData.code"+info.ltcBaseCdPttn;
	        if($.isFunction(callback)) callback(eval(rtn));
		});
	},
	
	//공통코드조회 불러오기 - 단건 (TBNYPZ31)
	bfn_getSelectCommonCode : function(info, callback){
		var data = {ltcBaseCdPttn : info.ltcBaseCdPttn, ltcBaseCd : info.ltcBaseCd};
		var request = gfn_ajaxReqComn("/npbs/code/selectCommonCode", gfn_setJson(data));
		request.done(function (responseText, statusText, xhr) {
			var rtnData = gfn_getJson(responseText);
			if($.isFunction(callback)) callback(rtnData);
		});
	},
	
	//공통코드조회 불러오기 - 리스트 (TBNYPZ31)
	bfn_getSelectCommonCodeList : function(info, callback){
		var data = {ltcBaseCdPttn : info.ltcBaseCdPttn};
		var request = gfn_ajaxReqComn("/npbs/code/selectCommonCodeList", gfn_setJson(data));
		request.done(function (responseText, statusText, xhr) {
			var rtnData = gfn_getJson(responseText); 
			var rtn = "rtnData.code"+info.ltcBaseCdPttn;
	        if($.isFunction(callback)) callback(eval(rtn)); 
			
		});
	},
	
	//공통코드조회 불러오기 info 파라미터 그대로 전송
	bfn_getSelectCommonCodeDescList : function(info, callback){
	    var request = gfn_ajaxReqComn("/npbs/code/selectCommonCodeList", gfn_setJson(info));
	    request.done(function (responseText, statusText, xhr) {
	    	var rtnData = gfn_getJson(responseText); 
			var rtn = "rtnData.code"+info.ltcBaseCdPttn;
	        if($.isFunction(callback)) callback(eval(rtn)); 
	    });
	}
};

var popup = null;
RT = {
	
	bfn_ltcoInfoPop : function(){
		if (!popup || popup.closed) {
	        var url = "/npbs/t/z/150/selectLtcoInfoList";
	        popup = gfn_openPupComn(url, "selectLtcoInfoList", 500, 680);
	    }
	    popup.focus();
	},
	
	bfn_postNoPop : function(){
		if (!popup || popup.closed) {
	        //var url = "${pageContext.request.contextPath}/t/z/120/selectPostNoList";
			var url = "/npbs/t/z/120/selectPostNoList";
	        popup = gfn_openPupComn(url, "selectPostNoList", 500, 680);
	    }
	    popup.focus();
	}
};


//펑션관련
//20120909  --> 2012-09-09
ST.fn_hypenDt = function(str, gbn){
	if(str == null || str == undefined) return;
	if(str.length == 6){
		var year = str.substring(0,4);
		var month = str.substring(4,6);
		if(gbn == null) gbn = "-";
		return year + gbn + month
	}
	var year = str.substring(0,4);
	var month = str.substring(4,6);
	var day = str.substring(6,8);
	if(gbn == null) gbn = "-";
	return year + gbn + month + gbn + day;
};


/*	옵션 <option 테그 만든다
 *  사용법 : ST.fn_addComboItem("id","0","선택");
 */
ST.fn_addComboItem = function(id, value, text){
	var reObj = "#"+id;
	$(reObj).append('<option value="'+value+'">'+text+'</option>');
};


/*	nvl
 *  사용법 : ST.fn_nvl(object,"2");
 *  return : object 가 널일경우 replace값 리턴 널이 아니면 object 리턴
 */
ST.fn_nvl = function(obj, replace){
	if(obj == null || obj == undefined || obj =="") return replace;
	return obj;
};


/*	checkDigits
 *  사용법 : onblur="ST.fn_checkDigits(this)";
 *  return : 3자리마다 컴마(,)를 넣어주는 함수
 */
ST.fn_checkDigits = function(obj){
	var s = obj.value;
	for(var j=0;j<s.length;j++){
		s = obj.value.replace(/,/g,"");
	}
	var t="";
	var i;
	var j=0;
	var tLen = s.length;
	if(s.length<=3){
		obj.value=s;
		return;
	}
	for(var i=0;i<tLen;i++){
		if(i != 0 && (i%3 == tLen %3)) t += ",";
		if(i<s.length) t += s.charAt(i);
	}
	obj.value = t;
	return;
};

/*	3자리마다 콤마 찍어주는 함수
 *  사용법 : ST.fn_numberComma(obj);
 *  return : ex) 4,444,444 
 */
ST.fn_numberComma = function(obj){
	var reg = /(^[+-]?\d+)(\d{3})/;
	var n = obj;
	while(reg.test(n)){
		n = n.replace(reg,'$1'+','+'$2');
	}
	return n;
};

/*	콤마 들어가 있는 값에서 콤마 제거
 *  사용법 : ST.fn_numberCommaRemove(obj);
 *  return : ex) 4444444 
 */
ST.fn_numberCommaRemove = function(obj){
	return obj.replace(eval(/,/g),"");
};

/*	숫자만 입력받는 함수
 *  사용법 : 
 *  $("#repr_hp_no").keydown(function(event){
		ST.fn_onlyNumber(event);
	});
 *  return : 
 */
ST.fn_onlyNumber = function(obj){
    obj = obj || window.event;
    
    var keyCode = (obj.which) ? obj.which : obj.keyCode;
    if(!((!obj.shiftKey && keyCode >= 48 && keyCode <= 57) || //숫자열 0~9
       (keyCode >= 96 && keyCode <= 105) || //키패드 0~9
       keyCode == 8 ||  //BackSpapce
       keyCode == 46 || //Delete
       keyCode == 37 || //LEFT ARROW KEY
       keyCode == 39 || //RIGHT ARROW KEY
       keyCode == 35 || //End KEY
       keyCode == 36 || //Home KEY
       keyCode == 9  || //Tab KEY
       keyCode == 13 || //Enter KEY
       keyCode == 46 || 
       keyCode == 86 || 
       keyCode == 144 ||
       keyCode == 110 ||
       keyCode == 190
       )) obj.preventDefault();
       
       setTimeout(function(){
       	obj.target.value = obj.target.value.replace(/[^0-9]/gi, "");
       },0)
       
};

/*	영문숫자만 입력받는 함수
 *  사용법 : 
 *  $("#ltc_mem_id").keydown(function(event){
		ST.fn_onlyEngNumber(event);
	});
 *  return : 
 *  
 
		
 */
ST.fn_onlyEngNumber = function(obj){
    obj = obj || window.event;
    var keyCode = (obj.which) ? obj.which : obj.keyCode;
    if(!((!obj.shiftKey && keyCode >= 48 && keyCode <= 57) || //숫자열 0~9
      (keyCode >= 96 && keyCode <= 105) || //키패드 0~9
      (keyCode >= 65 && keyCode <= 90) || //A~Z
      (keyCode >= 97 && keyCode <= 122) || //a~z
       keyCode == 8  || //BackSpapce
       keyCode == 9  || //Tab KEY
       keyCode == 46 || //Delete
       keyCode == 37 || //LEFT ARROW KEY
       keyCode == 39 || //RIGHT ARROW KEY
       keyCode == 35 || //End KEY
       keyCode == 36 || //Home KEY
       keyCode == 13 || //Enter KEY
       keyCode == 86 || 
       keyCode == 144 ||
       keyCode == 110 ||
       keyCode == 190
       )) obj.preventDefault();
       
	setTimeout(function(){
   	 obj.target.value = obj.target.value.replace(/[^A-Za-z0-9]/gi, "");
    },0)
    
};

/*	문자열이 숫자로만 되어있는지 확인하는 함수
 *  사용법 : 
 
		if(!ST.fn_isNumber($("#etrc_psnum").val())){ gfn_alert("숫자만 입력 가능합니다."); $("#etrc_psnum").focus(); return false;}
		 		 
 *  return : 
 */
ST.fn_isNumber = function(str){
	var isMatch = str.match(/[^0-9]/);
	if(isMatch == null)
		return true;
	return false;
};

/*	한글만 입력받는 함수
 *  사용법 : 
 *  $("#repr_hp_no").keypress(function(event){
		ST.fn_onlyHanGul(event);
	});
 *  return : 
 */
ST.fn_onlyHanGul = function(obj){
	
	let key = obj.witch || obj.keyCode;
	let onlyHanGul = (0xAC00 <= key && key <= 0xD7A3);
	// BackSpapce 방향키등 허용
	let keyControl = (
	   key == 8  || //BackSpapce
       key == 9  || //Tab KEY
       key == 46 || //Delete
       key == 37 || //LEFT ARROW KEY
       key == 39 || //RIGHT ARROW KEY
       key == 35 || //End KEY
       key == 36 || //Home KEY
       key == 13  //Enter KEY
       
       );

   	if (!(onlyHanGul ||keyControl )) {
		obj.preventDefault();
	}
};


/*	주민등록 마스크
 */
ST.fn_juminMask = function(str){
	var jumin1 = str.substring(0,6);
	var jumin2 = str.substring(6,7);
	
	return jumin1+"-"+jumin2+"******";
};

/*	문자열 변환
 */
ST.fn_replaceAll = function(obj, st, tr){
	if(obj != null){
		var ln = obj.length;
		for(var i=0; i< ln; i++){
			obj = obj.replace(st,tr);
		}
	}
	return obj;
};

/*	UI의 input 요소를 제한된 기간선택 datepicker 요소로 설정하는 함수
 */
ST.fn_setRstrSnglCal = function(calElmt, defaultDt, rstrStrtDt, rstrToDt, callback){
	
	if (!calElmt) return;
    if (!$.datepicker) return;
    
    var calDt = calElmt.val() || defaultDt;
    calDt = ifn_translateDateFormat(calDt);
    calElmt.val(calDt);
    
    var option = gfn_copyJson(DATEPICKER_OPTIONS);
    if(rstrStrtDt) option.minDate = ifn_translateDateFormat(rstrStrtDt);
    if(rstrToDt) option.maxDate = ifn_translateDateFormat(rstrToDt);
    calElmt.npdatepicker(option).inputmask(DATEPICKER_INPUT_MASK,{postValidation: ifn_toPostValidationCallback});
    
    function ifn_translateDateFormat(dateString) {
    	if (!dateString) return "";
        return dateString.replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3");
    }
    
    function ifn_toPostValidationCallback(args, opts) {
        var inputVal = args.join("").replace(/[^0-9]/g, "");
        var returnVal = ifn_postValidationCallback(inputVal);
        var calVal = calElmt.val().replace(/[^0-9]/g, "");
        if (calVal) {
            var val = calVal.substr(0, inputVal.length);
            if (inputVal < val) return false;
        }
        return returnVal;
    }
    
    function ifn_postValidationCallback(inputVal) {
        if (rstrStrtDt) {
            var rstrStrtVal = rstrStrtDt.replace(/[^0-9]/g, "").substr(0, inputVal.length);
            if (inputVal < rstrStrtVal) return false;
        }
        if (rstrToDt) {
            var rstrToVal = rstrToDt.replace(/[^0-9]/g, "").substr(0, inputVal.length);
            if (inputVal > rstrToVal) return false;
        }
        return true;
    }
    
}

