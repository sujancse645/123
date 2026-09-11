import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'PeoplePay360 - Enterprise HR & Payroll',
  description: 'Enterprise HR and payroll platform with role-based self-service, payrun processing, attendance verification, and salary simulation.',
  openGraph: {
    title: 'PeoplePay360 - Enterprise HR & Payroll',
    description: 'Enterprise HR and payroll platform with role-based self-service, payrun processing, attendance verification, and salary simulation.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PeoplePay360 - Enterprise HR & Payroll',
    description: 'Enterprise HR and payroll platform with role-based self-service, payrun processing, attendance verification, and salary simulation.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
