import React, {useReducer, useEffect, createContext, useContext} from 'react'
import {decode} from 'rlp'
import * as api from '../api/validation'
import useEpoch from './epoch-context'
import {useValidationTimer} from '../hooks/use-validation-timer'
import useLogger from '../hooks/use-logger'
import {usePersistence} from '../hooks/use-persistent-state'
import {fetchFlip} from '../api'
import {loadState} from '../utils/persist'
import {useThunk} from '../hooks/use-middleware'

export const AnswerType = {
  None: 0,
  Left: 1,
  Right: 2,
  Inappropriate: 3,
}

export const SessionType = {
  Short: 'short',
  Long: 'long',
}

const FETCH_FLIPS_STARTED = 'FETCH_FLIPS_STARTED'
const FETCH_FLIPS_SUCCEEDED = 'FETCH_FLIPS_SUCCEEDED'
const FETCH_FLIPS_FAILED = 'FETCH_FLIPS_FAILED'
export const ANSWER = 'ANSWER'
export const NEXT = 'NEXT'
export const PREV = 'PREV'
export const PICK = 'PICK'
export const SHOW_EXTRA_FLIPS = 'SHOW_EXTRA_FLIPS'
export const WORDS_FETCHED = 'WORDS_FETCHED'
export const IRRELEVANT_WORDS_TOGGLED = 'IRRELEVANT_WORDS_TOGGLED'
const SHORT_ANSWERS_SUBMITTED = 'SHORT_ANSWERS_SUBMITTED'
const LONG_ANSWERS_SUBMITTED = 'LONG_ANSWERS_SUBMITTED'
const SUBMIT_SHORT_ANSWERS_ATTEMPTED = 'SUBMIT_SHORT_ANSWERS_ATTEMPTED'
const SUBMIT_LONG_ANSWERS_ATTEMPTED = 'SUBMIT_LONG_ANSWERS_ATTEMPTED'

const initialState = {
  shortFlips: [],
  longFlips: [],
  loading: true,
  ready: false,
  currentIndex: 0,
  isFirst: true,
  isLast: false,
  total: 0,
  totalReady: 0,
  canSubmit: false,
  shortAnswers: [],
  longAnswers: [],
  shortAnswersSubmitted: false,
  longAnswersSubmitted: false,
  hasAllAnswers: false,
  retries: [],
}

