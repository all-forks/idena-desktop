import React from 'react'
import {margin, rem} from 'polished'
import {Button} from '../../../shared/components'
import Flex from '../../../shared/components/flex'
import theme from '../../../shared/theme'
import useValidation, {
  SessionType,
  submitShortAnswers,
  submitLongAnswers,
} from '../../../shared/providers/validation-context'
import Timer from './timer'

// eslint-disable-next-line react/prop-types
export default function ValidationActions({type}) {
  const [{canSubmit}, dispatch] = useValidation()
  const isShort = type === SessionType.Short
  return (
    <Flex
      justify="space-between"
      css={{
        ...margin(rem(29), 0, theme.spacings.medium16),
      }}
    >
      <Flex justify="flex-start" css={{flex: 1}}>
        &nbsp;
      </Flex>
      <Flex justify="center" css={{width: '33%'}}>
        {isShort && <Timer type={type} />}
      </Flex>
      <Flex justify="flex-end" css={{flex: 1}} s>
        <Button
          onClick={() =>
            dispatch(isShort ? submitShortAnswers() : submitLongAnswers())
          }
          disabled={!canSubmit}
        >
          Submit answers
        </Button>
      </Flex>
    </Flex>
  )
}
