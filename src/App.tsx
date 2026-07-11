import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import FooterContacts from './pages/FooterContacts';
import HomeContent from './pages/HomeContent';
import Services from './pages/Services';
import Projects from './pages/Projects';
import Products from './pages/Products';
import Testimonials from './pages/Testimonials';
import UpdatePassword from './pages/UpdatePassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/home" element={<HomeContent />} />
            <Route path="/footer" element={<FooterContacts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/services" element={<Services />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/products" element={<Products />} />
            <Route path="/testimonials" element={<Testimonials />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
