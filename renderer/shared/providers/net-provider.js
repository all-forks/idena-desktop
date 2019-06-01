import React, {createContext, useState, useEffect, useContext} from 'react'
import PropTypes from 'prop-types'
import {fetchAddress, fetchBalance} from '../services/api'
import {fetchEpoch, fetchIdentity} from '../api/dna'
import {useInterval} from '../../screens/validation/shared/utils/useInterval'
import {NotificationContext} from './notification-provider'

const initialState = {
  addr: '',
  balance: {
    stake: '',
    balance: '',
  },
  address: '',
  nickname: '',
  stake: '',
  invites: 0,
  age: 0,
  state: '',
  pubkey: '',
  requiredFlips: 0,
  madeFlips: 0,
}

const NetContext = createContext()

export const NetProvider = ({children}) => {
  const {setAlert, clearAlert} = useContext(NotificationContext)

  const [info, setInfo] = useState(initialState)
  const [epoch, setEpoch] = useState()

  useEffect(() => {
    let ignore = false

    async function fetchInfo() {
      if (!ignore) {
        try {
          const addr = await fetchAddress()
          const balance = await fetchBalance(addr)
          const identity = await fetchIdentity(addr)

          const validated = identity && identity.state !== 'Undefined'

          setInfo({
            ...identity,
            validated,
            addr,
            balance,
          })

          const epochResult = await fetchEpoch()
          const {currentPeriod} = epochResult
          const validationRunning = currentPeriod.toLowerCase() !== 'none'

          setEpoch({
            ...epochResult,
            validationRunning,
          })
          clearAlert()
        } catch (error) {
          setAlert({
            title: 'Cannot connect to node',
            body: error.message,
          })
        }
      }
    }

    fetchInfo()

    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useInterval(() => {
    let ignore = false

    async function fetchData() {
      if (!ignore) {
        try {
          const epochResult = await fetchEpoch()
          const {currentPeriod} = epochResult
          const validationRunning = currentPeriod.toLowerCase() !== 'none'

          setEpoch({
            ...epochResult,
            validationRunning,
          })
          clearAlert()
        } catch (error) {
          setAlert({
            title: 'Cannot connect to node',
            body: error.message,
          })
        }
      }
    }

    fetchData()

    return () => {
      ignore = true
    }
  }, 1000)

  return (
    <NetContext.Provider value={{...info, ...epoch}}>
      {children}
    </NetContext.Provider>
  )
}

NetProvider.propTypes = {
  children: PropTypes.node,
}

export default NetContext
