if(!_nasa) var _nasa = {};
var NP_LOG = function(){
	var CompletePayment = function(price,key){ /* 결제 및 구매 완료 */
		_nasa["cnv"] = wcs.cnv("1", String(price));
		npLogRequest("CompletePayment",key);
	};
	var CompleteJoin = function(){ /* 회원가입 완료 */
		_nasa["cnv"] = wcs.cnv("2", "1");
		npLogRequest('CompleteJoin');
	};
	var AddToCart = function(){ /* 장바구니 담기 완료 */
		_nasa["cnv"] = wcs.cnv("3", "1");
		npLogRequest('AddToCart');
	};
	var CompleteReservation = function(price,key){ /* 신청 및 예약 완료 */
		_nasa["cnv"] = wcs.cnv("4", String(price));
		npLogRequest('CompletePayment',key);
	};
	var EtcPage = function(){ /* 입력폼 작성 완료 */
		_nasa["cnv"] = wcs.cnv("5", "1");
		npLogRequest('EtcPage');
	};

	function npLogRequest(type,key){
		if ( IS_IADMIN ) {
			console.log("네이버 프리미엄 로그 호출 (" + type + ") \n", _nasa);
		}

		if(type == 'CompletePayment'){
			wcs_add["wa"] = key;
		}

		wcs_do(_nasa);
	}
	return {
		"Completepayment" : function(price,key){
			if(LIMIT_API_LIST.indexOf('naver') === -1) CompletePayment(price,key);
		},
		"CompleteJoin" : function(){
			if(LIMIT_API_LIST.indexOf('naver') === -1) CompleteJoin();
		},
		"AddToCart" : function(){
			if(LIMIT_API_LIST.indexOf('naver') === -1) AddToCart();
		},
		"CompleteReservation" : function(price,key){
			if(LIMIT_API_LIST.indexOf('naver') === -1) CompleteReservation(price,key);
		},
		"EtcPage" : function(){
			if(LIMIT_API_LIST.indexOf('naver') === -1) EtcPage();

		}
	}
}();