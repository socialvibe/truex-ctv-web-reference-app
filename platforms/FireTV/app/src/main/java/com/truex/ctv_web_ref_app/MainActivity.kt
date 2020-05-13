package com.truex.ctv_web_ref_app

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.PersistableBundle
import android.view.Window
import android.view.WindowManager.LayoutParams
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
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

        if (BuildConfig.DEBUG) {
            // Enable chrome://inspect debugging in debug builds
            WebView.setWebContentsDebuggingEnabled(true)

            // Disable caching
            webSettings.setAppCacheEnabled(false)
            webSettings.cacheMode = WebSettings.LOAD_NO_CACHE
        }
    }
}
