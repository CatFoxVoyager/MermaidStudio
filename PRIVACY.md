# MermaidStudio Privacy Policy

**Last updated:** 2026-11-02

MermaidStudio is an open-source Mermaid diagram editor. This policy covers both the web
application and the Android application.

## The short version

MermaidStudio is **local-first**: your diagrams are stored on your device and never sent
to us. We run no accounts. The public website uses Vercel's cookieless analytics and Google Analytics 4 in consent-denied (cookieless) mode (see Analytics below). The other third party that processes data is Google: cookieless web-analytics pings on the web, and the ads shown in the Android app — the ads ask via Google's consent form (GDPR); the web pings run with consent denied (cookieless).

## Data storage (web and Android)

- Diagrams, folders, versions, tags, and settings are stored **locally on your device**
  (browser IndexedDB, or the app's local storage on Android).
- Nothing about your diagrams or settings is uploaded to us. There is no account system and no sync service.
- Exports (PNG/JPEG/SVG) are generated on your device and shared or saved only where you
  choose (e.g. the Android share sheet or your photo library).

## AI features (web only)

AI assistance runs **in your browser** on your own device (WebGPU-based local inference).
Prompts and diagrams used by the AI features are processed locally and are not sent to us
or to any external service.

## Analytics (web)

The public website measures aggregate, anonymous usage with Vercel Analytics, Vercel Speed Insights, and Google Analytics 4 in consent-denied (cookieless) mode: page views, referrers, and coarse geography. These analytics are cookieless — no cookies, no advertising identifiers, no cross-site tracking — and we cannot identify individual visitors. Vercel's analytics also write nothing to your browser's localStorage; Google's consent-denied mode is verified cookie-free by Google's own documentation. Consent-denied Google pings may include your user agent, screen resolution, IP-derived coarse geography, and the referring page; Google processes these under [Google's Privacy & Terms](https://policies.google.com/privacy). The site also runs one small Vercel-hosted endpoint that receives browser Content-Security-Policy security reports — they carry no diagram content and cannot be linked to a visitor.

## Ads (Android only)

The Android app shows ads via **Google AdMob** (Google Mobile Ads SDK):

- Google and its partners may collect and process the **advertising identifier** (AD_ID)
  and related ad-interaction data to serve and measure ads, under
  [Google's Privacy & Terms](https://policies.google.com/privacy) and the
  [Google AdMob program policies](https://support.google.com/admob/answer/6128543).
- Before any ads are initialized, the app asks for your consent with **Google's UMP
  consent form** (GDPR). You can review or change your choices at any time via
  **Settings → Privacy options** in the app.
- You can also turn ads off entirely with the **Ads toggle in Settings**; the change
  takes effect immediately.

## What we never do

- We never sell your data.
- We never transmit your diagrams off your device.
- We have no access to your diagrams or settings. (Aggregate, anonymous site metrics are covered in Analytics above.)

## Changes to this policy

Material changes will be updated in this document with a new "last updated" date.

## Contact

Open an issue at
[github.com/CatFoxVoyager/MermaidStudio/issues](https://github.com/CatFoxVoyager/MermaidStudio/issues).
