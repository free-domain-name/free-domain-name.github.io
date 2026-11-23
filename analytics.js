/* SPDX-License-Identifier: GPL-3.0-only */
/* Copyright (C) 2026 Free Domain Name contributors */

/*
 * Open page counting.
 *
 * The provider, the endpoint and the site are configuration, not code. The
 * script reads them from its own tag:
 *
 *   <script src="analytics.js" defer
 *           data-provider="goatcounter"
 *           data-endpoint="https://analytics.example.com/count"
 *           data-domain="example.com"></script>
 *
 *   data-provider  goatcounter | plausible | ga4 | none
 *
 *   data-endpoint  goatcounter  the count URL the event is POSTed to
 *                  plausible    the script URL
 *                              (default: https://plausible.io/js/script.js)
 *                  ga4          the measurement id, for example G-ABC123
 *
 *   data-domain    plausible    the site to count
 *                  goatcounter  unused, the instance knows its own site
 *                  ga4          unused
 *
 * With no provider, or with "none", this file does nothing at all: no request
 * is made and nothing is thrown. GoatCounter needs no cookies, keeps no
 * personal data and can be self-hosted.
 */

(() => {
  "use strict";

  const tag =
    document.currentScript || document.querySelector("script[data-provider]");
  if (!tag) return;

  const provider = (tag.getAttribute("data-provider") || "").trim().toLowerCase();
  if (!provider || provider === "none") return;

  const endpoint = (tag.getAttribute("data-endpoint") || "").trim();
  const domain = (tag.getAttribute("data-domain") || "").trim();

  try {
    if (provider === "goatcounter") startGoatCounter(endpoint);
    else if (provider === "plausible") startPlausible(endpoint, domain);
    else if (provider === "ga4") startGa4(endpoint);
  } catch {
    // Counting must never break the page.
  }
})();

function startGoatCounter(endpoint) {
  if (!endpoint) return;

  const params = new URLSearchParams();
  params.set("p", window.location.pathname + window.location.search);
  params.set("r", document.referrer || "");
  params.set("t", document.title || "");
  const url = endpoint + (endpoint.includes("?") ? "&" : "?") + params.toString();

  // A beacon survives the page going away and carries no cookies.
  if (navigator.sendBeacon) {
    try {
      if (navigator.sendBeacon(url)) return;
    } catch {
      // Fall through to fetch.
    }
  }

  try {
    window
      .fetch(url, {
        method: "POST",
        mode: "no-cors",
        credentials: "omit",
        keepalive: true,
      })
      .catch(() => {});
  } catch {
    // Nothing else to try.
  }
}

function startPlausible(endpoint, domain) {
  if (!domain) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = endpoint || "https://plausible.io/js/script.js";
  script.setAttribute("data-domain", domain);
  document.head.append(script);
}

function startGa4(measurementId) {
  if (!measurementId) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", measurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId,
  )}`;
  document.head.append(script);
}
