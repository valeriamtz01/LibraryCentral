import { BrowserRouter as Router, Routes, Route, useLocation} from "react-router-dom";

// importing pages
import Home from "./pages/Home"; // home page
import SignUp from "./pages/SignUp"; // sign up page
import Login from "./pages/Login"; // login page


// import components
import Header from "./components/Header.tsx"; // header component for landing page navbar
import Footer from "./components/Footer.tsx"; // footer component for footer content

// placeholder for future routes
const Dashboard = () => <div>Student Dashboard Page</div>;

// created a wrapper component to access useLocation (this can't be usde inside App)
function AppWrapper() {
  const location = useLocation();
  const hideFooter = location.pathname === '/signup'; // hiding footer for signup because (since renders inside signup.tsx)

  return (
    <>
      <Header />
      <main className="flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} /> {/* Placeholder route for student dashboard */}
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  )
}
export default App;
