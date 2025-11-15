import SignIn from "@/components/auth/SignIn"
import Header from "@/components/layout/Header"
import { Box } from "@mui/material"


export default function LoginPage() {

  return (
    <>
      <Header />
      <Box>
        <SignIn />
      </Box>
    </>
  )
}
