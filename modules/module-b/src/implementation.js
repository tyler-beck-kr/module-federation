let message = "initial message"
const getMessage = () => message
const getNumbers = () => [ 7, 14, 21 ]

export default {
  getMessage: { value: getMessage },
  getNumbers: { value: getNumbers },
  message: { set: (v) => message = v },
}
