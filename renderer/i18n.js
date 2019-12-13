import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import en from '../locales/en'
import ru from '../locales/ru'
import {loadPersistentStateValue} from './shared/utils/persist'

export const LANGS = ['en', 'ru']

const resources = {
  en,
  ru,
}

i18n.use(initReactI18next).init({
  debug: global.isDev,
  resources,
  lng: loadPersistentStateValue('settings', 'lng'),
  fallbackLng: 'en',

  keySeparator: false,

  interpolation: {
    escapeValue: false,
  },
})

export default i18n
