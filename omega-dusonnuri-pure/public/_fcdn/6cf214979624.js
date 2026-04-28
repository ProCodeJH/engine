/**
 *	커스텀 모달 서비스
 *	
 *  # Promise를 리턴합니다.
 *    - await modalService.alert(message);
 *	  - await modalService.confirm(message);
 */
const modalService = {
	MODAL_TYPE: {
		ALERT: "ALERT",  // window.alert() 대체
		CONFIRM: "CONFIRM", // window.confirm() 대체
	},
	
	/**
	 *	alert형 커스텀 모달
	 *	@param options.message 내용
	 */
	alert: function (message) {
		modalService._makeModals();
		
		return modalService._openModal(modalService.MODAL_TYPE.ALERT, {
			title: "알림",
			message: message,
			eventTarget: event?.target,
			buttons: "",
		});
	},
	/**
	 *	confirm형 커스텀 모달
	 *	@param options.message 내용
	 */
	confirm: function (message) {
		modalService._makeModals();

		return modalService._openModal(modalService.MODAL_TYPE.CONFIRM, {
			title: "확인",
			message: message,
			eventTarget: event?.target,
			buttons: "",
		});
	},	

	/**
	 *	modalType에 따라 modalID를 리턴합니다.
	 *	@param modalType 모달타입
	 */
	_getModalID: function (modalType) {		
		return `common-${modalType}-modal`;
	},

	/**
	 *	modalType에 따른 modal을 오픈합니다.
	 *	@param options.title 제목
	 *	@param options.message 내용
	 */
	_openModal: function (modalType, options = {
		title: "",
		message: "",
		eventTarget: null,
		buttons: "",
	}) {
		if (![modalService.MODAL_TYPE.ALERT, modalService.MODAL_TYPE.CONFIRM].includes(modalType)) {
			throw new Error("파라미터가 올바르지 않습니다.");
		}

		return new Promise(resolve => {		
			const MODAL_ID = modalService._getModalID(modalType);	
			const MODAL_ID_SELECTOR = "#" + MODAL_ID;
		
			const MODAL_TITLE_SELECTOR = `${MODAL_ID_SELECTOR} h2#modal-title`;
			const MODAL_MESSAGE_SELECTOR = `${MODAL_ID_SELECTOR} div#modal-message`;
			const MODAL_CONFIRM_SELECTOR = `${MODAL_ID_SELECTOR} button#modal-confirm`;
			const MODAL_CANCEL_SELECTOR = `${MODAL_ID_SELECTOR} button#modal-cancel`;
		
			const title = document.querySelector(MODAL_TITLE_SELECTOR);
			const message = document.querySelector(MODAL_MESSAGE_SELECTOR);
			const confirm = document.querySelector(MODAL_CONFIRM_SELECTOR);
			const cancel = document.querySelector(MODAL_CANCEL_SELECTOR);
		
			title.innerHTML = options.title;
			message.innerHTML = String(options.message).replaceAll("\n", "<br />");
			
			
			$(confirm).off("click"); //click event 제거		
			confirm.addEventListener("click", (e) => {
				modalService._closeEffect(MODAL_ID_SELECTOR, () => {
					resolve(modalType === modalService.MODAL_TYPE.CONFIRM ? true : undefined);
					if(options.buttons){
						if(typeof options.buttons ==="object" && options.buttons["확인"]){
							options.buttons["확인"](e);
						}
						else if(typeof options.buttons ==="object" ){
							options.buttons.forEach(btn => {
								if(btn.text=='확인'){
									btn.click(e);
								}			
							});
						}
						
					}
					if (options?.eventTarget?.focus) {
						options.eventTarget.focus();
					}
				});
			}, { once: true });
			
			
			
			if (modalType === modalService.MODAL_TYPE.CONFIRM) {  //confirm에만 취소버튼이 존재하기 때문.
				$(cancel).off("click"); //click event 제거
				cancel.addEventListener("click", (e) => {
					modalService._closeEffect(MODAL_ID_SELECTOR, () => {
						resolve(false);	
						
						if(options.buttons){
						
							if(typeof options.buttons ==="object" && options.buttons["취소"]){
								options.buttons["취소"](e);
							}
							else if(typeof options.buttons ==="object" ){
								options.buttons.forEach(btn => {
									if(btn.text=='취소'){
										btn.click(e);
									}			
								});
							}
							
						}
						if (options?.eventTarget?.focus) {
							options.eventTarget.focus();
						}
					});
				}, { once: true });
			}
			
	

			modalService._openEffect(MODAL_ID_SELECTOR);
		})
	},

	_openEffect: (MODAL_ID_SELECTOR) => {		
		const $idVal = document.querySelector(MODAL_ID_SELECTOR);
		const $dialog = $idVal.querySelector('.modal-content');
		const $modalBack = $idVal.querySelector('.modal-back');
		const $kds_body = document.querySelector('body');
		
		//$kds_body.classList.add('scroll-no');
		$idVal.setAttribute('aria-hidden', 'false');
		$modalBack.classList.add('in');
		
		$idVal.classList.add('shown');
		setTimeout(() => {
			$idVal.classList.add('in');
		},150);

		//열린 팝업창 포커스
		$dialog.setAttribute('tabindex', '0');
		
		const $modalOpened = document.querySelectorAll('.krds-modal.in:not(.sample)');
		if ($modalOpened.length+1 > 1) {
			const zIndexs = [...$modalOpened].map((ele) => getComputedStyle(ele).zIndex);
			const zIndex = Math.max(...zIndexs) + 1;
			$idVal.setAttribute('style', 'z-index: ' + zIndex);
			$modalBack.classList.remove("in");
		}
		
		//레이어 진입 시 포커스
		setTimeout(() => {
			$dialog.focus();
		},350);
	}, 
	_closeEffect: (MODAL_ID_SELECTOR, callback = () => {}) => {
		const $idVal = document.querySelector(MODAL_ID_SELECTOR);
		const $dialog = $idVal.querySelector('.modal-content');	
		const $modalBack = $idVal.querySelector('.modal-back');
		const $kds_body = document.querySelector('body');
		const $modalOpened = document.querySelectorAll('.krds-modal.in:not(.sample)');
		if ($modalOpened.length > 2) {
			$kds_body.classList.remove('scroll-no');
		}
		
		$idVal.setAttribute('aria-hidden', 'true');
		$modalBack.classList.remove('in');
		
		$idVal.classList.remove('in');
		setTimeout(() => {
			$idVal.classList.remove('shown');
			
			setTimeout(() => {
				callback();
			}, 10);			
		},150);

		$dialog.removeAttribute('tabindex');
	},

	/**
	 * 모달을 만듭니다.
	 */
	_makeModals: function() {
		const body = document.getElementsByTagName("body")[0];		
		
		if (!document.getElementById(modalService._getModalID(modalService.MODAL_TYPE.CONFIRM))) {  // 요소가 없다면,
			body.append(modalService._fromHTML(modalService._makeModalTemplate(modalService.MODAL_TYPE.CONFIRM)));		
		}

		if (!document.getElementById(modalService._getModalID(modalService.MODAL_TYPE.ALERT))) {  // 요소가 없다면, 
			body.append(modalService._fromHTML(modalService._makeModalTemplate(modalService.MODAL_TYPE.ALERT)));		
		}
		
		Object.keys(modalService.MODAL_TYPE).forEach((modalType) => {  //접근성 처리
			const MODAL_ID = modalService._getModalID(modalType);	
			const MODAL_ID_SELECTOR = "#" + MODAL_ID;			
		
			const firstFocusableElement = document.querySelector(`${MODAL_ID_SELECTOR} div.modal-content`);
			const lastFocusableElement = document.querySelector(`${MODAL_ID_SELECTOR} button#modal-confirm`);
	
			document.getElementById(MODAL_ID).addEventListener("keydown", (e) => {
				const isTabPressed = (e.key === "Tab" || e.keyCode === 9);
			
				if (!isTabPressed) {
					return;
				}
	
				if (e.shiftKey) {
					if (document.activeElement === firstFocusableElement) {
						lastFocusableElement.focus();
						e.preventDefault();
					}
				} else {
					if (document.activeElement === lastFocusableElement) {
						firstFocusableElement.focus();
						e.preventDefault();
					}
				}
			})
		})
	},

	/*
		string element를 html 형태로 변경합니다.
	*/
	_fromHTML: function (html = "") {
		const template = document.createElement("template");
		template.innerHTML = html;
		const result = template.content.children;
	
		if (result.length !== 1) {
			throw Error("html 형식에 문제가 있습니다.");
		}
	
		return result[0];
	},

	
	/**
	 *	modalType에 따라 modal 탬플릿을 생성합니다.
	 *	@param modalType 모달타입
	 */
	_makeModalTemplate: function (modalType) {
		if (![modalService.MODAL_TYPE.ALERT, modalService.MODAL_TYPE.CONFIRM].includes(modalType)) {
			throw new Error("파라미터가 올바르지 않습니다.");
		}	
		
	    const MODAL_ID = modalService._getModalID(modalType);
	
		return `
	        <section
			  id="${MODAL_ID}"
			  class="krds-modal fade"
			  aria-hidden="false"
			  role="dialog"
			  aria-labelledby="modal-title"
			  style="z-index: 99999"
			>
			  <div class="modal-dialog modal-sm">
			    <div class="modal-content">
			      
			      <div class="modal-header">
			        <h2 id="modal-title" class="modal-title"><!-- title --></h2>
			      </div>
			      
			      <div class="modal-conts">
			        <div id="modal-message" class="conts-area modal-txt" style="align-items : center"><!-- contents --></div>
			      </div>
			      
			      <div class="modal-btn btn-wrap">
			        ${modalType === modalService.MODAL_TYPE.CONFIRM ? `<button type="button" id="modal-cancel" class="krds-btn medium tertiary close-modal">취소</button>` : ""}
			        <button type="button" id="modal-confirm" class="krds-btn medium primary close-modal">확인</button>
			        
			      </div>
			    </div>
			  </div>
			  <div class="modal-back"></div>
			</section>
			
	    `
	},
	
	_makeModalDivTemplate: function (id) {
		return `
	        <div
			  id="${id}"
			>
			</div>
			
	    `
	},
	
	/**
	 *	신규 modalPopup을 적용한 layerPopup 함수입니다. 서버로부터 읽어와 모달을 그립니다.
	 *	@param id 모달ID
	 *	@param url 서버URL
	 *	@param param 서버로 전송하는 파라미터
	 *	@param multiYn 멀티여부 (사용하지 않습니다.)
	 *	@param hiddenYn 숨김여부
	 *	@param callback 성공 시, callback 함수
	 *	@param loadText loading text
	 * 
	 */
	layerPopup(id, url, param, multiYn, hiddenYn, callback, loadText = "") {
		const layerPopupWrapperId = "LAYER_POPUP_WRAPPER_" + id;
		
		$.ajax({
			url : url,
			data : param,
			type : "POST",
			dataType : "text",
			async : false,
			beforeSend: () => {
				fn_loading(true, loadText);
				
				$("#" + layerPopupWrapperId).empty();
				$("#" + layerPopupWrapperId).remove();
			},
			complete: () => {
				fn_loading(false);
			},
			error : function(doc, status, err) {
				let vStatus;
				try{
					vStatus =  doc.status;
				}catch (e) {
					vStatus = "404"; 
				}

				$("#cms-content").append("<div class='four-zero' id='errorPageDiv00001'><h2>"+vStatus+"</h2><small>페이지를 찾을 수 없습니다.</small> <div class='button-group a-r mt20'><a rel='modal:close' class='button large border' onclick='javascript:clearModelremoveAndclose(\"errorPageDiv00001\"); return false;'>닫기</a></div> </div>");
				$(".four-zero").modal({
					escapeClose: false,
					clickClose: false
				});

			},
			success: function(doc) {
				try {
					const layerPopupWrapper = $('<div>').attr("id", layerPopupWrapperId);
					layerPopupWrapper.append(doc);
					
					$("#cms-content").append(layerPopupWrapper);					
					kds_modal.modalOpen(id);					

					if (hiddenYn == "Y") {
						$("#" + id).hide();
						$("#cms-content").append("<div class='modal-back in'></div>");
					}

					if (callback && typeof callback === 'function') {
						callback(doc);
					}	
				} catch (err) {
					fn_loading(false);
					console.error(err);
				}
			}
		});
		
	},
}

