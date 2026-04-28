/*
파일명             : search.js
화면제목           : 검색엔진 공통 스크립트
최초작성자         : 
최초작성일자       : 
변경이력
====================================================================================================
    변경일자    / 변경자 / 변경내용
====================================================================================================
2025. 09. 30. / 문수민 / 디지털 서비스 고도화 사업 UI/UX개선

*/

var search_isPop;

// 인기검색어, 내가찾은 검색어
function doKeyword(query, isPop) {
	var searchForm = getSearchForm(isPop); 
	searchForm.startCount.value = "0";
	searchForm.query.value = query;
	searchForm.collection.value = "ALL";
	searchForm.sort.value = "RANK";
	searchForm.query.value = query;
	doSearch(isPop);
}

// 쿠키값 조회
function getCookie(c_name) {
	var i,x,y,cookies=document.cookie.split(";");
	for (i=0;i<cookies.length;i++) {
		x=cookies[i].substr(0,cookies[i].indexOf("="));
		y=cookies[i].substr(cookies[i].indexOf("=")+1);
		x=x.replace(/^\s+|\s+$/g,"");
	
		if (x==c_name) {
			return unescape(y);
		}
	}
}

// 쿠키값 설정
function SearchSetCookie(c_name,value,exdays) {
	var exdate=new Date();
	exdate.setDate(exdate.getDate() + exdays);
	//수정 검색쿠키 path 변경 최진곤
	var c_value=escape(value) + ((exdays==null) ? "" : "; path=/; expires="+exdate.toUTCString()); 
	document.cookie=c_name + "=" + c_value; 
}

// 내가 찾은 검색어 조회
function getMyKeyword(keyword, totCount, isPop) {
	var MYKEYWORD_COUNT = 6; //내가 찾은 검색어 갯수 + 1
	var myKeyword = getCookie("mykeyword");
	if( myKeyword== null) {
		myKeyword = "";
	}

	var myKeywords = myKeyword.split("^%");

	if( totCount > 0 ) {
		var existsKeyword = false;
		for( var i = 0; i < myKeywords.length; i++) {
			if( myKeywords[i] == keyword) {
				existsKeyword = true;
				break;
			}
		}

		if( !existsKeyword ) {
			myKeywords.push(keyword);
			if( myKeywords.length == MYKEYWORD_COUNT) {
				myKeywords = myKeywords.slice(1,MYKEYWORD_COUNT);
			}
		}
		SearchSetCookie("mykeyword", myKeywords.join("^%"), 365);
	}

	showMyKeyword(myKeywords.reverse(), isPop);
}


// 내가 찾은 검색어 삭제
function removeMyKeyword(keyword, isPop) {
	var myKeyword = getCookie("mykeyword");
	if( myKeyword == null) {
		myKeyword = "";
	}

	var myKeywords = myKeyword.split("^%");

	var i = 0;
	while (i < myKeywords.length) {
		if (myKeywords[i] == keyword) {
			myKeywords.splice(i, 1);
		} else { 
			i++; 
		}
	}

	SearchSetCookie("mykeyword", myKeywords.join("^%"), 365);

	showMyKeyword(myKeywords, isPop);
}
 
// 내가 찾은 검색어 
function showMyKeyword(myKeywords, isPop) {
	//, var str = "<dt class=\"ta_c mt_10\">내가 찾은 검색어</dt>";
    //, 
	//, for( var i = 0; i < myKeywords.length; i++) {
	//, 	if( myKeywords[i] == "") continue;
	//, 	
	//, 	str += "<dd><a href=\"#none\" onClick=\"javascript:doKeyword('"+myKeywords[i]+"');\">" + myKeywords[i]+"</a>&nbsp;";
	//, 	str += "<a href=\"#none\" class=\"my_search_close\" onClick=\"javascript:removeMyKeyword('"+myKeywords[i]+"');\">닫기</a></dd>"
	//, }

	var str 	= "<div class=\"none\">최근 검색어가 없습니다.</div>";
	var tmpStr 	= '';
	for( var i = 0; i < myKeywords.length; i++) {
		if( myKeywords[i] == "") continue;
		tmpStr += "<div class=\"tag\">";
        tmpStr += 	"<button type=\"button\" class=\"btn-keyword\" onClick=\"javascript:doKeyword('"+myKeywords[i]+"', "+isPop+");\">" + myKeywords[i]+"</button>";
       	tmpStr += 	"<button type=\"button\" class=\"btn-del\" onClick=\"javascript:removeMyKeyword('"+myKeywords[i]+"', "+isPop+");\">삭제</button>";
        tmpStr += "</div>";
	}

	if(tmpStr != ''){
		str = "<div class=\"keyword\">";
		str += tmpStr;
		str += "</div>";
	}
	$("#mykeyword").find(".keyword,.none").remove();
	$("#mykeyword").append(str);
}

