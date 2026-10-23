import * as WebBrowser from 'expo-web-browser';

// Google sends its sign-in window back to the site root. That window must hand the result to the
// tab that opened it (which then closes it) before the router changes the URL, so this runs first.
WebBrowser.maybeCompleteAuthSession();

export {};
