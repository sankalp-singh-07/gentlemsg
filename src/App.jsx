import '../src/styles/tailwind.css'
import '../src/styles/global.css'
import AutoAuth from './components/auth/auto-auth.component'

import Home from './components/home/home.component'
import Router from './components/router/router.component'

function App() {
  return (
    <>
      <AutoAuth />
      <Router />
    </>
  )
}

export default App
