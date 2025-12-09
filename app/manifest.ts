import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MIDCAM Ontology App',
    short_name: 'MIDCAM',
    description: 'MIDCAM 중소기업 데이터 관리 및 분석 플랫폼',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.png',
        sizes: '1080x960',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '1080x960',
        type: 'image/png',
      },
    ],
  }
}

