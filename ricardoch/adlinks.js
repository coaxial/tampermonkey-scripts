// ==UserScript==
// @name         Link ratings to ads
// @namespace    http://tampermonkey.net/
// @version      0.3
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
  const tryNow = (attempt = 0) => {
    const el = elementFinder();
    const elFound = el.length > 0;

    if (elFound) {
      callback();
    } else {
      if (attempt == 33) {
        console.warn(
          `No matching elements after ${attempt} attempts, giving up.`
        );
      } else {
        setTimeout(() => tryNow(attempt + 1), 250 * Math.pow(1.1, attempt));
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

const ricardoCantCss = () => {
  // Remove useless negative margins so that the item number isn't covered by
  // another element and is clickable.
  // CSS is hard I guess.
  findDates().map((el) => {
    el.parentElement.style["padding-top"] = 0;
    el.parentElement.style["padding-left"] = 0;
    el.parentElement.parentElement.style["margin-top"] = 0;
    el.parentElement.parentElement.style["margin-left"] = 0;
  });
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
    // Make item numbers clickable.
    ricardoCantCss();
  });
};

// Find the paginator element, at the bottom of the reviews.
const findPaginator = () =>
  document.querySelector(".MuiPagination-root.MuiPagination-text");

// This needs to be a named function to avoid memory leaks; with an anonymous
// or arrow function, the event handler will be duplicated.
function paginatorClickHandler() {
  runWhenReady(findDates, addLinks);
}

const reviewsContainerNode = () => {
  const classes = [
    "MuiPaper-root",
    "MuiPaper-elevation",
    "MuiPaper-rounded",
    "MuiPaper-elevation1",
    "MuiCard-root",
    "MuiGrid-root",
    "MuiGrid-item",
  ];
  return document.querySelector(`.${classes.join(".")}`).parentElement
    .parentElement;
};

const callback = (mutationList, observer) => {
  mutationList.forEach((mutation) => {
    const reviewListMutated =
      mutation.type === "childList" &&
      (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0);
    if (reviewListMutated) {
      console.debug({ mutation });
      console.debug("reviews mutated");
      runWhenReady(findDates, addLinks);
    }
  });
};
const observer = new MutationObserver(callback);
// Whenever the user goes to the next page of reviews, run the script again.
// findPaginator().addEventListener("click", paginatorClickHandler);
observer.observe(reviewsContainerNode(), { childList: true });

// Ricardo does things in a very "interesting" way. One such interesting thing
// is to load review dates much later, then delete and immediately recreate the
// item number elements once the date has been loaded. Therefore, we must wait
// for the dates to load and for the item number elements to be removed and
// recreated before modifying them.
runWhenReady(findDates, addLinks);
