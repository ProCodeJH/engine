/*
====================================================================================================
    변경일자    / 변경자 / 변경내용
====================================================================================================
2025. 09. 30. / 문수민 / 디지털 서비스 고도화 사업 UI/UX개선
*/

$( window ).resize(function(){
	quick_place();
	sec_place();
	pop_height();

});

$(document).ready(function(){
	
	$('.select').removeAttr('style');
	
	//테이블호버
	function findBlocks(theTable) {
		if ($(theTable).data('hasblockrows') == null) {

			var rows = $(theTable).find('tr');
			for (var i = 0; i < rows.length;) {

				var firstRow = rows[i];

				var maxRowspan = 1;
				$(firstRow).find('td').each(function () {
					var attr = parseInt($(this).attr('rowspan') || '1', 10);
					if (attr > maxRowspan) maxRowspan = attr;
				});

				maxRowspan += i;

				var blockRows = [];
				for (; i < maxRowspan; i++) {
					$(rows[i]).data('blockrows', blockRows);
					blockRows.push(rows[i]);
				}
			
			}

			$(theTable).data('hasblockrows', 1);
		}
	}

	$("td").hover(function () {
		$el = $(this);
		$.each($el.parent().data('blockrows'), function () {
			$(this).find('td').addClass('hover');
		});
	}, function () {
		$el = $(this);
		$.each($el.parent().data('blockrows'), function () {
			$(this).find('td').removeClass('hover');
		});
	});

	findBlocks($('table'));
	
	//의견숨기기
	$(".re_open").click(function(){
		$(this).parents().find(".re_txt").addClass("on");
	});
	$(".re_hide").click(function(){
		$(this).parents().find(".re_txt").removeClass("on");
	});
    
    //////////////////////공통/////////////////////////
    
    //검색 호버시
    $(".btn_search").hover(function(){
        $(this).children("img").attr("src",CONTEXT_PATH+"/images/np/btn/btn_search_over.png");
    },function(){
        $(this).children("img").attr("src",CONTEXT_PATH+"/images/np/btn/btn_search.png");
    });
    
    $(".guide .btn_search").hover(function(){
        $(this).children("img").attr("src",CONTEXT_PATH+"/images/np/btn/btn_search_over.png");
    },function(){
        $(this).children("img").attr("src",CONTEXT_PATH+"/images/np/btn/btn_search.png");
    });
    
    //select 
    $(".select").filter(function(){
        $( ".select" ).selectmenu({change:function(){ 
        	$(this).click();
        } });
    });
    
    $(".ft_select").filter(function(){
        $( ".ft_select" ).selectmenu({change:function(){ 
        	$(this).click();
        } });
    });
    
  //search button 높이조정
	/*$(".btn_cell").each(function(){
		if($(this).hasClass("more")){
			$(this).find('.btn_search').css('height','48px').css('line-height','48px');
			$(this).find('.btn_search').children('img').css('padding-top','15.5px');
		}else{
			var search_h = $(this).height();
			var btn_search = search_h-16;
			var btn_search2 = search_h/2-16.5;
		
			$(this).find('.btn_search').css('height',btn_search).css('line-height',btn_search+'px');
			$(this).find('.btn_search').children('img').css('padding-top',btn_search2+'px');
		}; 
	});*/
    
    // 검색 design_list
    $(".design_list").filter(function(){
        $(".design_list ul").hide();
        $(".design_list").click(function(){
            $(this).find("ul").slideDown("fast");
            $(".design_list p").addClass("on");
        });

        $(".design_list").mouseleave(function(){
            $(this).find("p").removeClass("on");
            $(this).find("ul").slideUp("fast");
        });
    });
    
    //첨부파일
    file_design();


    //팝업 오픈
    $(".btn_pop").click(function(){
        pop_dialog("layer_popup");
    });
    
    //윈도우 팝업 오픈
    $(".btn_open_win").click(function(e){
        var url = $(this).attr('href');

        window.open(url, '새창띄우기', "width=533,height=400,scrollbars=yes,toolbar=no,location=no, status=no, directories=no");

        e.preventDefault();
    });
    
        
    //LNB
    $(".lnb").filter(function(){

        if($(".lnb").find('li').hasClass("on")){
    		$(this).children("a").attr('aria-label','닫기');
    	}

        //1depth
        $(".lnb").on("click", ">li >a", function(e) {
            if ($(this).attr("href") == "#") {
                e.preventDefault();
            };
            if($(this).parent().hasClass("on")){
        		$(this).attr('aria-label','열기');  
            	$(this).parent().removeClass("on");      	
                $(this).parent().find('>ul').hide();  
        	}else{
        		$(this).parent().addClass("on"); 
        		$(this).attr('aria-label','닫기');      	
                $(this).parent().find('>ul').show();
        	}
            if($(this).parent().children("ul").length>0) return false;
        });

        //2depth
        $(".lnb").on("click", ">li > ul > li > a", function(e) {
            if ($(this).attr("href") == "#") {
                e.preventDefault();
            }
            $('.lnb li li').removeClass('on');
            $('.lnb li li ').find('ul').hide();
            $(this).parent().addClass("on").find('>ul').show();            
        });

        //3depth
        $(".lnb").on("click", ">li > ul > li > ul > li > a", function(e) {
            if ($(this).attr("href") == "#") {
                e.preventDefault();
            }
            $('.lnb li li li').removeClass('on');
            $('.lnb li li li').find('ul').hide();
            $(this).parent().addClass("on").find('>ul').show();
        });
    });
    
    //탭
	$("#tabs").tabs();
    
	$(".special_tab li a").click(function(){
		$(".special_tab li").removeClass("on");
		$(this).parent().addClass("on");
	});
	
	$(".tabs_wrap2 .tabs2 > li > a").click(function(){
		var num = $(this).parent().index();
		$(".tabs_wrap2 .tabs2 > li").removeClass("on");
		$(this).parent().addClass("on");
		$(".tabs_wrap2 > div").removeClass("view");
		$(".tabs_wrap2 > div:eq("+num+")").addClass("view");
		return false;
	});
	
	//custom 탭
	$(".nhtn_box27 .tab > li > a").click(function(){
		var num = $(this).parent().index();
		$(".nhtn_box27 .tab > li").removeClass("on");
		$(this).parent().addClass("on");
		$(".nhtn_box27_inner .group").removeClass("on");
		$(".nhtn_box27_inner .group:eq("+num+")").addClass("on");
		return false;
	});
	
	//custom 탭
	$(".nhtn_box52 .tab > li > a").click(function(){
		var num = $(this).parent().index();
		$(".nhtn_box52 .tab > li").removeClass("on");
		$(this).parent().addClass("on");
		$(".nhtn_box52_inner .group").removeClass("on");
		$(".nhtn_box52_inner .group:eq("+num+")").addClass("on");
		return false;
	});	
	
	
	//quickmenu hover
	$(".q_menu").hover(function(){
		$(this).addClass("wide");
		$(this).stop().animate({'width':'244px'});
	},function(){
		$(this).removeClass("wide");
		$(this).stop().animate({'width':'82px'});
	});
	
	
	$(".q_menu").focusin(function(){
		$(this).addClass("wide");
		$(this).stop().animate({'width':'244px'});
	});
	$(".q_menu").focusout(function(){
		$(this).removeClass("wide");
		$(this).stop().animate({'width':'82px'});
	});	
	
	
	quick_place();
	sec_place();
	//quickmenu scroll
	$(window).scroll(function(){
		var top =$(this).scrollTop();
		var q_top = top+86;
		var q_top2 = top+7;
		
		if(top>100){
			//$(".q_menu").css({'top': q_top+'px'});
			//$(".q_menu2").css({'top': q_top2+'px'});
			
		}else{
			//$(".q_menu").css({'top': '179px'});
			//$(".q_menu2").css({'top': '100px'});
		};
	});

    
    ///////인정관리 
    
    // npub103m01 신청하기 설명 hover
    $(".apply_w").filter(function(){
        $( ".apply_w .ap_memo" ).hide();
        $( ".apply_a" ).mouseover(function() {
            $( ".ap_memo" ).hide();
            $(this).next().show();
        });
    });

    $(".apply_w").filter(function(){
        $( ".apply_w .ap_memo" ).hide();
        $( ".apply_a" ).mouseleave(function() {
            $( ".ap_memo" ).hide();

        });
    });
    
    $(".apply_w").filter(function(){
        $( ".apply_w .ap_memo" ).hide();
        $(".apply_a").focusin(function(){
         $( ".ap_memo" ).hide();
         $(this).next().show();
        });        
        $(".apply_a").focusout(function(){
         $( ".ap_memo" ).hide();
        });
    });
    
    //검색메인 텝 클릭
	$(".special .tabs_wrap .menu_wrap li a").click(function(){
		$(".special .tabs_wrap .menu_wrap li").removeClass("on");
		$(this).parent().addClass("on");

	});
    
    //자주묻는질문 아코디언
	$(".acc_tit>a").click(function(){
		$(".Accordion").removeClass("on");
		$(".acc_tit>a").attr('title','축소됨');
		$(this).parent().parent().addClass("on");
		if($(this).parent().parent().hasClass('on') == true){
			 $(this).attr('title','확장됨');
		}
	});
	
	//npeb201m01 장기요양인정점수 산정방법 아코디언
	$(".accordian").click(function(){
//		$(".acc_tit").removeClass("on");
//		$(".accordian").removeClass("on");
//		$(".acc_txt").removeClass("on");
		if($(this).hasClass("on")){
			$(".acc_tit").removeClass("on");
			$(".accordian").removeClass("on");
			$(".acc_txt").removeClass("on");
		}else{
			$(".acc_tit").removeClass("on");
			$(".accordian").removeClass("on");
			$(".acc_txt").removeClass("on");
			$(this).addClass("on");
			$(this).parents().addClass("on");
			$(this).parents().next().addClass("on");
			
		};
		return false;
		
	});

	//error페이지 상세보기 버튼 클릭
	$(".error_box .dt_info").click(function(){
		$(".error_box_exp").css("display","block");
	});
    
	//npra201p01 게시율 막대
	$(".graph").filter(function(){
		var pers = $(".graph .pers").text();
		$(".graph .bar .inner_bar").css("width",pers);
	});
	
});

