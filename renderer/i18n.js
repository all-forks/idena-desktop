import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import en from '../locales/en'
import ru from '../locales/ru'
import {loadItem} from './shared/utils/persist'

export const LANGS = ['en', 'ru']

const resources = {
  en,
  ru,
}

i18n.use(initReactI18next).init({
  resources,
  lng: loadItem('settings', 'lng'),

  keySeparator: false,

  interpolation: {
    escapeValue: false,
  },
})

export default i18n
