import { Font } from '@react-pdf/renderer'

let registered = false

/**
 * Noto Sans JP フォントを登録
 * Google Fonts の static TTF を URL から読み込む
 */
export function registerFonts() {
  if (registered) return
  registered = true

  Font.register({
    family: 'NotoSansJP',
    fonts: [
      {
        src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Regular.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Bold.ttf',
        fontWeight: 700,
      },
    ],
  })
}
