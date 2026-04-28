/**
 * (C) Copyright 2005-2015. AhnLab, Inc.
 *
 * Any part of this source code can not be copied with
 * any method without prior written permission from
 * the author or authorized person.
 *
 * @version				$Revision: 14304 $
 *
 */

var _g_aos_clsid_arr			= new Array();
var _g_aos_mimetype_arr		= new Array();
var _g_aos_mimetype_arr2	= new Array();
var _g_aos_opt_arr				= new Array();

// default: IE
var _g_aos_cab_version		= '1,0,0,23'; // Cab version
var _g_aos_object_id			= 'AOSMGR';
var _g_aos_object_name		= 'AOSMGR';

var _g_aos_ff_mimetype		= 'application/ahnlab/asp/npaosmgr.1';
var _g_aos_ff_mimetype2		= 'application/ahnlab.asp.npaosmgr.1';

_g_aos_opt_arr['authserver'] = "webclinic.ahnlab.com";
_g_aos_opt_arr['authinfo'] = "";
_g_aos_opt_arr['authinfourl'] = "";	// linux_mac firewall authinfo url
_g_aos_opt_arr['authrooturl'] = "";
_g_aos_opt_arr['asyncmode'] = false;
_g_aos_opt_arr['uimode'] = true;
_g_aos_opt_arr['showstartinfo'] = true;
_g_aos_opt_arr['browser'] = _aos_get_browser_type();
_g_aos_opt_arr['aosinfourl'] = "http://ahnlabdownload.nefficient.co.kr/aos/sup/aosinfo.html";   //mac firewall aosinfo url
_g_aos_opt_arr['aosinfourl2'] = "http://ahnlabdownload.nefficient.co.kr/aos/sup/aosinfo2.html";   //linux firewall aosinfo url
_g_aos_opt_arr['ssl_aosinfourl'] = "http://ahnlabdownload.nefficient.co.kr/aos/sup/aosinfo.html";   //mac firewall aosinfo url
_g_aos_opt_arr['ssl_aosinfourl2'] = "http://ahnlabdownload.nefficient.co.kr/aos/sup/aosinfo2.html";   //linux firewall aosinfo url
_g_aos_opt_arr['codebase'] = 'http://ahnlabdownload.nefficient.co.kr/aos/plugin/aosmgr.cab';
_g_aos_opt_arr['codebase_9x'] = 'http://ahnlabdownload.nefficient.co.kr/aos9x/plugin/aosmgr.cab';
_g_aos_opt_arr['ssl_codebase'] = 'https://secwebclinic.ahnlab.com/aos/plugin/aosmgr.cab';
_g_aos_opt_arr['ssl_codebase_9x'] = 'https://secwebclinic.ahnlab.com/aos9x/plugin/aosmgr.cab';
_g_aos_opt_arr['ff_installer'] = 'http://ahnlabdownload.nefficient.co.kr/aos/plugin/InstAosmgr.exe';
_g_aos_opt_arr['ff_installer_9x'] = 'http://ahnlabdownload.nefficient.co.kr/aos9x/plugin/InstAosmgr.exe';
_g_aos_opt_arr['ff_installer_mac'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall.dmg'; //mac firewall
_g_aos_opt_arr['ff_installer_linux_u32'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall_u32.deb'; //ubuntu 32bit firewall
_g_aos_opt_arr['ff_installer_linux_u64'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall_u64.deb'; //ubuntu 64bit firewall
_g_aos_opt_arr['ff_installer_linux_f32'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall_f32.rpm'; //fedora 32bit firewall
_g_aos_opt_arr['ff_installer_linux_f64'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall_f64.rpm'; //fedora 64bit firewall
_g_aos_opt_arr['ff_ssl_installer'] = 'http://ahnlabdownload.nefficient.co.kr/aos/plugin/InstAosmgr.exe';
_g_aos_opt_arr['ff_ssl_installer_9x'] = 'http://ahnlabdownload.nefficient.co.kr/aos9x/plugin/InstAosmgr.exe';
_g_aos_opt_arr['ff_ssl_installer_mac'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall.dmg'; //mac firewall
_g_aos_opt_arr['ff_ssl_installer_linux_u32'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall_u32.deb'; //ubuntu 32bit firewall
_g_aos_opt_arr['ff_ssl_installer_linux_u64'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall_u64.deb'; //ubuntu 64bit firewall
_g_aos_opt_arr['ff_ssl_installer_linux_f32'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall_f32.rpm'; //fedora 32bit firewall
_g_aos_opt_arr['ff_ssl_installer_linux_f64'] = 'http://ahnlabdownload.nefficient.co.kr/aos/sup/aosfirewall_f64.rpm'; //fedora 64bit firewall
_g_aos_opt_arr['mkd_protect_level'] = "default";
_g_aos_opt_arr['obj_position'] = "afterBegin";
_g_aos_opt_arr['obj_style'] = "";    // "hideout" ==> position:absolute;left=-1;top=-1

_g_aos_clsid_arr['40'] = "59B0298B-A7B5-4045-A34E-377EDF7BCB8E";
_g_aos_mimetype_arr['40'] = "application/ahnlab/asp/npmkd25sp";
_g_aos_mimetype_arr2['40'] = "application/ahnlab.asp.npmkd25sp";


var g_firefox_install_running = false;
var g_debug_enable = false;
var g_aosak_timerid = null;



function check_valid_mimetype(mime)
{
	navigator.plugins.refresh(false); //mac firewall

	if(navigator.mimeTypes)
	{
		var plugins = navigator.mimeTypes[mime];
		if( plugins )
		{
			if( plugins.enabledPlugin )
			{
				return true;
			}
		}
	}
	return false;
}


function check_support_firefox()
{
	var msg_browser_kr = "[AhnLab Online Security] Firefox 버전이 낮습니다. 최하 3.0 이상에서 사용할 수 있습니다.";
	var msg_browser_us = "AhnLab Online Security does not support the current version of Firefox. You must upgrade the web browser to version 3.0 or greater.";

	// Mozilla/5.0 (Windows; U; Windows NT 5.1; ko; rv:1.8.1.20) Gecko/20081217 Firefox/2.0.0.20 (.NET CLR 3.5.30729)
	// only Firefox/x.x or Firefox x.x
	var ret = false;
	if(/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent))
	{
		var brwver = new Number(RegExp.$1);
		if( brwver >= 3 )
		{
			ret = true;
		}
	}

	if(false == ret)
	{
		var chset = document.charset;
		if(chset && chset.toLowerCase() == "euc-kr")
			alert(msg_browser_kr);
		else
			alert(msg_browser_us);
	}

	return  ret;
}

function check_support_opera()
{
	var msg_browser_kr = "[AhnLab Online Security] Opera 버전이 낮습니다. 최하 10.0 이상에서 사용할 수 있습니다.";
	var msg_browser_us = "AhnLab Online Security does not support the current version of Opera. You must upgrade the web browser to version 10.0 or greater.";

	// Opera/9.80 (Windows NT 5.1; U; ko) Presto/2.2.15 Version/10.10
	// only Version/x.x or Version x.x
	var ret = false;
	if(/Version[\/\s](\d+\.\d+)/.test(navigator.userAgent))
	{
		var brwver = new Number(RegExp.$1);
		if( brwver >= 10 )
		{
			ret = true;
		}
	}

	if(/OPR[\/\s](\d+\.\d+)/.test(navigator.userAgent))
	{
		var brwver = new Number(RegExp.$1);
		if( brwver >= 10 )
		{
			ret = true;
		}
	}

	if(false == ret)
	{
		var chset = document.charset;
		if(chset && chset.toLowerCase() == "euc-kr")
			alert(msg_browser_kr);
		else
			alert(msg_browser_us);
	}

	return  ret;
}

function check_support_safari()
{
	var msg_browser_kr = "[AhnLab Online Security] Safari 버전이 낮습니다. 최하 4.0 이상에서 사용할 수 있습니다.";
	var msg_browser_us = "AhnLab Online Security does not support the current version of Safari. You must upgrade the web browser to version 4.0 or greater.";

	// Mozilla/5.0 (Windows; U; Windows NT 5.1; ko-KR) AppleWebKit/531.9 (KHTML, like Gecko) Version/4.0.3 Safari/531.9.1
	// only Version/x.x or Version x.x
	var ret = false;
	if(/Version[\/\s](\d+\.\d+)/.test(navigator.userAgent))
	{
		var brwver = new Number(RegExp.$1);
		if( brwver >= 4 )
		{
			ret = true;
		}
	}

	if(false == ret)
	{
		var chset = document.charset;
		if(chset && chset.toLowerCase() == "euc-kr")
			alert(msg_browser_kr);
		else
			alert(msg_browser_us);
	}

	return  ret;
}

function check_support_chrome()
{
	var msg_browser_kr = "[AhnLab Online Security] Chrome 버전이 낮습니다. 최하 2.0 이상에서 사용할 수 있습니다.";
	var msg_browser_us = "AhnLab Online Security does not support the current version of Chrome. You must upgrade the web browser to version 2.0 or greater.";

	// Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US) AppleWebKit/532.0 (KHTML, like Gecko) Chrome/3.0.195.33 Safari/532.0
	// only Version/x.x or Version x.x
	var ret = false;
	if(/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent))
	{
		var brwver = new Number(RegExp.$1);
		if( brwver >= 2 )
		{
			ret = true;
		}
	}

	if(false == ret)
	{
		var chset = document.charset;
		if(chset && chset.toLowerCase() == "euc-kr")
			alert(msg_browser_kr);
		else
			alert(msg_browser_us);
	}

	return  ret;
}

function check_support_browser()
{
	var browser = navigator.userAgent;

	if(browser.indexOf('Edge/') >= 0)
	{
		// Microsoft Edge
		if(typeof(window.console) === 'object' && typeof(console.log) === 'function')
				console.log("AOS does not support the Microsoft Edge browser.");

		// Do nothing
		return false;
	}

	var ff = browser.indexOf('Firefox');

	var ie = browser.indexOf('MSIE');
	if(ie < 0)
	{
		// sanmaul: for above IE11
		ie = _get_ie_version();
	}

	var ch = browser.indexOf('Chrome');

	var sf = browser.indexOf('Safari');
	if(sf >= 0)
	{
		// Chrome에서 navigator.userAgent에 "Safari" 문자열이 포함되어 있으므로, "Chrome" 문자열을 찾음.
		if(browser.indexOf('Chrome') >= 0)
		{
			sf = -1;
		}
	}

	
	var op = browser.indexOf('Opera');

	if( op < 0 )
	{
		op = browser.indexOf('OPR');
	}

	var msg_browser_kr = "AhnLab Online Security를 지원하지 않는 웹브라우저입니다.";
	var msg_browser_us = "AhnLab Online Security does not support this web browser.";

	var ret = true;
	if( ff >= 0 )
	{
		return check_support_firefox();
	}
	else if( op >= 0 )
	{
		return check_support_opera();
	}
	else if( sf >= 0 )
	{
		return check_support_safari();
	}
	else if( ch >= 0 )
	{
		return check_support_chrome();
	}
	else if( ie >= 0 )
	{
		// do nothing.
	}
	else
	{
		ret = false; // unknown browser
	}

	if(false == ret)
	{
		var chset = document.charset;
		if(chset && chset.toLowerCase() == "euc-kr")
			alert(msg_browser_kr);
		else
			alert(msg_browser_us);
	}

	return ret;
}

function check_support_os()
{
	var result = false;
	var os = navigator.platform;
	var win = os.indexOf('Win');
	var mac = os.indexOf('Mac');
	var linux = os.indexOf('Linux');
	var arm = os.indexOf('arm');

	var msg_os_kr = "[AhnLab Online Security] 지원하지 않는 운영체제입니다.";
	var msg_os_us = "[AhnLab Online Security] This operating system is not supported.";

	if (win == -1 && mac == -1 && linux == -1)
	{
		result = false;
	}
	else if (linux != -1 && arm != -1)	// android
	{
		result = false;
	}
	else
	{
		result = true;
	}

	if( result == false )
	{
		if(document.charset == "euc-kr")
			alert(msg_os_kr);
		else
			alert(msg_os_us);
	}

	return result;
}

function _aos_browser_version(dataString, browser)
{
	var index = dataString.indexOf(browser);
	if (index == -1)    return;
	return parseFloat(dataString.substring(index+browser.length+1));
}

function _aos_debug_print(str)
{
	if(g_debug_enable == false)
		return;

	if( _aos_is_netscape() == true )
	{
		str += "<br>";
		document.body.innerHTML += str;
	}
	else
	{
		document.body.insertAdjacentHTML("beforeEnd", str+"<br>");
	}
}


function onunload_handler()
{

}

function onunload_check()
{
	if( window.onunload == undefined )
	{
		window.onunload = onunload_handler;
	}

}

if(_aos_is_netscape() == true)
{
	onunload_check();
}


// optional
function aos_set_authinfo( authinfo )
{
	_g_aos_opt_arr['authinfo'] = authinfo;
}

function aos_set_authinfourl( authinfourl ) // mac firewall authinfo
{
	_g_aos_opt_arr['authinfourl'] = authinfourl;
}

function aos_set_auth_server( server )
{
	_g_aos_opt_arr['authserver'] = server;
}

function aos_set_aosinfourl( aosinfourl ) // linux_mac firewall authinfo
{
	if (_aos_is_mac() == true)
	{
		_g_aos_opt_arr['aosinfourl'] = aosinfourl;
	}
	else if (_aos_is_linux() == true)
	{
		_g_aos_opt_arr['aosinfourl2'] = aosinfourl;
	}
}

function aos_set_ssl_aosinfourl( aosinfourl ) // linux_mac firewall authinfo
{
	if (_aos_is_mac() == true)
	{
		_g_aos_opt_arr['ssl_aosinfourl'] = aosinfourl;
	}
	else if (_aos_is_linux() == true)
	{
		_g_aos_opt_arr['ssl_aosinfourl2'] = aosinfourl;
	}
}

function aos_set_codebase( codebase )
{
	_g_aos_opt_arr['codebase'] = codebase;
}

function aos_set_xpi_codebase( codebase )
{
	// deprecated
}

function aos_set_ssl_codebase( codebase )
{
	_g_aos_opt_arr['ssl_codebase'] = codebase;
}

function aos_set_ssl_xpi_codebase( codebase )
{
	// deprecated
}

function aos_set_xpi_installer( codebase )
{
	_g_aos_opt_arr['ff_installer'] = codebase;
}

function aos_set_ssl_xpi_installer( codebase )
{
	_g_aos_opt_arr['ff_ssl_installer'] = codebase;
}

function aos_set_mac_installer( codebase ) //mac firewall
{
	_g_aos_opt_arr['ff_installer_mac'] = codebase;
}

function aos_set_linux_u32_installer( codebase ) //ubuntu 32bit firewall
{
	_g_aos_opt_arr['ff_installer_linux_u32'] = codebase;
}

function aos_set_linux_u64_installer( codebase ) //ubuntu 64bit firewall
{
	_g_aos_opt_arr['ff_installer_linux_u64'] = codebase;
}

function aos_set_linux_f32_installer( codebase ) //fedora 32bit firewall
{
	_g_aos_opt_arr['ff_installer_linux_f32'] = codebase;
}

function aos_set_linux_f64_installer( codebase ) //fedora 64bit firewall
{
	_g_aos_opt_arr['ff_installer_linux_f64'] = codebase;
}

function aos_set_ssl_mac_installer( codebase ) //mac firewall
{
	_g_aos_opt_arr['ff_ssl_installer_mac'] = codebase;
}

function aos_set_ssl_linux_u32_installer( codebase ) //ubuntu 32bit firewall
{
	_g_aos_opt_arr['ff_ssl_installer_linux_u32'] = codebase;
}

function aos_set_ssl_linux_u64_installer( codebase ) //ubuntu 64bit firewall
{
	_g_aos_opt_arr['ff_ssl_installer_linux_u64'] = codebase;
}

function aos_set_ssl_linux_f32_installer( codebase ) //fedora 32bit firewall
{
	_g_aos_opt_arr['ff_ssl_installer_linux_f32'] = codebase;
}

function aos_set_ssl_linux_f64_installer( codebase ) //fedora 64bit firewall
{
	_g_aos_opt_arr['ff_ssl_installer_linux_f64'] = codebase;
}

function aos_set_subclsid( pd, clsid )
{
	_g_aos_clsid_arr[pd] = clsid;
}

function aos_set_submimetype( pd, mimetype )
{
	_aos_set_submimetype(pd, mimetype);
}

function aos_set_option( option_name, option_value )
{
	_g_aos_opt_arr[ option_name ] = option_value;
}

function aos_get_option( option_name )
{
	return _g_aos_opt_arr[ option_name ];
}

function _aos_set_submimetype( pd, mimetype )
{
	if(mimetype == "application/ahnlab/asp/npmkd25aos")
	{
		_g_aos_mimetype_arr[pd] = "application/ahnlab/asp/npmkd25sp";
		return;
	}
	_g_aos_mimetype_arr[pd] = mimetype;
}

function _aos_write_object()
{
	if(false == check_support_os())
	{
		return false;
	}

	if(false == check_support_browser())
	{
		return false;
	}

	if( _aos_is_netscape() == false )
	{
		_aos_ie_write_object();
	}
	else
	{
		try
		{
			window.max_script_run_time = 30000;
		}
		catch( e )
		{
		}

		_aos_ff_write_object();
	}
}

function _aos_ie_write_object()
{
	if( _aos_ie_loaded() == true )
	{
		return true;
	}

	var codebase;
	if (_aos_is_9x())
	{
		if( document.location.protocol == "https:" )
			codebase = _g_aos_opt_arr['ssl_codebase_9x'];
		else
			codebase = _g_aos_opt_arr['codebase_9x'];
	}
	else
	{
		if( document.location.protocol == "https:" )
			codebase = _g_aos_opt_arr['ssl_codebase'];
		else
			codebase = _g_aos_opt_arr['codebase'];
	}
		var width = 0, height = 0;
		if(_get_ie_version() >= 11)
		{
			// sanmaul: Change the width and height of 1. (for above IE11)
			width = 1; height = 1;
			_g_aos_opt_arr['obj_style'] = 'hideout';
		}

		var otstyle = ""
		if(_g_aos_opt_arr['obj_style'] == 'hideout')
		{
			otstyle = "style=" + "'position:absolute;left=-1;top=-1'";
		}

		var strHtml = "<OBJECT " + otstyle + " classid='CLSID:063F7D71-5E0B-48F2-87D5-F63C5917947E' id='"
			+ _g_aos_object_id +"' name='"+ _g_aos_object_name
			+"' height='"+height+"' width='"+width+"' tabindex='-1' codebase='"+ codebase +"#version="+ _g_aos_cab_version
			+"'></OBJECT>";

		document.body.insertAdjacentHTML(_g_aos_opt_arr['obj_position'], strHtml);
}

function _aos_ff_create_container(containerid)
{
	var container = document.getElementById(containerid);
	if(container)
	{
		// do nothing.
	}
	else
	{
		var adiv = document.createElement('div');
		adiv.style.position = "absolute";
		adiv.id = containerid;
		adiv.name = containerid;
		document.body.appendChild(adiv);
	}
}

function _aos_ff_create_write_object_container()
{
	_aos_ff_create_container("AOSMGROBJCONTAINER");
	_aos_ff_create_container("MKD25OBJCONTAINER");
}

function _aos_ff_write_object(retry)
{
	if(typeof(retry) == "undefined")
	{
		retry = 0;
	}
	_aos_ff_create_write_object_container();

	if(_aos_ff_is_new())
	{
		var aosmgr = document.getElementById("AOSMGR");
		if(aosmgr == null)
		{
			// write object...
			var mimetype;

			if( check_valid_mimetype(_g_aos_ff_mimetype) )
				mimetype = _g_aos_ff_mimetype;

			else if( check_valid_mimetype(_g_aos_ff_mimetype2) )
				mimetype = _g_aos_ff_mimetype2;

			var strHtml = "<OBJECT type='" + mimetype + "' id='"+ _g_aos_object_id +
				"' name='" + _g_aos_object_name + "' height=0 width=0 tabindex=-1></"+"OBJECT>";

			var container = document.getElementById("AOSMGROBJCONTAINER");
			if(container)
			{
				container.innerHTML += strHtml;
			}
			else
			{
				document.body.innerHTML += strHtml;
			}
		}

		if(_aos_ff_loaded() == false)
		{
			// not loaded...
			if(retry > 0) // for opera
			{
				// delete node
				aosmgr = document.getElementById("AOSMGR");
				if(aosmgr) aosmgr.parentNode.removeChild(aosmgr);

				// install
				_aos_run_install();
			}

			window.setTimeout("_aos_ff_write_object(" + (retry + 1) + ")", 500);
		}
		else
		{
			// load success
		}
	}
	else
	{
		// not installed...
		_aos_run_install();
		window.setTimeout("aos_write_object()", 500);
	}
}

function aos_write_object()
{
	if(document.body)
	{
		_aos_write_object();
	}
	else
	{
		window.setTimeout("aos_write_object()", 100);
	}
}

function aos_start( pd )
{
	window.setTimeout( "_aos_start_onload('" + pd + "')", 100 );
}

function _aos_start( pd )
{
	navigator.plugins.refresh(false);
	var aosmgr = document.getElementById("AOSMGR");

	// check start count
	if( 0 < _aos_startcount())
	{
		if(_aos_isfindlist(pd, "40"))
		{
			_aos_startcount_wait_mkd();
		}
		return;
	}

	// check frame index
	var async = _g_aos_opt_arr['asyncmode'];
	if(0 < _aos_frameindex())
	{
		if( async && _aos_isfindlist(pd, "e5"))
		{
			// skip
			return;
		}
		else if( _aos_isfindlist(pd, "40") && _aos_isrunning("40") )
		{
			// skip
			_aos_startcount_wait_mkd();
			return;
		}
	}

	// set prop.
	var x;
	for( x in _g_aos_opt_arr )
	{
		if(typeof(_g_aos_opt_arr[x]) == "undefined")
		{
			alert("invalid option [" + x + "]");
			return;
		}

		aosmgr.setProperty( x, _g_aos_opt_arr[x] );
	}

	// set event handler
	aosmgr.setProperty("aos_event_handler", _aos_event_handler);

	aosmgr.StartAos( pd ,0 );
}

function _aos_start_onload( pd )
{
	if( _aos_loaded() )
	{
		if(0 == _aos_startcount())
		{
			_aos_start( pd );
			return;
		}
	}

	window.setTimeout( "_aos_start_onload('" + pd + "')", 100 );
}

function aos_run_installer() //mac firewall
{
	return _aos_ff_install();
}

function _aos_run_install()
{
	if(_aos_is_mac())
	{
		return;
	}

	return _aos_ff_install();
}

function _aos_ff_install()
{
	if( g_firefox_install_running == true )
	{
		return;
	}

	var installer;
	if(_aos_is_mac())
	{
		if( document.location.protocol == "https:" )
			installer = _g_aos_opt_arr['ff_ssl_installer_mac'];
		else
			installer = _g_aos_opt_arr['ff_installer_mac'];
	}
	else if (_aos_is_linux())
	{
		return;
	}
	else if (_aos_is_9x())
	{
		if( document.location.protocol == "https:" )
			installer = _g_aos_opt_arr['ff_ssl_installer_9x'];
		else
			installer = _g_aos_opt_arr['ff_installer_9x'];
	}
	else
	{
		if( document.location.protocol == "https:" )
			installer = _g_aos_opt_arr['ff_ssl_installer'];
		else
			installer = _g_aos_opt_arr['ff_installer'];
	}

	var s = "window.location.href = '"+installer+"';";
	window.setTimeout(s, 500);

	g_firefox_install_running = true;
}

function _aos_ff_loaded()
{
	var aosmgr = document.getElementById("AOSMGR");

	try
	{
		if( typeof(aosmgr.IsRunning) != 'undefined')
		{
			try
			{
				if( aosmgr.IsInited() == false )
				{
					return false;
				}
			}
			catch( e2 )
			{
			}

			return true;
		}
	}
	catch( e )
	{
	}

	return false;
}

function _aos_ie_loaded()
{
	var aosmgr = document.getElementById("AOSMGR");
	try
	{
		if( aosmgr.object )
		{
			return true;
		}
	}
	catch( e )
	{
	}
	return false;
}

function aos_loaded()
{
	return _aos_loaded();
}

function _aos_loaded()
{

	if ( _aos_is_netscape() == true )
	{
		return _aos_ff_loaded();
	}
	else
	{
		return _aos_ie_loaded();
	}
}

function _aos_isfindlist(szpidlist, szpid)
{
	var nindex = 0;
	var bfind = false;

	// find pid
	nIndex = szpidlist.indexOf(szpid);

	if(nIndex == -1)
	{
		bfind = false;
	}
	else
	{
		bfind = true;
	}

	return(bfind);
}

function _aosak_ff_isvalid()
{
	if( check_valid_mimetype(_g_aos_mimetype_arr["40"]) )
	{
		return true;
	}
	if( check_valid_mimetype(_g_aos_mimetype_arr2["40"]) )
	{
		return true;
	}

	return false;
}

function _aos_event_handler( event_for, event_name, event_param1, event_param2 )
{
	var str = " "+ event_for +" + "+ event_name +" + "+ event_param1 +" + "+ event_param2 +"";

	if( event_name == "update_complete" )
	{
		if( true == _aos_isfindlist(event_param1 ,"40") )
		{
			if( _aos_is_netscape() == true )
			{
				if( check_valid_mimetype(_g_aos_mimetype_arr["40"]) )
				{
					_mkd_insert_ff_object( _g_aos_mimetype_arr["40"] );
				}
				else if( check_valid_mimetype(_g_aos_mimetype_arr2["40"]) )
				{
					_mkd_insert_ff_object( _g_aos_mimetype_arr2["40"] );
				}

			}
			else
			{
				_mkd_insert_ie_object( _g_aos_clsid_arr["40"] );
			}

			if( navigator.userAgent.indexOf('Opera') >= 0 || navigator.userAgent.indexOf('Chrome') >= 0)
			{
				if(_aosak_ff_isvalid() == true)
				{
					_mkd_start_onload();
				}
				else
				{
					location.reload();
				}
			}
			else
			{
				_mkd_start_onload();
			}

		}
		if( true == _g_aos_opt_arr['asyncmode'] )
		{
			// async mode is not real complete.
			return;
		}
	}
	else if( event_name == "update_event_begin" )
	{
		if( true == _g_aos_opt_arr['asyncmode'] )
		{
			// able to do some thing when async mode
			event_name = "update_complete"  ;
		}
	}
	/* suspicious code
	else if( event_name == "update_event_end" )
	{
		// sync and async mode real complete.
	}
	*/

	if( _g_aos_opt_arr[ "aos_event_handler" ])
	{
		_g_aos_opt_arr[ "aos_event_handler" ]( event_name, event_param1, event_param2 );
	}
}

function aos_get_text2( obj )
{
	try
	{
		var MKD25 = document.getElementById("MKD25");
		return MKD25.GetText2( obj );
	}
	catch( e )
	{
	}

	return "";
}

function aos_get_text3( obj, id )
{
	try
	{
		var MKD25 = document.getElementById("MKD25");
		return MKD25.GetText3( obj, id );
	}
	catch( e )
	{
	}

	return "";
}

function aos_get_text4( obj, order )
{
	try
	{
		var MKD25 = document.getElementById("MKD25");
		return MKD25.GetText4( obj, order );
	}
	catch( e )
	{
	}

	return "";
}

function aos_get_param( name )
{
	try
	{
		var MKD25 = document.getElementById("MKD25");
		return MKD25.GetParam( name );
	}
	catch( e )
	{
	}

	return "";
}

function aos_copy_to_form( form_object )
{
	var mkdLevel = _g_aos_opt_arr['mkd_protect_level'];
	var ownerDocument = form_object.ownerDocument;

	try
	{
		ownerDocument.getElementById("MKD25").SkipVerify( 1 );

		var collObjects = form_object.getElementsByTagName( "input" );

		var i;
		for( i=0; i<collObjects.length; i++ )
		{
			if( collObjects[i].getAttribute("mkdexcept") != "true" )
			{
				if(mkdLevel == "default")
				{
					if( collObjects[i].type == "password")
					{
						var value = ownerDocument.getElementById("MKD25").GetText2( collObjects[i] );
						collObjects[i].value = value;
					}
				}
				else
				{
					if( collObjects[i].type == "password" || collObjects[i].type == "text" )
					{
						var value = ownerDocument.getElementById("MKD25").GetText2( collObjects[i] );
						collObjects[i].value = value;
					}
				}
			}
		}

		ownerDocument.getElementById("MKD25").SkipVerify( 0 );
	}
	catch( e )
	{
	}
}

function aos_copy_to_all()
{
	try
	{
		document.getElementById("MKD25").SkipVerify( 1 );

		var collObjects = document.getElementsByTagName( "input" );

		var i;
		for( i=0; i<collObjects.length; i++ )
		{
			if( collObjects[i].getAttribute("mkdexcept") != "true" )
			{
				if( collObjects[i].type == "password" || collObjects[i].type == "text" )
				{
					var value = document.getElementById("MKD25").GetText2( collObjects[i] );
					collObjects[i].value = value;
				}
			}
		}

		document.getElementById("MKD25").SkipVerify( 0 );
	}
	catch( e )
	{
	}
}

function aosak_insert_ie_object( clsid )
{
	return _mkd_insert_ie_object( clsid );
}

function _mkd_insert_ie_object( clsid )
{
	if( _mkd_ie_installed() == false )
	{
		var mkd_object_id    = 'MKD25';
		var mkd_object_name      = 'MKD25';

		var width = 0, height = 0;
		if(_get_ie_version() >= 11)
		{
			// sanmaul: Change the width and height of 1. (for above IE11)
			width = 1; height = 1;
			_g_aos_opt_arr['obj_style'] = 'hideout';
		}

		var otstyle = ""
		if(_g_aos_opt_arr['obj_style'] == 'hideout')
		{
			otstyle = "style=" + "'position:absolute;left=-1;top=-1'";
		}

		var strHtml =  "<object " + otstyle + " id='" + mkd_object_id
			+ "' name='" + mkd_object_name + "' classid='clsid:" + clsid
			+ "' height='"+height+"' width='"+width+"' tabindex='-1'></object>";

		document.body.insertAdjacentHTML(_g_aos_opt_arr['obj_position'], strHtml);
	}
}

function aosak_insert_ff_object( mimetype )
{
	return _mkd_insert_ff_object( mimetype );
}

function _mkd_insert_ff_object( mimetype )
{
	if( _mkd_ff_installed() == false )
	{
		var mkd_object_id    = 'MKD25';
		var mkd_object_name      = 'MKD25';
		var strHtml = "<OBJECT type='" + mimetype + "' id='"+ mkd_object_id + "' name='" + mkd_object_name + "' height=0 width=0 tabindex=-1></"+"OBJECT>";
		var container = document.getElementById("MKD25OBJCONTAINER");
		if(container)
		{
			container.innerHTML += strHtml;
		}
		else
		{
			document.body.innerHTML += strHtml;
		}
	}
}

function _mkd_ie_installed()
{
	try
	{
		if( MKD25.object )
		{
			return true;
		}
	}
	catch( e )
	{
	}
	return false;
}

function _mkd_ff_installed()
{
	var MKD25 = document.getElementById("MKD25");
	if(MKD25)	{	return true; }
	return false;
}

function aosak_loaded()
{
	return _mkd_loaded();
}

function _mkd_loaded()
{
	if( _aos_is_netscape() == true )
	{
		var MKD25 = document.getElementById("MKD25");
		if( MKD25 == null )
		{
			return false;
		}
		
		if( typeof MKD25.Start == "undefined" )
		{
			return false;
		}
		
		return true;
	}
	else
	{
		return _mkd_ie_installed();
	}
}

function _mkd_start()
{
	var MKD25 = document.getElementById("MKD25");
	var x;
	for( x in _g_aos_opt_arr )
	{
		if( x == "mkd_protect_level" )
		{
			MKD25.SetInitProtectLevel( _g_aos_opt_arr[x] );
		}
		else
		{
			if( x.substr(0, 4) == "mkd_" )
			{
				MKD25.SetParam( x.substr(4, x.length-4), _g_aos_opt_arr[x] );
			}
		}
	}

	var aosmgr = document.getElementById("AOSMGR");

	_aos_save_authfile('40');

	try
	{
		aosmgr.Log( 'Start MKD' );
	}
	catch(e)
	{
	}

	if ( _aos_is_netscape() == true )
	{
		MKD25.SetParam( "searchtimer", "off" );
		MKD25.Start();
		if( g_aosak_timerid != null )
		{
			window.clearInterval( g_aosak_timerid );
			g_aosak_timerid = null;
		}
		g_aosak_timerid = window.setInterval( aosak_search, 300 );
	}
	else
	{
		MKD25.Start();
	}

	try
	{
		aosmgr.Log( 'MKD Started' );
	}
	catch(e)
	{
	}
}

function aosak_start_onload()
{
	return _mkd_start_onload();
}

function _mkd_start_onload()
{
	if( _mkd_loaded() )
	{
		_mkd_start();
	}
	else
	{
		window.setTimeout( _mkd_start_onload, 100 );
	}
}

function aos_start_ex()
{
	if( _aos_loaded() )
	{
		if(0 == _aos_startcount())
		{
			_aos_start_ex();
			return;
		}
	}

	window.setTimeout( "aos_start_ex()", 100 );
}

function _aos_start_ex()
{
	// check start count
	if( 0 < _aos_startcount())
	{
		_aos_startcount_wait_mkd();
		return;
	}

	// check running, update
	var mkd_running = _aos_isrunning("40");
	var mkd_chkupdate = (mkd_running) ? 0 : _aos_checkupdate("40");

	if( mkd_running == "undefined" || mkd_chkupdate == "undefined")
	{
		aos_set_option( "uimode", true );
		aos_set_option( "asyncmode", false );
		_aos_start("40|e5");
		return;
	}

	var async = false;
	var pids = "";
	var mkd_start = false;

	if(mkd_running)
	{
		mkd_start = true;
		async = true;
		pids = "e5";
	}
	else if(mkd_chkupdate)
	{
		async = false;
		pids = "40|e5";
	}
	else
	{
		mkd_start = true;
		async = true;
		pids = "e5";
	}

	if(mkd_start)
	{

		if(0 == mkd_running)
			_aos_start_lnchr();

		_aos_save_authfile('03');
		_aos_startcount_wait_mkd();
	}

	if(pids != "")
	{
		aos_set_option( "uimode", !async );
		aos_set_option( "asyncmode", async );
		aos_start(pids);
	}
}

function aos_start_ex2(pidlist1, pidlist2)
{
	if( _aos_loaded() )
	{
		if(0 == _aos_startcount())
		{
			_aos_start_ex2(pidlist1, pidlist2);
			return;
		}
	}

	window.setTimeout( function() { aos_start_ex2(pidlist1,pidlist2); }, 100 );
}

function _aos_start_ex2(pidlist1, pidlist2)
{
	// set startinfo
	var showstartinfo = aos_get_option('showstartinfo');
	if(true == showstartinfo)
	{
		aos_set_option('startinfo', pidlist1 + "|" + pidlist2);
	}

	var pidlist1_start = true;
	var async = true;
	var pidlist1_running = _aos_isrunning(pidlist1);
	var pidlist1_chkupdate = (pidlist1_running) ? false : _aos_checkupdate_ex2(pidlist1);

	if( pidlist1_running == "undefined" || pidlist1_chkupdate == "undefined")
	{
		pidlist1_start = false;
		async = false;
		pidlist2 = pidlist1 + "|" + pidlist2;
	}
	else
	{
		if(true == pidlist1_running || false == pidlist1_chkupdate)
		{
			pidlist1_start = true;
			async = true;
		}
		else
		{
			pidlist1_start = false;
			async = false;
			pidlist2 = pidlist1 + "|" + pidlist2;
		}
	}

	if (pidlist1_start)
	{
		_aos_start_lnchr();

		if(_aos_isfindlist(pidlist1, "40"))
		{
			_aos_save_authfile('03');
			_aos_startcount_wait_mkd();
		}

		pidlist1_exec = _aos_remove_pid(pidlist1, "40");
		if (pidlist1_exec != "")
			_aos_execute_pd(pidlist1_exec);
	}

	if(pidlist2 != "")
	{
		aos_set_option( "uimode", !async );
		aos_set_option( "asyncmode", async );
		aos_start(pidlist2);
	}
}

function _aos_ie_is_new()
{
	var xObj;

	try
	{
		xObj = new ActiveXObject( "aosmgr.aosmgrCtrl.1" );

		if( xObj )
		{
			return true;
		}
	}
	catch( ex )
	{
	}

	return false
}

function _aos_ff_is_new()
{
	if( check_valid_mimetype(_g_aos_ff_mimetype) )
		return true;


	if( check_valid_mimetype(_g_aos_ff_mimetype2) )
		return true;

	return false;
}

function aos_is_new()
{
	if( _aos_is_netscape() == true )
	{
		return _aos_ff_is_new();
	}
	else
	{
		return _aos_ie_is_new();
	}
}

function aos_isinstalled(pd)
{
	var aosmgr = document.getElementById("AOSMGR");

	var ret = 0;
	try
	{
		if( typeof(aosmgr.IsInstalled) != "undefined" )
			ret = aosmgr.IsInstalled(pd);
	}
	catch(e)
	{
	}

	return ret;
}

function aos_verifycomponents()
{
	var aosmgr = document.getElementById("AOSMGR");

	var ret = false;
	try
	{
		if( typeof(aosmgr.VerifyComponents) != "undefined" )
			ret = aosmgr.VerifyComponents();
	}
	catch(e)
	{
	}

	return ret;
}

function aos_isrunning(pd)
{
	return _aos_isrunning(pd);
}

function aos_isprotecting(pd)
{
	var ret = 0;
	if( pd == "40" )
	{
		try
		{
			var protectmode = 0;
			var MKD25 = document.getElementById("MKD25");
			protectmode = MKD25.GetProtectMode();
			if( protectmode == 0 )
				return false;
			else
				return true;
		}
		catch( e )
		{
		}
	}
	else
	{
		ret = _aos_isrunning(pd);
	}

	return ret;
}

function _aos_isrunning(pd)
{
	var aosmgr = document.getElementById("AOSMGR");

	var ret = 0;
	try
	{
		if( typeof(aosmgr.IsRunning) != "undefined" )
			ret = aosmgr.IsRunning(pd);
	}
	catch(e)
	{
	}

	return ret;
}

function aos_checkupdate(pd)
{
	if(_aos_is_mac())
	{
		return _aos_checkupdate_mac(pd);
	}
	else if(_aos_is_linux())
	{
		return _aos_checkupdate_linux(pd);
	}
	else
	{
		return _aos_checkupdate(pd);
	}
}

function _aos_checkupdate(pd)
{
	var aosmgr = document.getElementById("AOSMGR");

	if( typeof(aosmgr.CheckToUpdateEx) == "undefined" )
		return "undefined";

	// set prop.
	aosmgr.setProperty( 'authserver', _g_aos_opt_arr['authserver'] );
	aosmgr.setProperty( 'authrooturl', _g_aos_opt_arr['authrooturl'] );
	aosmgr.setProperty( 'authinfo', _g_aos_opt_arr['authinfo'] );

	var ret = 0;
	try
	{
		ret = aosmgr.CheckToUpdateEx(pd);
	}
	catch(e)
	{
	}

	return ret;
}

function _aos_checkupdate_ex2(pidlist)
{
	var aosmgr = document.getElementById("AOSMGR");

	if( typeof(aosmgr.CheckToUpdateEx2) == "undefined" )
		return "undefined";

	// set prop.
	aosmgr.setProperty( 'authserver', _g_aos_opt_arr['authserver'] );
	aosmgr.setProperty( 'authrooturl', _g_aos_opt_arr['authrooturl'] );
	aosmgr.setProperty( 'authinfo', _g_aos_opt_arr['authinfo'] );

	var ret = 0;
	try
	{
		ret = aosmgr.CheckToUpdateEx2(pidlist);
	}
	catch(e)
	{
	}

	return ret;
}

function _aos_checkupdate_mac( pd ) //mac firewall
{
	var bNeedUpdate = false;
	var aosmgr = document.getElementById("AOSMGR");
	var szLocVer = aosmgr.getProperty("fwversion");
	if(szLocVer == undefined)
	{
		return true;
	}

	if( document.location.protocol == "https:" )
	{
		aosmgr.setProperty( 'aosinfourl', _g_aos_opt_arr['ssl_aosinfourl'] );
	}
	else
	{
		aosmgr.setProperty( 'aosinfourl', _g_aos_opt_arr['aosinfourl'] );
	}

	var szSvrVer = aosmgr.getProperty("fwinstallerver");
	if(szSvrVer == undefined)
	{
		return true;
	}

	var arrFwLocVer		= szLocVer.split(".");
	var arrFwSvrVer	= szSvrVer.split(".");

	for(i = 0; i < arrFwSvrVer.length; i++)
	{
		var nLocVer = Number(arrFwLocVer[i]);
		var nSvrVer = Number(arrFwSvrVer[i]);
		if(nLocVer != nSvrVer)
		{
			bNeedUpdate = true;
			break;
		}
	}
	return bNeedUpdate;
}

function _aos_checkupdate_linux( pd ) //linux firewall
{
	var bNeedUpdate = false;
	var aosmgr = document.getElementById("AOSMGR");
	var szLocVer = aosmgr.getProperty("fwversion");
	if(szLocVer == undefined)
	{
		return false;
	}

	if( document.location.protocol == "https:" )
	{
		aosmgr.setProperty( 'aosinfourl', _g_aos_opt_arr['ssl_aosinfourl2'] );
	}
	else
	{
		aosmgr.setProperty( 'aosinfourl', _g_aos_opt_arr['aosinfourl2'] );
	}
	var szSvrVer = aosmgr.getProperty("fwinstallerver");
	if(szSvrVer == undefined)
	{
		return true;
	}

	// verify fw
	var szFwIntegrity = aosmgr.getProperty("fwintegrity");
	if( szFwIntegrity != "success")
	{
		return true;
	}


	var arrFwLocVer	= szLocVer.split(".");
	var arrFwSvrVer	= szSvrVer.split(".");

	for(i = 0; i < arrFwSvrVer.length; i++)
	{
		var nLocVer = Number(arrFwLocVer[i]);
		var nSvrVer = Number(arrFwSvrVer[i]);



		if(nLocVer != nSvrVer)
		{
			bNeedUpdate = true;
			break;
		}
	}
	return bNeedUpdate;
}

function _aos_startcount()
{
	var aosmgr = document.getElementById("AOSMGR");

	var ret = 0;
	try
	{
		if(typeof(aosmgr.StartCount) != "undefined")
			ret = aosmgr.StartCount;
	}
	catch(e)
	{
	}

	return ret;
}

function _aos_frameindex()
{
	var aosmgr = document.getElementById("AOSMGR");

	var ret = 0;
	try
	{
		if(typeof(aosmgr.FrameIndex) != "undefined")
			ret = aosmgr.FrameIndex;
	}
	catch(e)
	{
	}

	return ret;
}

function _aos_startcount_wait_mkd()
{
	if(0 == _aos_startcount())
	{
		if( _aos_is_netscape() == true )
		{
			if( check_valid_mimetype(_g_aos_mimetype_arr["40"]) )
			{
				_mkd_insert_ff_object( _g_aos_mimetype_arr["40"] );
			}
			else if( check_valid_mimetype(_g_aos_mimetype_arr2["40"]) )
			{
				_mkd_insert_ff_object( _g_aos_mimetype_arr2["40"] );
			}
		}
		else
		{
			_mkd_insert_ie_object( _g_aos_clsid_arr["40"] );
		}

		_mkd_start_onload();
	}
	else
	{
		window.setTimeout(_aos_startcount_wait_mkd, 100);
	}
}

function aos_start_lnchr()
{
	return _aos_start_lnchr();
}

function _aos_start_lnchr()
{
	var aosmgr = document.getElementById("AOSMGR");

	var ret = 0;
	try
	{
		if(typeof(aosmgr.StartLnchr) != 'undefined')
			ret = aosmgr.StartLnchr();
	}
	catch(e)
	{
	}

	return ret;
}

function _aos_is_netscape()
{
	if(navigator.appName == "Netscape")
	{
		// sanmaul: IE layout engine (for above IE11)
		if(navigator.userAgent.indexOf('Trident') >= 0)
			return false;

		return true;
	}
	else if(navigator.appName == "Opera")
	{
		return true;
	}

	return false;
}

function aos_common_js_ready()
{
	// support to dual site.
}

function _aos_get_browser_type()
{
	var ua = navigator.userAgent;
	var ret;

	if(ua.indexOf("MSIE") >= 0)	{
		ret = "iexplore";
	}else if(ua.indexOf("Trident") >= 0) {
		// ie11의 useragent스트링에서 IE라는 문자열이 제거됨
		ret = "iexplore";
	}else if(ua.indexOf("Firefox") >= 0) {
		ret = "firefox";
	}else if(ua.indexOf("Chrome") >= 0) {
		ret = "chrome";
	}else if(ua.indexOf("Safari") >= 0) {
		ret = "safari";
	}else if(ua.indexOf("Opera") >= 0)	{
		ret = "opera";
	}else {
		ret = "unknown";
	}

	return ret;
}

function aos_set_cookie(domain, value)
{
	var aosmgr = document.getElementById("AOSMGR");

	if( typeof(aosmgr.setProperty) == "undefined" )
		return;

	try
	{
		aosmgr.setProperty('cookie_domain', (domain) ? domain : document.domain);
		aosmgr.setProperty('cookie_value', (value) ? value : document.cookie);
	}
	catch(e)
	{
	}
}

function aosak_set_param( option_name, option_value )
{
	try
	{
		var MKD25 = document.getElementById("MKD25");
		if( option_name.substr(0, 7) == "mkdfsc_" )
		{
			MKD25.SetParam( option_name, option_value );
		}
		else if( option_name.substr(0, 4) == "mkd_" )
		{
			MKD25.SetParam( option_name.substr(4, option_name.length-4), option_value );
		}
	}
	catch(e)
	{
	}
}

function _aos_is_9x()
{
	var ua = navigator.userAgent;

	if(ua.indexOf("Win 9x 4.90") != -1)			// Windows Me (for IE)
		return true;
	else if(ua.indexOf("Windows ME") != -1)		// Windows Me (for opera)
		return true;
	else if(ua.indexOf("Windows 98") != -1)		// Windows 98
		return true;
	else
		return false;
}

function _aos_is_mac() //mac firewall
{
	var os = navigator.platform;
	var win = os.indexOf('Mac');

	if (win == -1)
	{
		return false;
	}
	else
	{
		return true;
	}
}

function _aos_is_win()
{
	var os = navigator.platform;
	var win = os.indexOf('Win');
	if (win == -1)
		return false;
	else
		return true;
}

function _aos_is_linux()
{
	var os = navigator.platform;
	var linux = os.indexOf('Linux');

	if (linux == -1)
		return false;
	else
		return true;
}

function aos_stop()
{
	try
	{
		if( g_aosak_timerid != null )
		{
			window.clearInterval( g_aosak_timerid );
			g_aosak_timerid = null;
		}

		var MKD25 = document.getElementById("MKD25");
		MKD25.Stop();
	}
	catch(e)
	{

	}

	try
	{
		var aosmgr = document.getElementById("AOSMGR");
		aosmgr.StopAos();
	}
	catch(e)
	{
	}
}

function aosak_search()
{
	try
	{
		if ( _aos_is_netscape() == true )
		{
			var MKD25 = document.getElementById("MKD25");
			MKD25.Search();
		}
	}
	catch(e)
	{
	}
}

function aos_set_userid(userid)
{
	window.setTimeout( "_aos_setuserid_onload('" + userid + "')", 100 );
}

function _aos_setuserid_onload( userid )
{
	if( _aos_loaded() )
	{
		var aosmgr = document.getElementById("AOSMGR");
		aosmgr.SetUserId(userid);
		return;
	}

	window.setTimeout( "_aos_setuserid_onload('" + userid + "')", 100 );
}

function _aos_execute_pd(pidlist)
{
	var aosmgr = document.getElementById("AOSMGR");

	if( typeof(aosmgr.ExecutePd) == "undefined" )
		return "undefined";

	// set prop.
	aosmgr.setProperty( 'authserver', _g_aos_opt_arr['authserver'] );
	aosmgr.setProperty( 'authrooturl', _g_aos_opt_arr['authrooturl'] );
	aosmgr.setProperty( 'authinfo', _g_aos_opt_arr['authinfo'] );

	var ret = 0;
	try
	{
		ret = aosmgr.ExecutePd(pidlist);
	}
	catch(e)
	{
	}

	return ret;
}

function _aos_remove_pid(pidlist, pid)
{
	var result = "";
	var nIndex = pidlist.indexOf(pid);

	if(nIndex == -1)
	{
		result = pidlist;
	}
	else
	{
		var i = 0;
		var pid_array = pidlist.split("|");
		for (i = 0; i < pid_array.length; i++)
		{
			if (pid_array[i] != pid)
			{
				if (result == "")
					result = pid_array[i];
				else
					result += "|" + pid_array[i];
			}
		}
	}

	return result;
}

function _aos_save_authfile(pid)
{
	var aosmgr = document.getElementById("AOSMGR");

	try
	{
		// set prop.
		var x;
		for( x in _g_aos_opt_arr )
		{
			if(typeof(_g_aos_opt_arr[x]) == "undefined")
			{
				alert("invalid option [" + x + "]");
				return;
			}

			aosmgr.setProperty( x, _g_aos_opt_arr[x] );
			aosmgr.setProperty("aos_event_handler", _aos_event_handler);
		}
		aosmgr.SaveAuthFile(pid);
	}
	catch(e)
	{
	}
}

// sanmaul: add function
function _get_ie_version()
{
	var agent = navigator.userAgent;

	if(agent.indexOf('MSIE') >= 0)
	{
		return parseInt(agent.split('MSIE')[1]);
	}
	// ie11부터 Trident라는 문자열이 포함됨
	else if(agent.indexOf('Trident') >= 0)	
	{
		// [BT:203151] ie11의 버전 필드가 달라짐
		if(agent.indexOf('rv:') >=0)
		{
			return parseInt(agent.split('rv:')[1]);
		}
		if(agent.indexOf('IE') >= 0)
		{
			return parseInt(agent.split('IE')[1]);
		}
	}

	// ie가 아닌 경우 다른 브라우저 체크 함수와 동일하게 -1을 리턴
	return -1;
}
