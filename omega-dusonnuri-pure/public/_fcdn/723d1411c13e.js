//modal
function modal(name,param) {
    modal_url = '';

    switch (name) {
		case 'submission-corporations' : //사용자용 공동인증서  id 를 case 랑 맞춰주세용 
			modal_url+='/npbs/e/z/905/npez905m04';
		break;
			
		case 'submission-personal' : //개인용 공동인증서
			modal_url+='/npbs/e/z/905/npez905m05';
		break;
			 
		case 'submission-server' : // 제출 서류 
			modal_url+='/npbs/e/z/905/npez905m06';
		break;
		 
		case 'public-setup' : // 공동인증서 재설치 안내
			modal_url+='/npbs/auth/login/publicSetup';
		break; 
		
		case 'modal-regi-number' : // 로그인 주민등록 팝업
			modal_url+='/npbs/auth/login/loginFormJumin';
		break;
		
		case 'modal-password-search' : //장기요양 기간회원 아이디 찾기
			modal_url+='/npbs/e/z/112/popPwdForm.web';
		break;
		
		case 'modal-calc' : //시설급여 간편 계산
			modal_url+='/npbs/e/b/504/openPopEquipPaymtCalcu';
		break;
		
		case 'modal-apprv-calc' : //재가급여 간편 계산
			modal_url+='/npbs/e/b/504/openPopApprvPaymtCalcu';
		break;
		
		case 'modal-calc-guide' : //급여비용 가산 내용 보기
			modal_url+='/npbs/e/b/504/openPopInfoP03';
		break;
		
		case 'modal-rftrEduDypr' : //요양보호사 보수교육기관 교육일정 조회
			modal_url+='/npbs/r/e/505/selectRftrEduDyprDetail';
		break;
		
		case 'LAYER_POPUP_img_dtl' : //품목별 제품 안내 이미지 확대 보기
			modal_url+='<section id="LAYER_POPUP_img_dtl" class="krds-modal fade" role="dialog" aria-labelledby="tit-modal-find" style="width:560px;">';
		    modal_url+='<div class="modal-dialog">';
			modal_url+='<div class="modal-content">';
		    modal_url+='<div class="modal-header">';
			modal_url+='<h2 id="tit-modal-find" class="modal-title">이미지 확대보기</h2>';
			modal_url+='</div>';
            modal_url+='<div class="modal-conts">';
            modal_url+='<div class="krds-tab-area layer">';
            modal_url+='<div class="tab line full">';
            modal_url+='<div class="tab-controls tab-prev">';
            modal_url+='<button type="button">이전</button>';
            modal_url+='</div>';
            modal_url+='<div class="tab-controls tab-next">';
            modal_url+='<button type="button">다음</button>';
            modal_url+='</div>';
            modal_url+='</div>';
			modal_url+='<img src='+param+' width=500 height=500 onerror=\'this.src="/npbs/images/np/contents/sample02.gif"\'>';
            modal_url+='</div>';
            modal_url+='</div>';
            modal_url+='</div>';
            modal_url+='<button type="button" class="krds-btn medium icon btn-close close-modal">';
            modal_url+='<span class="sr-only">닫기</span>';
            modal_url+='<i class="svg-icon ico-popup-close"></i>';
            modal_url+='</button>';
        	modal_url+='</div>';
    		modal_url+='</div>';
    		modal_url+='<div class="modal-back in"></div>';
			modal_url+='</section>';
		break;
		
		case 'modal-login-popup' : //로그인 팝업
			modal_url+='/npbs/auth/login/popup.web';
		break;
		
		case 'modal-eduMap' : //교육기관 지도
			modal_url+='/npbs/r/e/501/selectEduSrchMap';
		break;
		
		case 'modal-wimsupy-dtl' : //복지용구 공급업체 상세 정보
			modal_url+='/npbs/r/k/401/selectWimSupyDtl.web';
		break;
		
		case 'modal-wimsupy-map' : //장기요양기관 지도
			modal_url+='/npbs/r/a/201/selectLtcoSrchMap.web';
		break;
		
		case 'modal-careEduMap' : //요양보호사 보수교육기관 지도
			modal_url+='/npbs/r/e/505/selectRftrEduDyprMap.web';
		break;
		
		case 'modal-total-search-pop' : //통합검색 팝업
			modal_url+='/npbs/e/a/110/npea110m02.web';
		break;
		
		case 'modal-dmr-dis-links' : // 장기요양 심사청구 신청 취하 사유 입력 팝업
			modal_url+='/npbs/m/c/302/openPupDmrDiscontInq.web';
		break;
		case 'modal-npgh106m01-links' : // 본인부담환급금 신청내역 상세조회 팝업
			modal_url+='/npbs/g/h/106/selectSelfBrdnHwangubInq.web';
		break;
		case 'modal-select-LtcoMemInfo-Pop' : // 복지용구업체 블로그 상세보기
			modal_url+='/npbs/r/k/104/selectLtcoMemInfoPop.web';
		break;
		case 'modal-select-LtcoMemInfo2-Pop' : // 요양보호사 보수교육기관  블로그 상세보기
			modal_url+='/npbs/r/e/351/selectLtcoMemInfoPop.web';
		break;
		case 'modal-cs-detail' : // 교육신청 세부내역
			modal_url+='/npbs/e/g/900/aplyPopupOpen';
		break;
		case 'modal-npgm203m01-links' : // 부당청구 장기요양기관 포상금 신청내역 상세조회 팝업
			modal_url+='/npbs/g/m/203/selectDcltPmnyAplyDescInfo.web';
		break;
		case 'modal-npem580m02-links' : // 부당청구 장기요양기관 신고 취소 팝업
			modal_url+='/npbs/e/m/580/deleteIjstDmdLtcoDcltDtl.web';
		break;
		case 'modal-npuf100m03-links' : // 부정수급자 신고내역 삭제 팝업
			modal_url+='/npbs/u/f/100/openIjstRepeDcltDtlDscc.web';
		break;
		case 'modal-delete-member' : // 회원탈퇴
			modal_url+='/npbs/e/z/102/deleteLtcoMemInfoForm.web';
		break;
		
		case 'npub112p01r' : //장기요양인정 이력내역조회 > 상세조회
			modal_url+='/npbs/u/b/112/selectRcgtHistDescDtlEx.web';
		break;
		case 'npub114p01u' : //장기요양인정 이력내역조회 > 취소
			modal_url+='/npbs/u/b/114/selectRcgtAplyCncl.web';
		break;
		case 'modal-hospital-map' : //의료기관 지도
			modal_url+='/npbs/e/b/201/selectDodEduMap.web';
		break;
    }
    return modal_url;
}

//새창 팝업
function popupWindow(name) {
    switch (name) {
        case 'test' : // test
            var pop_width = 500;
            var pop_height = 600;
            var pop_x = 0;
            var pop_y = 0;
            window.open('https://rfid-ssl.longtermcare.or.kr:9001/webroot/xcs/transfer/index.jsp','온라인도우미','scrollbars=yes,status=1, width='+ pop_width +',height='+ pop_height +',left='+ pop_x +',top='+ pop_y +')');
            break;

    }
}


