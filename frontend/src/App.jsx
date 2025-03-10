import { Routes, Route } from "react-router-dom"; // ✅ Correct import
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import About from "./pages/About";
import RegistrationPage from "./pages/RegistrationPage";
import Login from "./pages/Login";

function App() {
  return (
    <>
      <Navbar />
      <Routes> {/* ✅ Correct usage */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/registration" element={<RegistrationPage />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;
