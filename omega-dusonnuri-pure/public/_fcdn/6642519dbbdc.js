/*
파일명             : np_common.js
화면제목           : 시스템 공통 스크립트
최초작성자         : 이종학
최초작성일자       : 2015. 4. 6.
변경이력
====================================================================================================
    변경일자    / 변경자 / 변경내용
====================================================================================================
2015. 4. 6. / 이종학 / 신규
2025. 09. 30. / 문수민 / 디지털 서비스 고도화 사업 UI/UX개선

*/
/*
함수목록
====================================================================================================
    함수명                  / 설명
====================================================================================================
gfn_submit                  / submit 함수
gfn_validate                / 유효성 검증기 생성 함수
gfn_addRules                / 유효성 규칙 추가 함수
gfn_removeRules             / 유효성 규칙 제거 함수
gfn_addCheckCountValidator  / CheckCount custom validator 추가 함수
gfn_openPup                 / 팝업창 열기 함수
gfn_openPostPup				/ POST로 팝업창 열기 함수
gfn_setPagination           / 페이징이 존재하는 화면의 pagination 처리 함수
gfn_getJson                 / json 문자열을 객체로 파싱하는 함수
gfn_setJson                 / json 객체를 문자열로 변환하는 함수
gfn_copyJson                / json 객체를 복사하여 새로운 json객체를 생성하는 함수
ifn_ajaxReq                 / ajax 요청 처리 내부 함수
gfn_ajaxReq                 / ajax 요청 비동기 처리 함수
gfn_ajaxReqSync             / ajax 요청 동기 처리 함수
ifn_showErrMsg              / ajax 요청 처리 후 오류가 발생할 경우 해당 오류를 표시해 주는 내부 함수
gfn_createEmailSplr         / email 입력 UI의 email 공급자를 선택할 수 있는 select 요소를 생성하는 함수
gfn_setEventHandleForEmail  / email 입력 UI에 event 핸들러를 설정하여 해당 요소들의 변경사항을 email Input 요소에 반영할 있도록 설정하는 함수
gfn_setEmailInfo            / email 입력 UI에 값을 설정하는 함수
gfn_createLocNo             / 전화번호 입력 UI의 지역번호를 생성하는 함수
gfn_setSnglCal              / UI의 input 요소들을 datepicker 요소로 설정하는 함수
gfn_setRangeCal             / UI의 input 요소를 기간선택 datepicker 요소로 설정하는 함수
gfn_setRstrRangeCal         / UI의 input 요소를 제한된 기간선택 datepicker 요소로 설정하는 함수
ifn_setRstrRangeCal			/ UI의 input 요소를 제한된 기간선택 datepicker 요소로 설정하는 내부 함수
gfn_alert                   / 알림창을 보여주는 함수
gfn_confirm					/ 확인창을 보여주는 함수
gfn_validConfirm			/ 특정 폼에 대한 유효성 검사를 수행하고 유효성에 문제가 없다면 확인창을 보여주는 함수
gfn_spinStart				/ 화면에 로딩 스핀을 표시하는 함수
gfn_spinStop				/ 화면에 표시된 로딩 스핀을 제거하는 함수
gfn_lpad                    / 문자열의 좌측에 특정 문자를 삽입하는 함수 
gfn_rpad                    / 문자열의 우측에 특정 문자를 입력하는 함수
gfn_formInit                / form 초기화 함수
gfn_reportOpen				/ 레포트 오픈 함수
*/

/*
 * submit 함수
 * form::jqueryObject >> 서버로 전송하고자 하는 form 요소
 * isPaging::Boolean >> 페이징 처리에서 호출 여부
 */
function gfn_submit(form, isPaging) {
    if (!isPaging) // 자신을 호출한 함수가 pagination 처리 함수가 아니라면 조회 후 페이지 no를 1로 설정한다.
        form.find("#cu_pag_no").val(1);

    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
    
    if (typeof AnySign == "undefined" || typeof s == "undefined" || s == "" || s ==undefined || portalMediType=="M")  {	
    	
    	gfn_spinStart();
    	form.submit();
    	
    } else {        	
    	if(form.valid()){
    		var tmpForm = document.getElementById(form.attr("id"));
            for (var k = 0; k < tmpForm.elements.length; k++) {
                if (tmpForm.elements[k].value != undefined && tmpForm.elements[k].value!= "undefined" &&  tmpForm.elements[k].value == "") {
                	
                	/* 2021 플러그인 제거 사업 */
                	//if(tmpForm.elements[k].type.indexOf("select") != -1 ){
                		//gfn_addComboItem(tmpForm.elements[k].id,"#999999999#", "전체");
                		//tmpForm.elements[k].value = "#999999999#";
                			
                	//}
                }
            }
//    		AnySign.XecureSubmit(document.getElementById(form.attr("id")), "");
			gfn_spinStart();
            document.getElementById(form.attr("id")).submit();

    	}
    }
    
    
    
}

function gfn_submitReport(form, isPaging) {
    if (!isPaging) // 자신을 호출한 함수가 pagination 처리 함수가 아니라면 조회 후 페이지 no를 1로 설정한다.
        form.find("#cu_pag_no").val(1);

    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
    
    if (typeof AnySign == "undefined" || typeof s == "undefined" || s == "" || s ==undefined || portalMediType=="M")  {	
    	
    	form.submit();
    	
    } else {        	
    	if(form.valid()){
    		var tmpForm = document.getElementById(form.attr("id"));
            for (var k = 0; k < tmpForm.elements.length; k++) {
                if (tmpForm.elements[k].value != undefined && tmpForm.elements[k].value!= "undefined" &&  tmpForm.elements[k].value == "") {
                	
                	/* 2021 플러그인 제거 사업 */
                	//if(tmpForm.elements[k].type.indexOf("select") != -1 ){
                		//gfn_addComboItem(tmpForm.elements[k].id,"#999999999#", "전체");
                		//tmpForm.elements[k].value = "#999999999#";
                			
                	//}
                }
            }
//    		AnySign.XecureSubmit(document.getElementById(form.attr("id")), "");
            document.getElementById(form.attr("id")).submit();

    	}
    }
    
    
    
}

function gfn_addComboItem(id, value, text){
	var reObj = "#"+id;
	$(reObj).append('<option value="'+value+'">'+text+'</option>');
};


function gfn_submitComn(form, isPaging){
	if (!isPaging) // 자신을 호출한 함수가 pagination 처리 함수가 아니라면 조회 후 페이지 no를 1로 설정한다.
        form.find("#cu_pag_no").val(1);
	gfn_spinStart();
	form.submit();
}

/*
 * 유효성 검증기 생성 함수
 * form::jqueryObject >> 요효성을 검증하고자 하는 form 요소
 * isDebug::Boolean >> 서버사이드 유효성 검증 테스트를 위해 form submit 발생시 유효성 검증을 하지 않는다.
 */
function gfn_validate(form, isDebug) {
	/*
    return form.validate({
        onsubmit: !isDebug,
        onkeyup: false,
        onclick: false,
        onfocusout: false,
        ignoreTitle: true,
        errorLabelContainer: "#msg_box ul",
        errorElement: "li",
        rules: RULES || {},
        messages: MESSAGES || {},
        invalidHandler: function(event, validator) {
            $("#msg_box div:has(span)").remove();
            $("#msg_box ul").addClass("err_label_container").css("visibility", "visible");
        }
    });
    */
    return form.validate({
    	isEnableEvents: false,
        onsubmit: !isDebug,
        onfocusout: function( element ) {
        	if (!this.settings.isEnableEvents) return false;
			if ( !this.checkable( element ) && ( element.name in this.submitted || !this.optional( element ) ) ) {
				this.element( element );
			}
		},
        onkeyup: function( element, event ) {
        	if (!this.settings.isEnableEvents) return false;
			if ( event.which === 9 && this.elementValue( element ) === "" ) {
				return;
			} else if ( element.name in this.submitted || element === this.lastElement ) {
				this.element( element );
			}
		},
        onclick: function( element ) {
        	if (!this.settings.isEnableEvents) return false;
			// click on selects, radiobuttons and checkboxes
			if ( element.name in this.submitted ) {
				this.element( element );

			// or option elements, check parent select in that case
			} else if ( element.parentNode.name in this.submitted ) {
				this.element( element.parentNode );
			}
		},
        ignore: [],
        ignoreTitle: true,
        errorElement: "p",
        errorClass: "form-hint-invalid",
        errorPlacement: function (error, element) {
            element.closest('.form-group').addClass("is-error");
        	error.appendTo(element.closest('.form-group'));
        },
        rules: RULES || {},
        messages: MESSAGES || {},
        groups: GROUPS || {}
    });
}

function gfn_validate_temp(form, isDebug) {
    return form.validate({
    	isEnableEvents: false,
        onsubmit: !isDebug,
        onfocusout: function( element ) {
        	if (!this.settings.isEnableEvents) return false;
			if ( !this.checkable( element ) && ( element.name in this.submitted || !this.optional( element ) ) ) {
				this.element( element );
			}
		},
        onkeyup: function( element, event ) {
        	if (!this.settings.isEnableEvents) return false;
			if ( event.which === 9 && this.elementValue( element ) === "" ) {
				return;
			} else if ( element.name in this.submitted || element === this.lastElement ) {
				this.element( element );
			}
		},
        onclick: function( element ) {
        	if (!this.settings.isEnableEvents) return false;
			// click on selects, radiobuttons and checkboxes
			if ( element.name in this.submitted ) {
				this.element( element );

			// or option elements, check parent select in that case
			} else if ( element.parentNode.name in this.submitted ) {
				this.element( element.parentNode );
			}
		},
        ignore: [],
        ignoreTitle: true,
        errorElement: "p",
        errorClass: "form-hint-invalid",
        errorPlacement: function (error, element) {
        	element.closest('.form-group').addClass("is-error");
        	error.appendTo(element.closest('.form-group'));
        },
        rules: RULES || {},
        messages: MESSAGES || {},
        groups: GROUPS || {}
    });
}

function gfn_validate_focus(form, isDebug) {
    return form.validate({
    	isEnableEvents: false,
        onsubmit: !isDebug,
        onfocusout: function( element ) {
        	if (!this.settings.isEnableEvents) return false;
			if ( !this.checkable( element ) && ( element.name in this.submitted || !this.optional( element ) ) ) {
				this.element( element );
			}
		},
        onkeyup: function( element, event ) {
        	if (!this.settings.isEnableEvents) return false;
			if ( event.which === 9 && this.elementValue( element ) === "" ) {
				return;
			} else if ( element.name in this.submitted || element === this.lastElement ) {
				this.element( element );
			}
		},
        onclick: function( element ) {
        	if (!this.settings.isEnableEvents) return false;
			// click on selects, radiobuttons and checkboxes
			if ( element.name in this.submitted ) {
				this.element( element );

			// or option elements, check parent select in that case
			} else if ( element.parentNode.name in this.submitted ) {
				this.element( element.parentNode );
			}
		},
        ignore: [],
        ignoreTitle: true,
        errorElement: "p",
        errorClass: "form-hint-invalid",
        errorPlacement: function (error, element) {
            element.closest('.form-group').addClass("is-error");
        	error.appendTo(element.closest('.form-group'));
        },
        rules: RULES || {},
        messages: MESSAGES || {},
        groups: GROUPS || {},
        invalidHandler: function(event, validator) {
        	var errors = validator.numberOfInvalids();
        	if(errors){
            	var parentObj_;
        		var firstId_ = validator.errorList[0].element.id;
        		if ($("#"+firstId_).is(":radio")){
            		parentObj_ = $("#"+firstId_).parent();
                }else if ($("#"+firstId_).is(":checkbox")){
            		parentObj_ = $("#"+firstId_).parent().parent();
                }else{
            		parentObj_ = $("#"+firstId_).parent();
                }
        		
        		parentObj_.find("input[type='text'], select, textarea, input[type='checkbox'], input[type='radio']").each(function(idx, obj) {
                    var ids = obj.id;                    
                	var tag_ = ($(this).prop("tagName")).toLowerCase();
                	var type_ = tag_ == 'input' ? ($(this).attr("type")).toLowerCase():'' ;
                	var flag_ = false;
                	if(ids != undefined){
                		/*if(tag_ == 'select'){
                			$("#"+ids).siblings(".ui-selectmenu-button")[0].focus(); 
                			flag_ = true;
                		}else */
                		if(tag_ == 'input' && type_ == 'hidden'){
                			flag_ = false;
                		}else{
                			gfn_alert('필수입력사항을 확인해 주세요.');
                			$("#"+ids).focus();
                			flag_ = true;
                		}
                	}else{
                		ids = obj.name;
                		/*if(tag_ == 'select'){
                			$( "select[name='" + ids + "']" ).siblings(".ui-selectmenu-button")[0].focus();
                			flag_ = true;
                		}else */
                		if(tag_ == 'input' && type_ == 'hidden'){
                			flag_ = false;
                		}else{
                			gfn_alert('필수입력사항을 확인해 주세요.');
                			$( tag_+"[name='" + ids + "']" ).focus();
                			flag_ = true;
                		}
                	} 
                    if(flag_) return false;
                });
        	}
        }
    });
}
/*
 * 유효성 규칙 추가 함수
 * rules::Object >> 추가하고자 하는 유효성 규칙을 정의한 객체
 */
function gfn_addRules(rules) {
    for (var rule in rules) $("#"+rule).rules("add", rules[rule]);
}

/*
 * 유효성 규칙 제거 함수
 * rules::Object >> 제거하고자 하는 유효성 규칙을 정의한 객체
 */
function gfn_removeRules(rules) {
    for (var rule in rules) $("#"+rule).rules("remove");
}

/*
 * CheckCount custom validator 추가 함수
 */
function gfn_addCheckCountValidator() {
    $.validator.addMethod("checkCount", $.validator.methods.minlength, $.validator.format("{0}개 이상 선택해야 합니다."));
}

/*
 * 팝업창 열기 함수
 * url::String >> 팝업창에 표시하고자 하는 화면의 url
 * name::String >> 팝업창 이름
 * height::Number >> 팝업창 높이
 * width::Number >> 팝업창 너비
 * scroll::String >> 스크롤 사용여부 (기본값 : no)			//2015.06.15 남지원 추가
 */
function gfn_openPup(url, name, height, width, scroll) {
    var positionTop = window.screenY || window.screenTop || 0;
    var positionLeft = window.screenX || window.screenLeft || 0;
    var top = positionTop + (screen.height - height)/2;
    var left = positionLeft + (screen.width - width)/2;
    var sScroll = "no";
    if (scroll != null )  sScroll = "yes";
    var formalSpecs = "menubar=no, status=no, scrollbars="+sScroll+", resizable=no";
    var specs = formalSpecs + ", top=" + top + ", left=" + left + ", height=" + height + ", width=" + width;
    /*
    specs - 속성명=값 형태이며 ,를 구분자로 사용
    height=pixel: 윈도우 높이
    left=pixel: 윈도우의 좌측 위치
    menubar=yes|no|1|0: 메뉴바 표시 여부
    status=yes|no|1|0: 상태바 표시 여부
    titlebar=yes|no|1|0: 타이틀바 표시 여부
    top=pixel: 윈도우의 상단 위치
    width=pixel: 윈도우의 너비
    */
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
//    if (typeof AnySign != "undefined" && typeof s != "undefined") {    
//    	return AnySign.XecureNavigate(url, name, specs);
//    }else{
    	//return window.open(url, name, specs, null);
    return window.open(url, name, specs);
//    }
}

function gfn_openModalPop(id, param ,event) {
	krds_modal.openModalCustom(id, param, event);
}
function gfn_closeModalPop(id, event) {
	krds_modal.closeModal(id, event);
}

function gfn_openPopMobile(type) {
	var height = 576;
	var width = 420;
    var positionTop = window.screenY || window.screenTop || 0;
    var positionLeft = window.screenX || window.screenLeft || 0;
    var top = positionTop + (screen.height - height)/2;
    var left = positionLeft + (screen.width - width)/2;
    var sScroll = "no";
    if (scroll != null )  sScroll = "yes";
    var formalSpecs = "menubar=no, status=no, scrollbars="+sScroll+", resizable=no";
    var specs = formalSpecs + ", top=" + top + ", left=" + left + ", height=" + height + ", width=" + width;
    
    
    var url = "/npbs/auth/mobile/requestKmc.web";
    if (type=='real') {
    	url = "/npbs/auth/mobile/requestKmc.web";
    }
    else{
		url = "/npbs/auth/mobile/requestTest.web";    
    }
    
    return window.open(url, 'DRMOKWindow', specs);
}

function gfn_openPupComn(url, name, height, width, scroll) {
    var positionTop = window.screenY || window.screenTop || 0;
    var positionLeft = window.screenX || window.screenLeft || 0;
    var top = positionTop + (screen.height - height)/2;
    var left = positionLeft + (screen.width - width)/2;
    var sScroll = "no";
    if (scroll != null )  sScroll = "yes";
    var formalSpecs = "menubar=no, status=no, scrollbars="+sScroll+", resizable=no";
    var specs = formalSpecs + ", top=" + top + ", left=" + left + ", height=" + height + ", width=" + width;
    
    //return window.open(url, name, specs,null);
    return window.open(url, name, specs);
}

/*
 * POST로 팝업창 열기 함수
 * form::jqueryObject >> 전송하려는 form 요소
 * name::String >> 팝업창 이름
 * height::Number >> 팝업창 높이
 * width::Number >> 팝업창 너비
 * scroll::String >> 스크롤 사용여부 (기본값 : no)			//2015.06.15 남지원 추가
 * isEncryption >> 팝업창 요청에 대한 데이터 암호화 여부
 */
