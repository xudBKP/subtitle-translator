import { type NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/subtitle-translator', // 替换成你的仓库名
}

export default config