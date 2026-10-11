import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VoucherList from './pages/VoucherList.jsx';
import VoucherForm from './pages/VoucherForm.jsx';
import VoucherDetails from './pages/VoucherDetails.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vouchers" element={<VoucherList />} />
          <Route path="/vouchers/:id" element={<VoucherDetails />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['EMPLOYEE']} />}>
        <Route element={<Layout />}>
          <Route path="/vouchers/new" element={<VoucherForm />} />
          <Route path="/vouchers/:id/edit" element={<VoucherForm />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['DIRECTOR']} />}>
        <Route element={<Layout />}>
          <Route path="/pending" element={<VoucherList pendingOnly />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
