import { z } from 'zod'

export const signUpSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail invalido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

export const signInSchema = z.object({
  email: z.string().email('E-mail invalido'),
  password: z.string().min(1, 'Senha e obrigatoria'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
