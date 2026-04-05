export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}