$(window).load(function(){
	//, [2025년 디지털 서비스 고도화 사업]
	//, 웹접근성 조치를 위해 업무별로 다른 속성값 지정 필요 (변경전:고정값->변경후:값이 없는 경우에만 고정값으로 세팅)
	setElementAttr($('input#searchDateFrom').next()	, 'title', '시작날짜버튼');
	setElementAttr($('input#searchDateFrom').next()	, 'alt', '시작날짜버튼');
	setElementAttr($('input#searchDateTo').next()	, 'title', '종료날짜버튼');
	setElementAttr($('input#searchDateTo').next()	, 'alt', '종료날짜버튼');

	setElementAttr($('input#srchPeriodFrom').next()	, 'title', '시작날짜버튼');
	setElementAttr($('input#srchPeriodFrom').next()	, 'alt', '시작날짜버튼');
	setElementAttr($('input#srchPeriodTo').next()	, 'title', '종료날짜버튼');
	setElementAttr($('input#srchPeriodTo').next()	, 'alt', '종료날짜버튼');

	setElementAttr($('input#wkg_fr_dt_01').next()	, 'title', '시작날짜버튼');
	setElementAttr($('input#wkg_fr_dt_01').next()	, 'alt', '시작날짜버튼');
	setElementAttr($('input#wkg_to_dt_01').next()	, 'title', '종료날짜버튼');
	setElementAttr($('input#wkg_to_dt_01').next()	, 'alt', '종료날짜버튼');

	setElementAttr($('input#stdDt').next(), 'title', '기준날짜버튼');
	setElementAttr($('input#stdDt').next(), 'alt', '기준날짜버튼');

	setElementAttr($('#psv_rel_cd')				, 'title', ' 신고인종류');
	setElementAttr($('input#email_provider')	, 'title', '이메일주소입력');
	setElementAttr($('input#postNo')			, 'title', '주소검색');
	setElementAttr($('input#postAddr')			, 'title', '기본주소');
	


	setElementAttr($('#sel_svc')			, 'title', '우수사례선택');
	setElementAttr($('#ui-selectmenu-text')	, 'title', '부담기관선택');
	setElementAttr($('#tab1_si_do_cd')		, 'title', '시도선택');
	setElementAttr($('#tab1_si_gun_gu_cd')	, 'title', '구군선택');
	$('.select').addClass('hidden');

	setElementAttr($('#si_do_cd')		, 'title', '시도선택');
	setElementAttr($('#si_gun_gu_cd')	, 'title', '구군선택');
	setElementAttr($('#occupation')		, 'title', '직종선택');

	setElementAttr($('table.frm_search').find('span.search_txt label'), 'for', 'brdnGrteeAdminSym-button');
	setElementAttr($('#brdnGrteeAdminSym'), 'title', '부담기관선택');
	
	setElementAttr($('table.frm_search').find($("label[for='brdnGrteeAdminSym']")), 'for', 'brdnGrteeAdminSym-button');

	$('table.frm_search').find('caption').remove();
	$('table.frm_search').removeAttr('summary');

	$('table.sido_table').removeAttr('summary');
	$('table.sido_table').find('caption').remove();

	$('table.frm_search2').find('caption').remove();
	$('table.frm_search2').removeAttr('summary');	

	
	/*
	 * 190626
	 * 웹 접근성 관련
	 * 
	 * 잘못 만들어진 돔 구조에서 탭인덱스를 임의로 컨트롤 하기위한 코드
	 * 돔 구조를 조정하고 이 코드를 사용하지 않는 방향으로 수정하는 것이 옳다.
	 */
	
	$('table.frm_search').find('#fn_search').attr('tabindex', '-1');
	$('table.frm_search').find('#btn_search').attr('tabindex', '-1');

	$('table.frm_search').find('input').last().focusout(function(){
	
		$('table.frm_search').find('#fn_search').focus();
		$('table.frm_search').find('#btn_search').focus();

	});

	$('table.frm_search').find('#fn_search').focus(function(){
	
		$('table.frm_search').find('input').last().attr('tabindex', '-1');
		$('table.frm_search').find('#fn_search').removeAttr('tabindex');

	});
	$('table.frm_search').find('#btn_search').focus(function(){
	
		$('table.frm_search').find('input').attr('tabindex', '-1');
		$('table.frm_search').find('#btn_search').removeAttr('tabindex');

	});

	$('table.frm_search').find('#fn_search').focusout(function(){
		
		$('table.frm_search').find('input').last().removeAttr('tabindex');
		$('table.frm_search').find('#fn_search').attr('tabindex', '-1');

	});
	$('table.frm_search').find('#btn_search').focusout(function(){
	
		$('table.frm_search').find('input').last().removeAttr('tabindex');
		$('table.frm_search').find('#btn_search').attr('tabindex', '-1');

	});
	

	$('table.frm_search2').find('#fn_search').attr('tabindex', '-1');
	$('table.frm_search2').find('#btn_search').attr('tabindex', '-1');
	
	$('table.frm_search2').find('input').last().focusout(function(){
	
		$('table.frm_search2').find('#fn_search').focus();
		$('table.frm_search2').find('#btn_search').focus();

	});

	$('table.frm_search2').find('#fn_search').focus(function(){
		$('table.frm_search2').find('input').last().attr('tabindex', '-1');
		$('table.frm_search2').find('#fn_search').removeAttr('tabindex');

	});
	$('table.frm_search2').find('#btn_search').focus(function(){
		$('table.frm_search2').find('input').attr('tabindex', '-1');
		$('table.frm_search2').find('#btn_search').removeAttr('tabindex');

	});

	
	$('table.frm_search2').find('#fn_search').focusout(function(){
		$('table.frm_search2').find('INPUT').removeAttr('tabindex');
		$('table.frm_search2').find('#fn_search').attr('tabindex', '-1');
	});
	
	$('table.frm_search2').find('#btn_search').focusout(function(){
		$('table.frm_search2').find('INPUT').removeAttr('tabindex');
		$('table.frm_search2').find('#btn_search').attr('tabindex', '-1');
	});
	
	//search_img 높이조정
	$(".btn_cell .search_img").each(function(){
		var search_h = $(this).parent().height();
		var search_img_h = search_h-2;
		var search_img_h2 = $(this).children('img').height();
		var search_img_h3 = (search_img_h-search_img_h2) / 2;

		$(this).css('height',search_img_h).css('line-height',search_img_h+'px');
		$(this).children('img').css('padding-top',search_img_h3+'px');
	});

	//photo게시판 이미지 높이조정
	$(".photo_list .img_wrap").each(function(){
		var search_h = $(this).height();
		var search_img_h = $(this).children().children('img').height();
		var search_img_h2 = (search_h-search_img_h) / 2;

		$(this).children().children('img').css('padding-top',search_img_h2+'px');
	});
	
	
	$(".detail_box .left dl dd").click(function(){
		$(".detail_box .left dl dt img").attr("src",$(this).children("img").attr("src"));
	});
	
	$(".detail_box .left dl dd").keydown(function(key){
		if(key.keyCode == 13){
			$(".detail_box .left dl dt img").attr("src",$(this).children("img").attr("src"));
		}
	});	
	
	pop_height(); 
	
	$(".detail_btn00").click(function(){
		$(".detail_btn ul li:eq(0) a").trigger("click");
	});
	
	$(".detail_btn01").click(function(){
		$(".detail_btn ul li:eq(1) a").trigger("click");
	});
	
	$(".detail_btn02").click(function(){
		$(".detail_btn ul li:eq(2) a").trigger("click");
	});
	
	$(".detail_btn03").click(function(){
		$(".detail_btn ul li:eq(3) a").trigger("click");
	});

	
	$('#header .close').focus(function(){
		$(this).css('outline', 'inset');	
	});

	$('#header .close').focusout(function(){
		$(this).css('outline', 'none');	
	});

	$('.tbl #sido_table tr.last').eq(2).find('td').eq(5).find('a').remove();
});

