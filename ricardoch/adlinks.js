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

// Find all elements containing the reviews' dates.
const dateElements = () => {
  // Array.prototype.join only inserts between elements but doesn't prepend.
  const dateElClasses = `.${["jss89", "jss119", "jss99"].join(".")}`;

  return [...document.querySelectorAll(dateElClasses)];
};

// Find all elements containing the reviews' article number.
const articleNumberElements = () => {
  // reviews are within `p` elements, but not all `p` are reviews.
  return [...document.querySelectorAll("p")].filter((e) =>
    new RegExp("(N° d'article|Art.-Nr.|No.-art.) [0-9]+", "g").test(e.innerText)
  );
};

// CSS is hard, fix margins and padding so the articule numbers are clickable.
// NOTE: elements should be dates, not article numbers.
const ricardoCantCss = (elements) => {
  // Remove useless negative margins so that the item number isn't covered by
  // another element and is clickable.
  // CSS is hard I guess.
  elements.map((el) => {
    el.parentElement.style["padding-top"] = 0;
    el.parentElement.style["padding-left"] = 0;
    el.parentElement.parentElement.style["margin-top"] = 0;
    el.parentElement.parentElement.style["margin-left"] = 0;
  });
};

// Add links to the given articleNumElements
const addLinks = (articleNumElements) => {
  articleNumElements.map((el) => {
    // Match current page language to link to the item in the corresponding
    // language.
    const lang = location.toString().match(/(fr|de|it|en)/)[0];
    const artNum = el.innerText.match(/[0-9]+/g);
    const anchor = document.createElement("a");
    anchor.href = `/${lang}/a/${artNum}/`;
    anchor.innerText = artNum;
    el.innerText = el.innerText.replace(artNum, "");
    el.insertAdjacentElement("beforeEnd", anchor);
  });
};

// Use this element to detect page changes, when the user clicks the paginator.
const reviewsRootContainer = () => {
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

// Use this element to find the reviews *when the page is first loaded*, and
// the dates are added (which occurs after the reviews are displayed).
// Once the page is loaded and the user pages through the reviews table, we'll
// use another element to detect page changes.
const reviewsDateContainer = document.querySelector(
  "[data-testid=ratings] hr"
).parentElement;

// This runs when the page is first loaded and the date have arrived.
const dateLoadedHandler = (mutationList, observer) => {
  // Just to be sure this didn't trigger but the dates haven't been populated
  // for some reason.
  if (dateElements().length > 0) {
    console.debug("dates arrived, adding links");
    addLinks(articleNumberElements());
    ricardoCantCss(dateElements());
    console.debug("disconnect from dates");
    // This observer is only useful for the initial page load. After that, we
    // can detect when the user pages through the reviews.
    // Disconnect this observer to avoid duplicate triggers (the page change
    // observer will also trigger then.)
    observer.disconnect();
  }
};

// This runs when the user pages through the reviews using the paginator below
// the reviews.
const paginatorHandler = (mutationList, observer) => {
  // When changing pages, the reviews are all removed first. Then the next page
  // of reviews is added.
  // Only run when the next page of reviews is added since there is nothing to
  // do when they're removed anyway.
  const mutationAddedNewReviews = mutationList[0].addedNodes.length > 0;

  if (mutationAddedNewReviews) {
    addLinks(articleNumberElements());
    ricardoCantCss(dateElements());
  }
};

const datesLoadObserver = new MutationObserver(dateLoadedHandler);
const paginatorObserver = new MutationObserver(paginatorHandler);
datesLoadObserver.observe(reviewsDateContainer, {
  childList: true,
  subtree: true,
});
paginatorObserver.observe(reviewsRootContainer(), {
  childList: true,
});

// In case dates were populated right away, without triggering the observer.
if (dateElements().length > 0) {
  console.debug("dates loaded with page");
  // We don't need to wait for dates, they're already here.
  datesLoadObserver.disconnect();
  addLinks(articleNumberElements());
  ricardoCantCss(dateElements());
}
