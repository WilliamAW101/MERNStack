import SignUp from "@/components/auth/SignUp"
import Header from "@/components/layout/Header"
import { Box } from "@mui/material"


export default function SignupPage() {

  return (
    <>
      <Header />
      <Box>
        <SignUp />
      </Box>
    </>
  )
}