function validationReducer(state, action) {
  switch (action.type) {
    case FETCH_FLIPS_STARTED:
      return {
        ...state,
        retries: state.retries.concat({time: Date.now()}),
      }
    case FETCH_FLIPS_SUCCEEDED: {
      const {data, sessionType} = action
      const {
        [`${sessionType}Flips`]: flips,
        [`${sessionType}Answers`]: answers,
      } = state
      const decodedFlips = decodeFlips(data, flips)
      if (sessionType === SessionType.Long) {
        decodedFlips.forEach(flip => {
          flip.hidden = !flip.ready
        })
      }
      const nextFlips = reorderFlips(decodedFlips)
      const theAnswers = answers.map(({answer}) => answer)
      return {
        ...state,
        [`${sessionType}Flips`]: nextFlips,
        loading: false,
        ready: nextFlips.every(({ready, failed}) => ready || failed),
        total: nextFlips.filter(x => !x.hidden).length,
        totalReady: nextFlips.filter(x => !x.hidden && x.ready).length,
        hasAllAnswers:
          theAnswers.length &&
          theAnswers.length === state.totalReady &&
          theAnswers.every(hasAnswer),
      }
    }
    case FETCH_FLIPS_FAILED: {
      return {
        ...state,
        loading: false,
        ready: false,
        error: action.error,
      }
    }
    case SHOW_EXTRA_FLIPS: {
      let flips = state.shortFlips.map(flip => ({
        ...flip,
        failed: !flip.ready,
      }))
      let availableExtraFlips = flips.filter(x => x.failed && !x.hidden).length
      let openedFlipsCount = 0
      flips = flips.map(flip => {
        if (!flip.hidden) {
          return flip
        }
        const shouldBecomeAvailable =
          flip.ready && flip.loaded && availableExtraFlips > 0
        availableExtraFlips -= 1
        openedFlipsCount += 1
        return {
          ...flip,
          hidden: !shouldBecomeAvailable,
        }
      })

      for (let i = flips.length - 1; i >= 0; i -= 1) {
        if (openedFlipsCount > 0 && flips[i].failed) {
          openedFlipsCount -= 1
          flips[i].hidden = true
        }
      }

      return {
        ...state,
        canSubmit: state.isLast || state.hasAllAnswers,
        shortFlips: reorderFlips(flips),
        ready: true,
        length: flips.filter(x => !x.hidden).length,
      }
    }
    case PREV: {
      const idx = Math.max(state.currentIndex - 1, 0)
      return {
        ...state,
        currentIndex: idx,
        isFirst: idx === 0,
        isLast: false,
      }
    }
    case NEXT: {
      const {currentIndex, hasAllAnswers, total} = state
      const idx = Math.min(currentIndex + 1, total)
      const isLast = idx === total - 1
      return {
        ...state,
        currentIndex: idx,
        isFirst: false,
        isLast,
        canSubmit: isLast || hasAllAnswers,
      }
    }
    case PICK: {
      const isLast = action.index === state.total - 1
      return {
        ...state,
        currentIndex: action.index,
        iFirst: action.index === 0,
        isLast,
        canSubmit: isLast || state.hasAllAnswers,
      }
    }
    case ANSWER: {
      const {sessionType, option} = action
      const {isLast, currentIndex} = state
      const answers = state[`${sessionType}Answers`].slice()
      answers[currentIndex] = {
        answer: option,
      }
      const theAnswers = answers.map(({answer}) => answer)
      const hasAllAnswers =
        theAnswers.length &&
        theAnswers.length === state.totalReady &&
        theAnswers.every(hasAnswer)
      return {
        ...state,
        [`${sessionType}Answers`]: answers,
        canSubmit: isLast || hasAllAnswers,
      }
    }
    case IRRELEVANT_WORDS_TOGGLED: {
      const {irrelevantWords, ...currentFlip} = state.flips[state.currentIndex]
      const flips = [
        ...state.flips.slice(0, state.currentIndex),
        {...currentFlip, irrelevantWords: !irrelevantWords},
        ...state.flips.slice(state.currentIndex + 1),
      ]
      return {
        ...state,
        flips,
      }
    }
    case WORDS_FETCHED: {
      const {
        words: [hash, fetchedWords],
      } = action
      const {longFlips: flips} = state
      const flip = flips.find(f => f.hash === hash)
      return {
        ...state,
        flips: [
          ...flips.slice(0, flips.indexOf(flip)),
          {...flip, words: flip.words || fetchedWords},
          ...flips.slice(flips.indexOf(flip) + 1),
        ],
      }
    }
    case SUBMIT_SHORT_ANSWERS_ATTEMPTED:
    case SUBMIT_LONG_ANSWERS_ATTEMPTED:
      return {...state, submitAttempted: true}
    case SHORT_ANSWERS_SUBMITTED:
      return {
        ...state,
        loading: true,
        ready: false,
        currentIndex: 0,
        isFirst: true,
        isLast: false,
        total: 0,
        totalReady: 0,
        canSubmit: false,
        hasAllAnswers: false,
        shortAnswersSubmitted: true,
      }
    case LONG_ANSWERS_SUBMITTED:
      return {
        ...state,
        ...initialState,
        longAnswersSubmitted: true,
      }
    default:
      throw new Error(`Unhandled action type: ${action.type}`)
  }
}

const ValidationStateContext = createContext()
const ValidationDispatchContext = createContext()

export function ValidationProvider(props) {
  const [state, dispatch] = usePersistence(
    useThunk(
      useLogger(
        useReducer(validationReducer, loadState('validation') || initialState)
      )
    ),
    'validation'
  )

  const {secondsLeftForShortSession} = useValidationTimer()

  const [epoch] = useEpoch()

  useEffect(() => {
    if (
      secondsLeftForShortSession === 0 &&
      !state.shortAnswersSubmitted &&
      state.shortAnswers.length
    ) {
      dispatch(submitShortAnswers())
    }
  }, [
    dispatch,
    secondsLeftForShortSession,
    state.shortAnswers.length,
    state.shortAnswersSubmitted,
  ])

  return (
    epoch && (
      <ValidationStateContext.Provider value={state}>
        <ValidationDispatchContext.Provider value={dispatch} {...props} />
      </ValidationStateContext.Provider>
    )
  )
}

