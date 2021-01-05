using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at https://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409

namespace RefApp
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            this.InitializeComponent();
            this.StartServer();
        }

        private void StartServer()
        {
            // The URI string
            // var uriToLaunch = "http://192.168.2.65:8080/";
            var uriToLaunch = "https://ctv.truex.com/web/ref-app/master/index.html";

            // Create a Uri object from the URI string
            var uri = new Uri(uriToLaunch);

            MainWebView.Navigate(uri);
        }

        private void MainWebView_DOMContentLoaded(WebView sender, WebViewDOMContentLoadedEventArgs args)
        {
            // Ref App should be mapping xbox controller to keyboard.
            // _ = MainWebView.InvokeScriptAsync("eval", new string[] { "navigator.gamepadInputEmulation = 'keyboard';" });
        }
    }
}
