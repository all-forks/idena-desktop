/* eslint-disable camelcase */
import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import {loadPersistentStateValue} from './shared/utils/persist'

import en_common from '../locales/en/common.json'
import en_profile from '../locales/en/profile.json'
import en_wallets from '../locales/en/wallets.json'
import en_flips from '../locales/en/flips.json'
import en_contacts from '../locales/en/contacts.json'
import en_settings from '../locales/en/settings.json'
import en_error from '../locales/en/error.json'
import ru_common from '../locales/ru/common.json'
import ru_profile from '../locales/ru/profile.json'
import ru_wallets from '../locales/ru/wallets.json'
import ru_flips from '../locales/ru/flips.json'
import ru_contacts from '../locales/ru/contacts.json'
import ru_settings from '../locales/ru/settings.json'
import ru_error from '../locales/ru/error.json'

export const LANGS = ['en', 'ru']

const resources = {
  en: {
    common: en_common,
    profile: en_profile,
    wallets: en_wallets,
    flips: en_flips,
    contacts: en_contacts,
    settings: en_settings,
    error: en_error,
  },
  ru: {
    common: ru_common,
    profile: ru_profile,
    wallets: ru_wallets,
    flips: ru_flips,
    contacts: ru_contacts,
    settings: ru_settings,
    error: ru_error,
  },
}

i18n.use(initReactI18next).init({
  debug: global.isDev,
  resources,
  lng: loadPersistentStateValue('settings', 'lng'),
  defaultNS: 'common',
  fallbackLng: 'en',

  keySeparator: false,

  interpolation: {
    escapeValue: false,
  },
})

export default i18n
