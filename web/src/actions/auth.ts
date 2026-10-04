'use server'

import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  try {
    const username = (formData.get('username') as string || '').trim()
    const password = (formData.get('password') as string || '').trim()

    if (!username || !password) {
      return { error: 'Preencha todos os campos.' }
    }

    let user: { id: string; name: string; username: string; password?: string; role: string } | null = null

    // 1. Tentar localizar usuário no banco de dados SQLite / Prisma
    try {
      user = await prisma.user.findUnique({
        where: { username }
      })
    } catch (dbErr) {
      console.warn('Falha na consulta ao banco via Prisma:', dbErr)
    }

    // 2. Fallback de contingência para os perfis padrões de demonstração
    if (!user) {
      if (username === 'admin' && password === '123') {
        user = {
          id: 'admin-seed-id',
          name: 'Supervisor Administrador',
          username: 'admin',
          password: '123',
          role: 'ADMIN'
        }
      } else if (username === 'operador1' && password === '123') {
        user = {
          id: 'operator-seed-id',
          name: 'João Operador',
          username: 'operador1',
          password: '123',
          role: 'OPERATOR'
        }
      }
    }

    if (!user || user.password !== password) {
      return { error: 'Usuário ou senha inválidos.' }
    }

    // 3. Salvar sessão em cookies com path raiz explícito
    const cookieStore = await cookies()
    cookieStore.set('userId', user.id, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    })
    cookieStore.set('userRole', user.role, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    })

    const redirectUrl = user.role === 'ADMIN' ? '/admin' : '/operator'
    return { success: true, redirectUrl }
  } catch (err: any) {
    console.error('Erro crítico no login:', err)
    return { error: 'Erro no servidor: ' + (err?.message || 'Falha ao autenticar.') }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('userId')
  cookieStore.delete('userRole')
  redirect('/')
}
