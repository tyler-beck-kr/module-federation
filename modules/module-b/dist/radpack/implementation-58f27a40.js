define("@kroger/kap-test-module-b/implementation-58f27a40.js", ['exports'], (function (exports) { 'use strict';

  let message = "initial message";
  const getMessage = () => message;
  const getNumbers = () => [ 7, 14, 21 ];

  var implementation = {
    getMessage: { value: getMessage },
    getNumbers: { value: getNumbers },
    message: { set: (v) => message = v },
  };

  exports["default"] = implementation;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
