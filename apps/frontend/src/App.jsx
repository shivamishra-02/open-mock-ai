import { Routes, Route, Navigate } from "react-router-dom";
import Home      from "./pages/Home.jsx";
import Setup     from "./pages/Setup.jsx";
import Interview from "./pages/Interview.jsx";
import Report    from "./pages/Report.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Home />} />
      <Route path="/setup"     element={<Setup />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/report"    element={<Report />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}