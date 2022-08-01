let message = "initial message"
const getMessage = () => message
const getNumbers = () => [ 7, 14, 21 ]
const status = () => 'async implementation loaded'

export default {
  getMessage: { value: getMessage },
  getNumbers: { value: getNumbers },
  message: { set: (v) => message = v },
  status: { value: status },
}
