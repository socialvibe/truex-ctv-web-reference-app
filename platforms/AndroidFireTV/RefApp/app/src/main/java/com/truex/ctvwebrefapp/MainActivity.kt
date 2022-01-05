package com.truex.ctvwebrefapp

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.os.AsyncTask
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.provider.Settings.Secure
import android.util.AttributeSet
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager.LayoutParams
import com.google.android.gms.ads.identifier.AdvertisingIdClient
import android.graphics.Bitmap
import android.webkit.*


class MainActivity : Activity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initWebView()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun initWebView() {
        // remove title bar, make Activity fullscreen, and set the layout
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        window.setFlags(LayoutParams.FLAG_FULLSCREEN, LayoutParams.FLAG_FULLSCREEN)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.appWebView)
        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.javaScriptCanOpenWindowsAutomatically = false
        webSettings.mediaPlaybackRequiresUserGesture = false

        webSettings.setSupportZoom(true)
        webSettings.displayZoomControls = false
        webSettings.builtInZoomControls = false
        webSettings.setSupportMultipleWindows(false)

        webView.setInitialScale(100)

        webView.scrollBarStyle = View.SCROLLBARS_OUTSIDE_OVERLAY
        webView.isScrollbarFadingEnabled = false
        webView.addJavascriptInterface(this, "hostApp");

        // Enable chrome://inspect debugging in debug builds
        WebView.setWebContentsDebuggingEnabled(true)

        // Disable caching
        webSettings.setAppCacheEnabled(false)
        webSettings.cacheMode = WebSettings.LOAD_NO_CACHE

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                hideSplashScreen()
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                // Ensure the splash screen gets removed eventually, e.g. if the webview fails to load.
                Handler().postDelayed(Runnable {
                    hideSplashScreen()
                }, 3000)
            }
        }

        val appUrl = getString(R.string.app_url)
        webView.loadUrl(appUrl)

    }

    @JavascriptInterface
    fun hideSplashScreen() {
        runOnUiThread {
            var mainLayout: ViewGroup = findViewById(R.id.mainLayout)
            var splashScreen: View? = findViewById(R.id.appSplash)
            if (splashScreen != null && splashScreen.parent != null) {
                mainLayout.removeView(splashScreen)
            }
        }
    }

    @JavascriptInterface
    fun getAdvertisingId() {
        AsyncTask.execute {
            var adId: String?
            var limitAdTracking: Boolean
            try {
                val adInfo: AdvertisingIdClient.Info =
                        AdvertisingIdClient.getAdvertisingIdInfo(applicationContext)
                adId = adInfo.getId()
                limitAdTracking = adInfo.isLimitAdTrackingEnabled()
            } catch (e: Exception) {
                val cr = contentResolver
                adId = Secure.getString(cr, "advertising_id")
                limitAdTracking = Secure.getInt(cr, "limit_ad_tracking") != 0
            }

            if (limitAdTracking) {
                // Prevent ad id from being used
                adId = null
            }

            runOnUiThread {
                evalJS(
                        "if (webApp && webApp.onAdvertisingIdReady) webApp.onAdvertisingIdReady(\"" + adId + "\")"
                )
            }
        }
    }

    fun evalJS(js: String) {
        webView.evaluateJavascript(js, null)
    }

    override fun onBackPressed() {
        evalJS("history.back()")
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            evalJS("focusManager.inject('menu')")
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    fun isFireTV() : Boolean {
        return Build.MODEL.indexOf("AFT") >= 0
    }

    fun isAndroidTV() : Boolean {
        return !isFireTV()
    }

}