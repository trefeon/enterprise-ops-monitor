import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { AuthContext } from '../context/AuthContext';

describe('PrivateRoute', () => {
  it('redirects to /login when unauthenticated', () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<div>Home</div>} />
            </Route>
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('renders child route when authenticated', () => {
    render(
      <AuthContext.Provider value={{ user: { id: '1' }, loading: false }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<div>Home</div>} />
            </Route>
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders children when used as an element wrapper', () => {
    render(
      <AuthContext.Provider value={{ user: { id: '1' }, loading: false }}>
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
