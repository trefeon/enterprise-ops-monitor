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
        name: /Monitor branch operations/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Demo account included\. No setup needed/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Everything an ops team needs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Modern, proven technologies/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Clean separation of concerns/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /One command to deploy/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Common questions/i })).toBeInTheDocument();
    const demoLinks = screen.getAllByRole('link', { name: /Open Live Demo/i });
    expect(demoLinks.length).toBeGreaterThan(0);
    for (const link of demoLinks) {
      expect(link).toHaveAttribute('href', '/login');
    }
    expect(screen.getByRole('link', { name: /Read Case Study/i })).toHaveAttribute(
      'href',
      '/case-study',
    );
    expect(screen.getAllByText(/simulated and anonymized/i).length).toBeGreaterThan(0);
  });
});