// 오타 조회
function getSpell(query) { 
	$.ajax({
	  type: "POST",
	  url: "./popword/popword.jsp?target=spell&charset=",
	  dataType: "xml",
	  data: {"query" : query},
	  success: function(xml) {
		if(parseInt($(xml).find("Return").text()) > 0) {
			var str = "<div class=\"resultall\">";

			$(xml).find("Data").each(function(){			
				if ($(xml).find("Word").text() != "0" && $(xml).find("Word").text() != query) {
					str += "<span>이것을 찾으셨나요? </span><a href=\"#none\" onClick=\"javascript:doKeyword('"+$(xml).find("Word").text()+"');\">" + $(xml).find("Word").text() + "</a>";
				}			
			});
			
			str += "</div>";

			$("#spell").html(str);
		}
	  }
	});

	return true;
}

// 기간 설정
function setDate(range) {
	var startDate = "";
	var endDate = "";
	
	var currentDate = new Date();
	var year = currentDate.getFullYear();
	var month = currentDate.getMonth() +1;
	var day = currentDate.getDate();

	if (parseInt(month) < 10) {
		month = "0" + month;
	}

	if (parseInt(day) < 10) {
		day = "0" + day;
	}

	var toDate = year + "." + month + "." + day;

	// 기간 버튼 이미지 초기화
	for (i = 1;i < 5 ;i++) {
		$("#range"+i).attr ("src", "images/btn_term" + i + ".gif");
	}
	
	// 기간 버튼 이미지 선택
	if (range == "D") {
		startDate = getAddDay(currentDate, -0);
		$("#range2").attr ("src", "images/btn_term22.gif");
	} else if (range == "W") {
		startDate = getAddDay(currentDate, -6);
		$("#range3").attr ("src", "images/btn_term32.gif");
	} else if (range == "M") {
		startDate = getAddDay(currentDate, -29);
		$("#range4").attr ("src", "images/btn_term42.gif");
	} else {
		startDate = "1970.01.01";
		endDate = toDate;
		$("#range1").attr ("src", "images/btn_term12.gif");
	}
	
	if (range != "A" && startDate != "") { 
		year = startDate.getFullYear();
		month = startDate.getMonth()+1; 
		day = startDate.getDate();

		if (parseInt(month) < 10) {
			month = "0" + month;
		}

		if (parseInt(day) < 10) {
			day = "0" + day;
		}

		startDate = year + "." + month + "." + day;				
		endDate = toDate;
	}
	
	$("#range").val(range);
	$("#startDate").val(startDate);
	$("#endDate").val(endDate);
}

// 날짜 계산
function getAddDay ( targetDate, dayPrefix )
{
	var newDate = new Date( );
	var processTime = targetDate.getTime ( ) + ( parseInt ( dayPrefix ) * 24 * 60 * 60 * 1000 );
	newDate.setTime ( processTime );
	return newDate;
}

// 정렬
function doSorting(sort, isPop) {
	var searchForm = getSearchForm(isPop);
	searchForm.sort.value = sort;
	searchForm.reQuery.value = "2";
	searchForm.submit();
}

//top_검색
function doTopSearch(isPop) {
	var searchForm = getSearchForm(isPop, true); 
	if(! searchForm){
		return false;
	}
	//, if (searchForm.query.value == "") {
	//, 	alert("검색어를 입력하세요.");
	//, 	searchForm.query.focus();
	//, 	return false;
	//, }
	
	searchForm.submit();
}

// 검색
function doSearch(isPop) {
	var searchForm = getSearchForm(isPop, true); 

	if(! searchForm){
		return false;
	}
	
	//, if (searchForm.query.value == "") {
	//, 	alert("검색어를 입력하세요.");
	//, 	searchForm.query.focus();
	//, 	return false;
	//, }
	
	if(searchForm.selectCol.value == ""){
		searchForm.collection.value = "ALL";
	}else{
		searchForm.collection.value = searchForm.selectCol.value;
	}
	
	searchForm.startDate.value = "";
	searchForm.endDate.value = "";
	searchForm.range.value = "ALL";
	searchForm.startCount.value = 0;
	searchForm.searchField.value = "ALL";
	searchForm.sort.value = "RANK";
	searchForm.submit();
}

