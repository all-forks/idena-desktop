import {useRef} from 'react'

export function useThunk([state, dispatch]) {
  const stateRef = useRef()
  stateRef.current = state

  const getStateRef = useRef(() => stateRef.current)

  const newDispatchRef = useRef(action => {
    if (typeof action === 'function') {
      action(newDispatchRef.current, getStateRef.current)
    } else {
      dispatch(action)
    }
  })

  return [state, newDispatchRef.current]
}
