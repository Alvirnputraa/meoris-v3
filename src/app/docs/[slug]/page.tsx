import DocsPage from '../page'

type Tab = 'terms' | 'privacy' | 'returns' | 'notif'

function slugToTab(slug: string): Tab {
  switch (slug) {
    case 'syarat&ketentuan':
    case 'syarat%26ketentuan':
      return 'terms'
    case 'kebijakan-privacy':
      return 'privacy'
    case 'pengembalian':
      return 'returns'
    case 'notifikasi':
      return 'notif'
    default:
      return 'terms'
  }
}

export default async function DocsSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const initialActive = slugToTab(slug)
  return <DocsPage initialActive={initialActive} />
}
