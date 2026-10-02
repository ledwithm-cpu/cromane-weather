/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '24px',
  fontFamily: "Fraunces, Georgia, 'Times New Roman', serif",
  fontWeight: 'bold' as const,
  color: '#362d26',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#72645a',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#6c9064',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #6c9064',
  borderRadius: '999px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9a8c80', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #6c9064 !important; color: #faf7f2 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #6c9064 !important; color: #faf7f2 !important; }
  [data-ogsb] .dm-btn { background-color: #6c9064 !important; color: #faf7f2 !important; }
`
