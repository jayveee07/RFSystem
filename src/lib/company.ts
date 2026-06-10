import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { auth } from './firebase'

export async function getCurrentCompanyId(): Promise<string> {
  const user = auth.currentUser
  if (!user) return ''
  const d = await getDoc(doc(db, 'users', user.uid))
  if (!d.exists()) return ''
  return (d.data().company_id as string) || ''
}
