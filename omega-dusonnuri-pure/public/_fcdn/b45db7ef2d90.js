var ZIPCODE_DAUM = function(){
    var $zipcodeContainer, $zipcodeLayer;
    var $postCodeInput;
    var $addressInput;
    var $subAddress; // 아이폰에서 input 버그로 인해 input 바로 위에 투명한 div
    var onComplete;
    var onStart;
    var onShow;
    var onClose;
    var type;
    var $openKakaoAddressButton;
    // Daum(primary) 사용 불가 시 자체 주소 페이지(fallback)로 전환할지 여부.
    // init 시점에 ADDRESS_MODE 강제 또는 헬스체크 결과로 결정한 뒤 캐싱한다.
    // 기본값 false: 헬스체크 미완료/실패 시에도 Daum 사용 (기존 fail-open 동작 유지).
    var useFallback = false;
    var option = {
        'addr_container' : null,
        'addr_pop' : null,
        'post_code' : null,
        'addr' : null,
        'height' : '',
        'open_button' : null,
	    attachShowEventOnInput: true,
	    hideWhenClickOutside: true,
    };

    var init = function(data) {
		option = $.extend(option,data);
        $zipcodeContainer = option.addr_container;
        $zipcodeLayer = option.addr_pop;
        $postCodeInput = option.post_code;
        $addressInput = option.addr;
        $openKakaoAddressButton = option.open_button;
        $subAddress = option.sub_addr;
        onComplete = option.onComplete;
        onShow = option.onShow;
        onStart = option.onStart;
        onClose = option.onClose;

        if(typeof onStart == 'function'){
            onStart();
        }
      if($openKakaoAddressButton !== undefined && $openKakaoAddressButton !== null){
        $openKakaoAddressButton.off('click').on('click', function(){
          showFindAddress();
        });
      }
      if($postCodeInput !== undefined && $postCodeInput !== null){
        $postCodeInput.off('click').on('click', function(){
          showFindAddress();
        });
      }
		if($subAddress !== undefined && $subAddress !== null ){
			$subAddress.off('click').on('click', function(){
				showFindAddress();
			});
		}

		if (option.attachShowEventOnInput)  {
			$addressInput.off('click').on('click', function(){
				showFindAddress();
			});
		}

		// init 시점에 1회만 결정. 이후 showFindAddress 호출 시 캐싱된 useFallback 값으로 분기한다.
		resolveAddressProvider();
    };

    var resolveAddressProvider = function() {
		// ADDRESS_MODE가 'kakao'/'naver'로 강제되어 있으면 자체 주소 검색 페이지(fallback) 사용
		if (window.ADDRESS_MODE === 'kakao' || window.ADDRESS_MODE === 'naver') {
			useFallback = true;
			return;
		}

		// Daum 주소 검색 헬스체크
		var controller = new AbortController();
		var timeoutId = setTimeout(function() {
			controller.abort();
			// 타임아웃 시 Daum 사용 (fallback 안 함)
			useFallback = false;
		}, 3000);

		fetch(TEST_SERVER ? 'https://gateway-platform.dev.imwebapis.com/address/health/daum' : 'https://gateway-platform.imwebapis.com/address/health/daum', {
			method: 'GET',
			signal: controller.signal
		})
		.then(function(response) {
			clearTimeout(timeoutId);
			if (!response.ok) {
				// HTTP 오류 시 Daum 사용
				useFallback = false;
				return null;
			}
			return response.json();
		})
		.then(function(data) {
			// isHealthy가 명시적으로 false일 때만 fallback 사용
			useFallback = !!(data && data.isHealthy === false);
		})
		.catch(function(error) {
			clearTimeout(timeoutId);
			// 네트워크 오류 등 헬스체크 호출 실패 시 Daum 사용
			useFallback = false;
		});
	};

    var hideFindAddress = function() {
        $zipcodeContainer.hide();
        $zipcodeContainer.parent('div._widget_data').removeClass('address-open');
        if(typeof onClose == 'function'){
            onClose();
        }
    };
    
    var showFindAddress = function() {
				// init 시점 resolveAddressProvider에서 결정/캐싱한 useFallback 값으로 분기
				if (useFallback) {
					useCustomAddressPage();
				} else {
					useDaumPostcode();
				}
			};
			
			var useCustomAddressPage = function() {
				// 자체 제작 주소 검색 페이지
				// 기존 iframe 제거
				$zipcodeLayer.empty();
				
				var iframe = document.createElement('iframe');
				iframe.src = '/_/address/';
				iframe.style.width = '100%';
				iframe.style.height = (!isNaN(option.height) && option.height !== '') ? option.height + 'px' : (option.height || '400px');
				iframe.style.background = '#fff';
				iframe.style.border = 'none';
				$zipcodeLayer.get(0).appendChild(iframe);

				// 메시지 핸들러 함수 정의
				var messageHandler = function(event) {
					if (event.data.type === 'ADDRESS_SELECTED') {
						const { address, postalCode } = event.data;
						$postCodeInput.val(postalCode);
						$addressInput.val(address);
						hideFindAddress();
						onComplete({zonecode: postalCode, addressEnglish: ',,,,', jibunAddressEnglish: ',,,,'}, address);
						
						// 이벤트 리스너 제거
						window.removeEventListener('message', messageHandler);
					}
				};
				
				window.addEventListener('message', messageHandler);
				
				// iframe을 넣은 element를 보이게 한다.
				$zipcodeContainer.show();
				$zipcodeContainer.parent('div._widget_data').addClass('address-open');

				if(typeof onShow == 'function'){
					onShow();
				}

				if (option.hideWhenClickOutside) {
					$(document).find('body').off('mousedown.zipcode').on('mousedown.zipcode', function() {
						hideFindAddress();
						$(this).off('mousedown.zipcode');
					});
				}
			};
			
			var useDaumPostcode = function() {
				new kakao.Postcode({
					oncomplete: function(data) {
						// 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분.

						// 각 주소의 노출 규칙에 따라 주소를 조합한다.
						// 내려오는 변수가 값이 없는 경우엔 공백('')값을 가지므로, 이를 참고하여 분기 한다.
						var fullAddr = data.address; // 최종 주소 변수
						var extraAddr = ''; // 조합형 주소 변수

						// 기본 주소가 도로명 타입일때 조합한다.
						if(data.addressType === 'R'){
							//법정동명이 있을 경우 추가한다.
							if(data.bname !== ''){
								extraAddr += data.bname;
							}
							// 건물명이 있을 경우 추가한다.
							if(data.buildingName !== ''){
								extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
							}
							// 조합형주소의 유무에 따라 양쪽에 괄호를 추가하여 최종 주소를 만든다.
							fullAddr += (extraAddr !== '' ? ' ('+ extraAddr +')' : '');
						}

						// 우편번호와 주소 정보를 해당 필드에 넣는다.
						$postCodeInput.val(data.zonecode); //5자리 새우편번호 사용
						$addressInput.val(fullAddr);
						//document.getElementById('sample2_addressEnglish').value = data.addressEnglish;

						// iframe을 넣은 element를 안보이게 한다.
						// (autoClose:false 기능을 이용한다면, 아래 코드를 제거해야 화면에서 사라지지 않는다.)
						hideFindAddress(data);

						onComplete(data, fullAddr);
					},
					width :'100%',
					height: option.height
				}).embed($zipcodeLayer.get(0));

				// iframe을 넣은 element를 보이게 한다.
				$zipcodeContainer.show();
				$zipcodeContainer.parent('div._widget_data').addClass('address-open');

				if(typeof onShow == 'function'){
					onShow();
				}

				if (option.hideWhenClickOutside) {
					$(document).find('body').off('mousedown.zipcode').on('mousedown.zipcode', function() {
						hideFindAddress();
						$(this).off('mousedown.zipcode');
					});
				}
    };

    return {
        'init' : function(data){
            init(data);
        },
        'showFindAddress' : function(){
            showFindAddress();
        },
        'hideFindAddress' : function(){
            hideFindAddress();
        }        
    }
};
