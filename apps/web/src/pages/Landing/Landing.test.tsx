import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './index';

describe('Landing', () => {
  it('presents the public portfolio entry without auth', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        name: /Build an operations dashboard starter without starting from scratch/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No setup needed\. Demo account included/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Why internal ops tools break down/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /How the starter works/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /What you can reuse/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Product depth/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Questions before demo/i })).toBeInTheDocument();
    const demoLinks = screen.getAllByRole('link', { name: /Open Demo/i });
    expect(demoLinks.length).toBeGreaterThan(0);
    for (const link of demoLinks) {
      expect(link).toHaveAttribute('href', '/login');
    }
    expect(screen.getByRole('link', { name: /Read Case Study/i })).toHaveAttribute(
      'href',
      '/case-study',
    );
    expect(screen.getAllByText(/Simulated\/anonymized data/i).length).toBeGreaterThan(0);
  });
});
