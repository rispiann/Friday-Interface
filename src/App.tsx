import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import ProfilePage from "./pages/ProfilePage"; // <-- 1. Impor halaman baru
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* --- RUTE YANG DILINDUNGI --- */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Index />} />
        <Route path="/profile" element={<ProfilePage />} /> {/* <-- 2. Tambahkan rute ini */}
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
