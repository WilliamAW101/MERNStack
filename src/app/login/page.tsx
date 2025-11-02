import SignIn from "@/components/SignIn"
import Header from "@/components/Header"
import { Box } from "@mui/material"


export default function LoginPage() {

  return (
    <>
      <Header />
      <Box>
        <SignIn/>
      </Box>
    </>
  )
}