//layer popup
function pop_dialog(formName){   
    $( "."+formName).dialog({
        //이벤트 발생했을때 보여주려면 autoOpen : false로 지정해줘야 한다.
        autoOpen: true,
        //레이어팝업 넓이
        width: 500,
        //뒷배경을 disable 시키고싶다면 true
        modal: true,
        //타이틀
        title: "타이틀입력",
        //버튼종류
        buttons: [
            {
                //버튼텍스트
                text: "확인",
                    'class':'btn_cancle',

                //클릭이벤트발생시 동작
                click: function() {
                    $( this ).dialog( "close" );
                }
            },
            {
                //버튼텍스트
                text: "취소",

                //클릭이벤트발생시 동작
                click: function() {
                    $( this ).dialog( "close" );
                }
            }
        ]
    });
}


//첨부파일 디자인
function file_design(){
    //Input File Fake        
    
    $(".file_add").find(".fake_file").bind("change", function() {
        var my_val = $(this).val().replace(/C:\\fakepath\\/i, ''); 
        $(this).parent().find(".fake_val").val(my_val);
     }); 
    //Input File Fake       
        
}

function quick_place(){
	var window_w= $(window).width();
	var right = window_w/2-557;
	var right2 = window_w/2-602;
	var temp_width = window_w-225;
	
	if($('#wrap').hasClass('sub')){
		if(window_w<1114){
			$(".q_menu").css({'right': 0});
			$(".q_menu2").css({'right': 0});
		}else{
			$(".q_menu").css({'right': right+'px'});
			$(".q_menu2").css({'right': right+'px'});
		};
	}else{
		if(window_w<1114){
			$(".q_menu").css({'right': 0});
			$(".q_menu2").css({'right': 0});
		}else{
			$(".q_menu").css({'right': right+'px'});
			$(".q_menu2").css({'right': right+'px'});
		};
	};
	
	$(".templet .cont_wrap").css({'width': temp_width+'px'});
}