function gfn_openPostPup(form, name, height, width, scroll) {
    var positionTop = window.screenY || window.screenTop || 0;
    var positionLeft = window.screenX || window.screenLeft || 0;
    var top = positionTop + (screen.height - height)/2;
    var left = positionLeft + (screen.width - width)/2;
    var sScroll = "no";
    if (scroll != null )  sScroll = "yes";
    var formalSpecs = "menubar=no, status=no, scrollbars="+sScroll+", resizable=no";
    var specs = formalSpecs + ", top=" + top + ", left=" + left + ", height=" + height + ", width=" + width;
    /*
    specs - 속성명=값 형태이며 ,를 구분자로 사용
    height=pixel: 윈도우 높이
    left=pixel: 윈도우의 좌측 위치
    menubar=yes|no|1|0: 메뉴바 표시 여부
    status=yes|no|1|0: 상태바 표시 여부
    titlebar=yes|no|1|0: 타이틀바 표시 여부
    top=pixel: 윈도우의 상단 위치
    width=pixel: 윈도우의 너비
    */

    var preTarget_ = form.prop("target");
    form.prop("target", name);    
    
	var post_popup = window.open(WEB_FULL_PATH + CONTEXT_PATH + "/t/z/500/selectComnonLoadingPop", name, specs, null);
		
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/	
//	if (typeof AnySign != "undefined" && typeof s != "undefined") {
//    	if(form.valid()){
//    		AnySign.XecureSubmit(document.getElementById(form.attr("id")), "");
//    	}
//    } else {
        form.submit();
//    }
    form.prop("target", preTarget_);   
    return post_popup;
}
function gfn_openPostPupComn(form, name, height, width, scroll) {
    var positionTop = window.screenY || window.screenTop || 0;
    var positionLeft = window.screenX || window.screenLeft || 0;
    var top = positionTop + (screen.height - height)/2;
    var left = positionLeft + (screen.width - width)/2;
    var sScroll = "no";
    if (scroll != null )  sScroll = "yes";
    var formalSpecs = "menubar=no, status=no, scrollbars="+sScroll+", resizable=no";
    var specs = formalSpecs + ", top=" + top + ", left=" + left + ", height=" + height + ", width=" + width;
    /*
    specs - 속성명=값 형태이며 ,를 구분자로 사용
    height=pixel: 윈도우 높이
    left=pixel: 윈도우의 좌측 위치
    menubar=yes|no|1|0: 메뉴바 표시 여부
    status=yes|no|1|0: 상태바 표시 여부
    titlebar=yes|no|1|0: 타이틀바 표시 여부
    top=pixel: 윈도우의 상단 위치
    width=pixel: 윈도우의 너비
    */
    var preTarget_ = form.prop("target");
    form.prop("target", name);
	var post_popup = window.open("", name, specs, null);
	form.submit();
	form.prop("target", preTarget_);   
    return post_popup;
}


/*
 * 팝업창 열기 함수(연계팝업)
 * url::String >> 팝업창에 표시하고자 하는 화면의 url
 * name::String >> 팝업창 이름
 * height::Number >> 팝업창 높이
 * width::Number >> 팝업창 너비
 * scroll::String >> 스크롤 사용여부 (기본값 : no)			
 */ 
function gfn_openConnPup(url, name, height, width, scroll) {
	var positionTop = window.screenY || window.screenTop || 0;
    var positionLeft = window.screenX || window.screenLeft || 0;
    var top = positionTop + (screen.height - height)/2;
    var left = positionLeft + (screen.width - width)/2;
    var sScroll = "no";
    if (scroll != null )  sScroll = "yes";
    var formalSpecs = "menubar=no, status=no, scrollbars="+sScroll+", resizable=no";
    var specs = formalSpecs + ", top=" + top + ", left=" + left + ", height=" + height + ", width=" + width;
    
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/	
	if (typeof AnySign != "undefined" && typeof s != "undefined" && s != "" && s !=undefined && portalMediType !="M")  {   
    	if(!name){
        	name="openConnPup";
        }
    	var returnPop = window.open("", name, specs, null);
    	
//		AnySign.XecureNavigate(WEB_FULL_PATH + CONTEXT_PATH + "/t/z/500/selectComnonLoadingPostPop?paramUrl="+encodeURIComponent(url), name);
    	window.open(WEB_FULL_PATH + CONTEXT_PATH + "/t/z/500/selectComnonLoadingPostPop?paramUrl="+encodeURIComponent(url), name, null);
		
    	return returnPop;
    }else{
    	return window.open(url, name, specs, null);
    }
}

/*
 * 팝업창 열기 함수(연계팝업)
 * url::String >> 팝업창에 표시하고자 하는 화면의 url
 * name::String >> 팝업창 이름
 * height::Number >> 팝업창 높이
 * width::Number >> 팝업창 너비
 * scroll::String >> 스크롤 사용여부 (기본값 : no)			
 */ 
function gfn_openConnPupmedi(url, name, height, width, scroll) {
	var positionTop = window.screenY || window.screenTop || 0;
    var positionLeft = window.screenX || window.screenLeft || 0;
    var top = positionTop + (screen.height - height)/2;
    var left = positionLeft + (screen.width - width)/2;
    var sScroll = "no";
    if (scroll != null )  sScroll = "yes";
    var formalSpecs = "menubar=no, status=no, scrollbars="+sScroll+", resizable=no";
    var specs = formalSpecs + ", top=" + top + ", left=" + left + ", height=" + height + ", width=" + width;
    
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/	
	/*if (typeof AnySign != "undefined" && typeof s != "undefined" && s != "" && s !=undefined && portalMediType !="M")  {   
    	if(!name){
        	name="openConnPup";
        }
    	var returnPop = window.open("", name, specs, null);
    	
//		AnySign.XecureNavigate(WEB_FULL_PATH + CONTEXT_PATH + "/t/z/500/selectComnonLoadingPostPop?paramUrl="+encodeURIComponent(url), name);
    	window.open(WEB_FULL_PATH + CONTEXT_PATH + "/t/z/500/selectComnonLoadingPostPop?paramUrl="+encodeURIComponent(url), name, null);
		
    	return returnPop;
    }else{
    	return window.open(url, name, specs, null);
    }*/
	
	return window.open(url, name, specs, null);
	
}




function gfn_openConnPostPup(form, name, height, width, scroll) {
    var positionTop = window.screenY || window.screenTop || 0;
    var positionLeft = window.screenX || window.screenLeft || 0;
    var top = positionTop + (screen.height - height)/2;
    var left = positionLeft + (screen.width - width)/2;
    var sScroll = "no";
    if (scroll != null )  sScroll = "yes";
    var formalSpecs = "menubar=no, status=no, scrollbars="+sScroll+", resizable=no";
    var specs = formalSpecs + ", top=" + top + ", left=" + left + ", height=" + height + ", width=" + width;
    /*
    specs - 속성명=값 형태이며 ,를 구분자로 사용
    height=pixel: 윈도우 높이
    left=pixel: 윈도우의 좌측 위치
    menubar=yes|no|1|0: 메뉴바 표시 여부
    status=yes|no|1|0: 상태바 표시 여부
    titlebar=yes|no|1|0: 타이틀바 표시 여부
    top=pixel: 윈도우의 상단 위치
    width=pixel: 윈도우의 너비
    */

    var preTarget_ = form.prop("target");
    form.prop("target", name);    
    
	var post_popup = window.open(WEB_FULL_PATH + CONTEXT_PATH + "/t/z/500/selectComnonLoadingPop", name, specs);
	
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
//    if (typeof AnySign != "undefined" && typeof s != "undefined" && s != "" && s !=undefined ) {   
//    	if(form.valid()){
//    		AnySign.XecureSubmitpop(document.getElementById(form.attr("id")), "");
//    	}
//    } else {
        form.submit();
//    }
    form.prop("target", preTarget_);   
    return post_popup;
}
/*
 * 페이징이 존재하는 화면의 pagination 처리 함수
 * paginationInfo::Object >> pagination 정보 객체
 * paginationId::String >> pagination을 wrapping하고 있는 div 요소 id
 * formId::String >> 조회조건을 설정하는 form 요소 id
 * tblId::String >> 조회결과를 표출하는 table 요소 id
 */
function gfn_setPagination(paginationInfo, paginationId, formId, tableId) {
    $("<input/>").prop("type", "hidden").prop("id", "pag_size").prop("name", "pageInfo.pageSize").val(paginationInfo.pageSize).appendTo($("#"+formId));
    $("<input/>").prop("type", "hidden").prop("id", "record_cnt_per_pag").prop("name", "pageInfo.recordCountPerPage").val(paginationInfo.recordCountPerPage).appendTo($("#"+formId));
    $("<input/>").prop("type", "hidden").prop("id", "cu_pag_no").prop("name", "pageInfo.currentPageNo").val(paginationInfo.currentPageNo).appendTo($("#"+formId));
	//, 선택된 페이지 번호에 title 추가
    $("#"+paginationId+" span.link").closest("a").attr("title", "선택됨");

    if (tableId) {
        $("#"+tableId+" td.no").text(function (index) {
            return paginationInfo.recordCountPerPage * (paginationInfo.currentPageNo - 1) + (index + 1);
        });
        var trCount = $("#"+tableId+" tbody tr").length;
        var colCount = $("#"+tableId+" colgroup col").length;
        if (trCount < 1) $("#"+tableId+" tbody").append($("<tr>").append($("<td class='normal-txt center'>").prop("colspan", colCount).text(NO_DATA_MSG)));
    }
    
    $("#"+paginationId+"   a.first").on("click", function (event) {
        event.preventDefault();
        if (paginationInfo.totalPageCount > paginationInfo.pageSize)
            ifn_srchList(paginationInfo.firstPageNo, $("#"+formId));
    });
    
    $("#"+paginationId+"  a.prev").on("click", function (event) {
        event.preventDefault();
        if (paginationInfo.totalPageCount > paginationInfo.pageSize) {
            if (paginationInfo.firstPageNoOnPageList > paginationInfo.pageSize)
                ifn_srchList(paginationInfo.firstPageNoOnPageList - 1, $("#"+formId));
            else
                ifn_srchList(paginationInfo.firstPageNo, $("#"+formId));
        }
    });
    
    $("#"+paginationId+" > a.page-link").on("click", function (event) {
        event.preventDefault();
        ifn_srchList($(this).text(), $("#"+formId));
    });
    
    $("#"+paginationId+"   a.next").on("click", function (event) {
        event.preventDefault();
        if (paginationInfo.totalPageCount > paginationInfo.pageSize) {
            if (paginationInfo.lastPageNoOnPageList < paginationInfo.totalPageCount)
                ifn_srchList(paginationInfo.firstPageNoOnPageList + paginationInfo.pageSize, $("#"+formId));
            else
                ifn_srchList(paginationInfo.lastPageNo, $("#"+formId));
        }
    });
    
    $("#"+paginationId+"   a.last").on("click", function (event) {
        event.preventDefault();
        if (paginationInfo.totalPageCount > paginationInfo.pageSize)
            ifn_srchList(paginationInfo.lastPageNo, $("#"+formId));
    });

    function ifn_srchList(pageNo, form) {
        form.find("#cu_pag_no").val(pageNo);
        gfn_submit(form, true);
    }
}

/*
 * json 문자열을 객체로 파싱하는 함수
 * jsonLiteral::String >> json 문자열
 */
function gfn_getJson(jsonLiteral) {
    if (!jsonLiteral) return "";
    return JSON.parse(jsonLiteral);
}

/*
 * json 객체를 문자열로 변환하는 함수
 * jsonObject::Object >> json 오브젝트
 */
function gfn_setJson(jsonObject) {
    return JSON.stringify(jsonObject);
}

/*
 * json 객체를 복사하여 새로운 json객체를 생성하는 함수
 * jsonObject::Object >> 복사하려는 json객체
 */
function gfn_copyJson(jsonObject) {
    return JSON.parse(JSON.stringify(jsonObject));
}

/*
 * ajax 요청 처리 내부 함수
 * url::String >> 요청 URL
 * data::Object >> 서버에 전송하고자 하는 데이터
 * httpMethod::String >> 요청 방법
 * contentType::String >> 요청 데이터의 포맷
 * isAsync::Boolean >> 비동기 여부
 */
function ifn_ajaxReqM(url, data, httpMethod, contentType, isAsync, enctype) {
	var type = contentType;
	var method = httpMethod;
	
    if(type == null) type = "json";
    if(method == null) method = "post";
    
    var request = $.ajax({
        contentType : "application/" + type,
        enctype : "multipart/form-data",
        url : url,
        type : method,
        data : data,
        async : isAsync
    });
    
    return request;
}

/*
 * ajax 요청 처리 내부 함수
 * url::String >> 요청 URL
 * data::Object >> 서버에 전송하고자 하는 데이터
 * httpMethod::String >> 요청 방법
 * contentType::String >> 요청 데이터의 포맷
 * isAsync::Boolean >> 비동기 여부
 */
function ifn_ajaxReq(url, data, httpMethod, contentType, isAsync) {
	var type = contentType;
	var method = httpMethod;
	
    if(type == null) type = "json";
    if(method == null) method = "post";
    
    var request = $.ajax({
        contentType : "application/" + type,
        url : url,
        type : method,
        data : data,
        async : isAsync
    });
    
    return request;
}

/*
 * ajax 요청 비동기 처리 함수
 * url::String >> 요청 URL
 * data::Object >> 서버에 전송하고자 하는 데이터
 * httpMethod::String >> 요청 방법
 * contentType::String >> 요청 데이터의 포맷
 */
function gfn_ajaxReq(url, data, httpMethod, contentType) {
	var request;
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
//    if (typeof AnySign == "undefined" || typeof s == "undefined"  || s == "" || s ==undefined ) {
		request = gfn_ajaxReqComn(url, data, httpMethod, contentType);
		
//	} else {
//		request= ifn_ajaxReqXecure(url, data, true);	
//	}
	return request;
}

function gfn_ajaxReqM(url, data, httpMethod, contentType) {
	var request;
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
//    if (typeof AnySign == "undefined" || typeof s == "undefined"  || s == "" || s ==undefined ) {
		request = gfn_ajaxReqComnM(url, data, httpMethod, contentType,  "multipart/form-data");
		
//	} else {
//		request= ifn_ajaxReqXecure(url, data, true);	
//	}
	return request;
}

function gfn_ajaxReqComnM(url, data_, httpMethod, contentType, enctype) {

	//var type = contentType;
	var type = false;
	var method = httpMethod;

	if(type == null) type = "x-www-form-urlencoded";
	if(method == null) method = "post";
	
	var data = gfn_getJson(data_);
	
	fn_npcaLog('★★★★★★ gfn_ajaxReqComnM start ★★★★★★★★');
	fn_npcaLog(data);
	
	if(data instanceof Array){
		var jsonAjaxObject = {spareDesc1: data_};  
		data_ = $.param(jsonAjaxObject).replace(/\+/g,'%20');
	}else{
		data_ = $.param(data).replace(/\+/g,'%20');
	}	
	fn_npcaLog('1★★★★★★ gfn_ajaxReqComnM end ★★★★★★★★');
	fn_npcaLog(data);
	fn_npcaLog('2★★★★★★ gfn_ajaxReqComnM start ★★★★★★★★');
	var request = ifn_ajaxReqM(url, data_, method, type, true, enctype);
	request.fail(function (xhr, statusText, errorThrown) {
	    ifn_showErrMsg(gfn_getJson(xhr.responseText));
	});
	return request;
}

/*
var form = $("#vond_dmd_Info")[0];
var formData = new FormData(form);

var request = $.ajax({
    	url : "${pageContext.request.contextPath}/c/a/903/"+saveUrl,
    	type : 'POST',
    	data : formData,    	
    	contentType : false,        
        processData : false       
*/

function ifn_ajaxReqM(url, data, httpMethod, contentType, isAsync, enctype) {
	var type = false;
	var method = httpMethod;
	var form = $("#vond_dmd_Info")[0];
	var formData = new FormData(form);
	
    if(type == null) type = "json";
    if(method == null) method = "post";
    
    var request = $.ajax({
    	url :  url,
    	type : 'POST',
    	enctype : enctype, 
    	data : formData,    	
    	contentType : false,        
        processData : false
    });
    
    return request;
}

function gfn_ajaxReqComn(url, data_, httpMethod, contentType) {

	var type = contentType;
	var method = httpMethod;

	if(type == null) type = "x-www-form-urlencoded";
	if(method == null) method = "post";
	
	var data = gfn_getJson(data_);
	if(data instanceof Array){
		var jsonAjaxObject = {spareDesc1: data_};  
		data_ = $.param(jsonAjaxObject).replace(/\+/g,'%20');
	}else{
		data_ = $.param(data).replace(/\+/g,'%20');
	}	
	
	var request = ifn_ajaxReq(url, data_, method, type, true);
	request.fail(function (xhr, statusText, errorThrown) {
	    ifn_showErrMsg(gfn_getJson(xhr.responseText));
	});
	return request;
}

/*
 * ajax 요청 동기 처리 함수
 * url::String >> 요청 URL
 * data::Object >> 서버에 전송하고자 하는 데이터
 * httpMethod::String >> 요청 방법
 * contentType::String >> 요청 데이터의 포맷
 */
