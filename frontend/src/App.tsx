import { BrowserRouter as Router, Routes, Route} from "react-router-dom";

// importing pages
import Home from "./pages/Home"; // home page
import SignUp from "./pages/SignUp"; // sign up page
import Login from "./pages/Login"; // login page
import Dashboard from "./pages/Dashboard.tsx"; // dashboard page for students to view their activity and reservations

/* comenting out the header and footer imports here because we are now rendering them inside the pages instead of in App, this is because we want to conditionally render different headers and footers for different pages (i.e. no header or footer for home/login/signup, student header for dashboard, romms,equipment, etc.) */
/* //import components
import Header from "./components/Header.tsx"; // header component for landing page navbar
import Footer from "./components/Footer.tsx"; // footer component for footer content
*/

/* commenting this out for now as i made changes to the header and footer to render inside the pages instead of in App, this is because we want to conditionally render different headers and footers for different pages (i.e. no header or footer for home/login/signup, student header for dashboard, romms,equipment, etc. */
/*
const NavigationWrapper = () => {
  const location = useLocation();
  // Show StudentHeader for dashboard and related student pages (i.e. all pages aften login), otherwise show Header
  // if path is "private" (dashboard, rooms, equipment) show StudentHeader, if path is "public" (home, login, signup) show Header
  const isStudentPage = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/rooms') || location.pathname.startsWith('/equipment');
  return isStudentPage ? <StudentHeader /> : <Header />;
};



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
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </>
  );
}
*/

function App() {
  return (
    <Router>
      <main className="flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
      </Router>
  );
}

export default App;
