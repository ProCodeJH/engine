var GOOGLE_ANAUYTICS = function(){
	var order_info = [];

	/* 주문 정보에 넣어줄 데이터 쌓기 */
	var AddorderInfo = function(prod_no, prod_name, prod_price, prod_count){  /* 전자상거래 되돌리기 시 prod_count를 음수 수량으로 넣어줌 */
		order_info.push({
			'id' : prod_no,
			'name' : prod_name,
			'price' : prod_price,
			'quantity' : prod_count
		});
	};

	/* 결제 정보 */
	var Completepayment = function(order_no, total_price,currency,is_npay){
		if(is_npay === true){
			gtag('event', 'purchase', {
				"transaction_id" : order_no,
				"affiliation" : "Npay",
				"value" : total_price,
				"currency" : currency,
				"items" : order_info
			});
		}else{
			gtag('event', 'purchase', {
				"transaction_id" : order_no,
				"value" : total_price,
				"currency" : currency,
				"items" : order_info
			});
		}
	};

	/* 전화 걸기 */
	var Calltellephone = function(eventLabel){
		ga('send', 'event', '전화걸기', '링크클릭', eventLabel, '1');
	};

	/* 전자상 거래 회수 (환불,반품) */
	var ReversePayment = function(info){
		for(var i = 0; i < info.length; i++){
			ga('ecommerce:addItem', info[i]);
		}
		ga('ecommerce:send');
	};

	var use_npay_count = false;
	var setUseNpayCount = function(b){
		use_npay_count = (b === true);
	};

	var addNpayOrder = function(order_data){
		if(!use_npay_count) return false;
		if(typeof order_data == 'undefined') return false;
		if(typeof order_data['list'] == 'undefined') return false;
		// 네이버 페이도 구매전환에 포함하게끔 옵션을 사용할 경우에는 구매완료를 바로 보낸다

		var np_ga_data = {'order_no' : '', 'total_price' : 0};
		var npay_order_item = {};
		for(var i = 0; i < order_data['list'].length; i++){
			npay_order_item = order_data['list'][i];
			if(np_ga_data['order_no'] == ''){
				np_ga_data['order_no'] = npay_order_item['order_no'];
			}
			AddorderInfo(npay_order_item['prod_idx'], npay_order_item['prod_name'], npay_order_item['price'], npay_order_item['count']);
		}
		np_ga_data['total_price'] = order_data['total_price'];

		Completepayment(np_ga_data['order_no'], np_ga_data['total_price'],'KRW',true);
	};

	var GA4 = {
		view_item: function(params) {
			__event('view_item', params);
		},
		add_to_cart: function(params) {
			__event('add_to_cart', params);
		}
	};

	var __event = function(event, params) {
		gtag('event', event, params);
	};

	return {
		"AddorderInfo" : function(prod_no, prod_name, prod_price, prod_count){
			AddorderInfo(prod_no, prod_name, prod_price, prod_count);
		},
		"Completepayment" : function(order_no, total_price,currency){
			Completepayment(order_no, total_price,currency,false);
		},
		"Calltellephone" : function(eventLabel){
			Calltellephone(eventLabel);
		},
		"ReversePayment" : function(info){
			ReversePayment(info);
		},
		"setUseNpayCount" : function(b){
			setUseNpayCount(b);
		},
		"addNpayOrder" : function(order_data){
			addNpayOrder(order_data);
		},
		GA4: {
			view_item: function(params) {
				GA4.view_item(params);
			},
			add_to_cart: function(params) {
				GA4.add_to_cart(params);
			}
		}
	}
}();