(function () {
    const DeployStrategy = function () {
        function DeployStrategy() {
            this.accesstype = '';
            this.features = [];
            this.syncTime = 0;
            this.isUpdating = false;
            /** 동기화 주기 (밀리초 단위) */
            this.syncPeriod = 60000;
			this.logStorage = [];
            this.logSenderInterval = null;
            this.logSendIntervalMs = 3000; // 로그 전송 간격 (3초)
        }

        // 초기화 완료 이벤트를 발행해 외부에서 구독할 수 있도록 한다.
        const initCompleted = function (context) {
            try {
                const detail = {
                    accesstype: context.accesstype,
                    features: context.features,
                    syncPeriod: context.syncPeriod,
                    syncTime: context.syncTime,
                    instance: context,
                };
                let evt;
                try {
                    evt = new CustomEvent('imweb:deploy_strategy_init', { detail: detail });
                } catch (e) {
                    evt = document.createEvent('CustomEvent');
                    evt.initCustomEvent('imweb:deploy_strategy_init', false, false, detail);
                }
                if (window && window.dispatchEvent) {
                    window.dispatchEvent(evt);
                    if (window.console && typeof window.console.log === 'function') {
                        window.console.log('IMWEB_DEPLOY_STRATEGY init event dispatched', detail);
                    }
                }
            } catch (e) {
                if (window && window.console && typeof window.console.error === 'function') {
                    window.console.error('IMWEB_DEPLOY_STRATEGY init event failed', e);
                }
            }
        }

        DeployStrategy.prototype.init = function (options) {
            this.accesstype = options.accesstype;
            this.features = options.features;
            this.syncPeriod = options.syncPeriod || 60000; // 동기화 주기 (밀리초 단위)
            this.syncTime = Date.now();
            
            // 로그 전송 루프 시작 (비동기로 실행되므로 다른 프로세스에 영향 없음)
            this.startLogSender();

            initCompleted(this);
        }

        DeployStrategy.prototype.isSiteEnabled = async function (featureKey) {
            // 1분( 60000 밀리초 ) 이 지나면 최신화
            if (this.syncTime === 0 || Date.now() - this.syncTime > this.syncPeriod) {
                await this.updateFeatures();
            }
            return this.features[featureKey] || false;
        }

        DeployStrategy.prototype.isFeatureEnabled = function (featureKey) {
            // 1분( 60000 밀리초 ) 이 지나면 최신화
            if (this.syncTime === 0 || Date.now() - this.syncTime > this.syncPeriod) {
                this.updateFeatures();
            }
            const isEnabled = this.features[featureKey] || false;
            const logData = {
                'featureKey': featureKey,
                'isEnabled': isEnabled,
                'timestamp': Math.floor(Date.now() / 1000),
            }

            this.logStorage.push(logData);
            return isEnabled;
        }

        DeployStrategy.prototype.getFeatures = async function () {
            try {
                let url;
                switch (this.accesstype) {
                    case 'IO':
                        url = '/_/api/io-legacy/ajax/get_deploy_features.cm';
                        break;
                    case 'BO':
                        url = '/admin/ajax/get_deploy_features.cm';
                        break;
                    case 'FO':
                    default:
                        url = '/ajax/get_deploy_features.cm';
                        break;
                }
                const response = await fetch(url);
                if (!response.ok) throw new Error(`서버 응답 오류 (상태 코드: ${response.status})`);
                const result = await response.json();
                if (result.msg !== "SUCCESS") throw new Error(result.msg);
                return result.features;
            } catch (error) {
                console.error('기능 목록을 가져오는 중 오류 발생:', error);
                // 에러가 발생했다면 기존의 feature 값을 그대로 사용한다.
                return this.features;
            }
        }

        DeployStrategy.prototype.updateFeatures = async function () {
            if (!this.isUpdating) {
                this.isUpdating = true;
                this.features = await this.getFeatures();
                this.syncTime = Date.now();
                this.isUpdating = false;
            }
        }

        /**
         * logStorage에 있는 로그를 서버로 전송하고 배열을 초기화
         */
        DeployStrategy.prototype.sendLogs = async function () {
            try {
                // logStorage에 데이터가 있는지 확인
                if (!this.logStorage || this.logStorage.length === 0) {
                    return;
                }

                // 전송할 로그 데이터 복사 (전송 중 새로운 로그가 추가될 수 있으므로)
                const logsToSend = [...this.logStorage];
                
                // 배열 초기화
                this.logStorage = [];

		        let url;
                switch (this.accesstype) {
                    case 'IO':
                        url = '/_/api/io-legacy/ajax/add_deploy_strategy_logs.cm';
                        break;
                    case 'BO':
                        url = '/admin/ajax/add_deploy_strategy_logs.cm';
                        break;
                    case 'FO':
                    default:
                        url = '/ajax/add_deploy_strategy_logs.cm';
                        break;
                }

                // 서버로 로그 전송
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        logs: logsToSend
                    })
                });

                // 응답 확인 (실패해도 에러를 던지지 않음)
                if (!response.ok) {
                    console.warn('로그 전송 실패:', response.status);
                }
            } catch (error) {
                // 에러가 발생해도 다른 프로세스에 영향을 주지 않도록 조용히 처리
                console.warn('로그 전송 중 오류 발생:', error);
            }
        }

        /**
         * 10초마다 로그를 전송하는 비동기 루프 함수
         */
        DeployStrategy.prototype.startLogSender = function () {
            // 이미 실행 중이면 중복 실행 방지
            if (this.logSenderInterval) {
                return;
            }

            // 3초마다 로그 전송
            this.logSenderInterval = window.setInterval(() => {
                this.sendLogs();
            }, this.logSendIntervalMs);
        }

        return DeployStrategy;
    }();

    window.DeployStrategy = new DeployStrategy();
})();
