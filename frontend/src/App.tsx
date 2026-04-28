import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";

// importing pages
import Home from "./pages/Home"; // home page
import SignUp from "./pages/SignUp"; // sign up page
import Login from "./pages/Login"; // login page
import Dashboard from "./pages/Dashboard"; // dashboard page for students to view their reservations and loans at a glance
import StudySpaces from "./pages/StudySpaces"; // study spaces page for students to view and book study rooms and computer stations
import Equipment from "./pages/Equipment"; // equipment page for students to view inventory and checkout equipment
import EquipmentDetail from "./pages/EquipmentDetail"; // equipment detail page for viewing specific equipment information
import FloatingAssistant from "./components/FloatingAssistant";

function AppShell() {
  const location = useLocation();
  const showFloatingAssistantOnPrefixes = ["/study-spaces", "/equipment"];
  const shouldShowFloatingAssistant = showFloatingAssistantOnPrefixes.some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`),
  );

  return (
    <>
      <main className="flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/study-spaces" element={<StudySpaces />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/equipment/:id" element={<EquipmentDetail />} />
        </Routes>
      </main>
      {shouldShowFloatingAssistant ? <FloatingAssistant /> : null}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
