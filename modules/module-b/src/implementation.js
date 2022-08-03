let message = "initial message from b"
const getMessage = () => message
// V1 use of another hybrid module in the context of the implementation
const getNumbers = function() { return this.a.getNumbers().map((n) => n*2) }

export default {
  getMessage: { value: getMessage },
  getNumbers: { value: getNumbers },
  message: { set: (v) => message = v },
}
