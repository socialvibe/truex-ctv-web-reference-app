import config              from './config';
import { inputActions }    from 'truex-shared/focus_manager/txm_input_actions';
import { Focusable }       from 'truex-shared/focus_manager/txm_focusable';
import { TXMFocusManager } from 'truex-shared/focus_manager/txm_focus_manager';
import { DebugLog }        from './components/debug-log';
import { LoadingSpinner }  from "./components/loading-spinner";
import { VideoController } from "./components/video-controller";


(function () {
    const focusManager = new TXMFocusManager();
    const platform = focusManager.platform;

    let currentPage = 'home-page';
    let lastPage;

    const debugLog = new DebugLog();
    debugLog.captureConsoleLog();

    const spinner = new LoadingSpinner();

    const videoController = new VideoController("#playback-page video", "#playback-page .video-control-bar", platform);
    videoController.closeVideoAction = returnToParentPage;

    const videoStreams = require('./data/video-streams.json');
    let currentVideoStream = videoStreams[0];

    function hidePage() {
        // Hide whatever page is currently shown.
        document.querySelectorAll('.app-content .page').forEach(page => {
            page.classList.remove('show');
        });

        // Ensure no videos are playing
        videoController.stopVideo();

        // Ensure no outstanding loading spinner.
        spinner.hide();

        // Ensure debug log is empty
        debugLog.hide();

        focusManager.setContentFocusables([]);
    }

    function showPage(pageId) {
        if (currentPage == 'playback-page' && pageId != currentPage) {
            var breakH = 1; // to catch unexpected keystrokes during ad displays
        }
        lastPage = currentPage;
        currentPage = pageId;
        renderCurrentPage();
    }

    function renderCurrentPage() {
        hidePage();

        const pageSelector = '#' + currentPage;
        enableStyle(pageSelector, 'show', true);

        if (currentPage == "home-page") {
            renderHomePage();

        } else if (currentPage == "playback-page") {
            renderPlaybackPage();

        } else if (currentPage == "debug-log") {
            debugLog.show();
            setFocus(pageSelector, null, debugLog.onInputAction);

        } else if (currentPage == "test-page") {
            spinner.show();
        }
    }

    let resizeTimer;

    function onAppResized() {
        // Just push out the timer some more until things settle.
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            scaleAppSize();
            renderCurrentPage();
        }, 100);
    }

    function scaleAppSize() {
        // Ensure our app uses a consistent 1920x1080 design size that fits within the actual screen size.
        const designW = 1920;
        const designH = 1080;

        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const widthScaleFactor = screenW / designW;
        const heightScaleFactor = screenH / designH;
        const scaleFactor = Math.min(widthScaleFactor, heightScaleFactor);
        const scaledH = designH * scaleFactor;
        const scaledW = designW * scaleFactor;

        // Center in the actual screen.
        const top = Math.max(screenH - scaledH, 0) / 2;
        const left = Math.max(screenW - scaledW, 0) / 2;

        function px(value) { return '' + value + 'px' }

        const appContent = document.querySelector('.app-content');

        appContent.style.position = 'absolute';
        appContent.style.width = px(designW);
        appContent.style.height = px(designH);
        appContent.style.top = px(top);
        appContent.style.left = px(left);

        const transform = 'scale(' + scaleFactor + ')';
        const origin = '0% 0% 0';

        appContent.style.transform = transform;
        appContent.style.transformOrigin = origin;

        appContent.style.webkitTransform = transform;
        appContent.style.webkitTransformOrigin = origin;

        console.log(`screen size: ${screenW} ${screenH} scale: ${scaleFactor}`)
    }

    function enableStyle(elementOrSelector, cssStyle, enabled) {
        let element = (typeof elementOrSelector == 'string')
            ? document.querySelector(elementOrSelector) : elementOrSelector;
        if (enabled) {
            element.classList.add(cssStyle);
        } else {
            element.classList.remove(cssStyle);
        }
    }

    function renderHomePage() {
        const homePage = document.querySelector('#home-page');

        const titleDiv = homePage.querySelector('.title');
        titleDiv.innerText = currentVideoStream.title;

        const descriptionDiv = homePage.querySelector('.description');
        descriptionDiv.innerText = currentVideoStream.description;

        const tray = homePage.querySelector('.tray');
        const selectedTile = tray.querySelector('.selected-tile');
        selectedTile.src = currentVideoStream.cover;

        setFocus('.play-content-button', () => {
            videoController.currVideoTime = 0; // restart the video
            showPage('playback-page')
        });
    }

    function renderPlaybackPage() {
        videoController.startVideo(currentVideoStream);

        setFocus(videoController.video, null, action => {
            if (action == inputActions.select || action == inputActions.playPause) {
                videoController.togglePlayPause();
                return true; // handled
            }

            if (action == inputActions.fastForward || action == inputActions.moveRight
                || action == inputActions.rightShoulder1 || action == inputActions.rightShoulder2) {
                videoController.stepForward();
                return true; // handled
            }

            if (action == inputActions.rewind || action == inputActions.moveLeft
                || action == inputActions.leftShoulder1 || action == inputActions.leftShoulder2) {
                videoController.stepBackward();
                return true; // handled
            }

            if (action == inputActions.num2 || action == inputActions.rightStick) {
                // QA helper to allow ads to be skipped.
                videoController.skipAd();
                return true; // handled
            }
        });
    }

    function newFocusable(elementRef, selectAction, inputAction) {
        return new Focusable(elementRef, selectAction, inputAction, focusManager);
    }

    function setFocus(elementRef, selectAction, inputAction) {
        focusManager.setContentFocusables([newFocusable(elementRef, selectAction, inputAction)]);
    }

    function onBackAction(event) {
        // Since the true[X] ad renderer also needs to field this event, we need to ignore when the user
        // backs out of the ad overlay.
        //
        // We do this by only recognizing a back action to this app's specific state.
        const isForThisApp = event && event.state && event.state.app == config.name;
        if (!isForThisApp) return; // let the back action proceed, most likely from ad overlay processing.

        pushBackActionBlock(); // ensure the next back action is blocked.

        returnToParentPage();
    }

    function pushBackActionBlock() {
        history.pushState({app: config.name}, null, null);
    }

    function returnToParentPage() {
        let returnToPage = 'home-page';
        if (currentPage == 'debug-log') {
            returnToPage = lastPage;
        }
        showPage(returnToPage);
    }

    function initializeApplication() {
        try {
            console.log(`running ${config.name} ${config.version} ${config.buildDate}
host: ${window.location.href}
platform: ${platform.name} model: ${platform.model} version: ${platform.version}
user agent: ${window.navigator.userAgent}`);

            const baseOnInputAction = focusManager.onInputAction;

            focusManager.onInputAction = (action) => {
                if (action == inputActions.num4 || action == inputActions.leftStick || action == inputActions.menu) {
                    // Show debug log with either "4" on the remote, or clicking the left stick on the game controller.
                    // Or the menu key, e.g. for FireTV
                    showPage('debug-log');
                    return true; // handled
                }

                if (action == inputActions.back) {
                    returnToParentPage();
                    return true; // handled
                }

                return baseOnInputAction(action);
            };

            scaleAppSize();
            renderCurrentPage();

            // Handle resizes for when testing in chrome.
            window.addEventListener("resize", onAppResized);

            window.addEventListener("keydown", focusManager.onKeyDown);

            // We need to field the back action popstate change on FireTV, as we cannot reliably
            // consume back action key events.
            // see: https://developer.amazon.com/docs/fire-tv/web-app-faq.html
            pushBackActionBlock(); // push a back action block
            pushBackActionBlock(); // push a 2nd that can be consumed, to land on the previous
            window.addEventListener("popstate", onBackAction);
        } catch (err) {
            console.error('initialization error: ' + platform.describeErrorWithStack(err));
            setTimeout(() => debugLog.show(), 0);
        }
    }

    initializeApplication();
}());