export function useValidationState() {
  const context = useContext(ValidationStateContext)
  if (context === undefined) {
    throw new Error(
      'useValidationState must be used within a ValidationProvider'
    )
  }
  return context
}

export function useValidationDispatch() {
  const context = useContext(ValidationDispatchContext)
  if (context === undefined) {
    throw new Error(
      'useValidationDispatch must be used within a ValidationProvider'
    )
  }
  return context
}

export function fetchFlips(type) {
  return async (dispatch, retrieveState) => {
    dispatch({type: FETCH_FLIPS_STARTED})
    try {
      const hashes = await api.fetchFlipHashes(type)
      if (hashes) {
        const {[`${type}Flips`]: flips} = retrieveState()
        const data = await Promise.all(
          hashes.map(({hash, extra: hidden, ready}) => {
            const existingFlip = flips.find(f => f.hash === hash)
            if (existingFlip) {
              if (
                (existingFlip.ready && existingFlip.loaded) ||
                existingFlip.failed
              ) {
                return Promise.resolve({
                  hash: existingFlip.hash,
                  hidden: existingFlip.hidden,
                  ready: existingFlip.ready,
                })
              }
            } else if (!ready) {
              return Promise.resolve({hash, hidden, ready})
            }
            return fetchFlip(hash).then(resp => ({
              hash,
              hidden,
              ready,
              ...resp.result,
            }))
          })
        )
        dispatch({type: FETCH_FLIPS_SUCCEEDED, data, sessionType: type})
      } else {
        dispatch({
          type: FETCH_FLIPS_FAILED,
          error: new Error('Error while trying to retreive flips'),
        })
      }
    } catch (error) {
      dispatch({type: FETCH_FLIPS_FAILED, error})
    }
  }
}

export function submitShortAnswers() {
  return async (dispatch, retrieveState) => {
    dispatch({type: SUBMIT_SHORT_ANSWERS_ATTEMPTED})
    await api.submitShortAnswers(retrieveState().shortAnswers)
    dispatch({type: SHORT_ANSWERS_SUBMITTED})
  }
}

export function submitLongAnswers() {
  return async (dispatch, retrieveState) => {
    dispatch({type: SUBMIT_LONG_ANSWERS_ATTEMPTED})
    await api.submitLongAnswers(retrieveState().longAnswers)
    dispatch({type: LONG_ANSWERS_SUBMITTED})
  }
}

function reorderFlips(flips) {
  const ready = []
  const loading = []
  const failed = []
  const hidden = []
  for (let i = 0; i < flips.length; i += 1) {
    if (flips[i].hidden) {
      hidden.push(flips[i])
    } else if (flips[i].ready && flips[i].loaded) {
      ready.push(flips[i])
    } else if (flips[i].failed) {
      failed.push(flips[i])
    } else {
      loading.push(flips[i])
    }
  }
  return [...ready, ...loading, ...failed, ...hidden]
}

function decodeFlips(data, currentFlips) {
  const flips = currentFlips.length
    ? currentFlips
    : data.map(item => ({
        ...item,
        pics: null,
        urls: null,
        orders: null,
        answer: null,
        loaded: false,
      }))
  return flips.map(flip => {
    if ((flip.ready && flip.loaded) || flip.failed) {
      return flip
    }
    const item = data.find(x => x.hash === flip.hash)
    if (item.ready) {
      try {
        const decodedFlip = decode(fromHexString(item.hex.substring(2)))
        const pics = decodedFlip[0]
        const urls = pics.map(pic =>
          URL.createObjectURL(new Blob([pic], {type: 'image/jpeg'}))
        )
        const orders = decodedFlip[1].map(order => order.map(x => x[0] || 0))
        return {
          ...flip,
          ready: true,
          pics,
          urls,
          orders,
          loaded: true,
          hidden: flip.hidden || item.hidden,
        }
      } catch {
        return {
          hash: flip.hash,
          failed: true,
          hidden: flip.hidden || item.hidden,
          ready: false,
          pics: null,
          urls: null,
          orders: null,
          answer: null,
          loaded: false,
        }
      }
    } else {
      return {
        hash: item.hash,
        hidden: item.hidden,
        ready: item.ready,
      }
    }
  })
}

export function hasAnswer(answer) {
  return Number.isFinite(answer)
}

function fromHexString(hexString) {
  return new Uint8Array(
    hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  )
}

export default function useValidation() {
  return [useValidationState(), useValidationDispatch()]
}
