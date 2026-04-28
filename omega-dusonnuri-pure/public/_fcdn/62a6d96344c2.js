/**
 * 상품 상세 분석용 높이 측정 SDK
 * window.IMWEB_SHOP_DETAIL_PAGE 전역에 높이 정보를 기록한다.
 */
window.IMWEB_SHOP_ANALYTICS_SDK = (function () {
    var $body = null;
    var $prod_detail_content_pc = null;
    var $prod_detail_content_mobile = null;
    var get_is_mobile_width = null;
    var analyticsEventName = 'imweb:shop:detail-analytics';

    var setProdDetailTargets = function (body, pcTarget, mobileTarget, isMobileGetter) {
        $body = body || null;
        $prod_detail_content_pc = pcTarget || null;
        $prod_detail_content_mobile = mobileTarget || null;
        get_is_mobile_width = typeof isMobileGetter === 'function' ? isMobileGetter : null;
    };

    var ensureDetailNamespace = function () {
        if (!window.IMWEB_SHOP_DETAIL_PAGE) return false;
        if (!window.IMWEB_SHOP_DETAIL_PAGE.detail) {
            window.IMWEB_SHOP_DETAIL_PAGE.detail = {};
        }
        return true;
    };

    var selectHeight = function (pcHeight, mobileHeight, isMobileWidth) {
        if (isMobileWidth && mobileHeight > 0) return mobileHeight;
        if (!isMobileWidth && pcHeight > 0) return pcHeight;
        if (mobileHeight > 0) return mobileHeight;
        if (pcHeight > 0) return pcHeight;
        return 0;
    };

    /**
     * 접힌 상태에서도 실제 펼쳐졌을 때의 높이를 계산한다.
     * @param {jQuery} $target
     * @returns {number}
     */
    var measureExpandedHeight = function ($target) {
        if (!$target || $target.length === 0) return 0;

        var el = $target.get(0);
        var height = Math.max(el.scrollHeight || 0, el.offsetHeight || 0);
        if (height > 0) return height;

        var $clone = $target.clone();
        $clone.removeAttr('id');
        $clone.css({
            position: 'absolute',
            visibility: 'hidden',
            height: 'auto',
            maxHeight: 'none',
            overflow: 'visible',
            left: '-99999px',
            top: 0
        });
        var width = $target.outerWidth() || $target.parent().outerWidth() || window.innerWidth;
        $clone.css('width', width + 'px');
        if ($body && typeof $body.append === 'function') {
            $body.append($clone);
        } else if (document && document.body) {
            document.body.appendChild($clone.get(0));
        }
        var cloneEl = $clone.get(0);
        var cloneHeight = Math.max(cloneEl.scrollHeight || 0, cloneEl.getBoundingClientRect().height || 0);
        $clone.remove();

        return Math.ceil(cloneHeight);
    };

    /**
     * 접힌 상태에서의 현재 높이를 계산한다.
     * @param {jQuery} $target
     * @returns {number}
     */
    var measureCollapsedHeight = function ($target) {
        if (!$target || $target.length === 0) return 0;

        var el = $target.get(0);
        var rectHeight = 0;
        if (el.getBoundingClientRect) {
            rectHeight = el.getBoundingClientRect().height || 0;
        }
        var height = Math.max(rectHeight, el.offsetHeight || 0);

        return Math.ceil(height || 0);
    };

    /**
     * 상품 상세 body의 펼쳐진 높이를 전역 네임스페이스에 저장한다.
     * @returns {void}
     */
    var updateProdDetailBodyExpandedHeight = function () {
        if (!ensureDetailNamespace()) return;

        var pcExpandedHeight = measureExpandedHeight($prod_detail_content_pc);
        var mobileExpandedHeight = measureExpandedHeight($prod_detail_content_mobile);
        var pcCollapsedHeight = measureCollapsedHeight($prod_detail_content_pc);
        var mobileCollapsedHeight = measureCollapsedHeight($prod_detail_content_mobile);
        var bodyHeightExpanded = 0;
        var bodyHeightCollapsed = 0;
        var is_mobile_width = false;

        if (get_is_mobile_width) {
            is_mobile_width = !!get_is_mobile_width();
        }

        bodyHeightExpanded = selectHeight(pcExpandedHeight, mobileExpandedHeight, is_mobile_width);
        bodyHeightCollapsed = selectHeight(pcCollapsedHeight, mobileCollapsedHeight, is_mobile_width);

        if (bodyHeightExpanded > 0) {
            window.IMWEB_SHOP_DETAIL_PAGE.detail.bodyHeight = bodyHeightExpanded;
            window.IMWEB_SHOP_DETAIL_PAGE.detail.bodyHeightExpanded = bodyHeightExpanded;
        }

        if (bodyHeightCollapsed > 0) {
            window.IMWEB_SHOP_DETAIL_PAGE.detail.bodyHeightCollapsed = bodyHeightCollapsed;
        }
    };

    /**
     * 레이아웃 안정 이후 높이를 재계산한다.
     * @returns {void}
     */
    var scheduleProdDetailBodyExpandedHeightUpdate = function () {
        requestAnimationFrame(function () {
            setTimeout(updateProdDetailBodyExpandedHeight, 0);
        });
    };

    var listenAnalyticsEvents = function () {
        if (!document || typeof document.addEventListener !== 'function') return;

        document.addEventListener(analyticsEventName, function (event) {
            try {
                if (!event || !event.detail) return;

                var detail = event.detail || {};
                var payload = detail.payload || {};

                switch (detail.type) {
                    case 'setTargets':
                        setProdDetailTargets(payload.body, payload.pcTarget, payload.mobileTarget, payload.isMobileGetter);
                        break;
                    case 'scheduleBodyHeightUpdate':
                        scheduleProdDetailBodyExpandedHeightUpdate();
                        break;
                    default:
                        break;
                }
            } catch (e) {
                return;
            }
        });
    };

    listenAnalyticsEvents();

    return {
        setProdDetailTargets: setProdDetailTargets,
        updateProdDetailBodyExpandedHeight: updateProdDetailBodyExpandedHeight,
        scheduleProdDetailBodyExpandedHeightUpdate: scheduleProdDetailBodyExpandedHeightUpdate
    };
})();