function sec_place(){
	var window_w= $(window).width();
	var mar_right= (window_w-1024)/2+45;
	var mar_left= (window_w-1024)/2-45;
//	if(window_w<1114){
//		$(".gnb_slide_wrap .section").css({'margin': 0});
//	}else{
//		$(".gnb_slide_wrap .section").css({'margin': '0 auto'});
//	};
	if($("#wrap").hasClass("special")){
			
		}else{
			if(window_w<1114){
				$("#header .section").css({'margin': 0});
				$(".main #contents .section").css({'margin': 0 , 'marginTop' : '-222px'});
				$(".visual .section").css({'margin': 0});
				$("#footer .section").css({'margin': 0});
			}else{
				$("#header .section").css({'marginLeft': mar_left+'px' , 'marginRight': mar_right+'px'});
				$(".main #contents .section").css({'marginLeft': mar_left+'px' , 'marginRight': mar_right+'px' , 'marginTop' : '-222px'});
				$("#footer .section").css({'marginLeft': mar_left+'px' , 'marginRight': mar_right+'px'});
				$(".visual .section").css({'marginLeft': mar_left+'px' , 'marginRight': mar_right+'px'});
			};
		}

}

function pop_height(){
	$(".h_align .h_align_box").filter(function(){
		var h1=$(window).height();
		var h2=$(".h_align .pop_header").height();
		var h3=h1-h2;
		var h4=$(".h_align .pop_cont .h_align_box").height();
		var h5=(h3-h4)/2;
		$(".h_align .pop_cont").height(h3);
		$(".h_align .pop_cont .h_align_box").css("marginTop",h5+"px"); 
	});
}

function setElementAttr(el, attrName, str){ 
	if(typeof el == "undefined" || el == null){
		return false;
	}
	var attr = el.attr(attrName);
	str = (typeof attr == "undefined" || attr == null) ? str : attr;
	try{
		el.attr(attrName, str);
	}catch(e){
		console.log("인자값을 확인해주세요 attrName : " + attrName + ", str : " + str);
	} 
}
$(document).ready(function () {
	setTimeout(function(){
		//$('SELECT').selectmenu('refresh');
		
		//20190724 웹 접근성 작업 관련 selectbox refresh 코드 대응
		if($('DIV#fileList').length>0){
			$(".ui-menu").append("<iframe src='about:blank' style='position:absolute;border:none;top:0;left:0;height:100%;width:100%;z-index:-1;' title='콤보박스를 보여주기위한 숨김 프레임' ></iframe>");
		}
	}, 200);
});