function gfn_ajaxReqSync(url, data, encType, httpMethod, contentType) {
	var request;
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
//    if (typeof AnySign == "undefined" || typeof s == "undefined" || s == "" || s ==undefined) {
		request= gfn_ajaxReqSyncComn(url, data, httpMethod, contentType);
//	} else {
//		request= ifn_ajaxReqXecure(url, data, true);
//	}
	return request;
}
function gfn_ajaxReqSyncComn(url, data, httpMethod, contentType) {

	var type = contentType;
	var method = httpMethod;

	if(type == null) type = "x-www-form-urlencoded";
	if(method == null) method = "post";
	
	data = gfn_getJson(data);
	data = $.param(data).replace(/\+/g,'%20');
	
	var request = ifn_ajaxReq(url, data, method, type, false);
	request.fail(function (xhr, statusText, errorThrown) {
	    ifn_showErrMsg(gfn_getJson(xhr.responseText));
	});
	return request;
}


function ifn_ajaxReqXecure(url, data_, isAsync) {
	
	var type = "x-www-form-urlencoded";
	var method = "post";
	
	ajaxData = {};
	ajaxData["url"] = url+"";
	ajaxData["data"]   = data_+"";
	ajaxData["isAsync"] = isAsync;
//	XecureAjaxGet(ajaxData);	
	if(ajaxData.np_data == "" || ajaxData.np_data == undefined || ajaxData.np_data == "undefined"){
		return gfn_ajaxReqComn(url, data_);
	}
	
    var deferred = $.Deferred();
    $.ajax({
        contentType : "application/" + type,
        url : ajaxData.np_url,
        type : method,
        data : ajaxData.np_data,
        async : ajaxData.isAsync
    })
	.done(function(responseText, statusText, xhr){  
		  
//		responseText = AnySign.BlockDec(responseText.replace(/"/g,""));
		responseText = responseText.replace(/"/g,"");
		if(responseText == null || responseText == 'null'){
			responseText = '';
		}
		deferred.resolve(responseText, statusText, xhr);
    })
	.fail(function(xhr, statusText, errorThrown){
		if(xhr.status == 999){			
			gfn_alert('세션이 만료되었습니다. 홈으로 이동합니다.', "페이지 이동", null, {
			    "확인" : function() {
			        $(this).dialog("close");
			        window.top.location.href = "/";
			    }
			});
		    $(".ui-dialog-titlebar-close").hide(); 
		}else{
			ifn_showErrMsg(gfn_getJson(xhr.responseText));
		}
		deferred.reject();
	});
    return deferred.promise();	
	
}

/*
 * ajax 요청 처리 후 오류가 발생할 경우 해당 오류를 표시해 주는 내부 함수
 * err::Object >> 오류 정보를 담고 있는 객체
 */
function ifn_showErrMsg(err) {
    if ($("div").is($("#err_box"))) {
        $("#err_box ul").empty();
    } else {
        var errBox = $("<div/>").prop("id","err_box");
        errBox.append($("<ul/>"));
        $("body").append(errBox);
    }
    //if (err.statusValue) { // 유효성 검증 이외의 오류
    if (err.ErrorCode) { // 유효성 검증 이외의 오류
        //$("<li/>").text("사유: "+err.reason).appendTo($("#err_box ul"));
        $("<li/>").text("사유: "+err.ErrorMsg).appendTo($("#err_box ul"));
        if(err.url){
        	$("<li/>").text("발생경로: "+err.url).appendTo($("#err_box ul"));
        }
        //$("<li/>").text("오류코드: "+err.statusValue).appendTo($("#err_box ul"));
        $("<li/>").text("오류코드: "+err.ErrorCode).appendTo($("#err_box ul"));
		modalService._makeModals();
		var msgText ="";
		msgText+="사유: "+err.ErrorMsg+'</br>';
		if(err.url){
			msgText+="발생경로: "+err.url+'</br>';
		}
		msgText+="오류코드: "+err.ErrorCode+'</br>';
		
		
		return modalService._openModal(modalService.MODAL_TYPE.ALERT, {
			title: err.statusName || "알림",
			message: msgText || "",
			eventTarget: event?.target,
			buttons: null
		});
        
    } else { // 유효성 검증 오류
    
		modalService._makeModals();
		var msgText ="";
    
        for (var i=0; i<err.length; i++) {
    		msgText+=err[i];
        }
		
		return modalService._openModal(modalService.MODAL_TYPE.ALERT, {
			title: "유효성 오류" || "알림",
			message: msgText || "",
			eventTarget: event?.target,
			buttons: null
		});
        
    }
}

/*
 * email 입력 UI의 email 공급자를 선택할 수 있는 select 요소를 생성하는 함수
 * emailSplrElmt::jqueryObject >> 선택된 email 공급자를 표시하는 input 요소
 * emailSplrSeltElmt::jqueryObject >> email 공급자를 선택할 수 있는 select 요소
 * emailSplrArray::Array >> email 공급자 배열
 */
function gfn_createEmailSplr(emailSplrElmt, emailSplrSeltElmt, emailSplrArray) {
    if (!emailSplrElmt || !emailSplrSeltElmt) return;
    var emailSplr = EMAIL_SPLR;
    if (emailSplrArray && emailSplrArray.length > 0) emailSplr = emailSplrArray;
    
    emailSplrSeltElmt.append($("<option/>").text("선택").val(""));
    for (var i=0; i<emailSplr.length; i++) {
        emailSplrSeltElmt.append($("<option/>").text(emailSplr[i]).val(emailSplr[i]));
    }
    emailSplrSeltElmt.append($("<option/>").text("직접입력").val("etc"));
    
    if (emailSplrElmt.val()) {
        var emailProviderVal = emailSplrSeltElmt.val(emailSplrElmt.val()).val();
        if (!emailProviderVal) {
            emailSplrSeltElmt.val("etc");
        }
    } else {
        emailSplrSeltElmt.val("");
    }
    if (emailSplrSeltElmt.hasClass("select")) emailSplrSeltElmt.selectmenu("refresh"); // jquery ui 사용시 select 요소에 동적으로 option을 추가,삭제,비활성화 할 경우 수행
}

/*
 * email 입력 UI에 event 핸들러를 설정하여 해당 요소들의 변경사항을 email Input 요소에 반영할 있도록 설정하는 함수
 * emailIdElmt::jqueryObject >> email Id를 입력할 수 있는 input 요소
 * emailSplrElmt::jqueryObject >> 선택된 email 공급자를 표시하는 input 요소
 * emailSplrSeltElmt::jqueryObject >> email 공급자를 선택할 수 있는 select 요소
 * emailElmt::jqueryObject >> email 입력 UI의 변경사항이 반영될 email Input 요소
 */
function gfn_setEventHandleForEmail(emailIdElmt, emailSplrElmt, emailSplrSeltElmt, emailElmt) {
    if (!emailIdElmt || !emailSplrElmt || !emailSplrSeltElmt) return;
    emailIdElmt.on("change", function (event) {
        var emailProvider = emailSplrElmt;
        if ($(this).val() || emailProvider.val()) emailElmt.val($(this).val() + "@" + emailProvider.val());
        else emailElmt.val("");
    });
    
    emailSplrElmt.on("change", function (event) {
        var emailId = emailIdElmt;
        if (emailId.val() || $(this).val()) emailElmt.val(emailId.val() + "@" + $(this).val());
        else emailElmt.val("");
    });
    
    var eventName = "change";
    if (emailSplrSeltElmt.hasClass("select")) eventName = "selectmenuchange";  // jquery ui 사용시 select 요소에 change 이벤트 핸들러를 할당할 경우
    emailSplrSeltElmt.on(eventName, function (event) {
        var emailProviderVal = $(this).val();
        var emailId = emailIdElmt;
        var emailProvider = emailSplrElmt;
        
        if (emailProviderVal && emailProviderVal != "etc") {
            emailProvider.prop("readonly", true).val(emailProviderVal);
        } else if (emailProviderVal && emailProviderVal == "etc") {
            emailProvider.prop("readonly", false).val("");
        } else {
            emailProvider.prop("readonly", true).val("");
        }

        if (emailId.val() || emailProvider.val()) emailElmt.val(emailId.val() + "@" + emailProvider.val());
        else emailElmt.val("");
    });
}

/*
 * email 입력 UI에 값을 설정하는 함수
 * emailIdElmt::jqueryObject >> email Id를 입력할 수 있는 input 요소
 * emailSplrElmt::jqueryObject >> 선택된 email 공급자를 표시하는 input 요소
 * emailSplrSeltElmt::jqueryObject >> email 공급자를 선택할 수 있는 select 요소
 * emailVal::String >> email 입력 UI에 설정할 값
 */
function gfn_setEmailInfo(emailIdElmt, emailSplrElmt, emailSplrSeltElmt, emailVal) {
    if (!emailVal) return;
    var emailId = emailVal.split("@")[0];
    var emailProvider = emailVal.split("@")[1];
    emailIdElmt.val(emailId);
    emailSplrElmt.val(emailProvider);
    var isContains = emailSplrSeltElmt.find("option:contains('"+emailProvider+"')").length > 0;
    if (isContains) emailSplrSeltElmt.val(emailProvider);
    else emailSplrSeltElmt.val("etc");
}

/*
 * 전화번호 입력 UI의 지역번호를 생성하는 함수
 * locNoSeltElmt::jqueryObject >> 지역번호를 선택할 수 있는 select 요소
 * initValue::String >> 처음 표시할 지역번호 값
 * locNoArray::Array >> 지역번호 배열
 */
function gfn_createLocNo(locNoSeltElmt, initValue, locNoArray) {
    if (!locNoSeltElmt) return;
    var locNo = LOC_NO;
    if (locNoArray && locNoArray.length > 0) locNo = locNoArray;

    locNoSeltElmt.append($("<option/>").text("선택").val(""));
    for (var i=0; i<locNo.length; i++) { 
        var option = $("<option/>").text(locNo[i]).val(locNo[i]);
        if (initValue && initValue == locNo[i]) option.prop("selected", true);
        locNoSeltElmt.append(option);
    }
    if (locNoSeltElmt.hasClass("select")) locNoSeltElmt.selectmenu("refresh"); // jquery ui 사용시 select 요소에 동적으로 option을 추가,삭제,비활성화 할 경우 수행
}

/*
 * UI의 input 요소들을 datepicker 요소로 설정하는 함수
 * calElmtArray::Array >> datepicker 요소로 설정할 input 요소 배열
 */
function gfn_setSnglCal(calElmtArray) {
    if (!$.datepicker) return;
    for (var i=0; i<calElmtArray.length; i++) {
        calElmtArray[i].npdatepicker().inputmask(DATEPICKER_INPUT_MASK);
    }
}

/*
 * UI의 input 요소를 기간선택 datepicker 요소로 설정하는 함수
 * calStrtElmt::jqueryObject >> 기간 시작 일자를 표시할 input 요소
 * calToElmt::jqueryObject >> 기간 종료 일자를 표시할 input 요소
 * defaultStrtDt::String >> 기간 시작 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * defaultToDt::String >> 기간 종료 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * callback::Function >> datepicker 요소의 날짜가 변경되면 콜백을 호출한다. 콜백함수에 넘겨주는 파라메터는 현재 선택 날짜, 이전 선택 날짜 이다.
 */
function gfn_setRangeCal(calStrtElmt, calToElmt, defaultStrtDt, defaultToDt, callback) {
    ifn_setRstrRangeCal(calStrtElmt, calToElmt, defaultStrtDt, defaultToDt, null, null, callback);
}

/*
 * UI의 input 요소를 제한된 기간선택 datepicker 요소로 설정하는 함수
 * calStrtElmt::jqueryObject >> 기간 시작 일자를 표시할 input 요소
 * calToElmt::jqueryObject >> 기간 종료 일자를 표시할 input 요소
 * defaultStrtDt::String >> 기간 시작 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * defaultToDt::String >> 기간 종료 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * rstrStrtDt::String >> 기간 제한 시작 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * rstrToDt::String >> 기간 제한 종료 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * callback::Function >> datepicker 요소의 날짜가 변경되면 콜백을 호출한다. 콜백함수에 넘겨주는 파라메터는 현재 선택 날짜, 이전 선택 날짜 이다.
 */
function gfn_setRstrRangeCal(calStrtElmt, calToElmt, defaultStrtDt, defaultToDt, rstrStrtDt, rstrToDt, callback) {
    ifn_setRstrRangeCal(calStrtElmt, calToElmt, defaultStrtDt, defaultToDt, rstrStrtDt, rstrToDt, callback);
}

/*
 * UI의 input 요소를 제한된 기간선택 datepicker 요소로 설정하는 내부 함수
 * calStrtElmt::jqueryObject >> 기간 시작 일자를 표시할 input 요소
 * calToElmt::jqueryObject >> 기간 종료 일자를 표시할 input 요소
 * defaultStrtDt::String >> 기간 시작 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * defaultToDt::String >> 기간 종료 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * rstrStrtDt::String >> 기간 제한 시작 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * rstrToDt::String >> 기간 제한 종료 일자 설정 값 포맷은 datepicker의 dateFormat 옵션값을 따름
 * callback::Function >> datepicker 요소의 날짜가 변경되면 콜백을 호출한다. 콜백함수에 넘겨주는 파라메터는 현재 선택 날짜, 이전 선택 날짜 이다.
 */
function ifn_setRstrRangeCal(calStrtElmt, calToElmt, defaultStrtDt, defaultToDt, rstrStrtDt, rstrToDt, callback) {
    if (!calStrtElmt || !calToElmt) return;
    if (!$.datepicker) return;
    var strtDt 		= calStrtElmt.val() || defaultStrtDt;
    var toDt 		= calToElmt.val() || defaultToDt;
    var strtElNm 	= gfn_isNull(calStrtElmt.attr("id")) ?  gfn_nvl(calStrtElmt.attr("name")) : calStrtElmt.attr("id");
	var toElNm 		= gfn_isNull(calToElmt.attr("id")) ?  gfn_nvl(calToElmt.attr("name")) : calToElmt.attr("id");
	
	strtDt 	= ifn_translateDateFormat(strtDt);
    toDt 	= ifn_translateDateFormat(toDt);
    calStrtElmt.val(strtDt);
    calToElmt.val(toDt);

    var strtOption = gfn_copyJson(DATEPICKER_OPTIONS);
    strtOption.defaultDate = strtDt;
    if (rstrStrtDt) strtOption.minDate = rstrStrtDt;//, 조회가능시작일
    if (rstrToDt) strtOption.maxDate = rstrToDt;//, 조회가능종료일
    
    //, [default 세팅 삭제] 종료일 기준으로 maxDate 를 세팅하지 않는다.
	//, strtOption.maxDate = toDt;
	
	//, [default 세팅 삭제] 캘린더 close 시 종료일의 minDate 를 세팅 하지 않음
	//, strtOption.onClose = function (selectedDate) {
    //,     calToElmt.datepicker("option", "minDate", selectedDate);
    //, };

	strtOption.beforeShow = function($input, inst){
		setTimeout(function(){
			allowHide = false;
			var hiddenInput = $("[hiddenId='"+strtElNm+"']");
			var input 		= hiddenInput.parent().find(".hasDatepicker");
			var btnPane 	= $(inst.dpDiv).find('.ui-datepicker-buttonpane');
			btnPane.find('.btn-cancel').remove();
			inst.dpDiv.find('.ui-datepicker-current').after('<button class="krds-btn border small btn-cancel">취소</button>');
			//, 취소버튼 클릭 이벤트
			$('.ui-datepicker-buttonpane .btn-cancel').on('click', function(){
				allowHide= true;
				calStrtElmt.datepicker('hide');
			});
			//, 선택버튼 클릭 이벤트 
			$('.ui-datepicker-buttonpane .ui-datepicker-close').on('click', function(){
				var strCalStrtElmt 	= gfn_nvl(hiddenInput.attr("temp")).replace(/[^0-9]/g, "");
				var strCalToElmt 	= calToElmt.val().replace(/[^0-9]/g, "");
				
				if(! gfn_isNull(strCalStrtElmt) && ! gfn_isNull(strCalToElmt) && strCalStrtElmt > strCalToElmt){
					gfn_alert("조회 시작일이 종료일보다 큽니다.");
				}else{
					allowHide = true;
					hiddenInput.attr("sel", hiddenInput.attr("temp"))
					calStrtElmt.datepicker('hide');
				}
			});
			//2025-11-26 캘린더 아래쪽으로 고정
			$('.ui-datepicker').css({
				top: input.offset().top + input.outerHeight() + 'px',
				left: input.offset().left + 'px'
			});
		}, 1);
		
	}
	strtOption.onChangeMonthYear = function(month, year){
		setTimeout(function(){
			var hiddenInput = $("[hiddenId='"+strtElNm+"']");
			$('.ui-datepicker-current').after('<button class="krds-btn border small btn-cancel">취소</button>');			
			//, 취소버튼 클릭 이벤트
			$('.ui-datepicker-buttonpane .btn-cancel').on('click', function(){
				allowHide= true;
				calStrtElmt.datepicker('hide');
			});
			//, 선택버튼 클릭 이벤트 
			$('.ui-datepicker-buttonpane .ui-datepicker-close').on('click', function(){
				var strCalStrtElmt 	= gfn_nvl(hiddenInput.attr("temp")).replace(/[^0-9]/g, "");
				var strCalToElmt 	= calToElmt.val().replace(/[^0-9]/g, "");
				
				if(! gfn_isNull(strCalStrtElmt) && ! gfn_isNull(strCalToElmt) && strCalStrtElmt > strCalToElmt){
					gfn_alert("조회 시작일이 종료일보다 큽니다.");
				}else{
					allowHide = true;
					hiddenInput.attr("sel", hiddenInput.attr("temp"))
					calStrtElmt.datepicker('hide');
				}
			});
			
		}, 1);
	}
    if (callback) calStrtElmt.npdatepicker(strtOption, callback).inputmask(DATEPICKER_INPUT_MASK, {postValidation: ifn_strtPostValidationCallback});
    else calStrtElmt.npdatepicker(strtOption, null).inputmask(DATEPICKER_INPUT_MASK, {postValidation: ifn_strtPostValidationCallback});
    
    var toOption = gfn_copyJson(DATEPICKER_OPTIONS);
    toOption.defaultDate = toDt;
    if (rstrStrtDt) toOption.minDate = rstrStrtDt;//, 조회가능시작일
    if (rstrToDt) toOption.maxDate = rstrToDt;//, 조회가능종료일
    
	//, [default 세팅 삭제] 시작일 기준으로 minDate 를 세팅하지 않는다.
	//, toOption.minDate = strtDt;
	
	//, [default 세팅 삭제] 캘린더 close 시 시작일의 maxDate 를 세팅 하지 않음
	//, toOption.onClose = function (selectedDate) {
    //,     calStrtElmt.datepicker("option", "maxDate", selectedDate);
    //, };

	toOption.beforeShow = function($input, inst){
		setTimeout(function(){
			allowHide = false;
			var hiddenInput = $("[hiddenId='"+toElNm+"']");
			var input 		= hiddenInput.parent().find(".hasDatepicker");
			var btnPane = $(inst.dpDiv).find('.ui-datepicker-buttonpane');
			btnPane.find('.btn-cancel').remove();
			inst.dpDiv.find('.ui-datepicker-current').after('<button class="krds-btn border small btn-cancel">취소</button>');
			//, 취소버튼 클릭 이벤트
			$('.ui-datepicker-buttonpane .btn-cancel').on('click', function(){
				allowHide= true;
				calToElmt.datepicker('hide');
			});
			//, 선택버튼 클릭 이벤트 
			$('.ui-datepicker-buttonpane .ui-datepicker-close').on('click', function(){
				var strCalStrtElmt	= calStrtElmt.val().replace(/[^0-9]/g, "");
				var strCalToElmt 	= gfn_nvl(hiddenInput.attr("temp")).replace(/[^0-9]/g, "");
				
				if(! gfn_isNull(strCalStrtElmt) && ! gfn_isNull(strCalToElmt) && strCalStrtElmt > strCalToElmt){
					gfn_alert("조회 시작일이 종료일보다 큽니다.");
				}else{
					allowHide = true;
					hiddenInput.attr("sel", hiddenInput.attr("temp"))
					calToElmt.datepicker('hide');
				}
			});
			//2025-11-26 캘린더 아래쪽으로 고정
			$('.ui-datepicker').css({
				top: input.offset().top + input.outerHeight() + 'px',
				left: input.offset().left + 'px'
			});
		}, 1);
		
	}
	toOption.onChangeMonthYear = function(month, year){
		setTimeout(function(){
			var hiddenInput = $("[hiddenId='"+toElNm+"']");
			$('.ui-datepicker-current').after('<button class="krds-btn border small btn-cancel">취소</button>');			
			//, 취소버튼 클릭 이벤트
			$('.ui-datepicker-buttonpane .btn-cancel').on('click', function(){
				allowHide= true;
				calToElmt.datepicker('hide');
			});
			//, 선택버튼 클릭 이벤트 
			$('.ui-datepicker-buttonpane .ui-datepicker-close').on('click', function(){
				var strCalStrtElmt	= calStrtElmt.val().replace(/[^0-9]/g, "");
				var strCalToElmt 	= gfn_nvl(hiddenInput.attr("temp")).replace(/[^0-9]/g, "");
				
				if(! gfn_isNull(strCalStrtElmt) && ! gfn_isNull(strCalToElmt) && strCalStrtElmt > strCalToElmt){
					gfn_alert("조회 시작일이 종료일보다 큽니다.");
				}else{
					allowHide = true;
					hiddenInput.attr("sel", hiddenInput.attr("temp"))
					calToElmt.datepicker('hide');
				}
			});
			
		}, 1);
	}

    if (callback) calToElmt.npdatepicker(toOption, callback).inputmask(DATEPICKER_INPUT_MASK, {postValidation: ifn_toPostValidationCallback});
    else calToElmt.npdatepicker(toOption, null).inputmask(DATEPICKER_INPUT_MASK, {postValidation: ifn_toPostValidationCallback});

    function ifn_translateDateFormat(dateString) {
    	if (!dateString) return "";
        return dateString.replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3");
    }
    
    function ifn_strtPostValidationCallback(args, opts) {
        var inputVal = args.join("").replace(/[^0-9]/g, "");
        var returnVal = ifn_postValidationCallback(inputVal);
        var calToVal = calToElmt.val().replace(/[^0-9]/g, "");
        if (calToVal) {
            var toVal = calToVal.substr(0, inputVal.length);
            if (inputVal > toVal) return false;
        }
        return returnVal;
    }
    
    function ifn_toPostValidationCallback(args, opts) {
        var inputVal = args.join("").replace(/[^0-9]/g, "");
        var returnVal = ifn_postValidationCallback(inputVal);
        var calStrtVal = calStrtElmt.val().replace(/[^0-9]/g, "");
        if (calStrtVal) {
            var strtVal = calStrtVal.substr(0, inputVal.length);
            if (inputVal < strtVal) return false;
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

	//, datepicker 에 readonly 속성 제거
	$(".hasDatepicker").removeAttr("readonly");
}

/*
 * 알림창을 보여주는 함수
 * msg::String >> 알림창에 표시할 메시지
 * title::String >> 알림창에 표시할 메시지 제목
 * width::Number >> 알림창 너비 값
 * buttons::Object >> 알림창에 표시할 버튼 객체
 */
function gfn_alert(msg, title, width, buttons,event) {
	var ty = $.type(msg);
	modalService._makeModals();
	
	var msgText ="";
	 if(ty == 'array'){
    	for(var i=0;i<msg.length; i++){
    		msgText+=msg[i];
    	}
    }
	else{
		msgText+=msg;
	}
	
	
	return modalService._openModal(modalService.MODAL_TYPE.ALERT, {
		title: title || "알림",
		message: msgText || "",
		eventTarget: event?.target,
		buttons: buttons,
	});
}
/*
* 버튼 없는 알림창을 보여주는 함수
* msg::String >> 알림창에 표시할 메시지
* title::String >> 알림창에 표시할 메시지 제목
* width::Number >> 알림창 너비 값
*/
function gfn_alertNoneBtn(msg, title, width, obj) {
	var ty = $.type(msg);
    if ($("div").is($("#alert_box"))) {
        $("#alert_box p").text(msg);
    } else {
        var alertBox = $("<div/>").prop("id","alert_box");
        if(ty == 'array'){
        	for(var i=0;i<msg.length; i++){
        		alertBox.append($("<p align=\"left\" style=\"margin-top:10px;\" />").text(msg[i]));
        	}
        } else {
        	alertBox.append($("<p/>").text(msg));
        }
        $("body").append(alertBox);
    }

    var alert_boxNoneBtn = $("#alert_box").dialog({
        title: title || "알림",
        width: width || 500,
        modal: true,
    }).dialog({position : {my : 'center top',
                           at : 'center top',
                           of : obj
    }});
    $('button.ui-dialog-titlebar-close').hide();
}
/*
 * 디비 (등록,수정,삭제,저장) 후 알림창을 보여주는 함수
 * CSUD::String >> 등록 C,수정 U,삭제 D,저장 S
 * title::String >> 알림창에 표시할 메시지 제목
 * width::Number >> 알림창 너비 값
 * buttons::Object >> 알림창에 표시할 버튼 객체
 */
function gfn_CRUD_alert(CSUD, title, width, buttons) {
	var msg="";
	if(CSUD=="C") msg="등록 되었습니다."; 
	else if(CSUD=="R") msg="검색 되었습니다."; 
	else if(CSUD=="U") msg="수정 되었습니다."; 
	else if(CSUD=="D") msg="삭제 되었습니다."; 
	
	gfn_alert(msg, title, width, buttons); 
}


/*
 * 3버튼창을 보여주는 함수
 * msg::String >> 확인창에 표시할 메시지
 * callback::Function >> 사용자의 선택 이벤트에 따른 처리를 담당할 콜백함수. 콜백함수에 넘겨주는 파라메터는 boolean 타입으로 확인 버튼의 경우 true, 취소 버튼의 경우 false 이다.
 * title::String >> 확인창에 표시할 메시지 제목
 * btnMsgs::String >> 버튼문구
 * width::Number >> 확인창 너비 값
 * buttons::Object >> 확인창에 표시할 버튼 객체
 */
function gfn_confirm3btn(msg, callback, title, btnMsgs, width, buttons) {
	
	var ty = $.type(msg);
	$("#confirm_box").remove();

    var confirmBox = $("<div/>").prop("id","confirm_box");
    
    AnySign.mExtensionSetting.mImgIntervalError = true;
    
    if(ty == 'array'){        	
    	for(var i=0;i<msg.length; i++){
    		confirmBox.append($("<p align=\"left\"/>").text(msg[i]) );
    		
    	}
    }else{
    	confirmBox.append($("<p/>").text(msg));
    }
    $("body").append(confirmBox);

    $("#confirm_box").dialog({
        title: title || "확인",
        width: width || 500,
        modal: true,
        close : function(){
        	callback("3");
        },
        buttons: [buttons ||
                  {
                      //버튼텍스트
                      text: btnMsgs[0],

                      //클릭이벤트발생시 동작
                      click: function() {
                          $(this).dialog( "close" );
                          $(this).remove();
                          callback("1");
                      }
                  },
                  {
                      //버튼텍스트
                      text: btnMsgs[1],

                      //클릭이벤트발생시 동작
                      click: function() {
                          $(this).dialog( "close" );
                          $(this).remove();
                          callback("2");
                      }
                  },                  
                  {
                      //버튼텍스트
                      text: btnMsgs[2],
                      "class":"btn_cancle",

                      //클릭이벤트발생시 동작
                      click: function() {
                          $(this).dialog( "close" );
                          $(this).remove();
                          callback("3");
                      }
                  }
              ]
    });
}

/*
 * 확인창을 보여주는 함수
 * msg::String >> 확인창에 표시할 메시지
 * callback::Function >> 사용자의 선택 이벤트에 따른 처리를 담당할 콜백함수. 콜백함수에 넘겨주는 파라메터는 boolean 타입으로 확인 버튼의 경우 true, 취소 버튼의 경우 false 이다.
 * title::String >> 확인창에 표시할 메시지 제목
 * width::Number >> 확인창 너비 값
 * buttons::Object >> 확인창에 표시할 버튼 객체
 */
function gfn_confirm(msg, callback, title, width, buttons, event) {
	modalService._makeModals();
	
	return modalService._openModal(modalService.MODAL_TYPE.CONFIRM, {
		title: title || "알림",
		message: msg || "",
		eventTarget: event?.target,
        buttons: [buttons ||
          {
              text: "확인",
              click: function() {
                  callback(true);
              }
          },
          {
              text: "취소",
              click: function() {
                  callback(false);
              }
          }
      ],
	});
}

/*
 * 특정 폼에 대한 유효성 검사를 수행하고 유효성에 문제가 없다면 확인창을 보여주는 함수
 * form::jqueryObject >> 유효성 검사를 수행할 form 요소
 * msg::String >> 확인창에 표시할 메시지
 * callback::Function >> 사용자의 선택 이벤트에 따른 처리를 담당할 콜백함수. 콜백함수에 넘겨주는 파라메터는 boolean 타입으로 확인 버튼의 경우 true, 취소 버튼의 경우 false 이다.
 * title::String >> 확인창에 표시할 메시지 제목
 * width::Number >> 확인창 너비 값
 * buttons::Object >> 확인창에 표시할 버튼 객체
 */
function gfn_validConfirm(form, msg, callback, title, width, buttons) {
	var isValid = form.valid();
    if (isValid) gfn_confirm(msg, callback, title, width, buttons);
    else {
    	var settings = form.validate().settings;
        settings.isEnableEvents = true;
    }
}

/*
 * 화면에 로딩 스핀을 표시하는 함수
 * elmt::jqueryObject >> 로딩 스핀을 표시할 때 사용자의 폼 조작을 막을 범위의 기준이 되는 UI요소
 */
function gfn_spinStart() {
    var element = $("body");
    element.addClass('scroll-no');
    element.spin({}, "black").block({message: null});
}

/*
 * 화면에 표시된 로딩 스핀을 제거하는 함수
 * elmt::jqueryObject >> 로딩 스핀의 표시 범위를 나타내는 UI요소 
 */
function gfn_spinStop() {
    var element = $("body");
    element.removeClass('scroll-no');
    element.spin(false).unblock();
}

/*
 * 문자열의 좌측에 특정 문자를 삽입하는 함수 
 * oriStr::String >> 좌측에 특정 문자를 삽입해야 하는 문자열
 * length::Number >> 특정 문자 삽입 후 문자열의 전체 길이
 * strToPad::String >> 좌측에 삽입할 특정 문자
 */
function gfn_lpad(oriStr, length, strToPad) {
	while(oriStr.length < length) {
		oriStr = strToPad + oriStr;
	}
	return oriStr;
}

/*
 * 문자열의 우측에 특정 문자를 입력하는 함수
 * oriStr::String >> 우측에 특정 문자를 삽입해야 하는 문자열
 * length::Number >> 특정 문자 삽입 후 문자열의 전체 길이
 * strToPad::String >> 우측에 삽입할 특정 문자
 */
function gfn_rpad(oriStr, length, strToPad) {
	while(oriStr.length < length) {
		oriStr = oriStr + strToPad;
	}
	return oriStr;
}

/**
 * 함 수 명 : gfn_IsValidateYM
 * 함수설명 : 날짜 여부를 확인한다.
 * 입    력 : 6자리의 숫자로 된 날짜(YYYYMM)
 * 결    과 : Boolen 형식의 정합성 체크
 *            맞으면 = true, 맞지 않으면 = false
**/
function gfn_IsValidateYM(obj)
{
	if(isNaN(obj.val().replace(/-/gi, ""))==true) {
		gfn_alert("날짜는 숫자로만 입력하십시오", "", null, {"확인" : function() { $(this).dialog("close"); obj.val(""); obj.focus(); return;} });
		return false;
	}
    
	if(obj.val().length != 7 && obj.val().replace(/-/gi, "").length < 6) {
		gfn_alert("날짜 입력이 잘못되었습니다.", "", null, {"확인" : function() { $(this).dialog("close"); obj.val(""); obj.focus(); return;} });
		return false;
	}
	
	if(obj.val().length > 6 && obj.val().length < 10 ) {
		gfn_alert("날짜 입력이 잘못되었습니다.", "", null, {"확인" : function() { $(this).dialog("close"); obj.val(""); obj.focus(); return;} });
		return false;
	}

	var nYear  = Number(obj.val().replace(/-/gi, "").substr(0,4));	//년도값을 숫자로
	var nMonth = Number(obj.val().replace(/-/gi, "").substr(4,2));	//월을 숫자로

	if((nMonth < 1) || (nMonth > 12)) {
		gfn_alert(nMonth+'월의 입력이 잘못 되었습니다.', "", null, {"확인" : function() { $(this).dialog("close"); obj.val(""); obj.focus(); return;} });
		return false;
	}

	return true;
}

/**
 * 함 수 명 : gfn_IsValidateYMD
 * 함수설명 : 복지용구 급여제공내용조회 '복지용구탭' 날짜확인 (임의변경금지)
 * 입    력 : 8자리의 숫자로 된 날짜(YYYYMMDD)
 * 결    과 : Boolen 형식의 정합성 체크
 *            맞으면 = true, 맞지 않으면 = false
**/
function gfn_IsValidateYMD(obj)
{
	var ymd = obj.val().replace(/-/gi, "");
	if(ymd.length != 8 && ymd.length == 6 ){
		ymd = ymd + '01';  // 복지용구 급여제공내용조회 '기타탭'월단위 > '복지용구탭'일단위 변경 시 사용.(임의변경금지)
	}else if(ymd.length != 8) {
		gfn_alert("날짜 입력이 잘못되었습니다.", "", null, {"확인" : function() { $(this).dialog("close"); obj.val(""); obj.focus(); return;} });
		return false;
	}
	if(isNaN(ymd)==true) {
		gfn_alert("날짜는 숫자로만 입력하십시오", "", null, {"확인" : function() { $(this).dialog("close"); obj.val(""); obj.focus(); return;} });
		return false;
	}

	if(ymd.length != 8) {
		gfn_alert("날짜 입력이 잘못되었습니다.", "", null, {"확인" : function() { $(this).dialog("close"); obj.val(""); obj.focus(); return;} });
		return false;
	}

	var nYear  = Number(ymd.substr(0,4));	//년도값을 숫자로
	var nMonth = Number(ymd.substr(4,2));	//월을 숫자로

	if((nMonth < 1) || (nMonth > 12)) {
		gfn_alert(nMonth+'월의 입력이 잘못 되었습니다.', "", null, {"확인" : function() { $(this).dialog("close"); obj.val(""); obj.focus(); return;} });
		return false;
	}

	return true;
}

/*
 * jquery datepicker와 inputmask를 동시에 적용할 때 datepicker의 dateFormat과 inputmask의 masking 형식이 일치하지 않으면 datepicker가 원하는 동작을 수행하지 않는다.
 * 그러므로 datepicker의 dateFormat은 로케일을 고려하여 "yy-mm-dd"로 설정하였으며 inputmask의 masking 형식은 "y-m-d"로 설정하여 사용해야 한다.
 * 그런데 위와 같이 설정을 하게 되면 서버로 폼 전송시 yyyy-mm-dd 형태의 문자열로 전송이 되므로 서버에서 처리시 yyyymmdd의 형태로 처리해야 한다면
 * 다음과 같은 npdatepicker라는 확장 플러그인을 사용한다.
 */


$.fn.extend({
    npdatepicker: function (options, callback) {
		if($(this).length != 0){
			allowHide = false;//, 달력을 세팅할 객체가 있는 경우에만 구분값을 바꾼다.ㄷ
		}
		var input 			= $(this);
        var hiddenInput		= $("<input>");
        var tempDate 		= ""; //, 선택한 값을 넣을 임시 변수
        var selectedDate 	= input.val() == "" ? "" : input.val(); //, 이전에 선택된 값
		var hiddenId		= gfn_isNull($(this).attr("id")) ?  gfn_nvl($(this).attr("name")) : $(this).attr("id");

        hiddenInput.attr("hiddenId", hiddenId);
		hiddenInput.attr("name", $(this).attr("name"));
        hiddenInput.attr("type", "hidden");
        if (input.val() && input.val().length > 0) {
            hiddenInput.val(input.val().replace(/_/g, "").split("-").join("")); // inputmask가 적용된경우 입력된 값을 지우면 공백이 _ 로 표현되므로 .replace(/_/g, "")를 추가함.
        }
        input.after(hiddenInput);
        input.attr("name", "");
        
        var oldValue = null;
        
        input.focus(function () {
        	oldValue = input.val().replace(/_/g, "").split("-").join("");
        });
        
        input.focusout(function () {
            var value = gfn_nvl($(this).val()).replace(/[^0-9]/g, "");
			if (value.length == 8) {
                hiddenInput.val(input.val().replace(/_/g, "").split("-").join(""));
                if (callback && oldValue != hiddenInput.val()) callback(hiddenInput.val(), oldValue);
            } else if (value.length < 8) {
				$(this).val("");                
				hiddenInput.val("");
            }
        });
        
        var defaultOptions = {
            onSelect: function (dateText, inst) {
				input.val("");//, 선택 버튼 클릭 시 값을 넣는다.
				hiddenInput.val("");
				hiddenInput.attr("temp", dateText);
				
				if(allowHide){//, _gotoToday 커스텀 대상 때문에 추가됨. 선택과 동시에 캘리더를 닫는다.
					hiddenInput.attr("sel", dateText);
					input.datepicker('hide');
				}
            }
			, beforeShow: function($input, inst){
				setTimeout(function(){
					allowHide= false;
					var btnPane = $(inst.dpDiv).find('.ui-datepicker-buttonpane');
					btnPane.find('.btn-cancel').remove();
					inst.dpDiv.find('.ui-datepicker-current').after('<button class="krds-btn border small btn-cancel">취소</button>');
					//, 취소버튼 클릭 이벤트
					$('.ui-datepicker-buttonpane .btn-cancel').on('click', function(){
						allowHide= true;
						input.datepicker('hide');
					});
					//, 선택버튼 클릭 이벤트 
					$('.ui-datepicker-buttonpane .ui-datepicker-close').on('click', function(){
						allowHide = true;
						hiddenInput.attr("sel", hiddenInput.attr("temp"));
						input.datepicker('hide');
					});
				}, 1);
				
			}
			, onChangeMonthYear: function(month, year){
				setTimeout(function(){
					$('.ui-datepicker-current').after('<button class="krds-btn border small btn-cancel">취소</button>');			
					//, 취소버튼 클릭 이벤트
					$('.ui-datepicker-buttonpane .btn-cancel').on('click', function(){
						allowHide= true;
						input.datepicker('hide');
					});
					//, 선택버튼 클릭 이벤트 
					$('.ui-datepicker-buttonpane .ui-datepicker-close').on('click', function(){
						allowHide = true;
						hiddenInput.attr("sel", hiddenInput.attr("temp"));
						input.datepicker('hide');
					});
					
				}, 1);
			}
			, onClose: function(dateText, inst){
				if(allowHide){
					if(hiddenInput.attr("sel")){
						input.val(hiddenInput.attr("sel"));
						hiddenInput.val(hiddenInput.attr("sel").replace(/_/g, "").split("-").join(""));
					}
					if (callback) callback(hiddenInput.val(), oldValue);
				}
				allowHide = true;
			}
			, showMonthAfterYear: true
			, currentText: '오늘'
			, closeText: '선택'
        };//, defaultOptions
        $.extend(true, defaultOptions, options);
        
		input.datepicker(defaultOptions);
        return input;
    }
});


function gfn_init_main(){
	// 좌측 서브메뉴의 현재 선택된 메뉴 설정
	var CURRENT_MENU_ID 	= $("#current_menu_id").val();//, aside.jsp
	var pgmId 				= $("#pgmId").val();//, 업무화면에서 세팅
	if(! gfn_isNull(pgmId) && pgmId.length >= 7) pgmId = pgmId.substring(0,7);
	
	//, aside.jsp(lnb) 선택 처리를 위한 스크립트_[S] ============================================
	var target;
	// requsetParam("menuId")가 없을때 프로그램ID로 메뉴 확인. 프로그램ID에 해당하는 menu가 없으면 현재 세션에 담긴 현재 menu로 유지
	if(gfn_isNull($("#request_menu_id").val()) && ! gfn_isNull(pgmId) && $(".lnb-list").find("a[class^="+pgmId+"]").length > 0){
		//pgmId에 해당하는 menu가 1개 이상이면 마지막 menu선택
		target = $(".lnb-list").find("a[class^="+pgmId+"]").length == 1 ? $("a[class^="+pgmId+"]") : $("a[class^="+pgmId+"]").eq($("a[class^="+pgmId+"]").length-1);
		
		//pgmId가 여러개인경우 해당 ID속성값과 세션메뉴ID 값이 같으면 선택
		$(".lnb-list").find("a[class^="+pgmId+"]").each(function(index){
			if($(this).prop("id")== CURRENT_MENU_ID){
				target = $(this);
			}
	    });
		
		//pgmId와같은 class 를 가진 메뉴가 있으면 최종 선택
		var pgmId_full = $("#pgmId").val();//, 각 화면에 있는 input
		if(! gfn_isNull(pgmId_full) && pgmId_full.length >= 10) {
			pgmId_full = pgmId_full.substring(0,10);
			if($(".lnb-list").find("a[class="+pgmId_full+"]").length == 1){
				target = $(".lnb-list").find("a[class="+pgmId_full+"]");
			}
		}
		
		//이전페이지로 이동시 열린메뉴 초기화 
		$('.lnb-list').find('.lnb-item.active').removeClass('active');
		$('.lnb-list').find('.selected').removeClass('selected');
		$('.lnb-list').find('button.lnb-btn').attr('aria-expanded', false)
		
		target.closest(".lnb-item").addClass('active');
		target.closest("button.lnb-btn").attr('aria-expanded', true)
		target.addClass('selected');
	}else {
		if(CURRENT_MENU_ID) {
	        target = $("#"+CURRENT_MENU_ID);
			target.closest(".lnb-item").addClass('active');
			target.closest("button.lnb-btn").attr('aria-expanded', true)
			target.addClass('selected');
	    }
	} 
	//, aside.jsp(lnb) 선택 처리를 위한 스크립트_[E] ============================================
	
	
	// 상단 GNB메뉴 한번호출로 처리함   
	//item.menuLevel == 2 탑메뉴의(제도소개,민원상담실,알림.자료실,종사자마당)
	//item.menuLevel == 3 제도소개의(노인장기요양보험이란?,장기요앙인저 및 이용절차,급여종류 및 내용, 인프라시설, 급여기준 및 수가) 
	 	 
    var menuId = $(".gnb-menu").prop("id");
    var request = gfn_ajaxReqSync(CONTEXT_PATH + "/menu/selectRoleMenuList", gfn_setJson({sysMenuId: menuId}));
    request.done(function (responseText, statusText, xhr) {
        var menuList 	= gfn_getJson(responseText);
        var contDiv 	= $("#no_seek_to_length_0");//, PC 메뉴 DIV 영역
	    var m_contDiv 	= $("#no_seek_to_length_0");//, MOBILE 메뉴 DIV 영역
        //전체메뉴
        //var contDiv_all =$("#no_seek_to_length_all");
		//, var gnbTotalCount	= $(".gnb-menu > li > button").length;
        //, var gnbCount		= 0; 
        //, var oldMenuLevel 	= 0;
        for (var i=0; i < menuList.length; i++) {
            var item = menuList[i];
			
            if (item.menuLevel == 2) {//, 탑메뉴(민원서비스, 장기요양기관, 알림.자료실, 제도안내)
            	contDiv=$("#"+item.sysMenuId);
            	m_contDiv=$("#m_"+item.sysMenuId);
            	
				//, gnbCount=gnbCount+1;//, 화면에 있는 태그 만큼만 메뉴 그리기 용
            	//, contDiv_all = $("#"+item.sysMenuId+"_all");
            }
            //, if(gnbCount > gnbTotalCount) break;//, 화면에 있는 태그 만큼만 메뉴 그리기 용
            
            if (item.menuLevel > 2) { //, 탑메뉴 하위 메뉴
            	if (item.menuLevel == 3) {
                 	var menuUrl = "#"; //메뉴 바로가기 강제로 없음
                    var renderingData = {menuUrl: menuUrl, menuNm: item.menuNm};
                }else if(item.pgmPttnCd=="2"){//, DCMS Lite > 프로그램유형 : 2(화면(팝업))
                	var menuUrl = (item.menuUrl == "#" ? "": item.menuUrlBlank);
                    var renderingData = {menuUrl: menuUrl, menuNm: item.menuNm};
                }else{//링크
                  	var menuUrl = (item.menuUrl == "#" ? "" : CONTEXT_PATH + item.menuUrl);
                    var renderingData = {menuUrl: menuUrl, menuNm: item.menuNm};
                }
                
                if(contDiv.length>0){//, 탑메뉴(민원서비스, 장기요양기관, 알림.자료실, 제도안내) 영역이 화면에 없으면 메뉴를 그리지 않는다. 
            		if (item.menuLevel == 3) {
            			//contDiv.append($.templates("#header_template").render(renderingData));
                		contDiv.next('div').find('.gnb-main-list > .cate-list').append($.templates("#header_template").render(renderingData));
                		m_contDiv.append($.templates("#m_header_template").render(renderingData));
                		//contDiv_all.append($.templates("#header_template_all").render(renderingData));
                		
                    } else if (item.menuLevel == 4) {
                    	if(item.pgmPttnCd=="2"){   
	                        //contDiv.find(".nav-column-main:last-child > ul:last-child").append($.templates("#item_template_blank").render(renderingData));
	                        contDiv.next('div').find('.gnb-main-list:last-child .devDiv:last-child .devMenuList:last-child').append($.templates("#item_template_blank").render(renderingData));
	                        m_contDiv.find('.devDiv:last-child .devMenuList').append($.templates("#m_item_template_blank").render(renderingData));
                        
	                        //contDiv_all.find(".nav-column-main-all:last-child > ul:last-child").append($.templates("#item_template_blank_all").render(renderingData));
                    	}else{
	                        //contDiv.find(".nav-column-main:last-child > ul:last-child").append($.templates("#item_template").render(renderingData));
	                        contDiv.next('div').find('.gnb-main-list:last-child .devDiv:last-child .devMenuList:last-child').append($.templates("#item_template").render(renderingData));
	                        m_contDiv.find('.devDiv:last-child .devMenuList').append($.templates("#m_item_template").render(renderingData));
	                        //contDiv_all.find(".nav-column-main-all:last-child > ul:last-child").append($.templates("#item_template_all").render(renderingData));
                    	}	
                    }else if (item.menuLevel == 5) {
                    	//if (item.menuLevel > oldMenuLevel) contDiv.find(".nav-column-main:last-child > ul > li:last-child").append($("<ul></ul>"));
                    	//if (item.menuLevel > oldMenuLevel) contDiv_all.find(".nav-column-main-all:last-child > ul > li:last-child").append($("<ul></ul>"));
                    	//contDiv.find(".nav-column-main:last-child > ul:last-child > li:last-child > ul:last-child").append($.templates("#item_template2").render(renderingData));
                    }
            	
                    //, oldMenuLevel = item.menuLevel;
                }
            }
            
        }
        
        //$("#menuText").val( $("#npe0000000000").html());
        //$("#npe0000000010").append('<button type="button" class="layer_close">레이어 닫기</button>');
        //$("#npe0000000410").append('<button type="button" class="layer_close">레이어 닫기</button>');
        //$("#npe0000000750").append('<button type="button" class="layer_close">레이어 닫기</button>');
        //$("#npe0000001000").append('<button type="button" class="layer_close">레이어 닫기</button>');
        //$("#gnb").append('<a href="#" class="allmenu">전체메뉴</a>');
        //$(".allmenu_wrap").append('<button type="button" class="close" style="background: transparent;"><img src="/npbs/main/images/common/all_close2.png" alt="창닫기">창닫기</button>');
        
    });
	
	
	
	// enter key form submit 방지
	$("input:text").on("keydown", function (event) {
	    if (event.keyCode == 13) return false;
	});
	
	// 서버 유효성 검증 결과 오류가 존재할 경우 메시지 박스 스타일 설정
	$("#msg_box div:has(span)").addClass("proc_label_container");
	$("#msg_box ul:has(li)").addClass("err_label_container").css("visibility", "visible");
	
	// 화면내 싱글 캘린더에 대한 datepicker 자동 설정
	if ($.datepicker) {
	    $.datepicker.setDefaults(DATEPICKER_OPTIONS);
	    //, datepicker 에 readonly 속성 제거
		$(".hasDatepicker").removeAttr("readonly");
		$(".sngl_cal").npdatepicker().inputmask(DATEPICKER_INPUT_MASK);
	}
	
	// 테스트 결함등록을 위한 버튼 이벤트
	$("#btn_test_fail").on("click", function (event) {
	    var pgmId = $("#pgmId").val();
	    if (!pgmId) {
	        gfn_alert("프로그램 ID가 존재하지 않습니다.");
	        return;
	    }
	    gfn_openPup($("#pmsq.fail.url").val()+"/?_eifid_=defect.DefectRegister&_menu_=defect.RegisterDefectIF&_pgmId_="+pgmId, "test_fail", 600, 1200);
	});
	// 테스트 승인을 위한 버튼 이벤트
	$("#btn_test_pass").on("click", function (event) {
	    var pgmId = $("#pgmId").val();
	    if (!pgmId) {
	        gfn_alert("프로그램 ID가 존재하지 않습니다.");
	        return;
	    }
	    gfn_openPup(CONTEXT_PATH+"/pmsq/pass?pgmId="+pgmId, "test_pass", 400, 1024);
	});
	// 테스트 화면 진입을 위해 프로그램 아이디를 이용하여 메뉴 이동
	$("#prog_id_srch").autocomplete({
	    source: function (request, response) {
	        request = gfn_ajaxReq(CONTEXT_PATH+"/menu/selectRoleMenuListByPgmId", gfn_setJson({"pgmId": $("#prog_id_srch").val()}));
	        request.done(function (responseText, statusText, xhr) {
	            var returnArray = [];
	            var menuList = gfn_getJson(responseText);
	            for (var i=0; i < menuList.length; i++) {
	                returnArray.push({label:menuList[i].pgmId, value:menuList[i].menuNm, url:CONTEXT_PATH+menuList[i].menuUrl});
	            }
	            response(returnArray);
	        });
	    },
	    select: function (event, ui) {
	        location.href = ui.item.url;
	    },
	    open: function () {
	        $(this).removeClass("ui-corner-all").addClass("ui-corner-top");
	    },
	    close: function () {
	        $(this).removeClass("ui-corner-top").addClass("ui-corner-all");
	    }
	});
	// 프로그램 아이디 입력후 검색 버튼을 이용하여 메뉴 이동
	$("#btn_prog_id_srch").on("click", function (event) {
	    var pgmId = $("#prog_id_srch").val();
	    if (!pgmId) {
	        gfn_alert("프로그램 ID를 입력해 주세요.");
	        return;
	    }
	    var request = gfn_ajaxReq(CONTEXT_PATH+"/menu/selectRoleMenuListByPgmId", gfn_setJson({"pgmId": $("#prog_id_srch").val()}));
	    request.done(function (responseText, statusText, xhr) {
	        var menuList = gfn_getJson(responseText);
	        if (!menuList || menuList.length < 1) gfn_alert("입력한 프로그램 ID에 대한 메뉴가 존재하지 않습니다.");
	        else if (menuList.length == 1) location.href = CONTEXT_PATH+menuList[0].menuUrl;
	        else if (menuList.length > 1) {
	            $("#prog_id_srch").autocomplete("search", $("#prog_id_srch").val());
	        }
	    });
	});
	// 기본 검증 규칙추가 : 허용 최대값 Byte로 체크 (한글입력등 DB에 입력시 길이체크를 위해추가함 - 모상세)
	$.validator.addMethod("maxByteLength",
	        function( value, element, param ) {
	            var len = 0;
	            var str = String(value).replace(/\r\n/g, "\n").replace(/\n/g, "\r\n").replace(/^\s+/, '').replace(/\s+$/, '');
	            for(var i=0; i < str.length; i++) {
	                var ch = escape(str.charAt(i));
	                if( ch.length == 1 ) len++;
	                else if( ch.indexOf("%u") != -1 )  len += 2;
	                else if( ch.indexOf("%") != -1 ) len += ch.length/3;
	            }
	            return this.optional( element ) || param >= len;
	        },$.validator.format("최대허용 입력 글자는 {0}입니다.")
	);
}
/*
 * form 초기화 함수
 * - 서버 validation후 에러가 있다면 메시지 표시와 관련된 작업을 한다.
 * - datepicker 설정 작업을 한다.
 */
function gfn_init() {
    /*
	//isLeaf 가 0 이면 메뉴트리 부모이다. 첫번째 자식 링크로 이동한다.
    $(".isLeaf0").each(function(index){
    	
    	var aside_a_id = $(this).attr("id");
    	var aside_child_a_obj= $("#"+aside_a_id).parent().find('.isLeaf1');
    	if(aside_child_a_obj.length > 0){
    		var aside_child_a_id_first = aside_child_a_obj.first().attr("id");
    		var aside_child_a_id_first_href = $("#"+aside_child_a_id_first).prop("href");
    		$("#"+aside_a_id).prop("href", $("#"+aside_child_a_id_first).prop("href"));
    		$("#"+aside_a_id).prop("target", $("#"+aside_child_a_id_first).prop("target"));
    	}
    });
    */
	
	if(  document.location.pathname.indexOf("/npbs/index.jsp") != -1
	  || document.location.pathname.indexOf("/npbs/indexr.jsp") != -1		
	  || document.location.pathname == "/npbs/"
	  )
	{
		gfn_init_main();
		return;
	}
	
	// 좌측 서브메뉴의 현재 선택된 메뉴 설정
    var CURRENT_MENU_ID = $("#current_menu_id").val();
	var pgmId = $("#pgmId").val();
	if(typeof pgmId !== "undefined" && pgmId != null && pgmId != "" && pgmId.length >= 7) pgmId = pgmId.substring(0,7);
	
	//, aside.jsp(lnb) 선택 처리를 위한 스크립트_[S] ============================================
	var target;
	// requsetParam("menuId")가 없을때 프로그램ID로 메뉴 확인. 프로그램ID에 해당하는 menu가 없으면 현재 세션에 담긴 현재 menu로 유지
	if(gfn_isNull($("#request_menu_id").val()) && ! gfn_isNull(pgmId) && $(".lnb-list").find("a[class^="+pgmId+"]").length > 0){
	    	
		//pgmId에 해당하는 menu가 1개 이상이면 마지막 menu선택
		target = $(".lnb-list").find("a[class^="+pgmId+"]").length == 1 ? $("a[class^="+pgmId+"]") : $("a[class^="+pgmId+"]").eq($("a[class^="+pgmId+"]").length-1);
		
		//pgmId가 여러개인경우 해당 ID속성값과 세션메뉴ID 값이 같으면 선택
		$(".lnb-list").find("a[class^="+pgmId+"]").each(function(index){
			if($(this).prop("id")== CURRENT_MENU_ID){
				target = $(this);
			}
	    });
		
		//pgmId와같은 class 를 가진 메뉴가 있으면 최종 선택
		var pgmId_full = $("#pgmId").val();
		if(! gfn_isNull(pgmId_full) && pgmId_full.length >= 10) {
			pgmId_full = pgmId_full.substring(0,10);
			if($(".lnb-list").find("a[class="+pgmId_full+"]").length == 1){
				target = $(".lnb-list").find("a[class="+pgmId_full+"]");
			}
		}
		
		//이전페이지로 이동시 열린메뉴 초기화 
		$('.lnb-list').find('.lnb-item.active').removeClass('active');
		$('.lnb-list').find('.selected').removeClass('selected');
		$('.lnb-list').find('button.lnb-btn').attr('aria-expanded', false)
		
		target.closest(".lnb-item").addClass('active');
		target.closest("button.lnb-btn").attr('aria-expanded', true)
		target.addClass('selected');
	}else {
		if(CURRENT_MENU_ID) {
	        target = $("#"+CURRENT_MENU_ID);
			target.closest(".lnb-item").addClass('active');
			target.closest("button.lnb-btn").attr('aria-expanded', true)
			target.addClass('selected');
	    }
	} 
	//, aside.jsp(lnb) 선택 처리를 위한 스크립트_[E] ============================================
// 상단 메가메뉴 설정
//  메뉴를 5번 호출해서 한번만 호출 하고자 주석처리함  
//    $(".nav li a").on("mouseover", function (event) {
//        //alert($(this).prop("id"));
//        var that = $(this);
//        var divElmt = that.next();
//        if (divElmt.find("h3").length > 0) return;
//        var menuId = that.prop("class");
//        var request = gfn_ajaxReq(CONTEXT_PATH + "/menu/selectRoleMenuList", gfn_setJson({sysMenuId: menuId}));
//        request.done(function (responseText, statusText, xhr) {
//            var menuList = gfn_getJson(responseText);
//            var contDiv = $("."+menuId).next();
//            
//            var oldMenuLevel = 0;
//            for (var i=0; i < menuList.length; i++) {
//                var item = menuList[i];
//                if (item.menuLevel > 1) {
//                    if (item.menuLevel == 4 && item.menuLevel > oldMenuLevel) contDiv.find(".nav-column:last-child > ul > li:last-child").append($("<ul></ul>"));
//                    var menuUrl = (item.menuUrl == "#" ? item.menuUrl : CONTEXT_PATH + item.menuUrl);
//                    var renderingData = {menuUrl: menuUrl, menuNm: item.menuNm};
//                    if (item.menuLevel == 2) {
//                        contDiv.append($.templates("#header_template").render(renderingData));
//                    }
//                    if (item.menuLevel == 3) {
//                        contDiv.find(".nav-column:last-child > ul:last-child").append($.templates("#item_template").render(renderingData));
//                    }
//                    if (item.menuLevel == 4) {
//                        contDiv.find(".nav-column:last-child > ul:last-child > li:last-child > ul:last-child").append($.templates("#item_template2").render(renderingData));
//                    }
//                }
//                oldMenuLevel = item.menuLevel;
//            }
//            
//            $(".nav .nav-column").mouseover(function(event){ 
//        		event.preventDefault(); 
//        	    $(".nav .nav-column").removeClass("on");
//        	    $(this).addClass("on");
//        	});
//        });
//    }); 

    
	// 상단 GNB메뉴 한번호출로 처리함   
	//item.menuLevel == 2 탑메뉴의(제도소개,민원상담실,알림.자료실,종사자마당)
	//item.menuLevel == 3 제도소개의(노인장기요양보험이란?,장기요앙인저 및 이용절차,급여종류 및 내용, 인프라시설, 급여기준 및 수가) 
    
	var menuId = $(".gnb-menu").prop("id");
	var request = gfn_ajaxReqSync(CONTEXT_PATH + "/menu/selectRoleMenuList", gfn_setJson({sysMenuId: menuId}));
	request.done(function (responseText, statusText, xhr) {
		var menuList 		= gfn_getJson(responseText);//, 메뉴 리스트
        var contDiv 		= $("#no_seek_to_length_0");//, PC 메뉴 DIV 영역
	    var m_contDiv 		= $("#no_seek_to_length_0");//, MOBILE 메뉴 DIV 영역
		var isCurrent		= false; //, gnb 선택 처리 여부 

		//, 파라미터로 받은 메뉴 ID 세팅_[S]
		var paramMenuId = "";
		if(location.search.indexOf('menuId') > -1){
			paramMenuId = location.search.substring(location.search.indexOf('menuId')+7, location.search.indexOf('menuId')+20);
		}else if(! gfn_isNull(target)){
			paramMenuId = gfn_nvl(target.attr("id"));//, 파라미터에 메뉴 id 가 없는 경우 asdie.jsp 선택 처리를 위해 선언한 target 에서 메뉴 id 를 찾는다.
		}
		//, 파라미터로 받은 메뉴 ID 세팅_[E]
				
		//, var gnbTotalCount	= $(".gnb-menu > li > button").length;
		//, var gnbCount		= 0; 
		//, var oldMenuLevel 	= 0;
		for (var i=0; i < menuList.length; i++) {
			var item = menuList[i];
			if (item.menuLevel == 2) {
				contDiv=$("#"+item.sysMenuId);
				m_contDiv=$("#m_"+item.sysMenuId);
				//, gnbCount=gnbCount+1;//, 화면에 있는 태그 만큼만 메뉴 그리기 용
			}
			//, if(gnbCount > gnbTotalCount) break;//, 화면에 있는 태그 만큼만 메뉴 그리기 용
			
			if (item.menuLevel > 2) { //, 탑메뉴(민원서비스, 장기요양기관, 알림.자료실, 제도안내)
				if (item.menuLevel == 3) {
					var menuUrl = "#"; //메뉴 바로가기 강제로 없음
					var renderingData = {menuUrl: menuUrl, menuNm: item.menuNm};
				}else if(item.pgmPttnCd=="2"){//, DCMS Lite > 프로그램유형 : 2(화면(팝업))
					var menuUrl = (item.menuUrl == "#" ? "": item.menuUrlBlank);
					var renderingData = {menuUrl: menuUrl, menuNm: item.menuNm};
				}else{//링크
					var menuUrl = (item.menuUrl == "#" ? "" : CONTEXT_PATH + item.menuUrl);
					var renderingData = {menuUrl: menuUrl, menuNm: item.menuNm};
				}
				
				if(contDiv.length>0){//, 탑메뉴(민원서비스, 장기요양기관, 알림.자료실, 제도안내) 영역이 화면에 없으면 메뉴를 그리지 않는다. 
            		if (item.menuLevel == 3) {
                		contDiv.next('div').find('.gnb-main-list > .cate-list').append($.templates("#header_template").render(renderingData));
                        m_contDiv.append($.templates("#m_header_template").render(renderingData));
                		
                    } else if (item.menuLevel == 4) {
                    	if(item.pgmPttnCd=="2"){   
	                        //contDiv.find(".nav-column:last-child > ul:last-child").append($.templates("#item_template_blank").render(renderingData));
	                        contDiv.next('div').find('.gnb-main-list:last-child .devDiv:last-child .devMenuList:last-child').append($.templates("#item_template_blank").render(renderingData));
	                        m_contDiv.find('.devDiv:last-child .devMenuList').append($.templates("#m_item_template_blank").render(renderingData));
                    	}else{
	                        //contDiv.find(".nav-column:last-child > ul:last-child").append($.templates("#item_template").render(renderingData));
	                        contDiv.next('div').find('.gnb-main-list:last-child .devDiv:last-child .devMenuList:last-child').append($.templates("#item_template").render(renderingData));
	                        m_contDiv.find('.devDiv:last-child .devMenuList').append($.templates("#m_item_template").render(renderingData));
                    	}	
                    }else if (item.menuLevel == 5) {
                    	//if (item.menuLevel > oldMenuLevel) contDiv.find(".nav-column:last-child > ul > li:last-child").append($("<ul></ul>"));
                    	//contDiv.find(".nav-column:last-child > ul:last-child > li:last-child > ul:last-child").append($.templates("#item_template2").render(renderingData));
                    	contDiv.next('div').find('.gnb-main-list:last-child .devDiv:last-child .devMenuList:last-child').append($.templates("#item_template2").render(renderingData));
                    }
            	
                    //, oldMenuLevel = item.menuLevel;
                	
					//, 파라미터로 받은 메뉴ID 와 화면의 ID를 비교한다.
					if(paramMenuId == item.sysMenuId){
						//, gnb 선택 처리
						contDiv.addClass('current');
						let $parent =  m_contDiv.closest("#npe0000000000");
						$parent.find('.active').removeClass("active")
						$parent.find('a[href=#'+m_contDiv.attr("id")+']').addClass("active")
						m_contDiv.addClass("active");
					}
				}//, if(contDiv.length>0)
			}
			
		}
		
		//$("#menuText").val( $("#npe0000000000").html());  
		
		//, $(".nav01").append("<a href='#' class='close cl1'><img src='/npbs/images/np/layout/slide_close.gif' alt='메뉴닫기' /></a>"); 
		//, $(".nav02").append("<a href='#' class='close cl2'><img src='/npbs/images/np/layout/slide_close.gif' alt='메뉴닫기' /></a>"); 
		//, $(".nav03").append("<a href='#' class='close cl3'><img src='/npbs/images/np/layout/slide_close.gif' alt='메뉴닫기' /></a>"); 
		//, $(".nav04").append("<a href='#' class='close cl4'><img src='/npbs/images/np/layout/slide_close.gif' alt='닫기' /></a>");
		//$(".nav04").append("<a href='#' class='close cl4'><img src='/npbs/images/np/layout/slide_close.gif' alt='닫기' /></a>");
		
		//, $(".nav05").append("<a href='#' class='close cl5'><img src='/npbs/images/np/layout/slide_close.gif' alt='닫기' /></a>"); 
		
		//, $("li.n_04").attr('id', 'last');
		//, $("li.n_04").attr('id', 'last');
		//, $("div.na04").append("<a href='#' style='position:absolute; text-indent:-99999px; font-size:0'>빈텍스트</a>");
		//, $(".nav02 .nav-column:eq(5)").addClass("line");
	});//, request.done(function (responseText, statusText, xhr)
    
    // enter key form submit 방지
    $("input:text").on("keydown", function (event) {
        if (event.keyCode == 13) return false;
    });

    // 서버 유효성 검증 결과 오류가 존재할 경우 메시지 박스 스타일 설정
    $("#msg_box div:has(span)").addClass("proc_label_container");
    $("#msg_box ul:has(li)").addClass("err_label_container").css("visibility", "visible");
    
    // 화면내 싱글 캘린더에 대한 datepicker 자동 설정
    if ($.datepicker) {
        $.datepicker.setDefaults(DATEPICKER_OPTIONS);
		//, datepicker 에 readonly 속성 제거
		$(".hasDatepicker").removeAttr("readonly");        
		$(".sngl_cal").npdatepicker().inputmask(DATEPICKER_INPUT_MASK);
    }
    
    // 테스트 결함등록을 위한 버튼 이벤트
    $("#btn_test_fail").on("click", function (event) {
        var pgmId = $("#pgmId").val();
        if (!pgmId) {
            gfn_alert("프로그램 ID가 존재하지 않습니다.");
            return;
        }
        gfn_openPup($("#pmsq.fail.url").val()+"/?_eifid_=defect.DefectRegister&_menu_=defect.RegisterDefectIF&_pgmId_="+pgmId, "test_fail", 600, 1200);
    });
    // 테스트 승인을 위한 버튼 이벤트
    $("#btn_test_pass").on("click", function (event) {
        var pgmId = $("#pgmId").val();
        if (!pgmId) {
            gfn_alert("프로그램 ID가 존재하지 않습니다.");
            return;
        }
        gfn_openPup(CONTEXT_PATH+"/pmsq/pass?pgmId="+pgmId, "test_pass", 400, 1024);
    });
    // 테스트 화면 진입을 위해 프로그램 아이디를 이용하여 메뉴 이동
    $("#prog_id_srch").autocomplete({
        source: function (request, response) {
            request = gfn_ajaxReq(CONTEXT_PATH+"/menu/selectRoleMenuListByPgmId", gfn_setJson({"pgmId": $("#prog_id_srch").val()}));
            request.done(function (responseText, statusText, xhr) {
                var returnArray = [];
                var menuList = gfn_getJson(responseText);
                for (var i=0; i < menuList.length; i++) {
                    returnArray.push({label:menuList[i].pgmId, value:menuList[i].menuNm, url:CONTEXT_PATH+menuList[i].menuUrl});
                }
                response(returnArray);
            });
        },
        select: function (event, ui) {
            location.href = ui.item.url;
        },
        open: function () {
            $(this).removeClass("ui-corner-all").addClass("ui-corner-top");
        },
        close: function () {
            $(this).removeClass("ui-corner-top").addClass("ui-corner-all");
        }
    });
    // 프로그램 아이디 입력후 검색 버튼을 이용하여 메뉴 이동
    $("#btn_prog_id_srch").on("click", function (event) {
        var pgmId = $("#prog_id_srch").val();
        if (!pgmId) {
            gfn_alert("프로그램 ID를 입력해 주세요.");
            return;
        }
        var request = gfn_ajaxReq(CONTEXT_PATH+"/menu/selectRoleMenuListByPgmId", gfn_setJson({"pgmId": $("#prog_id_srch").val()}));
        request.done(function (responseText, statusText, xhr) {
            var menuList = gfn_getJson(responseText);
            if (!menuList || menuList.length < 1) gfn_alert("입력한 프로그램 ID에 대한 메뉴가 존재하지 않습니다.");
            else if (menuList.length == 1) location.href = CONTEXT_PATH+menuList[0].menuUrl;
            else if (menuList.length > 1) {
                $("#prog_id_srch").autocomplete("search", $("#prog_id_srch").val());
            }
        });
    });
    // 기본 검증 규칙추가 : 허용 최대값 Byte로 체크 (한글입력등 DB에 입력시 길이체크를 위해추가함 - 모상세)
    $.validator.addMethod("maxByteLength",
            function( value, element, param ) {
                var len = 0;
                var str = String(value).replace(/\r\n/g, "\n").replace(/\n/g, "\r\n").replace(/^\s+/, '').replace(/\s+$/, '');
                for(var i=0; i < str.length; i++) {
                    var ch = escape(str.charAt(i));
                    if( ch.length == 1 ) len++;
                    else if( ch.indexOf("%u") != -1 )  len += 2;
                    else if( ch.indexOf("%") != -1 ) len += ch.length/3;
                }
                return this.optional( element ) || param >= len;
            },$.validator.format("최대허용 입력 글자는 {0}입니다.")
    );
    
}//, function gfn_init()
 

function gfn_myMenuScrap(){  
   if(USER_NAME==""){
 	    gfn_alert("로그인 후 이용해주세요.");
   }else{
       if(USER_TYPE == "P" || USER_TYPE == "D" || USER_TYPE == "F" || USER_TYPE == "G" || USER_TYPE == "H") {
//         var request = gfn_ajaxReqComn(CONTEXT_PATH+"/e/g/108/insertMyMenuScrap.web", gfn_setJson({"currentMenuId" : $("#current_menu_id").val()}));
           var request = gfn_ajaxReq(CONTEXT_PATH+"/e/g/108/insertMyMenuScrap.web", gfn_setJson({"currentMenuId" : $("#current_menu_id").val()}));
           request.done(function (responseText, statusText, xhr) {
               gfn_alert("스크랩 완료 되었습니다.");
           });
       } else if(USER_TYPE == "A" || USER_TYPE == "B" || USER_TYPE == "C" || USER_TYPE == "E" || USER_TYPE == "I") {
           gfn_alert("기관로그인은 이용할 수 없습니다. 개인로그인 후 이용해 주세요.");
           return false;
       }
   }

//		request.done(function (responseText, statusText, xhr) {
//			gfn_alert(responseText);
//		var rtnData = gfn_getJson(responseText); 
//		if(rtnData.result == 'success') {
//		    gfn_alert("스크랩했습니다 마이메뉴 스크랩에서 확인가능합니다.");
//		    return false;
//		} else {
//		    gfn_alert("스크랩할 수 없습니다. 관리자에게 문의해 주세요.");
//		    return false;
//		}
//		
//	});
}



function gfn_myPagePrint(){ 

		var url = CONTEXT_PATH+"/e/g/108/myPagePrint.web";
      popup_A = gfn_openPupComn(url, "popup_myPagePrint",768, 1024,"yes").focus();
	
	
    return false;
}

function gfn_aLink(aLink, isStr){
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
	
	var orginUrl = (isStr == true) ? aLink : $(aLink).attr("href"); 
    if (typeof AnySign == "undefined" || typeof s == "undefined" || s == "" || s == undefined ) {
    	
    	var zoomSize;
    	
    	if(typeof Zoom  == "undefined" || typeof Zoom == undefined){
    		zoomSize = "";
    	}else{
    		zoomSize = Zoom.size;
    	}
		var url = orginUrl;
		if(url.indexOf('?') > -1){
			url = orginUrl + '&zoomSize=' + zoomSize;
		} else {
			url = orginUrl + '?zoomSize=' + zoomSize;
		}
		location.href = url;
	} else {
		
		if(orginUrl != "#"){
			
			var prevPath = document.location.pathname;
			var url = '';
			if (orginUrl.indexOf('?') > -1) {
				url = orginUrl + '&prevPath=' + prevPath;
			} else {
				url = orginUrl + '?prevPath=' + prevPath;
			}
			
			if(isStr == true){
				location.href = url;
			}else{
				$(aLink).attr("href", url);
				location.href = aLink;			
			}
//			AnySign.XecureLink(aLink);
			//, location.href = aLink;
			//location.link(aLink);

		}
	}
}

//location.href
//기존 페이지 이동 location.href 를 대체
function gfn_location(url, target){
	if(!target){
		target = "_self";
	}
    /*    2018.10.20. / 박홍식 / 엑티브X제거사업 
     *    XecureWeb -> AnySign변경   {*/
//    if (typeof AnySign == "undefined" || typeof s == "undefined" || s == "" || s ==undefined) {
		location.href = url;
//	} else {
//		AnySign.XecureNavigate( url, target);
//	}
}
function gfn_filedown(url){
	location.href = url;
	//운영서버에서 URL 호출이 제대로 안되어 URL 이동으로 변경. JEUS 환경설정도 HWP 지원으로 변경됨.
	//url = encodeURIComponent(url);
	//var $filedownloadform_ = $('<form name="filedownloadform_" id="filedownloadform_" action="'+CONTEXT_PATH+'/attachfile/downloadFile" target="np_common_iframe_" method="post"><input type="hidden" name="fileUrl" value="'+url+'" /></form>').appendTo('body');
	//$filedownloadform_.submit().remove();
}



function gfn_validationJumin(strVal){
	if(strVal == null || strVal.length != 13) {
		gfn_alert("주민번호가 올바르지 않습니다."); 
		return false;
	}
	
	var resiFirst = strVal.substring(0,6);
	var resiLast = strVal.substring(6,13);
	var chk = 0;
	if(resiFirst.length < 6) {
		gfn_alert("주민번호가 올바르지 않습니다.");
		return false;
	}
	if(resiLast.length < 7) {
		gfn_alert("주민번호가 올바르지 않습니다.");
		return false;
	}
	if(resiFirst.match(/[^(\+|\-)?][^\d]+/) != null) {
		gfn_alert('주민등록번호에 잘못된 문자가 있습니다.');
		return false;
	}
	if(resiLast.match(/[^(\+|\-)?][^\d]+/) != null) {
		gfn_alert('주민등록번호에 잘못된 문자가 있습니다.');
		return false;
	}
	var nMondth = resiFirst.substring(2,4);
	var nDay    = resiFirst.substring(4,6);
	var nSex    = resiLast.charAt(0);
	if(resiFirst.length!=6 || nMondth<1 || nMondth>12 || nDay<1 || nDay>31) {
		gfn_alert('올바른 주민등록번호가 아닙니다.');
		return false;
	}
	if(resiLast.length !=7 || nSex < 1 || nSex > 8) {
		gfn_alert('올바른 주민등록번호가 아닙니다.');
		return false;
	}
	var i;
	for(i=0; i < 6; i++) {
		chk += ( (i+2) * parseInt( resiFirst.charAt(i) ));
	}
	for(i=6; i < 12; i++) {
		chk += ( (i%8+2) * parseInt( resiLast.charAt(i-6) ));
	}
	chk = 11 - (chk%11);
	chk %= 10;

	// 외국인 등록번호 유효성 추가
	if(chk != parseInt( resiLast.charAt(6)) && gfn_foreignNumber(strVal) == false) {
		gfn_alert('유효하지않은 주민등록번호입니다!!');
		return false;
	} 
	
	return true; 
}

function gfn_foreignNumber(rrn){
	var sum = 0;
	if(rrn.length != 13){
		return false;
	}else if(rrn.substr(6,1) != '5' && rrn.substr(6,1) != '6' && rrn.substr(6,1) != '7' && rrn.substr(6,1) != '8'){
		return false;
	}
	
	if(Number(rrn.substr(7,2))%2 != 0){
		return false;
	}
	for(var i=0; i<12; i++){
		sum += Number(rrn.substr(i,1)) * ((i%8)+2);
	}
	if((((11-(sum%11))%10+2)%10) != Number(rrn.substr(12,1))){
		return false;
	}
	return true;	
}
/*
 * 페이지의 타이틀을 변경하는 함수.
 */
function gfn_titleInit(){
	
	var titleText = "국민건강보험공단 장기요양보험";
	
	if($("div.pop_header").find("p.tit_pop_header").length != 0){
		titleText += TITL_DELIMITER + $("div.pop_header").find("p.tit_pop_header").text();
	}else{
		$("div .location").find("li > a").each(function(index){
			if(index > 0) {
				titleText += TITL_DELIMITER + $(this).text();
			}
	    });
		if($("div .location").find("h3").length > 0){
			titleText += TITL_DELIMITER+$("div .location").find("h3").text();		
		}
	}
	
	if($(".breadcrumbli").length != 0 || $(".div.page-title").length != 0){
		var arr = $(".breadcrumbli").children().map(function(){
		return $(this).text().trim();
		}).get();
		
		titleText= "국민건강보험공단 장기요양보험 > " 
		for(var i = 0 ; i  < arr.length; i++){
			titleText += arr[i]+" > ";
		}
		titleText += $(".page-title").text();
		
	}
	
	document.title = titleText;
}
/*
 * 페이지의 타이틀을 추가하는 함수.
 */
function gfn_addTitle(name_){
	var titleText = document.title;
	titleText += TITL_DELIMITER + name_;
	document.title = titleText;
}


/*
 * SELECTBOX UI의 값을 선택하는 함수
 */
function gfn_selectRefresh(locNoSeltElmtId, refreshValue) {
	var locNoSeltElmt = $("#"+locNoSeltElmtId);
    if (!locNoSeltElmt) return;
    if (locNoSeltElmt.hasClass("select")) {
    	locNoSeltElmt.val(refreshValue);
    	locNoSeltElmt.selectmenu("refresh"); // jquery ui 사용시 select 요소에 동적으로 option을 추가,삭제,비활성화 할 경우 수행
    }
}

/*
 * 인증서 검증
 * return "Y" or "ERROR MASSAGE"
 */
function gfn_certValid(signedMsg, vidMsg, custNo, tranId) {
	//console.log("@@@@ signedMsg : " + signedMsg );
	//console.log("@@@@ vidMsg : " + vidMsg );
	//console.log("@@@@ custNo : " + custNo );
	//console.log("@@@@ tranId : " + tranId );
	var xmlRequest = null;
	var responseText = "";
	
	if(window.XMLHttpRequest){
		xmlRequest = new XMLHttpRequest();		
	}else if(window.ActiveXObject){
		try{
			xmlRequest = new ActiveXObject("Msxml2.XMLHTTP");
		}catch(e){
			xmlRequest = new ActiveXObject("Microsoft.XMLHTTP");
		}
	}
	
	var url = CONTEXT_PATH+"/auth/pki/selectCertCheck.web";
	var data = "signedMsg="+signedMsg+"&vidMsg="+vidMsg+"&custNo="+custNo;
	//alert("custNo : " + custNo);
	if(typeof tranId!=undefined  && tranId!= undefined &&  tranId!= "undefined" &&  tranId != "" ){
		data += gfn_getTranData(tranId);
		
		data += "&transkeyUuid="+ tk.transkeyUuid+"";
		
		data += "&ids="+tranId;
	}
	
	ajaxData      = {};
	ajaxData["url"]   = url+"";
	ajaxData["data"]  = {signedMsg: signedMsg,vidMsg:vidMsg, custNo:custNo };
    if (typeof AnySign != "undefined" && typeof s != "undefined" && s != "" && s !=undefined ) {
		//XecureAjaxGet(ajaxData);
		if(ajaxData.np_data != "" && ajaxData.np_data != undefined && ajaxData.np_data !="undefined" )
		{
			ajaxData["url"] =  ajaxData.np_url;
			ajaxData["data"] = ajaxData.np_data;
		}else{
			ajaxData["data"] = data;
		}
    }

	xmlRequest.open("POST", ajaxData.url, false);
	xmlRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	//xmlRequest.send(ajaxData.data);
	xmlRequest.send(data);
	
	if(xmlRequest.readyState == 4){
		if(xmlRequest.status == 200){
			responseText = xmlRequest.responseText;
			if(ajaxData.np_data != "" && ajaxData.np_data != undefined && ajaxData.np_data !="undefined" ){   
//				responseText = AnySign.BlockDec((responseText).replace(/"/g,""));
				responseText = responseText.replace(/"/g,"");
				if(responseText == null || responseText == 'null'){
					responseText = '';
				}
		    }
			var resultJson = gfn_getJson(responseText);	
			if(resultJson == ""){
				responseText = "";
			}else if(resultJson.certInfoVO.certResultYN == "Y"){
				responseText = "Y";
			}else{
				responseText = resultJson.certInfoVO.certMsg;
			}
		}else if(xmlRequest.status == 999){
			responseText = "세션이 만료되었습니다.";
		}else{
			responseText = "서버와 통신중 에러가 발생하였습니다.";
		}
	}
	
    return responseText;
}

function gfn_openMediPop(){
	if(gfn_getCookie("drnvwpcmnpup") == ""){
	    var formalSpecs = "menubar=no, status=no, scrollbars=no, resizable=no";
	    var specs = formalSpecs + ", top=100, left=100, height=760, width=680";
	    
	    var mediPop = window.open(WEB_FULL_PATH + CONTEXT_PATH + "/t/z/500/selectRcgtAplyCnclPop", "mediPopup", specs, null);
	    mediPop.focus();
	}
}

function gfn_getCookie( name ){
    var nameOfCookie = name + "=";
    var x = 0;
    while ( x <= document.cookie.length ){
        var y = (x+nameOfCookie.length);
        if ( document.cookie.substring( x, y ) == nameOfCookie ){
            if ( (endOfCookie=document.cookie.indexOf( ";", y )) == -1 ) endOfCookie = document.cookie.length;
            return unescape( document.cookie.substring( y, endOfCookie ) );
        }
        x = document.cookie.indexOf( " ", x ) + 1;
        if ( x == 0 ) break;
    }
    return "";
}


function gfn_setCookie( name, value, expiredays ){
    var todayDate = new Date();
    todayDate.setDate( todayDate.getDate() + expiredays );
    document.cookie = name + "=" + escape( value ) + "; path=/; expires=" + todayDate.toGMTString() + ";";
}
function gfn_setCookieToday( name, value, expiredays ){
	var tempDate = new Date();
    var todayDate = new Date();
    todayDate = new Date(parseInt(todayDate.getTime()/86400000)*86400000+54000000);
    
    if(todayDate > tempDate){
        expiredays = expiredays -1;
    }
    
    todayDate.setDate( todayDate.getDate() + expiredays );
    document.cookie = name + "=" + escape( value ) + "; path=/; expires=" + todayDate.toGMTString() + ";";
}

function checkdate(day, stylename){
	var xmlHttp = null;
	if(window.XMLHttpRequest) {
		xmlHttp = XMLHttpRequest();
		xmlHttp.open("HEAD",window.location.href.toString(),false);
		xmlHttp.setRequestHeader("Content-Type","text/html");
		xmlHttp.send("");
	} else if(window.ActiveXObject) {
		xmlHttp = ActiveXObject("Msxml2.XMLHTTP");
		xmlHttp.open("HEAD",window.location.href.toString(),false);
		xmlHttp.setRequestHeader("Content-Type","text/html");
		xmlHttp.send("");
	}
	
	var st = xmlHttp.getResponseHeader("Date");
	var curData = new Date(st);
	var yyyy = curData.getFullYear();
	var mm = curData.getMonth() + 1;
	var dd = curData.getDate();
	if(parseInt(mm) < 10) {
		mm = 0 + "" + mm;
	}
	if(parseInt(dd) < 10) {
		dd = 0 + "" + dd;
	}
	var curDataFmt = yyyy.toString() + mm.toString() + dd.toString();
	
	if(parseInt(curDataFmt) >= parseInt(day)) {
		document.getElementsByClassName("" + stylename + "")[0].style.display = "block";
	}
}

$(document).ready(function () {
	//포털일 경우만 실행함.
	if(typeof portalMediType != "undefined" && portalMediType == "P"){
		try{
			gfn_init();
		}catch(e){
			console.log(e);
		} 
		//마이메뉴스크랩
		$("#my_scrap").on("click", function (event) {
			event.preventDefault();	
			gfn_myMenuScrap();
			return false;
		});	
		$("#my_print").on("click", function (event) {
			event.preventDefault();	
			gfn_myPagePrint();
			return false;
		});	
		
		//타이틀 자동 변환
		gfn_titleInit();
	}
});

/*
 * 레포트 열기 함수
 * strUrl::String >> annotation 맵핑
 * data::String >> 데이터
 * rptUrl::String >> 레포트 명
 * parameter::String >> 파라미터
 * maIstChk::String >> 마크애니 exe / html5 버전 나누기
 */
this.gfn_reportOpen = function(strUrl, data, rptUrl, parameter, maIstChk, useMak,callBackData,callBackFunc,medi){
	var formalSpecs = "center=yes, menubar=no, status=no, scrollbars=no, resizable=yes, location=no";
  	var specs = formalSpecs + ",height=800, width=1024";
	var pop = window.open('about:blank',"Report", specs, null);
	var form = $('<form></form>');
	form.attr("method", "POST");
	form.attr("action",strUrl);
	form.attr("target","Report");
	
	var input = $('<input></input>');
	
	//crf파일 명
	input.attr("name", "rptUrl");
	input.attr("type", "hidden");
	input.attr("value", rptUrl);
	$(form).append(input);
	
	var input = $('<input></input>');
	
	//브라우저 버전 정보
	input.attr("name", "maIstChk");
	input.attr("type", "hidden");
	input.attr("value", maIstChk);
	$(form).append(input);
	
	var input = $('<input></input>');
	
	//마크애니 사용 정보
	input.attr("name", "useMak");
	input.attr("type", "hidden");
	input.attr("value", useMak);
	$(form).append(input);
	
	
	var input = $('<input></input>');
	
	//출력제어 데이터 전달.
	input.attr("name", "data");
	input.attr("type", "hidden");
	input.attr("value", callBackData);
	$(form).append(input);

	var input = $('<input></input>');
	//출력제어 콜백함수 전달.
	input.attr("name", "callBackFunc");
	input.attr("type", "hidden");
	input.attr("value", callBackFunc);
	$(form).append(input);
	
	var input = $('<input></input>');
	//출력제어 콜백함수 전달.
	input.attr("name", "medi");
	input.attr("type", "hidden");
	input.attr("value", medi);
	$(form).append(input);
	
	for (var paramName in data) {
		setInputParam(form,paramName,data[paramName]);
    }
	
	var param = "";
	
	if(parameter != ""){
		for (var paramName in parameter) {
			param += paramName+"__"+parameter[paramName] +",";
		}
	}
	if(param != null){
		setInputParam(form,"addField",param);
	};
	
	$(document.body).append(form);
	
	form.submit();
}

this.setInputParam = function(oForm, sName, sValue){
	var input = $('<input></input>');
	
	input.attr("name", sName);
	input.attr("type", "hidden");
	input.attr("value", sValue);
	
	$(oForm).append(input);
}


this.gfn_reportOpen2 = function(strUrl, data, rptUrl, parameter, maIstChk,useMak,callBackData,callBackFunc,medi){
	var formalSpecs = "center=yes, menubar=no, status=no, scrollbars=no, resizable=yes, location=no";
  	var specs = formalSpecs + ",height=800, width=1024";
	var pop = window.open('about:blank',"Report", specs, null);
	
	var form = $('<form></form>');
	form.attr("method", "POST");
	form.attr("action",strUrl);
	form.attr("target","Report");
	
	var input = $('<input></input>');
	
	//crf파일 명
	input.attr("name", "rptUrl");
	input.attr("type", "hidden");
	input.attr("value", rptUrl);
	$(form).append(input);
	
	var input = $('<input></input>');
	
	//브라우저 버전 정보
	input.attr("name", "maIstChk");
	input.attr("type", "hidden");
	input.attr("value", maIstChk);
	$(form).append(input);

	var input = $('<input></input>');
	
	//마크애니 사용 정보
	input.attr("name", "useMak");
	input.attr("type", "hidden");
	input.attr("value", useMak);
	$(form).append(input);
	
	/*
	var cbData = "";
	for (var paramName in callBackData) {
		cbData += paramName + ":" +  callBackData[paramName] + ",";
    }
	*/
	
	var input = $('<input></input>');
	
	//출력제어 데이터 전달.
	input.attr("name", "data");
	input.attr("type", "hidden");
	input.attr("value", callBackData);
	$(form).append(input);
	
	var input = $('<input></input>');
	//출력제어 데이터 전달.
	input.attr("name", "callBackFunc");
	input.attr("type", "hidden");
	input.attr("value", callBackFunc);
	$(form).append(input);
	
	var input = $('<input></input>');
	//출력제어 콜백함수 전달.
	input.attr("name", "medi");
	input.attr("type", "hidden");
	input.attr("value", medi);
	$(form).append(input);
	
/*	
	var doc = $.parseXML("<root/>");
    var rootElmt = doc.getElementsByTagName("root")[0];
    
    var setKey;
    alert(data);
    for (var key in data) {

	    setKey += key+",";
	    
        var listElmt = doc.createElement(key);
        var list = data[key];
        for (var i=0; i<list.length; i++) {
            var recordElmt = doc.createElement("record");
            var record = list[i];
            for (var columnName in record) {
                var columnElmt = doc.createElement(columnName);
                var columnValue = record[columnName];
                if (!columnValue) columnValue = "";
                $(columnElmt).text(columnValue);
                recordElmt.appendChild(columnElmt);
            }
            listElmt.appendChild(recordElmt);
        }
        rootElmt.appendChild(listElmt);
    }
*/
    
    var setKey = "";
    var doc = "";
    
    doc +="<root>\\n";
    
    for (var key in data) {
    	
    	setKey += key+",";
    	
    	doc +="<"+key+">";
    	
    	var list = data[key];
    	for(var i=0; i<list.length; i++) {
    		doc +="<record>\\n";
    		var record = list[i];
            for (var columnName in record) {
            	doc +="<"+columnName+">";
            	doc +=record[columnName]==null?"":"<![CDATA["+record[columnName].toString().replace(/(?:\r\n|\r|\n)/g,"\\n")+"]]>";
            	doc +="</"+columnName+">\\n";
            }
            doc +="</record>\\n";
    	}
    	
    	doc +="</"+key+">\\n";
    	
    }
    
    doc +="</root>";
    
    doc = doc.replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("[", "%5B").replaceAll("]", "%5D");

    var input = $('<input></input>');
	
	//xml데이터
	input.attr("name", "reportData");
	input.attr("type", "hidden");
	input.attr("value", doc);
	$(form).append(input);
	
	var input = $('<input></input>');
	
	//데이터셋 명
	input.attr("name", "setKey");
	input.attr("type", "hidden");
	input.attr("value", setKey);
	$(form).append(input);
	
//	for (var paramName in data) {
//		setInputParam(form,paramName,data[paramName]);
//    }
	
	var param = "";
	if(parameter != ""){
		for (var paramName in parameter) {
			param += paramName+"__"+parameter[paramName] +",";
		}
	}
	if(param != null){
		setInputParam(form,"addField",param);
	};
	
	$(document.body).append(form);
	
	form.submit();
}


/*
function gfn_jsonToXml(object) {
    
	var doc = $.parseXML("<root/>");
    var rootElmt = doc.getElementsByTagName("root")[0];
    
    var setKey;
    
    for (var key in object) {
    	// xpath를 설정한다.
	    oReport.dataset(key).xpath = "root/"+key+"/record";
	    oReport.dataset(key).xpath = "root/"+key+"/record";
	    setKey += key+",";
	    
        var listElmt = doc.createElement(key);
        var list = object[key];
        for (var i=0; i<list.length; i++) {
            var recordElmt = doc.createElement("record");
            var record = list[i];
            for (var columnName in record) {
                var columnElmt = doc.createElement(columnName);
                var columnValue = record[columnName];
                if (!columnValue) columnValue = "";
                $(columnElmt).text(columnValue);
                recordElmt.appendChild(columnElmt);
            }
            listElmt.appendChild(recordElmt);
        }
        rootElmt.appendChild(listElmt);
    }
    return doc;
}
*/

/*
 * Cookie에 할당된 마크애니 설치 and 브라우저 정보
 * strName::String >> Cookie 변수
 */
this.gfn_getRptCookie = function(strName){
    var strArg = new String(strName + "=");
    var nArgLen, nCookieLen, nEnd;
    var i = 0, j;

    nArgLen    = strArg.length;
    nCookieLen = document.cookie.length;
    if(nCookieLen > 0) {
        while(i < nCookieLen) {
            j = i + nArgLen;

            if(document.cookie.substring(i, j) == strArg) {
                nEnd = document.cookie.indexOf (";", j);
                if(nEnd == -1) nEnd = document.cookie.length;
                return unescape(document.cookie.substring(j, nEnd));
            }

            i = document.cookie.indexOf(" ", i) + 1;
            if (i == 0) break;
        }
    }

    return "";
}
/*
 * 트랜스키 데이타 설정
 * 
 */
function gfn_setTranData(strId, data){
	
    var values = tk.inputFillEncData(document.getElementById(strId));
    var org    = document.getElementById(strId).value;
    var name   = document.getElementById(strId).name;
    var hidden = values.hidden;
    var hmac   = values.hmac;       
    
    data[strId+"_values"] = values+"";
    data[strId+"_name"]   = name+"";
    data[strId+"_hidden"] = hidden+"";
    data[strId+"_hmac"]   = hmac+"";
    data[strId+"_org"]    = org+"";
    
	return data;
}


/*
 * 트랜스키 데이타 설정
 * 
 */
function gfn_getTranData(strId){
	
    var values = tk.inputFillEncData(document.getElementById(strId));
    var org    = document.getElementById(strId).value;
    var name   = document.getElementById(strId).name;
    var hidden = values.hidden;
    var hmac   = values.hmac;
    
    var rtnData = "";
    rtnData += "&"+ strId+"_hidden="+hidden;
    rtnData += "&"+ strId+"_hmac="+hmac;
    rtnData += "&"+ strId+"="+org;
    
	return rtnData;
}

/*
 * 문자열 내 주빈번호를 검색한다. 
 */
function gfn_str_isJumin(strId){
	
	var regExp = /(?:\d{2}(?:0[1-9]|1[0-2])(?:[0-3][1-9]|[1-2]\d|[3][0-1])[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z]?[1-8][\d]{6})/g;
	var regSpecSym = /\n|\r/g; // 엔터, 개행
	
	strId = strId.replace(regSpecSym, "");		
	
	return regExp.exec(strId);
	
}
/* ==================================================================================
 * [ 2025년 디지털 서비스 고도화 사업 > 노인장기요양 홈페이지 기능 기선 추가 ] 
 * ==================================================================================
*/

/*
 * header <div id="wrap" class="wrap"> 에 클래스 추가
 * str		::String >> 클래스
 * isOnly	::Boolean >> 추가 클래스 유일 적용 여부(true:모든 클래스를 지우고 str만 추가/false:기존 클래스 유지 및 str추가)
 * ex) gfn_setWrapClass('only-pc', false);
 */
function gfn_setWrapClass(str, isOnly){
	if(str != null && str != undefined){
		str += "";
		if(isOnly){
			$("#wrap").removeClass();
		}
		$("#wrap").addClass(str);
	}	
}

/*
 * null, 빈문자열, undefined, NaN 여부를 체크하는 함수
 * str		::String >> 클래스
 * ex) gfn_isNull('문자열');
 * return  	:: boolean
 */
function gfn_isNull(str){
	if(str == null || str == undefined || str == '' || typeof str == "undefined"){
		return true;
	}
	return false;
}

/*
 * isNull 체크 후 true 시 빈문자열을 리턴함
 * str		::String >> 클래스
 * ex) gfn_nvl('문자열');
 * return  	:: boolean
 */
function gfn_nvl(str){
	if(gfn_isNull(str)){
		return "";
	}
	return str;
}

/*
 * isNull 체크 후 true 시 빈문자열을 리턴함
 * str		::String >> 클래스
 * ex) gfn_personalSimpleLogin('문자열');
 * return  	:: boolean
 */
function gfn_personalSimpleLogin(Rform,type){
	if("local" == type){
		//, 주민번호를 입력 받도록 변경
		gfn_alert(
			"간편인증은 운영환경에서만 테스트가 가능합니다.<br>테스트 로그인할 주민번호를 입력해 주세요<br>"
			+"<input type='text' id='personalSimpleLoginTest' placeholder='주민번호를 입력해 주세요'>"
			+"<br><br>", "", null
			, {"확인" : function() {
				//var jumin = document.createElement("input");
			    var form = Rform.prop("action", "/npbs/auth/login/personalSimpleLogin");
			    //form.find("input[name=custNo]").val('0009203477845'); 
				
				form.find("input[name=custNo]").val($("#personalSimpleLoginTest").val().replaceAll(' ', ''));
				form.submit();
			} 
		});	    
	    
	}else{
		var spAthOption = { ciChckYn : "Y" };
		gfn_simpleAhtc(spAthOption);//, 간편인증 팝업 호출
	}
}


/*
 * 간편인증 Sample_callback
 * type		::String >> 테스트 환경
 * ex) gfn_simpleAuth('문자열');
 * 
 */
function gfn_simpleAuthSample(type){
	if("local" == type){
		//, 업무별로 pass 로직이 필요한 경우 입력값에 맞게 변경해주세요
		gfn_alert(
			"간편인증은 운영환경에서만 테스트가 가능합니다.<br>테스트 로그인할 주민번호를 입력해 주세요<br>"
			+"<input type='text' id='gfn_simpleAuthName' placeholder='이름을 입력해 주세요'>"
			+"<input type='text' id='gfn_simpleAuthBirth' placeholder='생년월일 입력해 주세요(YYYYMMDD)'>"
			+"<input type='text' id='gfn_simpleAuthPhone' placeholder='-없이 핸드폰번호를 입력해 주세요'>"
			+"<br><br>", "", null
			, {"확인" : function() {
				var data = {
					'name' 		: $("#gfn_simpleAuthName").val().replaceAll(' ', '')
					, 'birth' 	: $("#gfn_simpleAuthBirth").val().replaceAll(' ', '')
					, 'phone' 	: $("#gfn_simpleAuthPhone").val().replaceAll(' ', '')
				};
				//, 업무별로 구현된 callback 함수를 호출한다. 
				if(typeof callbackSimpleAuth != 'undefined'){
					callbackSimpleAuth(data);
				}else{
					console.log("callbackSimpleAuth 함수가 구현되지 않았습니다.");
				}
			} 
		});	    
	    
	}else{
		//, 인증결과를 java 에서 받는 경우(callbackUrl 지정)
		//, gfn_simpleAhtc("callbackUrl 지정");//, 간편인증 팝업 호출
		//, 지정한 'callback URL' 에서 아래 소스로 응답을 취득한다. 
		//, ex) LoginController.java > personalSimpleLogin()   
        //,  - 간편인증 결과 취득            : SimpleAuthUtil.getSimpleAhtcResult(request);
        //,  - CI 값으로 주민번호 취득 : npez701service.selectJuminNoByCi(StringUtil.nvl(simpleMap.get("ci")))
		
		//, 인증결과를 script callback 함수로 받는 경우(callbackUrl 지정 하지 않음)
		gfn_simpleAhtc();//, 간편인증 팝업 호출
		//, 응답 데이터 예시
		//,  -map.put("name", "문수민");
		//,  -map.put("birth", "19950603");
		//,  -map.put("phone", "01065523909");
		//,  -map.put("ci", "문수민");
	}
}

/*
 * 간편인증 요청
 * menuType 		::String >> 인증진행메뉴(01:일반민원상담 등록/02:개인별 맞춤 상담/03:부당청구 장기요양기관 신고/04:평가 현장확인 신청/05:부정수급자 신고)
 * callbackUrl		::String >> 간편인증 완료 후 이동할 url(없을 경우 callbackSimpleAuth 함수를 호출함)
 * param			::Object >> callbackUrl 파라미터
 * ex) gfn_simpleAhtc('문자열', object);
 * return  	:: boolean
 */
var simpleAhtcOption = {};
var simpleAhtcParam = {};
function gfn_simpleAhtc(option, param){
	simpleAhtcOption = option;
	simpleAhtcParam = param;
	npez701m02p.init("npez701m02p");
}

function gfn_simpleAhtcPop(option, param){
	if(! npez701m02p.check()){
		gfn_alert("서비스 이용에 대한 필수항목 동의를 하셔야 합니다.");
		return false;
	}

	var position = ',left=10px, top=10px';
    // UI Type: Step UI(default)
    //var winopts = 'width=412px, height=730px, scrollbars=yes, resizable=yes, menubar=no, toolbar=no, location=no, status=no, titlebar=0, ';
    // UI Type: Standard UI
	var winopts = 'width=799px, height=726px, scrollbars=yes, resizable=yes, menubar=no, toolbar=no, location=no, status=no, titlebar=0, ';
	
	if(typeof document.CXWindow == 'undefined'){
		var $CXWindow = document.createElement("form");
		$CXWindow.setAttribute("name"	, "CXWindow");
		$CXWindow.setAttribute("method"	, "POST");
		document.body.appendChild($CXWindow);
	}
	
	cx_window = window.open('about:blank', 'CXWindowPopup', winopts + position);
	if (cx_window == null) {
		alert(" ※ 파이어폭스, 윈도우 XP SP2 또는 인터넷 익스플로러 7 사용자일 경우에는 \n    화면 상단에 있는 팝업 차단 알림줄을 클릭하여 팝업을 허용해 주시기 바랍니다. \n\n※ MSN,야후,구글 팝업 차단 툴바가 설치된 경우 팝업허용을 해주시기 바랍니다.");
	} else {
		document.CXWindow.setAttribute("target", "CXWindowPopup")
		document.CXWindow.setAttribute("action", "/npbs/e/z/701/npez701m01p")
		
		document.CXWindow.innerHTML = '';
		option = ((typeof option).toLowerCase() == 'object') ? option : {};
		 
		var simpleAthcParam = {
			athcType 		: gfn_isNull(option.athcType) ? "athc" : option.athcType //, athc:간편인증, sign:전자약정
			, signTarget	: encodeURI(gfn_nvl(option.signTarget))//, 서명 원문
			, menuType		: gfn_nvl(option.menuType) //, 메뉴구분 (01:일반민원상담 등록/02:개인별 맞춤 상담/03:부당청구 장기요양기관 신고/04:평가 현장확인 신청/05:부정수급자 신고)
			, callbackUrl	: gfn_nvl(option.callbackUrl) //, callback url
			, ciChckYn		: gfn_nvl(option.ciChckYn) //, ci 체크 여부
		}
		for(var item in simpleAthcParam){
			$input = document.createElement("input");
			$input.setAttribute("type"	, "hidden");
			$input.setAttribute("name"	, item);
			$input.setAttribute("value"	, simpleAthcParam[item]);
			document.CXWindow.append($input);
		}
		if((typeof param).toLowerCase() == 'object'){
			for(var item in param){
				$input = document.createElement("input");
				$input.setAttribute("type"	, "hidden");
				$input.setAttribute("name"	, item);
				$input.setAttribute("value"	, param[item]);
				document.CXWindow.append($input);
			}
		}
		document.CXWindow.submit();
	}
}
/*
 * 콘텐츠관리 a태그 링크 추가
 * ex) gfn_content_link(id,"${pageContext.request.contextPath}");
 */
function gfn_content_link(id,preLink){
	var obj = "#"+id;
	var orgHref = $(obj).attr('href');
	$(obj).attr('href',preLink+orgHref);
}
//, 캘린더 관련 함수 > 날짜 선택 처리
function gfn_setDatePicker(id){
	var date = {};
	var $datepicker = $(id);
	if(gfn_isNull($datepicker.val())){
		date = new Date();
	}else{
		date = new Date($datepicker.val());
	}
	$datepicker.datepicker("setDate", date);
	allowHide = true;
	var inst = $.datepicker._getInst($datepicker[0]);
	var onselect = $datepicker.datepicker('option', 'onSelect');
	onselect.call($datepicker, $datepicker.val(), inst);
}