//
// www.eprivacy.or.kr / Mark popup library
// last update : 2016.02.02 by Ditongs 
//

	function markPopupE(code) {
		//return dcPopup('http://www.eprivacy.or.kr/seal/mark.jsp?mark=e&code='+ code, 'seal', 500, 700);
		return dcPopup('https://www.eprivacy.or.kr/front/certifiedSiteMark/certifiedSiteMarkPopup.do?certCmd=EP&certNum='+ code, 'seal', 500, 700);
	}
	
	function markPopupI(code) {
		return dcPopup('http://www.eprivacy.or.kr/seal/mark.jsp?mark=i&code='+ code, 'seal', 500, 700);
	}

	function dcPopup(url, name, w, h) {
		var x = (screen.availWidth  / 2) - (w/2);
		var y = (screen.availHeight / 2) - (h/2);
		return window.open(url, name, "toolbar=no,resizable=yes,scrollbars=yes,status=no,location=no,left="+ x + ",top=" + y + ",width=" + w + ",height="+ h);
	}
