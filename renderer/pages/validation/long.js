import React, {useEffect} from 'react'
import {useRouter} from 'next/router'
import {backgrounds, rem, padding, position} from 'polished'

import ValidationHeader from '../../screens/validation/components/validation-header'
import ValidationScene from '../../screens/validation/components/validation-scene'
import ValidationActions from '../../screens/validation/components/validation-actions'
import FlipThumbnails from '../../screens/validation/components/flip-thumbnails'
import Flex from '../../shared/components/flex'
import {
  Link,
  IconClose,
  Box,
  SubHeading,
  Text,
  Button,
} from '../../shared/components'
import theme from '../../shared/theme'
import Layout from '../../shared/components/layout'
import useValidation, {
  fetchFlips,
  SessionType,
  WORDS_FETCHED,
} from '../../shared/providers/validation-context'
import Modal from '../../shared/components/modal'
import useRpc from '../../shared/hooks/use-rpc'
import {useInterval} from '../../shared/hooks/use-interval'
import vocabulary from '../../screens/flips/utils/words'
import useEpoch from '../../shared/providers/epoch-context'

export default function LongValidation() {
  const [
    {shortAnswers, longAnswersSubmitted: answersSubmitted},
    dispatch,
  ] = useValidation()

  const [{isValidationRunning}] = useEpoch()

  const router = useRouter()

  useEffect(() => {
    if (!isValidationRunning || answersSubmitted) {
      router.push('/dashboard')
    }
  }, [answersSubmitted, isValidationRunning, router])

  useEffect(() => dispatch(fetchFlips(SessionType.Long)), [dispatch])

  const [showModal, setShowModal] = React.useState(false)

  useEffect(() => {
    if (!shortAnswers.length) {
      setShowModal(true)
      setTimeout(() => router.push('/dashboard'), 5000)
    }
  }, [router, shortAnswers.length])

  const words = useWords()

  useEffect(() => {
    if (words) {
      dispatch({
        type: WORDS_FETCHED,
        words,
      })
    }
  }, [dispatch, words])

  return (
    <Layout>
      <Flex
        direction="column"
        css={{
          ...backgrounds(theme.colors.white),
          height: '100vh',
          ...padding(
            rem(theme.spacings.medium24),
            rem(theme.spacings.large),
            rem(theme.spacings.medium16)
          ),
          ...position('relative'),
          overflow: 'hidden',
        }}
      >
        <ValidationHeader type={SessionType.Long}>
          <Link href="/dashboard">
            <IconClose />
          </Link>
        </ValidationHeader>
        <Flex
          direction="column"
          align="center"
          flex={1}
          css={position('relative')}
        >
          <ValidationScene type={SessionType.Long} />
        </Flex>
        <ValidationActions type={SessionType.Long} />
        <FlipThumbnails type={SessionType.Long} />
      </Flex>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Box m="0 0 18px">
          <SubHeading>Short session is over</SubHeading>
          <Text>
            Unfortunately, you are late: the short validation session is already
            over. You will be redirected to My Idena page.
          </Text>
        </Box>
        <Flex align="center" justify="flex-end">
          <Box px="4px">
            <Button onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </Button>
          </Box>
        </Flex>
      </Modal>
    </Layout>
  )
}

export function useWords() {
  const [{longFlips: flips}] = useValidation()
  const [{result, error}, fetchWords] = useRpc()

  const unfetchedWords = flips
    .filter(x => !x.hidden)
    // eslint-disable-next-line no-shadow
    .filter(({words}) => !words)

  const lastUsedFlip = React.useRef()
  const lastUsedFlipIdx = React.useRef(0)
  const takes = React.useRef(0)

  useInterval(
    () => {
      if (takes.current < 3) {
        fetchWords('flip_words', unfetchedWords[lastUsedFlipIdx.current].hash)
        lastUsedFlip.current = unfetchedWords[lastUsedFlipIdx.current]
        takes.current += 1
      } else {
        takes.current = 0
        lastUsedFlipIdx.current =
          (lastUsedFlipIdx.current + 1) % unfetchedWords.length
      }
    },
    unfetchedWords.length ? 1000 : null
  )

  const [words, setWords] = React.useState()

  useEffect(() => {
    if (result && !error) {
      setWords([
        lastUsedFlip.current.hash,
        result.words.map(i => vocabulary[i]),
      ])
      takes.current = 0
      lastUsedFlipIdx.current = 0
    }
  }, [error, result])

  return words
}
