/*
파일명             : np_common.js
화면제목           : 시스템 공통 상수
최초작성자         : 이종학
최초작성일자       : 2015. 6. 16.
변경이력
====================================================================================================
    변경일자    / 변경자 / 변경내용
====================================================================================================
2015. 6. 16. / 이종학 / 신규
2025. 09. 30. / 문수민 / 디지털 서비스 고도화 사업 UI/UX개선
*/
// 컨텍스트 패스
var CONTEXT_PATH = "/npbs";
// 웹 경로
var WEB_FULL_PATH = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':'+window.location.port:'');
// 이메일 공급자 배열
var EMAIL_SPLR = ["naver.com","gmail.com","daum.net","nate.com","hotmail.com"];
// 전화번호 지역 번호
var TEL_LOC_NO = ["02","031","032","033","041","042","043","044","051","052","053","054","055","061","062","063","064","070","0303","050","0504","0505","0506","0507"];
// 휴대전화 식별 번호
var HP_LOC_NO = ["010","011","016","017","018","019"];
// 통합 식별 번호
var LOC_NO = $.merge($.merge([],TEL_LOC_NO), HP_LOC_NO);
// datepicker input mask
var DATEPICKER_INPUT_MASK = "y-m-d";

//, 2025년 디지털 서비스 고도화 사업 추가_[S]

/* [ 2025년 디지털 서비스 고도화 사업 > 노인장기요양 홈페이지 기능 기선 추가 ] */ 
//, datepicker 제어 방식 변경
//, 	1. 달력 날짜 클릭 시 날짜 선택되며 picker close -> "선택" 버튼 클릭 시 날짜 선택되며 picker close
//, 	2. 취소 버튼 추가
var allowHide 		= true; //, datepicker hide flag
var originalHide 	= $.datepicker._hideDatepicker;

$.datepicker._hideDatepicker = function($input, duration){
	if(!allowHide) return;
	originalHide.apply(this, arguments);
}

// 달력 위젯 옵션
var DATEPICKER_OPTIONS = {
    dateFormat: "yy-mm-dd",
    showOtherMonths: true,
    selectOtherMonths: true,
    showButtonPanel: true,
    changeMonth: true,
    changeYear: true,
    yearSuffix: "",
    closeText: '선택',
    showOn: "button",
    buttonImage: CONTEXT_PATH+"/assetsRenew/images/np/icon/ico_calendar.svg",
    buttonImageOnly: false,
    buttonText: "날짜 선택 버튼"
    , beforeShow: function(input, inst){
		allowHide = false;//, 커스텀 달력이 열리면 hide flag false
		var $this = $(this);
		setTimeout(function(){
			var btnPane = $(inst.dpDiv).find('.ui-datepicker-buttonpane');
			btnPane.find('.btn-cancel').remove();
			inst.dpDiv.find('.ui-datepicker-current').after('<button class="krds-btn border small btn-cancel">취소</button>');
			
			//, 취소버튼 클릭 이벤트
			$('.ui-datepicker-buttonpane .btn-cancel').on('click', function(){
				allowHide= true;
				$this.datepicker('hide');
			});
			//, 선택버튼 클릭 이벤트 
			$('.ui-datepicker-buttonpane .ui-datepicker-close').on('click', function(){
				allowHide = true;
				$this.attr("sel", $this.attr("temp"));
				$this.datepicker('hide');
			});
			//2025-11-26 캘린더 아래쪽으로 고정
			$('.ui-datepicker').css({
				top: $this.offset().top + $this.outerHeight() + 'px',
				left: $this.offset().left + 'px'
			});
		}, 1);
		
	}
    , onSelect: function (dateText, inst) {
    	$(this).attr("temp", dateText);
    	$(this).val("");
    }
    , onClose: function(dateText, inst){
		if(allowHide){
			if($(this).attr("sel")){
				$(this).val($(this).attr("sel"));
			}
		}
		allowHide = true;//, 커스텀 달력이 열리면 hide flag true(default 달력은 닫혀야 하므로)
	}
	, onChangeMonthYear: function(input, inst){
		var $this = $(this);
		setTimeout(function(){
			$('.ui-datepicker-current').after('<button class="krds-btn border small btn-cancel">취소</button>');
			
			//, 취소버튼 클릭 이벤트
			$('.ui-datepicker-buttonpane .btn-cancel').on('click', function(){
				allowHide= true;
				$this.datepicker('hide');
			});
			//, 선택버튼 클릭 이벤트 
			$('.ui-datepicker-buttonpane .ui-datepicker-close').on('click', function(){
				allowHide = true;
				$this.attr("sel", $this.attr("temp"));
				$this.datepicker('hide');
			});
		}, 1);
	}
};
//2025-11-26 바깥쪽 클릭시 캘린더 닫기
$(document).on('mousedown', function(e){
	var $target = $(e.target);
	
	if(! gfn_isNull($('.monthPicker')) && $('.monthPicker').css("display") != 'none'
		&& gfn_isNull($target.closest('.monthPicker')) ||  $target.closest('.monthPicker').length == 0 ){
		$('.monthPicker').hide();
	}
	
	if( gfn_isNull($target.closest('.ui-datepicker')) || $target.closest('.ui-datepicker').length == 0){
		allowHide = true;
		$(".hasDatepicker").datepicker('hide');
		//selectedDate = tempDate;
	}
});
//, 2025년 디지털 서비스 고도화 사업 추가_[E]
// 유효성 규칙
var RULES = {};
// 유효성 메시지
var MESSAGES = {};
//유효성 그룹
var GROUPS = {};
// No Data 메시지
var NO_DATA_MSG = "데이터가 존재하지 않습니다.";
// 비밀번호 분실시 조회답변(AS-IS)
var PWD_INQ_AQUEST = ["나의 아버지 성함은?",
                      "나의 그리운 고향은?",
                      "나의 첫째아이 이름은?",
                      "나의 초등학교 이름은?",
                      "나의 보물 제1호는?",
                      "기억에 남는 추억의 장소는?",
                      "나의 인생 좌우명은?",
                      "내가 좋아하는 캐릭터는?",
                      "추억하고 싶은 날짜가 있다면?",
                      "인상 깊게 읽은 책 이름은?",
                      "내가 가장 존경하는 인물은?",
                      "가장 기억에 남는 선생님 성함은?",
                      "내가 받았던 선물 중 기억에 남는 선물은?",
                      //"주민 번호 끝자리 7자리는?"];
                      "가장 좋아하는 숫자조합은?"];
//title 구분자
var TITL_DELIMITER = " > ";