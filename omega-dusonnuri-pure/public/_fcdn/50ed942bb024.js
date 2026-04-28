// BrandScope 초기화 및 메서드 사용을 위한 래퍼 함수
(function (window, document, script, BrandScope, firstScript) {
	window.BrandScope = window.BrandScope || {
		init: function () {
			(window.BrandScope.q = window.BrandScope.q || [])
				.push(['init'].concat(Array.prototype.slice.call(arguments)))
		},
		identify: function () {
			(window.BrandScope.q = window.BrandScope.q || [])
				.push(['identify'].concat(Array.prototype.slice.call(arguments)))
		},
		track: function () {
			// TEST_SERVER 환경에서만 로그 출력
			if (typeof TEST_SERVER !== 'undefined' && TEST_SERVER) {
				console.log('[BrandScope] 이벤트 트래킹(래퍼): ', arguments[0], arguments[1]);
			}
			(window.BrandScope.q = window.BrandScope.q || [])
				.push(['track'].concat(Array.prototype.slice.call(arguments)))
		},
		getImwebClientInfo: function () {
			(window.BrandScope.q = window.BrandScope.q || [])
				.push(['getImwebClientInfo'].concat(Array.prototype.slice.call(arguments)))
		},
		sessionResetByLogout: function () {
			(window.BrandScope.q = window.BrandScope.q || [])
				.push(['sessionResetByLogout'].concat(Array.prototype.slice.call(arguments)))
		},
		timeEvent: function () {
			(window.BrandScope.q = window.BrandScope.q || [])
				.push(['timeEvent'].concat(Array.prototype.slice.call(arguments)))
		},
	}

	// BrandScope SDK 스크립트 로드
	BrandScope = window.BrandScope
	// BrandScope 스크립트 동적 로딩
	script = document.createElement('script')
	script.type = 'module'
	script.async = true
	script.src = (typeof TEST_SERVER !== 'undefined' && TEST_SERVER)
		? '//cdn-brandscope.imtest.me/bs.umd.js'
		: '//static.imweb.me/brand-scope/bs.umd.js';
	
	// TEST_SERVER 환경에서만 SDK track 함수 래핑
	if (typeof TEST_SERVER !== 'undefined' && TEST_SERVER) {
		script.onload = function() {
			if (window.BrandScope && typeof window.BrandScope.track === 'function') {
				var originalTrack = window.BrandScope.track;
				window.BrandScope.track = function() {
					console.log('[BrandScope] 이벤트 트래킹: ', arguments[0], arguments[1]);
					return originalTrack.apply(this, arguments);
				};
			}
		};
	}
	
	// BrandScope 스크립트 삽입
	firstScript = document.getElementsByTagName('script')[0]
	firstScript.parentNode.insertBefore(script, firstScript)
})(window, document);



// data-bs-event 속성을 가진 요소들에 클릭 트래킹 추가 (독립 실행)
(function initBrandScopeClickTracking() {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initBrandScopeClickTracking);
		return;
	}


	// 기존 요소들에 트래킹 추가
	function addTrackingToElements() {
		const elements = document.querySelectorAll('[data-bs-action="click"][data-bs-content]');

		elements.forEach(function(element) {
			// 이미 트래킹이 추가된 요소는 스킵
			if (element.hasAttribute('data-bs-tracked')) return;
			
			const action = element.getAttribute('data-bs-action');
			const content = element.getAttribute('data-bs-content');
			
			// action과 content는 필수
			if (!action || !content) return;
			
			// click 액션만 처리
			if (action !== 'click') return;
			
			
			element.setAttribute('data-bs-tracked', 'true');
			
			element.addEventListener('click', function(event) {
				try {
					// 이벤트명 생성: action_target_content_where (존재하는 것만)
					const eventParts = [action];
					const trackingData = { action: action, content: content };
					
					const target = element.getAttribute('data-bs-target');
					const where = element.getAttribute('data-bs-where');
					
					if (target) {
						eventParts.push(target);
						trackingData.target = target;
					}
					
					eventParts.push(content);
					
					if (where) {
						eventParts.push(where);
						trackingData.where = where;
					}
					
					const eventName = eventParts.join('_');

					// data-bs-로 시작하는 다른 속성들을 snake_case로 변환하여 추가
					const excludeAttrs = ['data-bs-action', 'data-bs-target', 'data-bs-content', 'data-bs-where', 'data-bs-tracked'];
					Array.from(element.attributes).forEach(function(attr) {
						if (attr.name.startsWith('data-bs-') && !excludeAttrs.includes(attr.name)) {
							// data-bs- 접두사 제거하고 케밥케이스를 스네이크케이스로 변환
							const key = attr.name.replace('data-bs-', '').replace(/-/g, '_');
							let value = attr.value;
							
							// data-bs-is-로 시작하는 속성의 경우 boolean 변환
							if (attr.name.startsWith('data-bs-is-')) {
								if (value === 'true') {
									value = true;
								} else if (value === 'false') {
									value = false;
								}
							}
							
							trackingData[key] = value;
						}
					});


					if (typeof BrandScope !== "undefined") {
						BrandScope.track(eventName, trackingData);
					}
				} catch (error) {
					// 트래킹 오류 무시
				}
			});
		});

	}

	// 초기 요소들에 트래킹 추가
	addTrackingToElements();

	// 동적으로 추가되는 요소들을 위한 MutationObserver
	if (typeof MutationObserver !== 'undefined') {
		const observer = new MutationObserver(function(mutations) {
			
			let hasNewElements = false;
			mutations.forEach(function(mutation) {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach(function(node) {
						if (node.nodeType === Node.ELEMENT_NODE) {
							// 추가된 노드 자체가 data-bs-action="click"과 data-bs-content를 가지거나, 하위에 가진 경우
							if (node.hasAttribute && node.getAttribute('data-bs-action') === 'click' && node.hasAttribute('data-bs-content')) {
								hasNewElements = true;
							} else if (node.querySelector && node.querySelector('[data-bs-action="click"][data-bs-content]')) {
								hasNewElements = true;
							}
						}
					});
				}
			});


			if (hasNewElements) {
				addTrackingToElements();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});

	}
})();

(function initBrandScope() {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initBrandScope);
		return;
	}

	// 상품 상세 위젯이 있을 경우 위젯에서 상품 데이터와 함께 초기화
	const hasShopViewWidget = !!document.querySelector('[data-widget-type="shop_view"]');
	if (hasShopViewWidget) {
		return;
	}

	BrandScope.init({
		projectToken: 'bs-im-019d09ae-1518-75f7-8c4f-33cf513a7a8a',
		props: {
			ownership: 'behavior-tracking-analytics',
		}
	});
})();
