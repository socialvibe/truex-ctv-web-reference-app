import config from './config';
import { inputActions }    from 'truex-shared/focus_manager/txm_input_actions';
import { Focusable }       from 'truex-shared/focus_manager/txm_focusable';
import { TXMFocusManager } from 'truex-shared/focus_manager/txm_focus_manager';
import { TruexAdRenderer } from '@truex/ctv-ad-renderer';
import { DebugLog } from './support/debug-log';
import { LoadingSpinner }      from "./components/LoadingSpinner";


(function () {
    const focusManager = new TXMFocusManager();
    const platform = focusManager.platform;

    let currentPage = 'home-page';
    let lastPage;

    const debugLog = new DebugLog();
    debugLog.captureConsoleLog();

    const spinner = new LoadingSpinner();

    const videoStreams = require('./data/video-streams.json');
    let currentVideo = videoStreams[0];
    let currentVideoTime = 0;
    let videoEventsInitialized = false;
    let isPlayingVideo = false;

    function removeAllChildrenFrom(parent) {
        if (parent) {
            const childNodes = parent.children;
            for (let i = childNodes.length - 1; i >= 0; i--) {
                parent.removeChild(childNodes[i]);
            }
        }
    }

    function hidePage() {
        // Hide whatever page is currently shown.
        document.querySelectorAll('.app-content .page').forEach(page => {
            page.classList.remove('show');
        });

        // Ensure no videos are playing
        stopVideo();

        // Ensure no outstanding loading spinner.
        spinner.hide();

        // Ensure debug log is empty
        debugLog.hide();

        focusManager.setContentFocusables([]);
    }

    function showPage(pageId) {
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
        titleDiv.innerText = currentVideo.title;

        const descriptionDiv = homePage.querySelector('.description');
        descriptionDiv.innerText = currentVideo.description;

        const tray = homePage.querySelector('.tray');
        const selectedTile = tray.querySelector('.selected-tile');
        selectedTile.src = currentVideo.cover;

        setFocus('.play-content-button', () => {
            currentVideoTime = 0; // restart the video
            showPage('playback-page')
        });
    }

    function renderPlaybackPage() {
        try {
            if (isPlayingVideo) return;
            isPlayingVideo = true;

            const video = getVideo();
            if (video.src != currentVideo.url) {
                video.src = currentVideo.url;
            }

            const initialVideoTime = currentVideoTime;
            if (!videoEventsInitialized) {
                videoEventsInitialized = true;
                if (platform.isPS4) {
                    // Using a timeupdate listener seems to hang playback on the PS4.
                    setInterval(onVideoTimeUpdate, 1000);
                } else {
                    video.addEventListener("timeupdate", onVideoTimeUpdate);
                }
            }

            console.log('starting playback at ' + initialVideoTime);
            video.currentTime = initialVideoTime;
            video.play();

            setFocus(video, null, action => {
                if (action == inputActions.select || action == inputActions.playPause) {
                    if (video.paused) video.play();
                    else video.pause();
                    return true;
                }

                if (action == inputActions.fastForward || action == inputActions.moveRight
                    || action == inputActions.rightShoulder1) {
                    video.currentTime += 10;
                    return true;
                }

                if (action == inputActions.rewind || action == inputActions.moveLeft
                    || action == inputActions.leftShoulder1) {
                    video.currentTime -= 10;
                    return true;
                }
            });
        } catch (err) {
            console.error('renderPlaybackPage: ' + err);
        }
    }

    function onVideoTimeUpdate() {
        const video = getVideo();
        if (!video || !isPlayingVideo) return;
        currentVideoTime = video.currentTime;
    }

    function getVideo() {
        return document.querySelector('#playback-page video');
    }

    function stopVideo() {
        if (!isPlayingVideo) return;
        isPlayingVideo = false;

        const video = getVideo();
        if (!video) return;

        currentVideoTime = video.currentTime;

        video.pause();

        // Note: We need to actually clear the video source to allow video reuse on the PS4.
        // Otherwise the video hangs when it is shown again.
        try {
            video.src = "";
        } catch (err) {
            console.warn('could not clear video src');
        }
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

            console.log('did initialization');
        } catch (err) {
            console.error('initialization error: ' + err);
            setTimeout(() => debugLog.show(), 0);
        }
    }

    initializeApplication();
}());
