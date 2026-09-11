export const EMPLOYEE_DEMO_CREDENTIALS = {
  email: 'employee@peoplepay360.demo',
  password: 'Demo@123',
} as const;

export function isEmployeeDemoLogin(email: string, password: string) {
  return email.trim().toLowerCase() === EMPLOYEE_DEMO_CREDENTIALS.email && password === EMPLOYEE_DEMO_CREDENTIALS.password;
}
