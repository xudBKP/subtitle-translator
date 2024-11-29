import { type NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/subtitle-translator' : '' // 开发环境不需要 basePath
}

export default config