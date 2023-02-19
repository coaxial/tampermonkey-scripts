// ==UserScript==
// @name         Link ratings to ads
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Turn article numbers into links to the corresponding listing on the Ricardo.ch user's evaluations page.
// @author       Coaxial
// @match        https://www.ricardo.ch/*/shop/*/ratings*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ricardo.ch
// @grant        none
// @homepage     https://github.com/coaxial/tampermonkey-scripts
// ==/UserScript==

"use strict";

// Some content is loaded later, this checks if reviews have been loaded yet
// before running transformations on them.
// Gives up after a minute.
// Inspired from
// https://github.com/Tampermonkey/tampermonkey/issues/1279#issuecomment-875386821
function runWhenReady(elementFinder, callback) {
  const numAttempts = 0;
  const tryNow = function () {
    const reviews = elementFinder();
    const reviewsFound = reviews.length > 0;

    if (reviewsFound) {
      callback(reviews);
    } else {
      numAttempts++;
      if (numAttempts >= 34) {
        console.warn("Giving up after 34 attempts. Could not find any reviews");
      } else {
        setTimeout(tryNow, 250 * Math.pow(1.1, numAttempts));
      }
    }
  };

  tryNow();
}

function findReviews() {
  // reviews are within `p` elements, but not all `p` are reviews.
  return [...document.querySelectorAll("p")].filter((e) =>
    new RegExp("(N° d'article|Art.-Nr.|No.-art.) [0-9]+", "g").test(e.innerText)
  );
}

function addLinks(reviews) {
  reviews.map((e) => {
    // Match current page language to link to the item in the corresponding
    // language.
    const lang = location.toString().match(/(fr|de|it|en)/)[0];
    const artNum = e.innerText.match(/[0-9]+/g);
    const anchor = document.createElement("a");
    anchor.href = `/${lang}/a/${artNum}/`;
    anchor.innerText = artNum;
    e.innerText = e.innerText.replace(artNum, "");
    e.insertAdjacentElement("beforeEnd", anchor);
  });
}

runWhenReady(findReviews, addLinks);
