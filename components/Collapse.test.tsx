import { render, screen } from '@testing-library/react';
import { IconRegistry } from '@/components/icons';
import { Collapse, CollapseChevron } from './Collapse';

describe('Collapse', () => {
  it('draws nothing until first opened', () => {
    render(<Collapse open={false}>inside</Collapse>);

    expect(screen.queryByText('inside')).toBeNull();
  });

  it('keeps what it holds once opened, out of reach while folded', () => {
    const { rerender } = render(<Collapse open>inside</Collapse>);
    expect(screen.getByText('inside').closest('[inert]')).toBeNull();

    rerender(<Collapse open={false}>inside</Collapse>);

    expect(screen.getByText('inside').closest('[inert]')).not.toBeNull();
  });

  it('says whether it is open, for the fold and the chevron to style from', () => {
    const both = (open: boolean) => (
      <IconRegistry>
        <Collapse open={open}>inside</Collapse>
        <CollapseChevron open={open} />
      </IconRegistry>
    );
    const { container, rerender } = render(both(true));
    expect(container.querySelectorAll('[data-open]')).toHaveLength(2);

    rerender(both(false));
    expect(container.querySelectorAll('[data-open]')).toHaveLength(0);
  });
});
