package com.truex.ctvwebrefapp

import android.annotation.SuppressLint
import android.app.Activity
import android.os.AsyncTask
import android.os.Bundle
import android.os.PersistableBundle
import android.provider.Settings.Secure
import android.view.KeyEvent
import android.view.View
import android.view.Window
import android.view.WindowManager.LayoutParams
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import com.google.android.gms.ads.identifier.AdvertisingIdClient


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
        webView.addJavascriptInterface(this, "fireTvApp");

        // Enable chrome://inspect debugging in debug builds
        WebView.setWebContentsDebuggingEnabled(true)

        // Disable caching
        webSettings.setAppCacheEnabled(false)
        webSettings.cacheMode = WebSettings.LOAD_NO_CACHE

        val appUrl = getString(R.string.app_url);
        webView.loadUrl(appUrl)
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

}