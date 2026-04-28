// const btnPrev = document.querySelector('.tab-prev');
// const btnNext = document.querySelector('.tab-next');
// const tabBtns = document.querySelectorAll('.tab-controls button');
// const scrollEle = document.querySelector('.tab:not(.main-tab) ul');
let parentWidth = 0;
let increaseValue = 200;
function resizeTab(){
    let tabWidth = 0;
    let tabPos = [];
    const tab = document.querySelector('.tab.line');
    const tabItems = document.querySelectorAll('.tab.line li');
    const gap = (tabItems.length - 1) * 8
    parentWidth = window.outerWidth;
    tabItems.forEach(item=>{
        tabWidth += item.getBoundingClientRect().width;
        tabPos.push(tabWidth);
    });
    if(parentWidth < tabWidth){
        tab.classList.add('scroll');
    } else{
        tab.classList.remove('scroll');
        btnPrev.removeAttribute('style');
        btnNext.removeAttribute('style');
    }
}
// if(scrollEle != null){
//     scrollEle.addEventListener('scroll', ()=>{
//         let tabLeft = scrollEle.scrollLeft;
//         let scrollLeft = scrollEle.scrollWidth;
//         if(tabLeft > 10){
//             btnPrev.style.display = 'block';
//         } else{
//             btnPrev.style.display = 'none';
//         }
//         if(tabLeft >= scrollLeft - document.querySelector('.tab.line').clientWidth){
//             btnNext.style.display = 'none';
//         } else{
//             btnNext.style.display = 'block';
//         }
//     });

//     btnPrev.addEventListener('click', ()=>{
//         let nowScrollValue = scrollEle.scrollLeft;
//         tabScrollValue = nowScrollValue - increaseValue;
//         scrollEle.scrollTo(tabScrollValue, 0);
//     });
//     btnNext.addEventListener('click', ()=>{
//         let nowScrollValue = document.querySelector('.tab ul').scrollLeft;
//         tabScrollValue = nowScrollValue + increaseValue;
//         document.querySelector('.tab ul').scrollTo(tabScrollValue, 0);
//     });
//     resizeTab();
//     window.addEventListener('resize', ()=>{
//         if(window.outerWidth <= 1023){
//             resizeTab();
//         }
//     });
// }

//mobile nav custom
const gnbMainTriggers = document.querySelectorAll('.krds-main-menu-mobile .gnb-main-trigger');
const gnbSubLists = document.querySelectorAll('.krds-main-menu-mobile .gnb-sub-list');
gnbMainTriggers.forEach(trigger=>{
    trigger.addEventListener('click', (e)=>{
        gnbMainTriggers.forEach(trigger=>{
            trigger.classList.remove('active');
            trigger.setAttribute('aria-selected', false);
        })
        gnbSubLists.forEach(gnbSubList=>{
            gnbSubList.classList.remove('active');
        });
        e.target.classList.add('active');
        e.target.setAttribute('aria-selected', true);
        const target = e.target.getAttribute('href');
        document.querySelector(target).classList.add('active');
    });
});

let isOverlay = false;
let overlays = [];
let tblOverlays;
function tblScroll(){
    const tblWraps = document.querySelectorAll('.krds-table-wrap');
    tblWraps.forEach(()=>{
        const overlay = document.createElement('button');
        overlay.setAttribute("type", "button");
        overlay.classList.add('tbl-overlay');
        overlay.innerHTML = '<span>화면을 터치한 후에 \n 좌우로 스크롤하여 확인하세요</span>';
        overlays.push(overlay);
    });
    if(isOverlay == false && window.outerWidth < 768 && tblWraps != null){
        tblWraps.forEach((tblWrap, i)=>{
            //console.log(tblWrap)
            tblWrap.setAttribute('tabindex', '0');
            tblWrap.parentNode.prepend(overlays[i]);
        });
        tblOverlays = document.querySelectorAll('.tbl-overlay');
        isOverlay = true;

        tblOverlays.forEach(tblOverlay=>{
            tblOverlay.addEventListener('click', (e)=>{
                tblOverlay.style.display = 'none';
                tblOverlay.parentNode.querySelector('.krds-table-wrap').focus();
            });
        });
    }
    if(window.outerWidth >= 768){
        isOverlay = false
        if(document.querySelector('.tbl-overlay') != null){
            document.querySelector('.tbl-overlay').remove();
            document.querySelector('.krds-table-wrap').removeAttribute('tabindex');
        }
    }
}

//img zoom
const zoomObjs = document.querySelectorAll('.zoom');
if(zoomObjs != null){
    zoomObjs.forEach(zoomObj=>{
        const zoomBtn = document.createElement('button');
        zoomBtn.innerText = "확대보기"
        zoomBtn.classList.add('btn-zoom');
        zoomBtn.setAttribute('title', '새 창 열림');
        zoomObj.append(zoomBtn);
        zoomBtn.addEventListener('click', (e)=>{
            const imgUrl = zoomBtn.previousElementSibling.getAttribute('src');
            window.open(imgUrl, '_blank');
        });
    });
}

window.addEventListener('load', ()=>{
    tblScroll();
});
window.addEventListener('resize', ()=>{
    tblScroll();
});

if($('#krds-header').length){
    $('.wrap').addClass('has-header');
}

// const btnAccordions = document.querySelectorAll('.krds-accordion .btn-accordion');
// let isTransitionEnd = false;
// btnAccordions.forEach(btnAccordion=>{
//     btnAccordion.addEventListener('click', (e)=>{
//     	e.target.blur();
//         setTimeout(()=>{
//             e.target.focus();
//         }, 500);
//     });
// });