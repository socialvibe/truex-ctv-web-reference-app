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

class MainActivity : Activity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // remove title bar, make Activity fullscreen, and set the layout
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        window.setFlags(LayoutParams.FLAG_FULLSCREEN, LayoutParams.FLAG_FULLSCREEN)
        setContentView(R.layout.activity_main)
        initWebView()
    }

    override fun onCreate(savedInstanceState: Bundle?, persistentState: PersistableBundle?) {
        super.onCreate(savedInstanceState, persistentState)

        // remove title bar, make Activity fullscreen, and set the layout
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        window.setFlags(LayoutParams.FLAG_FULLSCREEN, LayoutParams.FLAG_FULLSCREEN)
        setContentView(R.layout.activity_main)
        initWebView()
    }

    override fun onResume() {
        super.onResume()

        val appUrl = getString(R.string.app_url);
        webView.loadUrl(appUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun initWebView() {
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
    }

    @JavascriptInterface
    fun getAdvertisingId() {
        getFireTVAdvertisingId()
    }

    private fun getFireTVAdvertisingId() {
        try {
            val cr = contentResolver
            val advertisingID = Secure.getString(cr, "advertising_id")
            runOnUiThread {
                evalJS(
                    "if (webApp && webApp.onAdvertisingIdReady) webApp.onAdvertisingIdReady(\"$advertisingID\")"
                )
            }
        } catch (ex: java.lang.Exception) {
            runOnUiThread {
                evalJS(
                    "if (webApp && webApp.onAdvertisingIdReady) webApp.onAdvertisingIdReady()"
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