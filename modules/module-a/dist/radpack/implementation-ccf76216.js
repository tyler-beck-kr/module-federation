define("@kroger/kap-test-module-a/implementation-ccf76216.js", ['exports'], (function (exports) { 'use strict';

  let message = "initial message";
  const getMessage = () => message;
  const getNumbers = () => [ 7, 14, 21 ];
  const status = () => 'async implementation loaded';

  var implementation = {
    getMessage: { value: getMessage, enumerable: true },
    getNumbers: { value: getNumbers, enumerable: true },
    message: { set: (v) => message = v, enumerable: true },
    status: { value: status, enumerable: true },
  };

  exports["default"] = implementation;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
