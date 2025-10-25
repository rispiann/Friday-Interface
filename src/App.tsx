// src/App.tsx

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute"; // <-- 1. Impor komponen penjaga

// ... (kode lainnya)

const App = () => (
  // ... (provider lainnya)
  <BrowserRouter>
    <Routes>
      {/* Rute Login dan publik lainnya */}
      <Route path="/login" element={<LoginPage />} />

      {/* --- RUTE YANG DILINDUNGI --- */}
      <Route element={<ProtectedRoute />}>
        {/* Semua rute di dalam sini hanya bisa diakses setelah login */}
        <Route path="/" element={<Index />} />
        {/* Anda bisa menambahkan rute lain yang butuh login di sini, contoh: */}
        {/* <Route path="/profile" element={<ProfilePage />} /> */}
      </Route>

      {/* Rute catch-all untuk halaman tidak ditemukan */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
  // ... (provider lainnya)
);

export default App;