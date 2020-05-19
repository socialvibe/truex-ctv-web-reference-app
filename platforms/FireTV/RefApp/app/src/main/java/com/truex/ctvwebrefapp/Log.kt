package com.truex.ctvwebrefapp

import android.util.Log

object Log {
    private val TAG: String = BuildConfig.APPLICATION_ID

    fun debug(msg: String) {
        Log.d(TAG, msg)
    }

    fun info(msg: String) {
        Log.i(TAG, msg)
    }

    fun warn(msg: String) {
        Log.w(TAG, msg)
    }

    fun error(msg: String) {
        Log.e(TAG, msg)
    }
}
