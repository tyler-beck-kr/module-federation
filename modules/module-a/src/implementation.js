let message = "initial message from module a"
const getMessage = () => message
const getNumbers = () => [ 1, 2, 3 ]
const status = () => 'async implementation loaded'

export default {
  getMessage: { value: getMessage },
  getNumbers: { value: getNumbers },
  message: { set: (v) => message = v },
  status: { value: status },
}
