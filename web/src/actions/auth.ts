'use server'

import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Preencha todos os campos' }
  }

  // No mundo real: const match = await bcrypt.compare(password, user.password)
  const user = await prisma.user.findUnique({
    where: { username }
  })

  if (!user || user.password !== password) {
    return { error: 'Usuário ou senha inválidos' }
  }

  const cookieStore = await cookies()
  cookieStore.set('userId', user.id)
  cookieStore.set('userRole', user.role)

  // Redirecionar com base no papel (role)
  if (user.role === 'ADMIN') {
    redirect('/admin')
  } else {
    redirect('/operator')
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('userId')
  cookieStore.delete('userRole')
  redirect('/')
}
