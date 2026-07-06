import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { AuthContext } from '../context/AuthContext';

describe('PrivateRoute', () => {
  it('redirects /app to /login when unauthenticated', () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: false } as any}>
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/app" element={<div>Dashboard</div>} />
            </Route>
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('renders /app child route when authenticated', () => {
    render(
      <AuthContext.Provider value={{ user: { id: '1' }, loading: false } as any}>
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/app" element={<div>Dashboard</div>} />
            </Route>
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders children when used as an element wrapper', () => {
    render(
      <AuthContext.Provider value={{ user: { id: '1' }, loading: false } as any}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <div>Home</div>
                </PrivateRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
