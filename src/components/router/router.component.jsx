import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import Home from "../home/home.component";
import Admin from "../admin/admin.component";
import NotFound from "../404/notfound.component";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../utils/firebase";
import { useEffect } from "react";
import Chat from "../chat/chat.component";

const Router = () => {
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    if (error)
      return (
        <>
          <h1>Error</h1>
        </>
      );
  }, [error]);

  if (loading)
    return (
      <>
        <h1>Loading</h1>
      </>
    );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/admin" /> : <Home />} />
        <Route path="/admin" element={user ? <Admin /> : <Navigate to="/" />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/chat" element={<Chat inMobile="show" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
