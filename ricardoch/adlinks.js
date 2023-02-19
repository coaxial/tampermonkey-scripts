// ==UserScript==
// @name         Link ratings to ads
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Turn article numbers into links to the corresponding listing on the Ricardo.ch user's evaluations page.
// @author       Coaxial
// @match        https://www.ricardo.ch/*/shop/*/ratings*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ricardo.ch
// @grant        none
// @homepage     https://github.com/coaxial/tampermonkey-scripts
// ==/UserScript==

(function () {
  "use strict";

  [...document.querySelectorAll("p")]
    .filter((e) =>
      new RegExp("(N° d'article|Art.-Nr.|No.-art.) [0-9]+", "g").test(
        e.innerText
      )
    )
    .map((e) => {
      const lang = location.toString().match(/(fr|de|it|en)/)[0];
      const artNum = e.innerText.match(/[0-9]+/g);
      const anchor = document.createElement("a");
      anchor.href = `/${lang}/a/${artNum}/`;
      anchor.innerText = artNum;
      e.innerText = e.innerText.replace(artNum, "");
      e.insertAdjacentElement("beforeEnd", anchor);
    });
})();
