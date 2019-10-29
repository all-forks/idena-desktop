import React, {useEffect, useState} from 'react'
import {backgrounds, padding, rem, position} from 'polished'
import {useRouter} from 'next/router'

import ValidationHeader from '../../screens/validation/components/validation-header'
import ValidationScene from '../../screens/validation/components/validation-scene'
import ValidationActions from '../../screens/validation/components/validation-actions'
import FlipThumbnails from '../../screens/validation/components/flip-thumbnails'
import Flex from '../../shared/components/flex'
import {useInterval} from '../../shared/hooks/use-interval'
import theme from '../../shared/theme'
import useEpoch, {EpochPeriod} from '../../shared/providers/epoch-context'
import {Modal, Box, SubHeading, Text, Button} from '../../shared/components'
import useValidation, {
  SessionType,
  fetchFlips,
  SHOW_EXTRA_FLIPS,
} from '../../shared/providers/validation-context'
import {useTimeout} from '../../shared/hooks/use-timeout'

const EXTRA_FLIPS_DELAY = 35 * 1000

function ShortSession() {
  const [
    {ready, shortAnswers, shortAnswersSubmitted},
    dispatch,
  ] = useValidation()
  const [{currentPeriod, isValidationRunning}] = useEpoch()

  useInterval(
    () => dispatch(fetchFlips(SessionType.Short)),
    ready ? null : 1000 * 1,
    true
  )

  const router = useRouter()

  useEffect(() => {
    const shortAnswersMissing = !shortAnswers.length

    if (
      !isValidationRunning ||
      (currentPeriod &&
        currentPeriod === EpochPeriod.LongSession &&
        shortAnswersMissing)
    ) {
      router.push('/dashboard')
    }
  }, [currentPeriod, isValidationRunning, router, shortAnswers.length])

  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (shortAnswersSubmitted) {
      setShowModal(true)
    }
  }, [shortAnswersSubmitted])

  useTimeout(() => {
    if (!ready && !shortAnswersSubmitted) {
      dispatch({type: SHOW_EXTRA_FLIPS})
    }
  }, EXTRA_FLIPS_DELAY)

  return (
    <Flex
      direction="column"
      css={{
        ...backgrounds('rgba(0,0,0,1)'),
        height: '100vh',
        ...padding(
          rem(theme.spacings.medium24),
          rem(theme.spacings.large),
          rem(theme.spacings.medium16)
        ),
        overflow: 'hidden',
      }}
    >
      <ValidationHeader type={SessionType.Short} />
      <Flex
        direction="column"
        align="center"
        flex={1}
        css={position('relative')}
      >
        <ValidationScene type={SessionType.Short} />
      </Flex>
      <ValidationActions type={SessionType.Short} />
      <FlipThumbnails type={SessionType.Short} />
      <InviteQualificationModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSubmit={() => router.push('/validation/long')}
      />
    </Flex>
  )
}

// eslint-disable-next-line react/prop-types
function InviteQualificationModal({show, onSubmit}) {
  return (
    <Modal show={show} showCloseIcon={false}>
      <Box m="0 0 18px">
        <SubHeading>Flips qualification session</SubHeading>
        <Text>
          Your answers for the validation session have been submitted
          successfully!
        </Text>
        <Text>
          Please solve the series of 30 flips to check the flips quality. The
          flip is quialified if the majority gives the same answer (more than
          66% of participants).
        </Text>
      </Box>
      <Flex align="center" justify="flex-end">
        <Button onClick={onSubmit}>Okay, let’s start</Button>
      </Flex>
    </Modal>
  )
}

export default ShortSession
