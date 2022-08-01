let message = "initial message"
const getMessage = () => message
const getNumbers = () => [ 7, 14, 21 ]
const status = () => 'async implementation loaded'

export default {
  getMessage: { value: getMessage, enumerable: true },
  getNumbers: { value: getNumbers, enumerable: true },
  message: { set: (v) => message = v, enumerable: true },
  status: { value: status, enumerable: true },
}
