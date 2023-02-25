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
const findDates = () => {
  // Array.prototype.join only inserts between elements but doesn't prepend.
  const dateElClasses = `.${["jss89", "jss119", "jss99"].join(".")}`;

  return [...document.querySelectorAll(dateElClasses)];
};

// Find all elements containing the reviews' article number.
const findArticleNumbers = () => {
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
  if (findDates().length > 0) {
    console.debug("dates arrived, adding links");
    addLinks(findArticleNumbers());
    ricardoCantCss(findDates());
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
  console.debug("page refreshed, adding links");
  addLinks(findArticleNumbers());
  ricardoCantCss(findDates());
};

const datesLoadObserver = new MutationObserver(dateLoadedHandler);
const paginatorObserver = new MutationObserver(paginatorHandler);
datesLoadObserver.observe(reviewsDateContainer, {
  childList: true,
  subtree: true,
});
paginatorObserver.observe(paginatorHandler, { childList: true, subtree: true });

// In case dates were populated right away, without triggering the observer.
if (findDates().length > 0) {
  console.debug("dates loaded with page");
  // We don't need to wait for dates, they're already here.
  datesLoadObserver.disconnect();
  addLinks(findArticleNumbers());
  ricardoCantCss(findDates());
}

// // Handles when the reviews are refreshed (either once the dates are added on
// // first page load, or when the list is updated when paging through reviews).
// const reviewsRefreshedHandler = (mutationList, observer) => {
//   mutationList.forEach((mutation) => {
//     console.debug("added links via observer");
//     addLinks();
//     observer.disconnect();
//   });
// };
// // Watch for the dates being added to the reviews on the initial page load and
// // run the handler to modify them.
// const reviewsDetailObserver = new MutationObserver(reviewsRefreshedHandler);
// reviewsDetailObserver.observe(reviewsDetailContainer, {
//   childList: true,
//   subtree: true,
// });

// const reviewsPagechangeObserver = new MutationObserver(reviewsRefreshedHandler);
// // // Observe the reviews container to add links when the next page is loaded
// // // (when using the arrows from the paginator, at the bottom of the reviews
// // // page)
// reviewsPagechangeObserver.observe(reviewsTableContainer(), { childList: true });

// // const reviewsMutationHandler = (mutationList, observer) => {
// //   mutationList.forEach((mutation) => {
// //     const reviewListMutated =
// //       mutation.type === "childList" &&
// //       (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0);
// //     if (reviewListMutated) {
// //       addLinks();
// //     }
// //   });
// // };
// // const reviewsMutationObserver = new MutationObserver(reviewsMutationHandler);
// // // Observe the reviews container to add links when the next page is loaded
// // // (when using the arrows from the paginator, at the bottom of the reviews
// // // page)
// // reviewsMutationObserver.observe(reviewsContainerNode(), { childList: true });

// // // Ricardo does things in a very "interesting" way. One such interesting thing
// // // is to load review dates much later, then delete and immediately recreate the
// // // item number elements once the date has been loaded. Therefore, we must wait
// // // for the dates to load and for the item number elements to be removed and
// // // recreated before modifying them.
// // // FIXME: Use an observer for this instead.
// // runWhenReady(findDates, addLinks);
