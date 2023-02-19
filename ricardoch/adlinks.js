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

// Checks if the page is ready done loading the elements to modify before
// operating on them.
// Gives up after a minute.
// Inspired from
// https://github.com/Tampermonkey/tampermonkey/issues/1279#issuecomment-875386821
const runWhenReady = (elementFinder, callback) => {
  let numAttempts = 0;
  const tryNow = () => {
    const el = elementFinder();
    const elFound = el.length > 0;

    if (elFound) {
      callback();
    } else {
      numAttempts++;
      if (numAttempts >= 34) {
        console.warn(
          `Couldn't find any matching elements after ${numAttempts} attempts, giving up.`
        );
      } else {
        setTimeout(tryNow, 250 * Math.pow(1.1, numAttempts));
      }
    }
  };

  tryNow();
};

const findDates = () => {
  // Array.prototype.join only inserts between elements but doesn't prepend.
  const dateElClasses = `.${["jss89", "jss119", "jss99"].join(".")}`;

  return [...document.querySelectorAll(dateElClasses)];
};

const findReviews = () => {
  // reviews are within `p` elements, but not all `p` are reviews.
  return [...document.querySelectorAll("p")].filter((e) =>
    new RegExp("(N° d'article|Art.-Nr.|No.-art.) [0-9]+", "g").test(e.innerText)
  );
};

const addLinks = () => {
  findReviews().map((e) => {
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
};

// Ricardo does very "interesting" things to the page. One such interesting
// thing is to load review dates much later, which deletes and recreates
// the item number elements once the date has been loaded.
// Therefore, we must wait for the dates to load, and for the item number
// elements to be removed and recreated before modifying them.
runWhenReady(findDates, addLinks);
