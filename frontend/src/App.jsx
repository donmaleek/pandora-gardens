import { Routes, Route } from "react-router-dom"; // ✅ Correct import
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import About from "./pages/About";
import RegistrationPage from "./pages/RegistrationPage";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage"; // ✅ Import LandingPage
import Profile from './pages/Profile';
import PrivateRoute from './routes/PrivateRoute';

function App() {
  return (
    <>
      <Navbar />
      <Routes> {/* ✅ Correct usage */}
        <Route path="/" element={<LandingPage />} /> {/* ✅ Set LandingPage as the home page */}
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/registration" element={<RegistrationPage />} />
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/email-verified" element={<EmailVerified />} />
      </Routes>
    </>
  );
}

export default App;
