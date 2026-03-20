import { Font } from '@react-pdf/renderer'

let registered = false

/**
 * Noto Sans CJK JP フォントを登録
 * public/fonts/ に配置した OTF ファイルを参照
 */
export function registerFonts() {
  if (registered) return
  registered = true

  Font.register({
    family: 'NotoSansJP',
    fonts: [
      {
        src: '/fonts/NotoSansJP-Regular.otf',
        fontWeight: 400,
      },
      {
        src: '/fonts/NotoSansJP-Bold.otf',
        fontWeight: 700,
      },
    ],
  })
}