// 컬렉션별 검색
function doCollection(coll, isPop) {
	var searchForm = getSearchForm(isPop); 
	searchForm.collection.value = coll;
	searchForm.reQuery.value = "2";
	searchForm.submit();
}
	
//엔터 체크	
function pressCheck(isPop) {   
	if (event.keyCode == 13) {
		return doTopSearch(isPop);
	}else{
		return false;
	}
}

var temp_query = "";

// 결과내 재검색
function checkReSearch(isPop) {
	var searchForm = getSearchForm(isPop);
	var query = searchForm.query;
	var reQuery = searchForm.reQuery;

	if (document.getElementById("reChk").checked == true) {
		temp_query = query.value;
		reQuery.value = "1";
		query.value = "";
		query.focus();
	} else {
		query.value = trim(temp_query);
		reQuery.value = "";
		temp_query = "";
	}
}

// 페이징
function doPaging(count, isPop) {
	var searchForm = getSearchForm(isPop);
	searchForm.startCount.value = count;
	searchForm.reQuery.value = "2";
	searchForm.submit();
}

// 기간 적용
function doRange(isPop) {
	var searchForm = getSearchForm(isPop);
	
	if($("#startDate").val() != "" || $("#endDate").val() != "") {
		if($("#startDate").val() == "") {
			alert("시작일을 입력하세요.");
			$("#startDate").focus();
			return;
		}

		if($("#endDate").val() == "") {
			alert("종료일을 입력하세요.");
			$("#endDate").focus();
			return;
		}

		if(!compareStringNum($("#startDate").val(), $("#endDate").val(), ".")) {
			alert("기간이 올바르지 않습니다. 시작일이 종료일보다 작거나 같도록 하세요.");
			$("#startDate").focus();
			return;
		}		
	}

	searchForm.startDate.value = $("#startDate").val();
	searchForm.endDate.value = $("#endDate").val();
	searchForm.range.value = $("#range").val();
	searchForm.reQuery.value = "2";
	searchForm.submit();
}

// 영역
function doSearchField(field, isPop) {
	var searchForm = getSearchForm(isPop);
	searchForm.searchField.value = field;
	searchForm.reQuery.value = "2";
	searchForm.submit();
}

// 문자열 숫자 비교
function compareStringNum(str1, str2, repStr) {
	var num1 =  parseInt(replaceAll(str1, repStr, ""));
	var num2 = parseInt(replaceAll(str2, repStr, ""));

	if (num1 > num2) {
		return false;
	} else {
		return true;
	}
}

// Replace All
function replaceAll(str, orgStr, repStr) {
	return str.split(orgStr).join(repStr);
}

// 공백 제거
function trim(str) {
	return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

function goPage( page , isPop) {

	var frm = getSearchForm(isPop);
	if (page == "00")
	{
		page = "0";
	}

	if ( page != "")
	{
		frm.startCount.value = page;
		frm.submit();
	}
}


function go_list( page, isPop) {

	var frm = getSearchForm(isPop);
	if (page == "00")
	{
		page = "0";
	}

	if ( page != "")
	{
		frm.startCount.value = page;
		frm.submit();
	}
}


function getKeyword( docid , isPop) {

	var frm = getSearchForm(isPop);

	if (page == "00")
	{
		page = "0";
	}

	if ( page != "")
	{
		frm.startCount.value = page;
		frm.submit();
	}
}

/* ==================================================================================
 * [ 2025년 디지털 서비스 고도화 사업 > 노인장기요양 홈페이지 기능 기선 추가 ] 
 * ==================================================================================
*/

/*
 * 최근검색어를 모두 지움
 * ex) removeMyAllKeyword();
 */
function removeMyAllKeyword(isPop) {
	SearchSetCookie("mykeyword", '', 365);
	showMyKeyword('', isPop);	
}

/*
 * 검색 form 을 찾는 함수 (검색 화면에서 레이어팝업을 띄어 검색이 가능하여  form을 구분해야 하는 필요가 생김)
 * ex) getSearchForm(boolean);
 * return  	:: form node
 */
function getSearchForm(isPop, isQueryCheck){
	var $form =(isPop == true) ? document.searchPop : document.search;
	
	if(isQueryCheck){
		if($form.query.value == ""){
			gfn_alert("검색어를 입력하세요.", null, null, {'확인' : function(){
				$form.query.focus();
			}});
			return false;
		}
	}
	
	return $form; 
}