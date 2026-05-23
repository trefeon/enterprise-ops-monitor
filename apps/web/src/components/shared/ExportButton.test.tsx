import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportButton } from './ExportButton';

describe('ExportButton', () => {
  it('renders the Excel export label and handles clicks', () => {
    const onClick = vi.fn();

    render(<ExportButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /export excel/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables while loading', () => {
    render(<ExportButton onClick={vi.fn()} loading />);

    expect(screen.getByRole('button', { name: /export excel/i })).toBeDisabled();
  });
});
