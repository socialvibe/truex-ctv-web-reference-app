import config from './config';
import { inputActions } from 'truex-shared/focus_manager/txm_input_actions';
import { Focusable } from 'truex-shared/focus_manager/txm_focusable';
import { TXMFocusManager } from 'truex-shared/focus_manager/txm_focus_manager';
import { TruexAdRenderer } from '@truex/ctv-ad-renderer';
import { DebugLog } from './support/debug-log';

(function () {
    const focusManager = new TXMFocusManager();
    const platform = focusManager.platform;

    let currentPage = 'home-page';

    const debugLog = new DebugLog();
    debugLog.captureConsoleLog();

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
            page.classList.remove('visible');
        });

        // Ensure debug log is empty
        debugLog.hide();
    }

    function showPage(pageId) {
        const page = document.querySelector(pageId);
        currentPage = pageId;
        renderCurrentPage();
        return page;
    }

    function renderCurrentPage() {
        hidePage();

        const pageSelector = '#' + currentPage;

        if (currentPage == "home-page") {
            focusManager.setContentFocusables([
                new Focusable('#play-content-button', () => showPage('playback-page'), null, focusManager)
            ]);

        } else if (currentPage == "playback-page") {
            renderPlaybackPage();

        } else if (currentPage == "debug-log") {
            debugLog.show();
            focusManager.setContentFocusables([
                new Focusable(pageSelector, null, debugLog.onInputAction, focusManager)
            ]);

        } else {
            // If the keyword isn't listed in the above - render the error page.
            enableStyle('#error', 'visible', true);
        }

        enableStyle(pageSelector, 'visible', true);
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
        // Ensure our app shows at a consistent size.
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const designW = 1920;
        const designH = 1080;
        const scaleFactor = Math.min(screenW / designW);
        const scaleTransform = `scale(${scaleFactor})`;
        const scaleOrigin = "0px 0px";

        const body = document.body;
        body.style.transformOrigin = scaleOrigin;
        body.style.webkitTransformOrigin = scaleOrigin;
        body.style.transform = scaleTransform;
        body.style.webkitTransform = scaleTransform;

        // Now put the app size in design coordinates, ensuring that the height still fills the
        // actual screen.
        body.style.width = "" + designW + "px";
        body.style.height = "" + (screenH / scaleFactor) + "px";

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

    function renderPlaybackPage() {

    }

    function onBackAction(event) {
        // Since the true[X] ad renderer also needs to field this event, we need to ignore when the user
        // backs out of the ad overlay.
        //
        // We do this by only recognizing a back action to this app's specific state.
        const isForThisApp = event && event.state && event.state.app == config.name;
        if (!isForThisApp) return; // let the back action proceed, most likely from ad overlay processing.

        pushBackActionBlock(); // ensure the next back action is blocked.
    }

    function pushBackActionBlock() {
        history.pushState({app: config.name}, null, null);
    }

    function initializeApplication() {
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
                showPage('home-page');
                return true; // handled
            }

            return baseOnInputAction(action);
        };

        scaleAppSize();

        // Handle resizes for when testing in chrome.
        window.addEventListener("resize", onAppResized);

        window.addEventListener("keydown", focusManager.onKeyDown);

        // We need to field the back action popstate change on FireTV, as we cannot reliably
        // consume back action key events.
        // see: https://developer.amazon.com/docs/fire-tv/web-app-faq.html
        pushBackActionBlock();
        window.addEventListener("popstate", onBackAction);

        showPage('home-page');
    }

    initializeApplication();
}());
