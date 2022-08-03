import b from '@kroger/kap-test-module-b/implementation'

let message = "initial message"
const getMessage = () => message
const getNumbers = () => [ 7, 14, 21 ]
const myB = b

export default {
  myB: { value: myB },
  getMessage: { value: getMessage },
  getNumbers: { value: getNumbers },
  message: { set: (v) => message = v },
}
