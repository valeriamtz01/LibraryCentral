import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// importing pages
import Home from "./pages/Home"; // home page
import SignUp from "./pages/SignUp"; // sign up page
import Login from "./pages/Login"; // login page


// import components
import Header from "./components/Header.tsx"; // header component for landing page navbar
import Footer from "./components/Footer.tsx"; // footer component for footer content

// placeholder for future routes
const Dashboard = () => <div>Student Dashboard Page</div>;

function App() {
  return (
    <Router>
      <Header />
      <main className="flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} /> {/* Placeholder route for student dashboard */}
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
