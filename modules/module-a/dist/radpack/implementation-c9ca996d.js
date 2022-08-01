define("@kroger/kap-test-module-a/implementation-c9ca996d.js", ['exports'], (function (exports) { 'use strict';

  let message = "initial message";
  const getMessage = () => message;
  const getNumbers = () => [ 7, 14, 21 ];
  const status = () => 'async implementation loaded';

  var implementation = {
    getMessage: { value: getMessage },
    getNumbers: { value: getNumbers },
    message: { set: (v) => message = v },
    status: { value: status },
  };

  exports["default"] = implementation;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
